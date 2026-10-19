import React from 'react';
import { Calendar, History, Sparkles, Check } from 'lucide-react';
import { CICLO_ID_ATUAL, CICLO_ID_ANTERIOR, CICLO_ID_FEV2025, CAMPANHAS_OFICIAIS } from '../lib/ciclosOvitrampas';

export function SeletorCampanha({
  campanhaAtiva = CICLO_ID_ANTERIOR,
  campanhaHistorica = null,
  incluirHistorico = false,
  onMudarCampanha,
  tamanho = 'normal', // 'compacto' | 'normal'
  mostrarDescricao = false,
  className = ''
}) {
  const isCompact = tamanho === 'compacto';
  const ativa = campanhaHistorica || campanhaAtiva;

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg shadow-black/20 ${className}`}
      role="group"
      aria-label="Seletor de Ciclo Epidemiológico"
    >
      {/* Botão Histórico Fev/2025 (somente consulta, opcional) */}
      {incluirHistorico && (
        <button
          type="button"
          onClick={() => onMudarCampanha(CICLO_ID_FEV2025)}
          className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
            isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          } ${
            ativa === CICLO_ID_FEV2025
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Consultar dados históricos (Conta Ovos - Fev/2025 - 40 armadilhas)"
        >
          <History className="w-3.5 h-3.5 text-indigo-300" />
          <span>Fev/2025</span>
        </button>
      )}

      {/* Botão Ciclo Anterior (Set/2026 - 113 Leituras) */}
      <button
        type="button"
        onClick={() => onMudarCampanha(CICLO_ID_ANTERIOR)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          ativa === CICLO_ID_ANTERIOR
            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Consultar dados consolidados de Set/2026 (56 armadilhas, 113 leituras)"
      >
        <History className="w-3.5 h-3.5 text-amber-300" />
        <span>Set/2026</span>
      </button>

      {/* Botão Novo Ciclo (Atual) */}
      <button
        type="button"
        onClick={() => onMudarCampanha(CICLO_ID_ATUAL)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          ativa === CICLO_ID_ATUAL
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Operar no Novo Ciclo (Campanha 2026/2027)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span>Novo Ciclo</span>
        {!isCompact && <span className="text-[10px] text-emerald-200 font-medium hidden sm:inline">(2026/2027)</span>}
      </button>
    </div>
  );
}
