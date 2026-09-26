import React from 'react';
import {
  ChevronLeft, Volume2, VolumeX,
  Cloud, CloudOff, RefreshCw, Check, AlertTriangle
} from 'lucide-react';
import { SeletorCicloPalheta } from './SeletorCicloPalheta';

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
  },
  planejamento: {
    titulo: 'Mapa de Planejamento das Ações',
    subtitulo: 'Planejamento Geoespacial & Otimização de Rotas'
  },
  'cenario-ideal': {
    titulo: 'Mapa de Planejamento das Ações',
    subtitulo: 'Planejamento Geoespacial & Otimização de Rotas'
  }
};

export function Header({
  abaAtual,
  onMudarAba,
  totalArmadilhas = 0,
  isMuted,
  onToggleMute,
  syncInfo = { isOnline: true, syncInProgress: false, totalPendentes: 0 },
  onForcarSync,
  cicloAtivo,
  onMudarCiclo
}) {
  const modulo = INFO_MODULOS[abaAtual] || { titulo: 'GPS Ovitrampas', subtitulo: 'Carmo - RJ' };

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs flex items-center justify-between px-3 sm:px-4 shrink-0 z-30 select-none text-slate-900">
      
      {/* BOTÃO VOLTAR AO GUIA (ESTILO MOTOJA /GUIA) */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onMudarAba('guia')}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-2xl border border-slate-200/90 text-xs font-black transition-all shadow-xs group"
          title="Voltar ao Guia do Sistema"
        >
          <ChevronLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Guia</span>
        </button>

        {/* TÍTULO DA TELA ATIVA */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
              {modulo.titulo}
            </h1>
            <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 hidden sm:inline-block">
              CARMO RJ
            </span>
          </div>

          <div
            onClick={onForcarSync}
            className="cursor-pointer flex items-center gap-1 text-[10px] font-bold mt-0.5"
            title="Toque para forçar envio em segundo plano"
          >
            {syncInfo.syncErrors > 0 ? (
              <span className="text-rose-700 flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                <span>{syncInfo.syncErrors} recusado(s) pelo servidor</span>
              </span>
            ) : syncInfo.syncInProgress ? (
              <span className="text-blue-600 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Enviando em segundo plano...</span>
              </span>
            ) : syncInfo.totalPendentes > 0 ? (
              <span className="text-amber-700 flex items-center gap-1 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                <Cloud className="w-2.5 h-2.5" />
                <span>{syncInfo.totalPendentes} pendente(s)</span>
              </span>
            ) : syncInfo.isOnline ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Check className="w-2.5 h-2.5 text-emerald-600" />
                <span>Salvo e sincronizado</span>
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <CloudOff className="w-2.5 h-2.5" />
                <span>Modo Offline</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SELETOR CENTRAL DE CICLOS (PALHETA A, PALHETA B, AMBAS) */}
      {cicloAtivo && onMudarCiclo && abaAtual !== 'campo' && (
        <div className="hidden md:flex items-center">
          <SeletorCicloPalheta
            cicloAtivo={cicloAtivo}
            onMudarCiclo={onMudarCiclo}
            tamanho="compacto"
          />
        </div>
      )}

      {/* LADO DIREITO: TOTAL DE ARMADILHAS E CONTROLE DE SOM */}
      <div className="flex items-center gap-2">
        {totalArmadilhas > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">
            <span>Armadilhas:</span>
            <span className="text-emerald-700 font-extrabold">{totalArmadilhas}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
          title={isMuted ? 'Ativar som' : 'Silenciar som'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
        </button>
      </div>

    </header>
  );
}
