import React from 'react';
import {
  MapPin, Map as MapIcon, FlaskConical,
  Volume2, VolumeX, PlusCircle,
  Cloud, CloudOff, RefreshCw, Check
} from 'lucide-react';

export function Header({
  abaAtual,
  onMudarAba,
  totalArmadilhas = 0,
  isMuted,
  onToggleMute,
  syncInfo = { isOnline: true, syncInProgress: false, totalPendentes: 0 },
  onForcarSync
}) {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-4 shrink-0 z-30 select-none">
      {/* LOGO & TITULO COM STATUS DE SINCRONIZAÇÃO */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🪤</span>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-black text-white leading-tight">
              GPS OVITRAMPAS
            </h1>
            <span className="text-[9px] text-emerald-400 font-extrabold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800 hidden sm:inline-block">
              CARMO RJ
            </span>
          </div>

          {/* INDICADOR DE PERSISTÊNCIA E SINCRONIZAÇÃO EM SEGUNDO PLANO */}
          <div
            onClick={onForcarSync}
            className="cursor-pointer flex items-center gap-1 text-[10px] font-bold mt-0.5"
            title="Toque para forçar envio em segundo plano"
          >
            {syncInfo.syncInProgress ? (
              <span className="text-blue-400 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Enviando em segundo plano...</span>
              </span>
            ) : syncInfo.totalPendentes > 0 ? (
              <span className="text-amber-400 flex items-center gap-1 bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-800/60">
                <Cloud className="w-2.5 h-2.5" />
                <span>{syncInfo.totalPendentes} salvo(s) offline (aguardando net)</span>
              </span>
            ) : syncInfo.isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                <span>Salvo e sincronizado</span>
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <CloudOff className="w-2.5 h-2.5" />
                <span>Modo Offline (Salvo no aparelho)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => onMudarAba('campo')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            abaAtual === 'campo'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar</span>
          <span className="sm:hidden">Campo</span>
        </button>

        <button
          type="button"
          onClick={() => onMudarAba('mapa')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all relative ${
            abaAtual === 'mapa'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Mapa</span>
          {totalArmadilhas > 0 && (
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded-full font-extrabold text-emerald-300">
              {totalArmadilhas}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onMudarAba('laboratorio')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            abaAtual === 'laboratorio'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Laboratório</span>
          <span className="sm:hidden">Lab</span>
        </button>

        <button
          type="button"
          onClick={() => onMudarAba('admin')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
            abaAtual === 'admin'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="hidden sm:inline">Admin</span>
          <span className="sm:hidden">Adm</span>
        </button>
      </nav>

      {/* SOM MUTE / UNMUTE */}
      <button
        type="button"
        onClick={onToggleMute}
        className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-colors ml-1"
        title={isMuted ? 'Ativar som' : 'Silenciar som'}
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
      </button>
    </header>
  );
}
