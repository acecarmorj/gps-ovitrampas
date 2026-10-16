import React from 'react';
import { Calendar, History, Sparkles, Check } from 'lucide-react';
import { CICLO_ID_ATUAL, CICLO_ID_ANTERIOR, CAMPANHAS_OFICIAIS } from '../lib/ciclosOvitrampas';

export function SeletorCampanha({
  campanhaAtiva = CICLO_ID_ANTERIOR,
  onMudarCampanha,
  tamanho = 'normal', // 'compacto' | 'normal'
  mostrarDescricao = false,
  className = ''
}) {
  const isCompact = tamanho === 'compacto';

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg shadow-black/20 ${className}`}
      role="group"
      aria-label="Seletor de Ciclo Epidemiológico"
    >
      {/* Botão Ciclo Anterior (Ano Passado - 113 Leituras) */}
      <button
        type="button"
        onClick={() => onMudarCampanha(CICLO_ID_ANTERIOR)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          campanhaAtiva === CICLO_ID_ANTERIOR
            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Consultar dados consolidados do Ciclo Anterior (Ano Passado - Set/2026 - 113 leituras)"
      >
        <History className="w-3.5 h-3.5 text-amber-300" />
        <span>Ano Passado</span>
        {!isCompact && <span className="text-[10px] text-amber-200 font-medium hidden sm:inline">(Set/2026)</span>}
      </button>

      {/* Botão Novo Ciclo (Atual) */}
      <button
        type="button"
        onClick={() => onMudarCampanha(CICLO_ID_ATUAL)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          campanhaAtiva === CICLO_ID_ATUAL
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
