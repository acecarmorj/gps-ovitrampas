import React, { useState } from 'react';
import {
  PlusCircle, Map as MapIcon, FlaskConical,
  ShieldCheck, RefreshCw, Volume2, VolumeX,
  ChevronRight, Check, Cloud, CloudOff,
  MessageCircle, Share2, Copy, ExternalLink,
  Link2, Smartphone, Tablet
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
  const [copiadoKey, setCopiadoKey] = useState(null);

  const urlBase = typeof window !== 'undefined' ? window.location.origin : 'https://gps-ovitrampas.pages.dev';

  const LINKS_DIRETOS = [
    {
      key: 'admin',
      titulo: 'Admin no Tablet',
      subtitulo: 'Coordenação e Gestão Municipal',
      rota: '/admin',
      url: `${urlBase}/admin`,
      icone: ShieldCheck,
      corBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      corIcone: 'bg-amber-100 text-amber-700 border-amber-200',
      descricao: 'Painel executivo com mapa geral, tabela, edição de dados, IPO/IDO e emissão do relatório PDF consolidado.'
    },
    {
      key: 'campo',
      titulo: 'Campo (Instalação)',
      subtitulo: 'Celular do Agente de Endemias (ACE)',
      rota: '/campo',
      url: `${urlBase}/campo`,
      icone: PlusCircle,
      corBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      corIcone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      descricao: 'Instalação rápida em 5 segundos com GPS automático, sem fotos, sem burocracia e 100% offline.'
    },
    {
      key: 'mapa',
      titulo: 'Mapa de Armadilhas',
      subtitulo: 'Monitoramento Territorial',
      rota: '/mapa',
      url: `${urlBase}/mapa`,
      icone: MapIcon,
      corBadge: 'bg-blue-50 text-blue-800 border-blue-200',
      corIcone: 'bg-blue-100 text-blue-700 border-blue-200',
      descricao: 'Visualização geográfica de Carmo/RJ com malha de distâncias ideais entre armadilhas (300m a 400m).'
    },
    {
      key: 'laboratorio',
      titulo: 'Laboratório de Ovos',
      subtitulo: 'Entomologia e Leituras',
      rota: '/laboratorio',
      url: `${urlBase}/laboratorio`,
      icone: FlaskConical,
      corBadge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      corIcone: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      descricao: 'Lançamento ágil da contagem de ovos das palhetas e registro instantâneo de positividade.'
    }
  ];

  const handleCopiarLink = (key, url, e) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiadoKey(key);
      setTimeout(() => setCopiadoKey(null), 2500);
    }
  };

  const handleCompartilharIndividual = (item, e) => {
    if (e) e.stopPropagation();
    const texto = [
      `🪤 *GPS OVITRAMPAS - CARMO/RJ*`,
      ``,
      `Link direto para *${item.titulo}*:`,
      `👉 ${item.url}`,
      ``,
      `_${item.descricao}_`
    ].join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCompartilharTodosWhatsApp = () => {
    const texto = [
      `🪤 *GPS OVITRAMPAS - LINKS OFICIAIS (CARMO/RJ)*`,
      ``,
      `*1. Admin no Tablet:*`,
      `👉 ${urlBase}/admin`,
      ``,
      `*2. Campo (Agentes de Endemias):*`,
      `👉 ${urlBase}/campo`,
      ``,
      `*3. Mapa de Armadilhas:*`,
      `👉 ${urlBase}/mapa`,
      ``,
      `*4. Laboratório de Ovos:*`,
      `👉 ${urlBase}/laboratorio`,
      ``,
      `*Página Inicial:*`,
      `👉 ${urlBase}/`,
      ``,
      `_Prefeitura Municipal de Carmo/RJ • Vigilância em Saúde Ambiental_`
    ].join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(whatsappUrl, '_blank');
  };

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
          descricao: 'Mapa + Tabela integrados em tempo real, cálculo oficial de IPO e IDO, edição de dados e exportação completa.'
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

      {/* 2. ÁREA PRINCIPAL: CENTRAL DE LINKS DIRETOS + SEÇÕES DE CARDS */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-8 flex-1">
        
        {/* ==================================================================== */}
        {/* CENTRAL DE LINKS DIRETOS OFICIAIS (COLOQUE TUDO NA TELA INICIAL)     */}
        {/* ==================================================================== */}
        <section className="bg-white border-2 border-emerald-500/20 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Links Diretos
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Links Oficiais de Acesso Rápido
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Copie ou envie os links diretos para a equipe no WhatsApp ou salve na tela inicial do aparelho.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompartilharTodosWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black px-3.5 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
              title="Compartilhar lista de links no WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Todos no WhatsApp</span>
            </button>
          </div>

          {/* Grade com os links individuais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LINKS_DIRETOS.map((item) => {
              const Icone = item.icone;
              const isCopiado = copiadoKey === item.key;
              return (
                <div
                  key={item.key}
                  className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${item.corIcone}`}>
                        <Icone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                            {item.titulo}
                          </h3>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${item.corBadge}`}>
                            {item.subtitulo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Caixinha do link com botões de ação */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5">
                    <span className="text-[11px] font-mono text-slate-600 font-semibold px-2 truncate flex-1 select-all">
                      {item.url}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleCopiarLink(item.key, item.url, e)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0 ${
                        isCopiado
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="Copiar endereço do link"
                    >
                      {isCopiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiado ? 'Copiado!' : 'Copiar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCompartilharIndividual(item, e)}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors shrink-0"
                      title="Enviar este link no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavegar(item.rota)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 active:scale-95"
                      title="Abrir esta tela agora"
                    >
                      <span>Abrir</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* CARDS VISUAIS DOS MÓDULOS DE NAVEGAÇÃO                               */}
        {/* ==================================================================== */}
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
                    className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between gap-3 group shadow-xs hover:shadow-md ${
                      item.destaque
                        ? 'bg-gradient-to-r from-emerald-50/70 via-white to-white border-emerald-200/90 hover:border-emerald-400'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${item.iconeBg}`}>
                          <Icone className="w-6 h-6" />
                        </div>

                        <div className="min-w-0">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block mb-0.5 ${item.tagCor}`}>
                            {item.tag}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                            {item.titulo}
                          </h3>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-800 group-hover:bg-slate-200 transition-all shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-snug">
                      {item.descricao}
                    </p>

                    {item.rota === '/campo' && (
                      <div className="pt-2.5 border-t border-emerald-100 mt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const itemCampo = LINKS_DIRETOS.find(l => l.key === 'campo');
                            if (itemCampo) handleCompartilharIndividual(itemCampo, e);
                          }}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs transition-all"
                          title="Compartilhar link de campo no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Enviar link para o Agente (WhatsApp)</span>
                        </button>
                      </div>
                    )}
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
