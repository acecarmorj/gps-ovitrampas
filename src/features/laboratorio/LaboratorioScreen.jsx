import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical, CheckCircle2, Plus, Minus,
  Camera, X, History, Check
} from 'lucide-react';
import {
  registrarLeituraLaboratorio,
  getLeituras,
  compressImage
} from '../../lib/storage';
import { playSuccessSound } from '../../lib/soundAlert';

export function LaboratorioScreen({
  armadilhas = [],
  armadilhaPreSelecionada = null,
  onLeituraConcluida
}) {
  const fileInputRef = useRef(null);

  // Estados ultra simplificados para o laboratório
  const [numeroArmadilha, setNumeroArmadilha] = useState('');
  const [armadilhaId, setArmadilhaId] = useState('');
  const [numeroPalheta, setNumeroPalheta] = useState('P-01');
  const [qtdOvos, setQtdOvos] = useState(0);
  const [fotoPalheta, setFotoPalheta] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(null);

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
      setNumeroPalheta(armadilhaPreSelecionada.palheta || 'P-01');
    }
  }, [armadilhaPreSelecionada]);

  const handleSelecionarArmadilhaExistente = (arm) => {
    setNumeroArmadilha(arm.numero);
    setArmadilhaId(arm.id);
    setNumeroPalheta(arm.palheta || 'P-01');
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

    setSalvando(true);
    try {
      const nova = await registrarLeituraLaboratorio({
        armadilhaId: armadilhaId || null,
        numeroArmadilha: numeroArmadilha.trim(),
        numeroPalheta: numeroPalheta.trim() || 'P-01',
        ovos: qtdOvos,
        tecnicoNome: 'Laboratório Carmo',
        fotoPalhetaDataUrl: fotoPalheta
      });

      playSuccessSound();
      setSucessoMsg(`Leitura salva! OV-${nova.numeroArmadilha} (${nova.numeroPalheta}): ${nova.ovos} ovos (${nova.positiva ? 'Positiva' : 'Negativa'}).`);
      setHistoricoLeituras(getLeituras());

      // Reset
      setQtdOvos(0);
      setFotoPalheta(null);
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
    <div className="w-full h-full bg-slate-950 text-white flex flex-col overflow-y-auto font-sans p-3 sm:p-5 select-none">
      <div className="max-w-lg mx-auto w-full space-y-3.5 pb-20">

        {/* CABEÇALHO */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white">Laboratório Ovitrampa</h1>
              <p className="text-[10px] text-slate-400">Leitura de ovos da palheta (100% offline)</p>
            </div>
          </div>
        </div>

        {/* ALERTA DE SUCESSO */}
        {sucessoMsg && (
          <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span className="flex-1">{sucessoMsg}</span>
            <button onClick={() => setSucessoMsg(null)} className="p-1 text-blue-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* FORMULÁRIO RÁPIDO */}
        <form onSubmit={handleSalvar} className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3.5">
          
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-300 mb-1">
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
                  }
                }}
                className="w-full bg-slate-800 border-2 border-slate-700 focus:border-blue-500 rounded-2xl px-3 py-2 text-base font-black text-white text-center placeholder:text-slate-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-300 mb-1">
                Palheta *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: P-01"
                value={numeroPalheta}
                onChange={(e) => setNumeroPalheta(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 focus:border-blue-500 rounded-2xl px-3 py-2 text-base font-black text-blue-400 text-center placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ATALHOS RÁPIDOS DE ARMADILHAS CADASTRADAS */}
          {armadilhas.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Atalhos rápidos:
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {armadilhas.slice(0, 8).map((arm) => (
                  <button
                    key={arm.id}
                    type="button"
                    onClick={() => handleSelecionarArmadilhaExistente(arm)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                      numeroArmadilha === arm.numero
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    OV-{arm.numero}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CONTADOR DE OVOS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Quantidade de Ovos
              </span>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  qtdOvos > 0
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}
              >
                {qtdOvos > 0 ? 'POSITIVA' : 'NEGATIVA (0)'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 py-1">
              <button
                type="button"
                onClick={() => ajustarOvos(-1)}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 flex items-center justify-center text-white text-xl font-bold transition-transform"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  value={qtdOvos}
                  onChange={(e) => setQtdOvos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-24 text-center bg-transparent font-black text-4xl sm:text-5xl text-white focus:outline-none"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ovos</span>
              </div>

              <button
                type="button"
                onClick={() => ajustarOvos(1)}
                className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-500 flex items-center justify-center text-white text-xl font-bold transition-transform shadow-lg shadow-blue-900/40"
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
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-black text-xs py-1.5 rounded-xl transition-colors active:scale-95"
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
          </div>

          {/* FOTO DA PALHETA (OPCIONAL) */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              className="hidden"
            />

            {!fotoPalheta ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-800/30 rounded-2xl py-2 px-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 transition-colors"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Foto da Palheta (Opcional)</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-blue-500/40 bg-slate-800 h-20 flex items-center justify-center">
                <img src={fotoPalheta} alt="Palheta" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotoPalheta(null)}
                  className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* BOTÃO SALVAR */}
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 transition-all"
          >
            {salvando ? (
              <span>Salvando...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>SALVAR LEITURA</span>
              </>
            )}
          </button>
        </form>

        {/* HISTÓRICO RECENTE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 shadow-xl space-y-2.5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <History className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Últimas Leituras ({historicoLeituras.length})
            </h2>
          </div>

          {historicoLeituras.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-3">Nenhuma leitura registrada.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {historicoLeituras.map((leit) => (
                <div
                  key={leit.id}
                  className="bg-slate-800/80 border border-slate-700/70 px-3 py-2 rounded-xl flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-black text-white text-xs">OV-{leit.numeroArmadilha}</span>
                    <span className="text-[10px] text-slate-400 ml-2">({leit.numeroPalheta})</span>
                  </div>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      leit.positiva
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {leit.ovos} ovos
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
