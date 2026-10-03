import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, User, RefreshCw, PackageOpen, PlusCircle, Clock, MapPin } from 'lucide-react';
import {
  atualizarArmadilha,
  cadastrarArmadilha,
  trocarPalhetaArmadilha,
  recolherArmadilhaEPalheta,
  normalizarNumeroArmadilha
} from '../../lib/storage';
import {
  decidirAcaoCampo,
  sugerirProximaPalheta,
  calcularSituacaoArmadilha,
  identificarCicloArmadilha
} from '../../lib/situacaoOvitrampa';
import { calculateNavigationGuidance } from '../../lib/geoBearing';
import { playSuccessSound } from '../../lib/soundAlert';
import { temAcessoEquipe } from '../../lib/acessoEquipe';

// Raio em que o GPS assume sozinho que o agente esta na armadilha mais
// proxima. Acima disso o agente digita o numero ou toca na lista.
const RAIO_AUTO_METROS = 25;

// Mesmas opcoes do recolhimento no painel de acompanhamento, em chips de um
// toque (agente com luva, no sol).
const OCORRENCIAS = [
  'Normal',
  'Seca',
  'Tombada',
  'Palheta quebrada',
  'Com larvas'
];

const TITULO_ACAO = {
  instalar: 'Instalar',
  trocar: 'Trocar palheta',
  recolher: 'Recolher'
};

function pad2(n) {
  return /^\d$/.test(n) ? n.padStart(2, '0') : n;
}

function formatarDistancia(metros) {
  if (metros == null || !Number.isFinite(metros)) return '-';
  if (metros >= 1000) {
    const km = (metros / 1000).toFixed(1).replace('.', ',');
    return `${km} km (${metros} m)`;
  }
  return `${metros} m`;
}

function formatarDistanciaCurta(metros) {
  if (metros == null || !Number.isFinite(metros)) return '-';
  if (metros >= 1000) {
    return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
  }
  return `${metros} m`;
}

