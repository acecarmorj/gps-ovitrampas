import React from 'react';
import {
  PlusCircle, Map as MapIcon, FlaskConical,
  ShieldCheck, RefreshCw, Volume2, VolumeX,
  ChevronRight, Check, Cloud, CloudOff
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
          tagCor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icone: PlusCircle,
          iconeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          titulo: 'Instalar Ovitrampa',
          descricao: 'Cadastro em 5 segundos: endereço automático via GPS, Nº da OV e palheta. Sem burocracia, 100% offline.',
          destaque: true
        },
        {
          rota: '/mapa',
          tag: 'Monitoramento',
          tagCor: 'bg-blue-50 text-blue-700 border-blue-200',
          icone: MapIcon,
          iconeBg: 'bg-blue-50 text-blue-600 border-blue-200',
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
          tagCor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icone: FlaskConical,
          iconeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
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
          tagCor: 'bg-amber-50 text-amber-700 border-amber-200',
          icone: ShieldCheck,
          iconeBg: 'bg-amber-50 text-amber-600 border-amber-200',
          titulo: 'Painel do Administrador',
          descricao: 'Mapa + Tabela integrados em tempo real, cálculo oficial de IPO e IDO e exportação completa para Excel.'
        }
      ]
    }
  ];

  return (
    <div className="w-full h-full min-h-[100dvh] bg-[#F1F2F5] text-slate-900 flex flex-col justify-between overflow-y-auto font-sans select-none">
      
      {/* 1. CABEÇALHO CLEAN E SUAVE (ESTILO MOTOJA /GUIA) */}
      <header className="bg-white/95 border-b border-slate-200/90 backdrop-blur-md px-4 sm:px-8 py-6 shrink-0 shadow-xs">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* TOPO: LOGO, BADGE CARMO E SOM */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl shadow-xs">
                🪤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                    GPS OVITRAMPAS
                  </span>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    CARMO RJ
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Vigilância Entomológica de <i>Aedes aegypti</i>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl transition-colors shadow-xs"
                title={isMuted ? 'Ativar som' : 'Silenciar som'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>
          </div>

          {/* SAUDAÇÃO E TÍTULO PRINCIPAL */}
          <div className="pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{saudacao}! Guia do Sistema</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Painel unificado de navegação com acesso direto aos módulos de campo, monitoramento, entomologia e gestão municipal.
            </p>
          </div>

          {/* BARRA DE STATUS DE REDE / SINCRONIZAÇÃO E TOTAL DE ARMADILHAS */}
          <div
            onClick={onForcarSync}
            className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all shadow-xs group"
            title="Toque para forçar sincronização com o banco remoto"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  {syncInfo.syncInProgress ? (
                    <span className="text-blue-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando com nuvem...
                    </span>
                  ) : syncInfo.totalPendentes > 0 ? (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Cloud className="w-3 h-3" /> {syncInfo.totalPendentes} pendente(s) de envio
                    </span>
                  ) : syncInfo.isOnline ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Dados sincronizados em nuvem (Cloudflare D1)
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <CloudOff className="w-3 h-3" /> Modo Offline ativo (dados salvos no aparelho)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  <strong className="text-slate-900">{totalArmadilhas}</strong> armadilha(s) cadastrada(s) no município de Carmo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-500 group-hover:text-emerald-700 text-xs font-semibold">
              <span className="hidden sm:inline text-[11px]">Sincronizar</span>
              <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.syncInProgress ? 'animate-spin text-blue-600' : ''}`} />
            </div>
          </div>

        </div>
      </header>

      {/* 2. SEÇÕES COM OS CARDS SEPARADOS (GRID RESPONSIVO CLEAN) */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-8 flex-1">
        {SECOES.map((secao) => (
          <section key={secao.titulo} className="space-y-3">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-700 tracking-wider uppercase">
                {secao.titulo}
              </h2>
              <p className="text-xs text-slate-500">
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
                    className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between gap-4 group shadow-xs hover:shadow-md ${
                      item.destaque
                        ? 'bg-gradient-to-r from-emerald-50/70 via-white to-white border-emerald-200/90 hover:border-emerald-400'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
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
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                          {item.titulo}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                          {item.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-800 group-hover:bg-slate-200 transition-all shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* 3. RODAPÉ INSTITUCIONAL CLEAN (PADRÃO MOTOJA) */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-5 px-4 text-center shrink-0 space-y-1.5">
        <p className="text-xs text-slate-500 font-medium">
          Prefeitura Municipal de Carmo - RJ • Vigilância em Saúde Ambiental
        </p>
        <DevCredit className="text-slate-400" />
      </footer>

    </div>
  );
}
