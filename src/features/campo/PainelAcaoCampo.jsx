import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, User, RefreshCw, PackageOpen, PlusCircle, Clock, MapPin } from 'lucide-react';
import {
  cadastrarArmadilha,
  trocarPalhetaArmadilha,
  recolherArmadilhaEPalheta,
  normalizarNumeroArmadilha
} from '../../lib/storage';
import { decidirAcaoCampo, sugerirProximaPalheta, calcularSituacaoArmadilha } from '../../lib/situacaoOvitrampa';
import { calculateNavigationGuidance } from '../../lib/geoBearing';
import { playSuccessSound } from '../../lib/soundAlert';

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

export function PainelAcaoCampo({
  armadilhas = [],
  localizacao,
  vizinhasProximas = [],
  gpsErrorMsg,
  onConcluido
}) {
  const [numeroDigitado, setNumeroDigitado] = useState('');
  const [acaoManual, setAcaoManual] = useState(null);
  const [nomeMorador, setNomeMorador] = useState('');
  const [palheta, setPalheta] = useState('');
  const [ocorrencia, setOcorrencia] = useState('Normal');
  const [salvando, setSalvando] = useState(false);

  const numero = pad2(normalizarNumeroArmadilha(numeroDigitado) || '');

  // Armadilha alvo: o que foi digitado; sem digitar, a mais proxima dentro
  // do raio do GPS.
  const maisProxima = vizinhasProximas[0];
  const autoPorGps = !numero && maisProxima && maisProxima.distancia <= RAIO_AUTO_METROS;
  const armadilha = useMemo(() => {
    if (numero) {
      return armadilhas.find((a) => normalizarNumeroArmadilha(a.numero) === numero) || null;
    }
    return autoPorGps ? maisProxima.armadilha : null;
  }, [numero, armadilhas, autoPorGps, maisProxima]);

  const temAlvo = Boolean(numero) || Boolean(armadilha);
  const decisao = decidirAcaoCampo(armadilha);
  // Sem numero e sem armadilha perto, nao ha o que decidir ainda.
  const acao = !temAlvo ? null : acaoManual || (decisao.acao === 'nenhuma' ? null : decisao.acao);

  // Ao trocar de armadilha, volta para a decisao automatica e refaz a
  // sugestao de palheta.
  const chaveAlvo = armadilha?.id || numero;
  useEffect(() => {
    setAcaoManual(null);
    setOcorrencia('Normal');
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
    if (!nomeMorador.trim()) return alert('Informe o nome do morador.');
    // Nunca grava com a posicao padrao de antes do primeiro fix de GPS.
    if (localizacao.accuracy == null) {
      return alert(
        gpsErrorMsg
          ? `Não é possível instalar sem o GPS.\n\n${gpsErrorMsg}`
          : 'Aguardando o primeiro sinal de GPS. Espere parar de "Buscando Satélites..." antes de salvar.'
      );
    }
    if (armadilha) {
      const ok = window.confirm(
        `⚠️ JÁ EXISTE UMA OV-${numero} CADASTRADA.\n\nSalvar vai criar dois registros com o mesmo número e a leitura do laboratório pode ir pra armadilha errada. Deseja salvar assim mesmo?`
      );
      if (!ok) return;
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
    const nova = palheta.trim();
    if (!nova) return alert('Informe o código da palheta nova.');
    setSalvando(true);
    try {
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
    setSalvando(true);
    try {
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

  const executar = { instalar, trocar, recolher }[acao];

  const rotuloBotao = () => {
    if (acao === 'instalar') return `INSTALAR OV-${numero || '?'}`;
    if (acao === 'recolher') return `RECOLHER OV-${armadilha?.numero}`;
    if (acao === 'trocar') {
      if (!acaoManual && decisao.rotulo === 'reinstalar') return `REINSTALAR COM ${palheta || '?'}`;
      if (!acaoManual && decisao.rotulo === 'nova') return `COLOCAR PALHETA ${palheta || '?'}`;
      return `TROCAR ${armadilha?.palheta || '?'} → ${palheta || '?'}`;
    }
    return '';
  };

  // Acoes que o agente pode escolher na mao. Instalar so faz sentido para
  // numero sem cadastro; trocar para armadilha existente; recolher so para a
  // que ainda esta em campo.
  const acoesPossiveis = armadilha
    ? armadilha.status === 'instalada' || !armadilha.status
      ? ['trocar', 'recolher']
      : ['trocar']
    : numero
    ? ['instalar']
    : [];
  const sit = armadilha ? calcularSituacaoArmadilha(armadilha) : null;

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
          className="w-full bg-white border-2 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-4 py-3 text-2xl font-black text-slate-900 text-center tracking-wider placeholder:text-base placeholder:font-bold placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none"
        />
        {vizinhasProximas.length > 0 && !numero && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
            {vizinhasProximas.map((v) => (
              <button
                key={v.armadilha.id}
                type="button"
                onClick={() => setNumeroDigitado(v.armadilha.numero)}
                className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-black active:scale-95 transition-transform ${
                  autoPorGps && v === maisProxima
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-800 border-slate-300'
                }`}
              >
                OV-{v.armadilha.numero} · {v.distancia} m
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. O QUE O SISTEMA ENTENDEU */}
      {temAlvo && (
        <div className="rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-3 space-y-1">
          {armadilha ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-black text-slate-900">
                  OV-{armadilha.numero}
                  {autoPorGps && <span className="ml-1.5 text-[11px] font-bold text-emerald-700">(pelo GPS)</span>}
                </p>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white border border-slate-300 text-slate-800">
                  Palheta {armadilha.palheta || '-'}
                </span>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {armadilha.moradorNome || 'Morador'} · {armadilha.bairro} · {armadilha.quarteirao}
                </span>
              </p>
              {sit && <p className="text-xs font-bold text-slate-800">{sit.titulo}</p>}
            </>
          ) : (
            <p className="text-sm font-black text-slate-900">OV-{numero}: número sem cadastro</p>
          )}
        </div>
      )}

      {/* 3. NADA A FAZER (dentro do ciclo) */}
      {temAlvo && !acao && (
        <div className="rounded-2xl bg-blue-50 border border-blue-300 px-3.5 py-3 flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-blue-700 shrink-0" />
          <p className="text-sm font-bold text-blue-900">Nada a fazer agora. {decisao.motivo}.</p>
        </div>
      )}

      {/* 4. FORMULARIO DA ACAO */}
      {acao === 'instalar' && (
        <div className="space-y-2.5">
          {/* Assistente de Espaçamento de Campo (2 ou 3 armadilhas vizinhas) */}
          {vizinhasProximas && vizinhasProximas.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Distância das Armadilhas Vizinhas:</span>
                <span className="text-[10px] text-slate-500 font-semibold">Meta: 300m a 400m</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {vizinhasProximas.slice(0, 3).map((v) => {
                  const d = v.distancia;
                  const isIdeal = d >= 280 && d <= 420;
                  const isPerto = d < 280;
                  return (
                    <span
                      key={v.armadilha.id}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                        isIdeal
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isPerto
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <span>OV-{v.armadilha.numero}:</span>
                      <span>{d}m</span>
                      {isIdeal && <span className="text-[10px]">✓</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="campoMorador" className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome do morador
            </label>
            <input
              id="campoMorador"
              type="text"
              placeholder="Ex: Dona Maria"
              value={nomeMorador}
              onChange={(e) => setNomeMorador(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-none"
            />
          </div>
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
            className="w-full bg-white border-2 border-slate-300 focus:border-emerald-500 rounded-2xl px-3.5 py-2.5 text-lg font-black text-slate-900 text-center focus:outline-none"
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

      {acao && (
        <button
          type="button"
          onClick={executar}
          disabled={salvando}
          className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wide text-white shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all ${
            acao === 'recolher' ? 'bg-indigo-600 shadow-indigo-700/25' : 'bg-emerald-600 shadow-emerald-700/25'
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
