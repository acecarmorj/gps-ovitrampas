import React from 'react';
import {
  PlusCircle, Map as MapIcon, FlaskConical,
  ShieldCheck, RefreshCw, Volume2, VolumeX,
  ChevronRight, ArrowUpRight, Check, Cloud, CloudOff,
  MapPin, Activity, Sparkles
} from 'lucide-react';
import { DevCredit } from '../../components/DevCredit';

function greetingNow() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function GuiaScreen({
  onNavegar,
  totalArmadilhas = 0,
  syncInfo = { isOnline: true, syncInProgress: false, totalPendentes: 0 },
  onForcarSync,
  isMuted,
  onToggleMute
}) {
  const saudacao = greetingNow();

  const SECOES = [
    {
      titulo: 'Operação em Campo',
      subtitulo: 'Acesso rápido para o Agente de Combate a Endemias registrar e consultar armadilhas.',
      itens: [
        {
          rota: '/campo',
          tag: 'Agente em Campo',
          tagCor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icone: PlusCircle,
          iconeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          titulo: 'Instalar Ovitrampa',
          descricao: 'Cadastro em 5 segundos: endereço automático via GPS, Nº da OV e palheta. Sem burocracia, 100% offline.',
          destaque: true
        },
        {
          rota: '/mapa',
          tag: 'Monitoramento',
          tagCor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icone: MapIcon,
          iconeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          titulo: 'Mapa de Armadilhas',
          descricao: 'Visualização geográfica de Carmo, status de 5 dias (ativa ou aguardando recolhimento) e traçado de rotas.'
        }
      ]
    },
    {
      titulo: 'Entomologia & Leitura',
      subtitulo: 'Contagem de ovos e análise biológica das palhetas recolhidas em campo.',
      itens: [
        {
          rota: '/laboratorio',
          tag: 'Laboratório',
          tagCor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          icone: FlaskConical,
          iconeBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
          titulo: 'Laboratório de Ovos',
          descricao: 'Contagem simplificada (+ / -) de ovos por palheta, cálculo instantâneo de positividade e vinculação direta.'
        }
      ]
    },
    {
      titulo: 'Coordenação & Gestão',
      subtitulo: 'Acompanhamento estratégico, vigilância epidemiológica e indicadores municipais.',
      itens: [
        {
          rota: '/admin',
          tag: 'Coordenação Municipal',
          tagCor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icone: ShieldCheck,
          iconeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          titulo: 'Painel do Administrador',
          descricao: 'Mapa + Tabela integrados em tempo real, cálculo oficial de IPO e IDO e exportação completa para Excel.'
        }
      ]
    }
  ];

  return (
    <div className="w-full h-full min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto font-sans select-none">
      
      {/* 1. CABEÇALHO MODERNO DO GUIA (ESTILO MOTOJA /GUIA) */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-8 py-6 shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* TOPO: LOGO, BADGE CARMO E SOM */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-lg shadow-emerald-950/60">
                🪤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-xl font-black text-white tracking-tight">
                    GPS OVITRAMPAS
                  </span>
                  <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                    CARMO RJ
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Vigilância Entomológica de <i>Aedes aegypti</i>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-2.5 text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 rounded-2xl transition-colors shadow-sm"
                title={isMuted ? 'Ativar som' : 'Silenciar som'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* SAUDAÇÃO E TÍTULO PRINCIPAL */}
          <div className="pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{saudacao}! Guia do Sistema</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Painel unificado de navegação com acesso direto aos módulos de campo, monitoramento, entomologia e gestão municipal.
            </p>
          </div>

          {/* BARRA DE STATUS DE REDE / SINCRONIZAÇÃO E TOTAL DE ARMADILHAS */}
          <div
            onClick={onForcarSync}
            className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors shadow-sm group"
            title="Toque para forçar sincronização com o banco remoto"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  {syncInfo.syncInProgress ? (
                    <span className="text-blue-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando com nuvem...
                    </span>
                  ) : syncInfo.totalPendentes > 0 ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Cloud className="w-3 h-3" /> {syncInfo.totalPendentes} pendente(s) de sincronização
                    </span>
                  ) : syncInfo.isOnline ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Dados sincronizados em nuvem (Cloudflare D1)
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <CloudOff className="w-3 h-3" /> Modo Offline ativo (dados salvos no aparelho)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <strong className="text-slate-200">{totalArmadilhas}</strong> armadilha(s) cadastrada(s) no município de Carmo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-400 text-xs font-semibold">
              <span className="hidden sm:inline text-[11px]">Sincronizar</span>
              <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.syncInProgress ? 'animate-spin text-blue-400' : ''}`} />
            </div>
          </div>

        </div>
      </header>

      {/* 2. SEÇÕES COM OS CARDS SEPARADOS (GRID RESPONSIVO) */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-8 flex-1">
        {SECOES.map((secao) => (
          <section key={secao.titulo} className="space-y-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-wide uppercase text-slate-300">
                {secao.titulo}
              </h2>
              <p className="text-xs text-slate-400">
                {secao.subtitulo}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {secao.itens.map((item) => {
                const Icone = item.icone;
                return (
                  <div
                    key={item.rota}
                    onClick={() => onNavegar(item.rota)}
                    className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between gap-4 group shadow-lg ${
                      item.destaque
                        ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 hover:border-emerald-400/80 shadow-emerald-950/20'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center shrink-0 ${item.iconeBg}`}>
                        <Icone className="w-6 h-6" />
                      </div>

                      <div className="min-w-0">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block mb-1 ${item.tagCor}`}>
                          {item.tag}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-emerald-300 transition-colors">
                          {item.titulo}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
                          {item.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-slate-700/80 group-hover:translate-x-0.5 transition-all shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* 3. RODAPÉ INSTITUCIONAL COM ASSINATURA (PADRÃO MOTOJA) */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-5 px-4 text-center shrink-0 space-y-1.5">
        <p className="text-xs text-slate-400 font-medium">
          Prefeitura Municipal de Carmo - RJ • Vigilância em Saúde Ambiental
        </p>
        <DevCredit />
      </footer>

    </div>
  );
}
