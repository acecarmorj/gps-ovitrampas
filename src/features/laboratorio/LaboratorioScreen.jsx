import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical, CheckCircle2, Plus, Minus,
  Camera, X, History, Check, Sparkles, Bot, Bug, Key
} from 'lucide-react';
import {
  registrarLeituraLaboratorio,
  getLeituras,
  compressImage
} from '../../lib/storage';
import { playSuccessSound } from '../../lib/soundAlert';
import { AssistenteContadorOvos } from './AssistenteContadorOvos';
import { IdentificadorEspecies } from './IdentificadorEspecies';
import { ModalConfigChaveGemini } from './ModalConfigChaveGemini';

export function LaboratorioScreen({
  armadilhas = [],
  armadilhaPreSelecionada = null,
  onLeituraConcluida
}) {
  const fileInputRef = useRef(null);

  // Aba ativa: 'palhetas' ou 'especies'
  const [abaAtiva, setAbaAtiva] = useState('palhetas');

  // Estados da leitura de palheta
  const [numeroArmadilha, setNumeroArmadilha] = useState('');
  const [armadilhaId, setArmadilhaId] = useState('');
  const [numeroPalheta, setNumeroPalheta] = useState('P-01');
  const [qtdOvos, setQtdOvos] = useState(0);
  const [fotoPalheta, setFotoPalheta] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(null);

  // Assistente de IA de Ovos
  const [mostrarAssistente, setMostrarAssistente] = useState(false);
  const [laudoAuditoria, setLaudoAuditoria] = useState(null);
  const [mostrarModalChave, setMostrarModalChave] = useState(false);

  // Histórico de Leituras salvas offline
  const [historicoLeituras, setHistoricoLeituras] = useState([]);

  useEffect(() => {
    setHistoricoLeituras(getLeituras());
  }, []);

  // Armadilha pré-selecionada (se veio do mapa)
  useEffect(() => {
    if (armadilhaPreSelecionada) {
      setNumeroArmadilha(armadilhaPreSelecionada.numero);
      setArmadilhaId(armadilhaPreSelecionada.id);
      // Se a palheta foi recolhida em campo, ela tem precedência para contagem no laboratório
      setNumeroPalheta(armadilhaPreSelecionada.palhetaRecolhida || armadilhaPreSelecionada.ultimaPalheta || armadilhaPreSelecionada.palheta || 'P-01');
    }
  }, [armadilhaPreSelecionada]);

  const handleSelecionarArmadilhaExistente = (arm) => {
    setNumeroArmadilha(arm.numero);
    setArmadilhaId(arm.id);
    // Se a palheta foi recolhida em campo, ela tem precedência para contagem no laboratório
    setNumeroPalheta(arm.palhetaRecolhida || arm.ultimaPalheta || arm.palheta || 'P-01');
  };

  const ajustarOvos = (delta) => {
    setQtdOvos((prev) => Math.max(0, prev + delta));
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 0.85);
      setFotoPalheta(compressed);
    } catch (err) {
      alert('Erro ao carregar a foto da palheta.');
    }
  };

  // Salvar Leitura (100% offline)
  const handleSalvar = async (e) => {
    e.preventDefault();

    if (!numeroArmadilha.trim()) {
      alert('Digite o número da OV.');
      return;
    }

    // Confirma ANTES de salvar que existe uma armadilha de verdade pra
    // receber essa leitura. Sem isso, digitar um numero que nao bate com
    // nenhuma OV cadastrada salvava a leitura "solta" - o tecnico via
    // "sucesso" na tela, mas nenhuma armadilha tinha a contagem de ovos
    // atualizada, e ninguem percebia ate o relatorio sair errado.
    const numeroDigitadoNucleo = numeroArmadilha.trim().replace(/^OV[-_ ]*/i, '').trim().toLowerCase();
    const armadilhaEncontrada = armadilhas.some(
      (a) => a.id === armadilhaId || (a.numero && a.numero.toLowerCase() === numeroDigitadoNucleo)
    );
    if (!armadilhaEncontrada) {
      const prosseguirSemMatch = window.confirm(
        `⚠️ Não encontrei nenhuma OV-${numeroArmadilha.trim().replace(/^OV[-_ ]*/i, '')} cadastrada.\n\nSe salvar assim mesmo, esta leitura NÃO vai atualizar a contagem de ovos de nenhuma armadilha - vai ficar "solta".\n\nConfira o número antes de continuar. Deseja salvar mesmo assim?`
      );
      if (!prosseguirSemMatch) {
        return;
      }
    }

    setSalvando(true);
    try {
      const nova = await registrarLeituraLaboratorio({
        armadilhaId: armadilhaId || null,
        numeroArmadilha: numeroArmadilha.trim(),
        numeroPalheta: numeroPalheta.trim() || 'P-01',
        ovos: qtdOvos,
        tecnicoNome: 'Laboratório Carmo',
        fotoPalhetaDataUrl: fotoPalheta,
        laudoAuditoria
      });

      playSuccessSound();
      setSucessoMsg(`Leitura salva! OV-${nova.numeroArmadilha} (${nova.numeroPalheta}): ${nova.ovos} ovos (${nova.positiva ? 'Positiva' : 'Negativa'}).`);
      setHistoricoLeituras(getLeituras());

      // Reset. Limpa TAMBEM numero/id da armadilha e da palheta - sem isso,
      // apertar salvar de novo por engano (ou duplo toque) grava outra
      // leitura na MESMA armadilha que acabou de ser salva.
      setNumeroArmadilha('');
      setArmadilhaId('');
      setNumeroPalheta('P-01');
      setQtdOvos(0);
      setFotoPalheta(null);
      setLaudoAuditoria(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onLeituraConcluida) {
        onLeituraConcluida(nova);
      }

      setTimeout(() => {
        setSucessoMsg(null);
      }, 4000);
    } catch (err) {
      alert('Erro ao salvar a leitura.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#F1F2F5] text-slate-900 flex flex-col overflow-y-auto font-sans p-3 sm:p-5 select-none">
      <div className="max-w-lg mx-auto w-full space-y-3.5 pb-20">

        {/* CABEÇALHO CLEAN */}
        <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900">Laboratório Ovitrampa</h1>
              <p className="text-[11px] text-slate-500">Contagem de ovos e identificação taxonômica</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMostrarModalChave(true)}
              className="px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[10px] font-black flex items-center gap-1 transition-all active:scale-95"
              title="Configurar Chave da IA Google Gemini"
            >
              <Key className="w-3 h-3" />
              <span>Chave IA</span>
            </button>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              ENTOMOLOGIA
            </span>
          </div>
        </div>

        {/* SELETOR DE ABA CLEAN */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setAbaAtiva('palhetas')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'palhetas'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Contagem de Ovos</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('especies')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'especies'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span>Identificar Espécie</span>
          </button>
        </div>

        {/* ALERTA DE SUCESSO */}
        {sucessoMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span className="flex-1">{sucessoMsg}</span>
            <button onClick={() => setSucessoMsg(null)} className="p-1 text-emerald-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONTEÚDO DA ABA SELECIONADA */}
        {abaAtiva === 'especies' ? (
          <IdentificadorEspecies />
        ) : (
          <>
            {/* FORMULÁRIO RÁPIDO DE PALHETAS */}
            <form onSubmit={handleSalvar} className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm space-y-3.5">
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Nº da OV *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 01, 14"
                    value={numeroArmadilha}
                    onChange={(e) => {
                      setNumeroArmadilha(e.target.value);
                      const match = armadilhas.find(
                        (a) => a.numero.toLowerCase() === e.target.value.trim().toLowerCase()
                      );
                      if (match) {
                        setArmadilhaId(match.id);
                        if (match.palheta) setNumeroPalheta(match.palheta);
                      } else {
                        // SEM ISSO: tocar num atalho (fixa armadilhaId) e depois
                        // editar o numero pra outro que nao tem atalho mantinha o
                        // id antigo - a leitura salvava na armadilha ERRADA (a
                        // do atalho), com "sucesso" normal na tela, sem o
                        // tecnico perceber. Agora so casa pelo numero digitado.
                        setArmadilhaId('');
                      }
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-3 py-2 text-base font-black text-slate-900 text-center placeholder:text-slate-400 focus:outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Palheta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: P-01"
                    value={numeroPalheta}
                    onChange={(e) => setNumeroPalheta(e.target.value)}
                    className="w-full bg-indigo-50/50 border-2 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-3 py-2 text-base font-black text-indigo-800 text-center placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* ATALHOS RÁPIDOS DE ARMADILHAS CADASTRADAS */}
              {armadilhas.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Atalhos de armadilhas:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {armadilhas.slice(0, 8).map((arm) => (
                      <button
                        key={arm.id}
                        type="button"
                        onClick={() => handleSelecionarArmadilhaExistente(arm)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 transition-colors ${
                          numeroArmadilha === arm.numero
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        OV-{arm.numero}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTADOR DE OVOS */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Quantidade de Ovos
                  </span>
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                      qtdOvos > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {qtdOvos > 0 ? 'POSITIVA' : 'NEGATIVA (0)'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4 py-1">
                  <button
                    type="button"
                    onClick={() => ajustarOvos(-1)}
                    className="w-12 h-12 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 border border-slate-200 flex items-center justify-center text-slate-700 text-xl font-bold transition-transform shadow-xs"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      min="0"
                      value={qtdOvos}
                      onChange={(e) => setQtdOvos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-24 text-center bg-transparent font-black text-4xl sm:text-5xl text-slate-900 focus:outline-none"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ovos</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => ajustarOvos(1)}
                    className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 border border-indigo-500 flex items-center justify-center text-white text-xl font-bold transition-transform shadow-md shadow-indigo-600/20"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[-5, 5, 10, 25].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => ajustarOvos(val)}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs py-1.5 rounded-xl transition-colors active:scale-95 shadow-xs"
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* FOTO E ASSISTENTE DE IA */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoChange}
                  className="hidden"
                />

                {/* BOTÃO ASSISTENTE DE IA GEMINI */}
                <button
                  type="button"
                  onClick={() => setMostrarAssistente(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 active:scale-95 text-white font-black text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all uppercase tracking-wider"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Contar Ovos por Foto (IA Gemini)</span>
                </button>

                {/* PREVIEW DA FOTO SE EXISTIR */}
                {fotoPalheta && (
                  <div className="relative rounded-2xl overflow-hidden border border-indigo-200 bg-slate-100 p-2 space-y-2">
                    <div className="relative h-24 rounded-xl overflow-hidden">
                      <img src={fotoPalheta} alt="Palheta" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFotoPalheta(null);
                          setLaudoAuditoria(null);
                        }}
                        className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1 rounded-lg shadow-sm"
                        title="Remover foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {laudoAuditoria && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-xs flex items-start gap-2">
                        <Bot className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-black text-indigo-900 block">
                            Contagem na foto: {laudoAuditoria.final} ovos
                          </span>
                          <span className="text-[11px] text-slate-600 block leading-tight mt-0.5">
                            {laudoAuditoria.ia
                              ? `IA marcou ${laudoAuditoria.ia.ovosIA} · ${laudoAuditoria.ia.concordancia}% de acordo com o app`
                              : 'Sem conferência da IA'}
                            {laudoAuditoria.manuais ? ` · ${laudoAuditoria.manuais} marcado(s) à mão` : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* BOTÃO SALVAR */}
              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {salvando ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SALVAR LEITURA</span>
                  </>
                )}
              </button>
            </form>

            {/* HISTÓRICO RECENTE CLEAN */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Últimas Leituras ({historicoLeituras.length})
                </h2>
              </div>

              {historicoLeituras.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3">Nenhuma leitura registrada.</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {historicoLeituras.map((leit) => (
                    <div
                      key={leit.id}
                      className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-black text-slate-900 text-xs">OV-{leit.numeroArmadilha}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({leit.numeroPalheta})</span>
                        {leit.laudoAuditoria?.ia && (
                          <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-full ml-1.5">
                            IA {leit.laudoAuditoria.ia.concordancia}% acordo
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          leit.positiva
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {leit.ovos} ovos
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* MODAL DO ASSISTENTE DE CONTAGEM E IA */}
      {mostrarAssistente && (
        <AssistenteContadorOvos
          fotoInicial={fotoPalheta}
          onConfirmar={(total, fotoUrl, markers, laudo) => {
            setQtdOvos(total);
            if (fotoUrl) setFotoPalheta(fotoUrl);
            if (laudo) setLaudoAuditoria(laudo);
            setMostrarAssistente(false);
          }}
          onFechar={() => setMostrarAssistente(false)}
        />
      )}

      {/* MODAL CONFIGURAÇÃO DA CHAVE GEMINI */}
      <ModalConfigChaveGemini
        aberto={mostrarModalChave}
        onFechar={() => setMostrarModalChave(false)}
      />
    </div>
  );
}
