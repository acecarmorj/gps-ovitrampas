import React from 'react';
import { Layers, Calendar, History } from 'lucide-react';
import {
  CICLO_SEMANA_1,
  CICLO_SEMANA_2,
  CICLO_AMBAS,
  CICLO_ID_ATUAL,
  CICLO_ID_ANTERIOR
} from '../lib/ciclosOvitrampas';

export function SeletorCicloPalheta({
  cicloAtivo = CICLO_AMBAS,
  onMudarCiclo,
  campanhaAtiva = CICLO_ID_ANTERIOR,
  onMudarCampanha,
  mostrarCampanha = false,
  tamanho = 'normal', // 'compacto' | 'normal' | 'expandido'
  className = ''
}) {
  const isCompact = tamanho === 'compacto';

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* SELETOR DE CAMPANHA (OPCIONAL) */}
      {mostrarCampanha && onMudarCampanha && (
        <div
          className="inline-flex items-center p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg shadow-black/20"
          role="group"
          aria-label="Campanha Epidemiológica"
        >
          <button
            type="button"
            onClick={() => onMudarCampanha(CICLO_ID_ANTERIOR)}
            className={`flex items-center gap-1 rounded-xl font-black transition-all cursor-pointer ${
              isCompact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
            } ${
              campanhaAtiva === CICLO_ID_ANTERIOR
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Ciclo Anterior (Ano Passado - Set/2026)"
          >
            <History className="w-3 h-3 text-amber-300" />
            <span>Ano Passado</span>
          </button>
          <button
            type="button"
            onClick={() => onMudarCampanha(CICLO_ID_ATUAL)}
            className={`flex items-center gap-1 rounded-xl font-black transition-all cursor-pointer ${
              isCompact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
            } ${
              campanhaAtiva === CICLO_ID_ATUAL
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Novo Ciclo (2026/2027)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Novo Ciclo</span>
          </button>
        </div>
      )}

      {/* SELETOR DAS PALHETAS (A / B / AMBAS) */}
      <div
        className="inline-flex items-center p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg shadow-black/20"
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
    </div>
  );
}