export function PainelAcaoCampo({
  armadilhas = [],
  localizacao,
  vizinhasProximas = [],
  gpsErrorMsg,
  numeroPredefinido = null,
  onConcluido
}) {
  const [numeroDigitado, setNumeroDigitado] = useState(numeroPredefinido ? String(numeroPredefinido) : '');
  const [acaoManual, setAcaoManual] = useState(null);
  const [nomeMorador, setNomeMorador] = useState('');
  const [palheta, setPalheta] = useState('');
  const [ocorrencia, setOcorrencia] = useState('Normal');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (numeroPredefinido) {
      setNumeroDigitado(String(numeroPredefinido));
    }
  }, [numeroPredefinido]);

  const numero = pad2(normalizarNumeroArmadilha(numeroDigitado) || '');

  // Armadilha alvo: o que foi digitado; sem digitar, a mais proxima dentro
  // do raio do GPS.
  const maisProxima = vizinhasProximas[0];
  const autoPorGps = !numero && maisProxima && maisProxima.distancia <= RAIO_AUTO_METROS;

  const orientacaoGuia = useMemo(() => {
    return calculateNavigationGuidance(localizacao, armadilhas);
  }, [
    Math.round((localizacao?.latitude || 0) * 50000),
    Math.round((localizacao?.longitude || 0) * 50000),
    armadilhas
  ]);
  const armadilha = useMemo(() => {
    if (numero) {
      return armadilhas.find((a) => normalizarNumeroArmadilha(a.numero) === numero) || null;
    }
    return autoPorGps ? maisProxima.armadilha : null;
  }, [numero, armadilhas, autoPorGps, maisProxima]);

  const temAlvo = Boolean(numero) || Boolean(armadilha);
  const decisao = decidirAcaoCampo(armadilha);
  // Sem numero e sem armadilha perto, nao ha o que decidir ainda.
  // Para armadilha recolhida ou analisada, acao fica null para nao abrir formulario de troca/recolha indevido
  const acao = !temAlvo
    ? null
    : acaoManual || (decisao.acao === 'recolhida' || decisao.acao === 'analisada' || decisao.acao === 'nenhuma' ? null : decisao.acao);

  // Ao trocar de armadilha, volta para a decisao automatica e refaz a
  // sugestao de palheta.
  const chaveAlvo = armadilha?.id || numero;
  useEffect(() => {
    setAcaoManual(null);
    setOcorrencia('Normal');
    setNomeMorador(''); // o nome digitado para uma OV nao pode ir para outra casa
    setPalheta(armadilha ? sugerirProximaPalheta(armadilha) : numero ? `${numero}A` : '');
  }, [chaveAlvo]);

  const limpar = () => {
    setNumeroDigitado('');
    setAcaoManual(null);
    setNomeMorador('');
    setPalheta('');
    setOcorrencia('Normal');
  };

  const concluir = (mensagem) => {
    playSuccessSound();
    limpar();
    onConcluido?.(mensagem);
  };

  const instalar = async () => {
    if (!numero) return alert('Digite o número da OV.');
    if (armadilha) {
      alert(`⚠️ AÇÃO NÃO PERMITIDA:\nA tela de colocar/instalar é apenas para armadilhas novas.\nA OV-${numero} já está cadastrada e instalada.`);
      return;
    }
    if (!nomeMorador.trim()) return alert('Informe o nome do morador.');
    // Nunca grava com a posicao padrao de antes do primeiro fix de GPS.
    if (localizacao.accuracy == null) {
      return alert(
        gpsErrorMsg
          ? `Não é possível instalar sem o GPS.\n\n${gpsErrorMsg}`
          : 'Aguardando o primeiro sinal de GPS. Espere parar de "Buscando Satélites..." antes de salvar.'
      );
    }
    const guia = calculateNavigationGuidance(localizacao, armadilhas);
    if (guia.status === 'afastar') {
      const ok = window.confirm(
        `⚠️ ESPAÇAMENTO MENOR QUE 300M:\n\n${guia.orientacao}\n${guia.acao}\n\nDeseja instalar neste ponto mesmo assim?`
      );
      if (!ok) return;
    }
    if (localizacao.accuracy > 35) {
      const ok = window.confirm(
        `O GPS ainda está calibrando (±${localizacao.accuracy}m). O ideal é menos de 15m.\n\nSalvar com a precisão atual mesmo assim?`
      );
      if (!ok) return;
    }
    setSalvando(true);
    try {
      const nova = await cadastrarArmadilha({
        moradorNome: nomeMorador.trim(),
        numero,
        palheta: palheta.trim() || `${numero}A`,
        rua: localizacao.rua,
        numeroImovel: localizacao.numero,
        bairro: localizacao.bairro,
        microarea: localizacao.microarea,
        quarteirao: localizacao.quarteirao,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        precisaoGps: localizacao.accuracy,
        fotoDataUrl: null
      });
      concluir(`OV-${nova.numero} instalada com a palheta ${nova.palheta}.`);
    } catch (err) {
      alert('Erro ao gravar a instalação.');
    } finally {
      setSalvando(false);
    }
  };

  const trocar = async () => {
    if (!armadilha) return;
    if (decisao?.bloqueado) {
      alert(`⚠️ TROCA BLOQUEADA (REGRA DE 5 A 7 DIAS):\n\n${decisao.motivo}`);
      return;
    }
    const nova = palheta.trim();
    if (!nova) return alert('Informe o código da palheta nova.');
    if (faltaMorador && !nomeMorador.trim()) return alert('Informe o nome do morador (obrigatório).');
    setSalvando(true);
    try {
      if (faltaMorador) await atualizarArmadilha(armadilha.id, { moradorNome: nomeMorador.trim() });
      const saiu = armadilha.palheta || '-';
      await trocarPalhetaArmadilha(armadilha.id, {
        novaPalheta: nova,
        observacao: ocorrencia !== 'Normal' ? `Palheta ${saiu} retirada: ${ocorrencia}` : ''
      });
      concluir(`OV-${armadilha.numero}: saiu ${saiu}, entrou ${nova}. Leve a ${saiu} para o laboratório.`);
    } catch (err) {
      alert('Erro ao gravar a troca.');
    } finally {
      setSalvando(false);
    }
  };

  const recolher = async () => {
    if (!armadilha) return;
    if (decisao?.bloqueado) {
      alert(`⚠️ RETIRADA BLOQUEADA (REGRA DE 5 A 7 DIAS):\n\n${decisao.motivo}`);
      return;
    }
    if (faltaMorador && !nomeMorador.trim()) return alert('Informe o nome do morador (obrigatório).');
    setSalvando(true);
    try {
      if (faltaMorador) await atualizarArmadilha(armadilha.id, { moradorNome: nomeMorador.trim() });
      const saiu = armadilha.palheta || '-';
      await recolherArmadilhaEPalheta(armadilha.id, {
        condicoes: ocorrencia === 'Normal' ? 'Armadilha e palheta recolhidas intactas' : ocorrencia
      });
      concluir(`OV-${armadilha.numero} recolhida. Leve a palheta ${saiu} para o laboratório.`);
    } catch (err) {
      alert('Erro ao gravar o recolhimento.');
    } finally {
      setSalvando(false);
    }
  };

  // Nome do morador e SEMPRE obrigatorio. Em armadilha ja cadastrada sem nome, o agente completa ao trocar/recolher.
  const faltaMorador = Boolean(armadilha) && acao !== 'instalar' && temAcessoEquipe() && !String(armadilha.moradorNome || '').trim();
  const precisaMorador = acao === 'instalar' || faltaMorador;
  const bloqueadoPorRegra = Boolean(decisao?.bloqueado);
  const bloqueado = salvando || (precisaMorador && !nomeMorador.trim()) || bloqueadoPorRegra;

  const executar = { instalar, trocar, recolher }[acao];

  const rotuloBotao = () => {
    if (acao === 'instalar') return `INSTALAR OV-${numero || '?'}`;
    if (acao === 'recolher') {
      if (decisao?.bloqueado) {
        return `RETIRADA BLOQUEADA (${decisao.diasFaltam} ${decisao.diasFaltam === 1 ? 'DIA' : 'DIAS'} RESTANTES)`;
      }
      return `RECOLHER OV-${armadilha?.numero} E PALHETA ${armadilha?.palheta || 'B'}`;
    }
    if (acao === 'trocar') {
      if (decisao?.bloqueado) {
        return `TROCA BLOQUEADA (${decisao.diasFaltam} ${decisao.diasFaltam === 1 ? 'DIA' : 'DIAS'} RESTANTES)`;
      }
      return `TROCAR ${armadilha?.palheta || '?'} → ${palheta || '?'}`;
    }
    return '';
  };

  // Acoes que o agente pode escolher na mao.
  // Regra Estrita de Ovitrampas:
  // - Para armadilha nova (!armadilha): SOMENTE 'instalar'.
  // - Para armadilha já colocada: NUNCA 'instalar'!
  //   - Ciclo 1 (Palheta A): SOMENTE 'trocar' (Palheta A -> Palheta B).
  //   - Ciclo 2 (Palheta B): SOMENTE 'recolher' (Armadilha e Palheta B).
  const acoesPossiveis = useMemo(() => {
    if (!armadilha) {
      return numero ? ['instalar'] : [];
    }
    if (armadilha.status === 'recolhida' || armadilha.status === 'analisada') {
      return [];
    }
    const cicloInfo = identificarCicloArmadilha(armadilha);
    return cicloInfo.ciclo === 'A' ? ['trocar'] : ['recolher'];
  }, [armadilha, numero]);
  const sit = armadilha ? calcularSituacaoArmadilha(armadilha) : null;

  const renderAssistenteEspacamento = () => {
    if (!vizinhasProximas || vizinhasProximas.length === 0) return null;
    return (
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-3.5 space-y-2.5">
        {/* Destaque em fonte grande da mais próxima */}
        {maisProxima && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Armadilha mais próxima</span>
              <span className="text-base sm:text-lg font-black text-black">
                Mais próxima: OV-{maisProxima.armadilha.numero} a {formatarDistancia(maisProxima.distancia)}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black shrink-0">
              {maisProxima.distancia < 280 && (
                <span className="text-red-600 bg-red-50 border border-red-300 px-2.5 py-1 rounded-lg inline-block">
                  Perto demais - afaste-se
                </span>
              )}
              {maisProxima.distancia >= 280 && maisProxima.distancia <= 420 && (
                <span className="text-black bg-slate-100 border border-black px-2.5 py-1 rounded-lg inline-block">
                  Distância boa ✓
                </span>
              )}
              {maisProxima.distancia > 420 && (
                <span className="text-slate-600 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg inline-block">
                  Longe - pode aproximar
                </span>
              )}
            </div>
          </div>
        )}

        {/* Instrução Tática de Campo em Tempo Real (Padrão 300m a 400m) */}
        {orientacaoGuia && orientacaoGuia.status !== 'sem_gps' && (
          <div className={`p-2.5 rounded-xl border text-xs leading-snug ${
            orientacaoGuia.status === 'afastar'
              ? 'bg-red-50 border-red-300 text-red-900'
              : orientacaoGuia.status === 'ideal'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
              : 'bg-slate-50 border-slate-300 text-slate-800'
          }`}>
            <div className="font-black uppercase text-[10px] tracking-wider mb-1">
              {orientacaoGuia.status === 'afastar' && '⚠️ Perto demais (< 300 m) - Afaste-se'}
              {orientacaoGuia.status === 'ideal' && '🎯 Ponto Ideal de Espaçamento (300 a 400 m)'}
              {orientacaoGuia.status === 'amplo' && '📍 Espaçamento Amplo (> 400 m)'}
              {orientacaoGuia.status === 'primeira' && '🏁 Primeira Armadilha da Cidade'}
            </div>
            <p>{orientacaoGuia.orientacao}</p>
            <p className="mt-1 font-extrabold">{orientacaoGuia.acao}</p>
          </div>
        )}

        {/* Vizinhas no entorno */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span>Vizinhas no entorno:</span>
          <span className="text-[10px] text-slate-500 font-semibold">Meta: 300 m a 400 m entre armadilhas</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {vizinhasProximas.slice(0, 3).map((v) => {
            const d = v.distancia;
            const isIdeal = d >= 280 && d <= 420;
            const isPerto = d < 280;
            return (
              <span
                key={v.armadilha.id}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                  isPerto
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : isIdeal
                    ? 'bg-white text-black border-black'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                <span className="font-black">OV-{v.armadilha.numero}:</span>
                <span>{formatarDistancia(d)}</span>
                {isPerto && <span className="text-[10px] text-red-600 font-semibold">(Perto demais)</span>}
                {isIdeal && <span className="text-[10px] font-bold">✓ (Distância boa)</span>}
                {d > 420 && <span className="text-[10px] text-slate-500 font-semibold">(Longe)</span>}
              </span>
            );
          })}
        </div>

        {/* Legenda simples */}
        <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-slate-900">Meta: 300 m a 400 m entre armadilhas</span>
          <span className="text-red-600 font-bold">&lt; 280 m: Perto demais - afaste-se</span>
          <span className="text-black font-bold">280 a 420 m: Distância boa ✓</span>
          <span className="text-slate-600 font-bold">&gt; 420 m: Longe - pode aproximar</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. QUAL ARMADILHA */}
      <div>
        <label htmlFor="campoNumeroOv" className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
          Nº da armadilha
        </label>
        <input
          id="campoNumeroOv"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={autoPorGps ? `Perto de você: OV-${maisProxima.armadilha.numero}` : 'Ex: 05'}
          value={numeroDigitado}
          onChange={(e) => setNumeroDigitado(e.target.value)}
          className="w-full bg-white border-2 border-slate-300 focus:border-black focus:ring-2 focus:ring-slate-300 rounded-2xl px-4 py-3 text-2xl font-black text-slate-900 text-center tracking-wider placeholder:text-base placeholder:font-bold placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none"
        />
        {vizinhasProximas.length > 0 && !numero && (
          <div className="mt-2 space-y-1.5">
            {maisProxima && (
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between px-1">
                <span>Mais próxima: <b>OV-{maisProxima.armadilha.numero}</b> a <b>{formatarDistancia(maisProxima.distancia)}</b></span>
                {maisProxima.distancia < 280 && (
                  <span className="text-red-600 font-black text-[11px]">Perto demais</span>
                )}
                {maisProxima.distancia >= 280 && maisProxima.distancia <= 420 && (
                  <span className="text-black font-black text-[11px]">Distância boa ✓</span>
                )}
                {maisProxima.distancia > 420 && (
                  <span className="text-slate-500 font-semibold text-[11px]">Longe</span>
                )}
              </div>
            )}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {vizinhasProximas.map((v) => (
                <button
                  key={v.armadilha.id}
                  type="button"
                  onClick={() => setNumeroDigitado(v.armadilha.numero)}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-black active:scale-95 transition-transform ${
 autoPorGps && v === maisProxima
 ? 'bg-black text-white border-slate-300'
 : 'bg-white text-slate-800 border-slate-300'
 }`}
                >
                  OV-{v.armadilha.numero} · {formatarDistanciaCurta(v.distancia)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assistente de espaçamento visível antes de digitar qualquer número */}
      {!temAlvo && renderAssistenteEspacamento()}

      {/* 2. O QUE O SISTEMA ENTENDEU */}
      {temAlvo && (
        <div className="rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-3 space-y-1.5">
          {armadilha ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-black text-slate-900">
                  OV-{armadilha.numero}
                  {autoPorGps && <span className="ml-1.5 text-[11px] font-bold text-black">(pelo GPS)</span>}
                </p>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800">
                  Palheta Atual: {armadilha.palheta || '-'}
                </span>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {armadilha.moradorNome || 'Morador'} · {armadilha.bairro} · {armadilha.quarteirao}
                </span>
              </p>
              {sit && (
                <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200">
                  <span className="text-slate-800">{sit.titulo}</span>
                  <span className="text-slate-500 font-medium">Ciclo: 5 a 7 dias</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-900">OV-{numero}: Armadilha Nova</p>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-black text-white">
                Ponto Novo
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. STATUS DA REGRA DE 5 A 7 DIAS */}
      {temAlvo && armadilha && (
        <>
          {armadilha.status === 'recolhida' && (
            <div className="rounded-2xl bg-indigo-50 border-2 border-indigo-400 p-3.5 space-y-1 text-indigo-950">
              <div className="flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-800">
                    Armadilha Já Recolhida
                  </p>
                  <p className="text-sm font-black text-indigo-950">
                    Palheta {armadilha.palhetaRecolhida || armadilha.palheta} recolhida
                  </p>
                </div>
              </div>
              <p className="text-xs text-indigo-900 font-medium">
                Esta armadilha já concluiu o período de campo e aguarda contagem de ovos no laboratório.
              </p>
            </div>
          )}

          {armadilha.status === 'analisada' && (
            <div className="rounded-2xl bg-slate-100 border-2 border-slate-400 p-3.5 space-y-1 text-slate-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Leitura Concluída no Laboratório
                  </p>
                  <p className="text-sm font-black text-slate-950">
                    Resultado: {armadilha.ultimosOvos} ovos
                  </p>
                </div>
              </div>
            </div>
          )}

          {armadilha.status !== 'recolhida' && armadilha.status !== 'analisada' && (
            <>
              {decisao.bloqueado && (
                <div className="rounded-2xl bg-amber-50 border-2 border-amber-400 p-3.5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                        {decisao.acao === 'trocar' ? 'Troca da Palheta Bloqueada' : 'Retirada da Armadilha Bloqueada'}
                      </p>
                      <p className="text-sm font-black text-amber-950">
                        {decisao.diasCorridos} {decisao.diasCorridos === 1 ? 'dia' : 'dias'} em campo · Regra: 5 a 7 dias
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                    {decisao.motivo}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/80 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
                      <span className="text-amber-800 font-bold block text-[10px] uppercase">Liberado a partir de:</span>
                      <span className="font-black text-amber-950 text-xs">{decisao.dataMinFmt}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
                      <span className="text-amber-800 font-bold block text-[10px] uppercase">Prazo limite (7 dias):</span>
                      <span className="font-black text-amber-950 text-xs">{decisao.dataMaxFmt}</span>
                    </div>
                  </div>
                </div>
              )}

              {!decisao.bloqueado && (
                <div className={`rounded-2xl border-2 p-3.5 space-y-1.5 ${
                  decisao.rotulo?.includes('atrasada')
                    ? 'bg-rose-50 border-rose-400 text-rose-950'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-950'
                }`}>
                  <div className="flex items-center gap-2">
                    {decisao.rotulo?.includes('atrasada') ? (
                      <Clock className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${
                        decisao.rotulo?.includes('atrasada') ? 'text-rose-800' : 'text-emerald-800'
                      }`}>
                        {decisao.rotulo?.includes('atrasada') ? 'Prazo Máximo Excedido (> 7 dias)' : 'Período Oficial Atingido (5 a 7 dias)'}
                      </p>
                      <p className="text-sm font-black">
                        {decisao.diasCorridos} dias em campo · {decisao.acao === 'trocar' ? 'Pronta para troca (A → B)' : 'Pronta para retirada'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">
                    {decisao.motivo}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* 4. FORMULARIO DA ACAO */}
      {acao === 'instalar' && (
        <div className="space-y-2.5">
          {renderAssistenteEspacamento()}

          <p className="text-[11px] text-slate-600 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {localizacao.rua} · {localizacao.microarea} · {localizacao.quarteirao}
              {localizacao.accuracy != null ? ` · ±${localizacao.accuracy}m` : ''}
            </span>
          </p>
        </div>
      )}

      {(acao === 'instalar' || acao === 'trocar') && (
        <div>
          <label htmlFor="campoPalheta" className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
            Palheta nova
          </label>
          <input
            id="campoPalheta"
            type="text"
            autoComplete="off"
            value={palheta}
            onChange={(e) => setPalheta(e.target.value.toUpperCase())}
            className="w-full bg-white border-2 border-slate-300 focus:border-black rounded-2xl px-3.5 py-2.5 text-lg font-black text-slate-900 text-center focus:outline-none"
          />
        </div>
      )}

      {(acao === 'trocar' || acao === 'recolher') && armadilha?.status === 'instalada' && (
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
            Como estava a palheta {armadilha.palheta}?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {OCORRENCIAS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOcorrencia(o)}
                className={`px-3 py-2 rounded-xl border text-xs font-black active:scale-95 transition-transform ${
 ocorrencia === o ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-300'
 }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {acao && precisaMorador && (
        <div className="mb-3">
          <div>
            <label htmlFor="campoMorador" className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome do morador <span className="text-red-600">* obrigatório</span>
            </label>
            <input
              id="campoMorador"
              type="text"
              placeholder="Ex: Dona Maria"
              value={nomeMorador}
              onChange={(e) => setNomeMorador(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 focus:border-black rounded-2xl px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      )}

      {acao && (
        <button
          type="button"
          onClick={executar}
          disabled={bloqueado}
          className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wide text-white shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all ${
 acao === 'recolher' ? 'bg-black ' : 'bg-black '
 }`}
        >
          {salvando ? (
            'Salvando...'
          ) : (
            <>
              {acao === 'instalar' && <PlusCircle className="w-5 h-5" />}
              {acao === 'trocar' && <RefreshCw className="w-5 h-5" />}
              {acao === 'recolher' && <PackageOpen className="w-5 h-5" />}
              <span>{rotuloBotao()}</span>
            </>
          )}
        </button>
      )}

      {/* 5. TROCA MANUAL DE ACAO */}
      {acoesPossiveis.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <span className="font-bold text-slate-500">Outra ação:</span>
          {acoesPossiveis
            .filter((a) => a !== acao)
            .map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAcaoManual(a)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-black text-slate-800 active:scale-95"
              >
                {TITULO_ACAO[a]}
              </button>
            ))}
          {acaoManual && (
            <button type="button" onClick={() => setAcaoManual(null)} className="px-2 py-1.5 font-bold text-slate-500 underline">
              voltar à sugestão
            </button>
          )}
        </div>
      )}

      {!temAlvo && (
        <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Digite o número ou toque numa armadilha próxima.
        </p>
      )}
    </div>
  );
}
