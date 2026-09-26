import React from 'react';
import { Layers, Calendar, Sparkles } from 'lucide-react';
import { CICLO_SEMANA_1, CICLO_SEMANA_2, CICLO_AMBAS } from '../lib/ciclosOvitrampas';

export function SeletorCicloPalheta({
  cicloAtivo = CICLO_AMBAS,
  onMudarCiclo,
  tamanho = 'normal', // 'compacto' | 'normal' | 'expandido'
  className = ''
}) {
  const isCompact = tamanho === 'compacto';

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg shadow-black/20 ${className}`}
      role="group"
      aria-label="Seletor de Ciclo das Palhetas"
    >
      {/* Botão Ciclo A */}
      <button
        type="button"
        onClick={() => onMudarCiclo(CICLO_SEMANA_1)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          cicloAtivo === CICLO_SEMANA_1
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Exibir dados da 1ª Semana (Palheta A)"
      >
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span>Palheta A</span>
        {!isCompact && <span className="text-[10px] text-blue-200 font-medium hidden sm:inline">(Sem. 1)</span>}
      </button>

      {/* Botão Ciclo B */}
      <button
        type="button"
        onClick={() => onMudarCiclo(CICLO_SEMANA_2)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          cicloAtivo === CICLO_SEMANA_2
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Exibir dados da 2ª Semana (Palheta B)"
      >
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
        <span>Palheta B</span>
        {!isCompact && <span className="text-[10px] text-indigo-200 font-medium hidden sm:inline">(Sem. 2)</span>}
      </button>

      {/* Botão Ambas (A + B) */}
      <button
        type="button"
        onClick={() => onMudarCiclo(CICLO_AMBAS)}
        className={`flex items-center gap-1.5 rounded-xl font-black transition-all cursor-pointer ${
          isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          cicloAtivo === CICLO_AMBAS
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Exibir consolidação e soma das duas palhetas (A + B)"
      >
        <Layers className="w-3.5 h-3.5 text-emerald-300" />
        <span>Ambas</span>
        {!isCompact && <span className="text-[10px] text-emerald-200 font-medium hidden sm:inline">(A + B)</span>}
      </button>
    </div>
  );
}
