import React from 'react';
import {
  ChevronLeft, Volume2, VolumeX,
  Cloud, CloudOff, RefreshCw, Check
} from 'lucide-react';

const INFO_MODULOS = {
  campo: {
    titulo: 'Instalar Ovitrampa',
    subtitulo: 'Campo • Agente de Endemias'
  },
  mapa: {
    titulo: 'Mapa de Armadilhas',
    subtitulo: 'Monitoramento & Rotas'
  },
  laboratorio: {
    titulo: 'Laboratório de Ovos',
    subtitulo: 'Contagem de Palhetas'
  },
  admin: {
    titulo: 'Painel do Administrador',
    subtitulo: 'Gestão Municipal & Indicadores'
  }
};

export function Header({
  abaAtual,
  onMudarAba,
  totalArmadilhas = 0,
  isMuted,
  onToggleMute,
  syncInfo = { isOnline: true, syncInProgress: false, totalPendentes: 0 },
  onForcarSync
}) {
  const modulo = INFO_MODULOS[abaAtual] || { titulo: 'GPS Ovitrampas', subtitulo: 'Carmo - RJ' };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 z-30 select-none">
      
      {/* BOTÃO VOLTAR AO GUIA (ESTILO MOTOJA /GUIA) */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onMudarAba('guia')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white rounded-2xl border border-slate-700/80 text-xs font-black transition-all shadow-sm group"
          title="Voltar ao Guia do Sistema"
        >
          <ChevronLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Guia</span>
        </button>

        {/* TÍTULO DA TELA ATIVA */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-black text-white leading-tight">
              {modulo.titulo}
            </h1>
            <span className="text-[9px] text-emerald-400 font-extrabold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800 hidden sm:inline-block">
              CARMO RJ
            </span>
          </div>

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
                <span>{syncInfo.totalPendentes} pendente(s)</span>
              </span>
            ) : syncInfo.isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                <span>Salvo e sincronizado</span>
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <CloudOff className="w-2.5 h-2.5" />
                <span>Modo Offline</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* LADO DIREITO: TOTAL DE ARMADILHAS E CONTROLE DE SOM */}
      <div className="flex items-center gap-2">
        {totalArmadilhas > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-[11px] font-bold text-slate-300">
            <span>Armadilhas:</span>
            <span className="text-emerald-400 font-extrabold">{totalArmadilhas}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-colors border border-slate-700/50"
          title={isMuted ? 'Ativar som' : 'Silenciar som'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

    </header>
  );
}
