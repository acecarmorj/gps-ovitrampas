import React from 'react';
import {
  PlusCircle, Map as MapIcon, FlaskConical,
  ShieldCheck, RefreshCw, Volume2, VolumeX,
  ChevronRight, Check, Cloud, CloudOff,
  MessageCircle
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

  // Envio ultra simples do link do Agente pelo WhatsApp
  const handleEnviarWhatsAppAgente = (e) => {
    e.stopPropagation();
    const urlCampo = 'https://gps-ovitrampas.pages.dev/campo';
    const texto = [
      '🪤 *GPS OVITRAMPAS - CARMO/RJ*',
      '',
      'Olá, Agente! Acesse o app de instalação de ovitrampas pelo link:',
      urlCampo,
      '',
      '✅ Endereço e quarteirão automáticos via GPS',
      '✅ Funciona mesmo sem internet (Offline)'
    ].join('\n');

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const MODULOS = [
    {
      rota: '/campo',
      tag: 'Agente em Campo',
      tagCor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icone: PlusCircle,
      iconeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      titulo: 'Instalar Ovitrampa',
      descricao: 'Cadastro em 5 segundos no celular: GPS automático, número da OV e palheta. Sem burocracia e 100% offline.',
      destaque: true,
      temWhatsApp: true
    },
    {
      rota: '/mapa',
      tag: 'Monitoramento',
      tagCor: 'bg-blue-50 text-blue-800 border-blue-200',
      icone: MapIcon,
      iconeBg: 'bg-blue-100 text-blue-700 border-blue-200',
      titulo: 'Mapa de Armadilhas',
      descricao: 'Visualização geográfica de Carmo, malha de distâncias ideais (300m a 400m) e rotas.'
    },
    {
      rota: '/laboratorio',
      tag: 'Entomologia',
      tagCor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      icone: FlaskConical,
      iconeBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      titulo: 'Laboratório de Ovos',
      descricao: 'Contagem de ovos por palheta e cálculo instantâneo de armadilhas positivas e negativas.'
    },
    {
      rota: '/admin',
      tag: 'Coordenação no Tablet / PC',
      tagCor: 'bg-amber-50 text-amber-800 border-amber-200',
      icone: ShieldCheck,
      iconeBg: 'bg-amber-100 text-amber-700 border-amber-200',
      titulo: 'Painel do Administrador',
      descricao: 'Mapa + Tabela integrados, edição e remoção de armadilhas, IPO/IDO e relatório oficial em PDF.'
    }
  ];

  return (
    <div className="w-full h-full min-h-[100dvh] bg-[#F1F2F5] text-slate-900 flex flex-col justify-between overflow-y-auto font-sans select-none">
      
      {/* 1. CABEÇALHO CLEAN (ESTILO MOTOJA) */}
      <header className="bg-white/95 border-b border-slate-200/90 backdrop-blur-md px-4 sm:px-8 py-5 shrink-0 shadow-xs">
        <div className="max-w-3xl mx-auto space-y-3.5">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl shadow-xs">
                🪤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
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

            <button
              type="button"
              onClick={onToggleMute}
              className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl transition-colors shadow-xs"
              title={isMuted ? 'Ativar som' : 'Silenciar som'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>

          <div className="pt-0.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {saudacao}! Selecione o que deseja acessar:
            </h1>
          </div>

          {/* BARRA DE SINCRONIZAÇÃO MINIMALISTA */}
          <div
            onClick={onForcarSync}
            className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer hover:bg-white hover:border-slate-300 transition-all shadow-xs group"
            title="Toque para sincronizar"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {syncInfo.syncInProgress ? (
                    'Sincronizando...'
                  ) : syncInfo.isOnline ? (
                    'Nuvem Conectada (D1)'
                  ) : (
                    'Modo Offline'
                  )}
                </span>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="text-slate-500">
                  <strong className="text-slate-900">{totalArmadilhas}</strong> armadilha(s)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-700 text-xs font-semibold">
              <span className="text-[11px] hidden sm:inline">Atualizar</span>
              <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.syncInProgress ? 'animate-spin text-blue-600' : ''}`} />
            </div>
          </div>

        </div>
      </header>

      {/* 2. OS 4 CARDS PRINCIPAIS - SUPER SIMPLES E DIRETOS */}
      <main className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-3 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODULOS.map((item) => {
            const Icone = item.icone;
            return (
              <div
                key={item.rota}
                onClick={() => onNavegar(item.rota)}
                className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all active:scale-[0.99] flex flex-col justify-between gap-3 group shadow-xs hover:shadow-md ${
                  item.destaque
                    ? 'bg-gradient-to-br from-emerald-50/70 via-white to-white border-emerald-300/80 hover:border-emerald-500'
                    : 'bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs ${item.iconeBg}`}>
                      <Icone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block mb-0.5 ${item.tagCor}`}>
                        {item.tag}
                      </span>
                      <h2 className="text-base font-black text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                        {item.titulo}
                      </h2>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-800 group-hover:bg-slate-200 transition-all shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-snug">
                  {item.descricao}
                </p>

                {/* BOTÃO ÚNICO E ULTRA SIMPLES: SÓ PARA O APP DO AGENTE */}
                {item.temWhatsApp && (
                  <div className="pt-2 border-t border-emerald-100/90 mt-0.5">
                    <button
                      type="button"
                      onClick={handleEnviarWhatsAppAgente}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all"
                      title="Enviar link do aplicativo para o WhatsApp do Agente"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Enviar App para o Agente (WhatsApp)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 3. RODAPÉ INSTITUCIONAL */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 px-4 text-center shrink-0 space-y-1">
        <p className="text-xs text-slate-500 font-medium">
          Prefeitura Municipal de Carmo - RJ • Vigilância em Saúde Ambiental
        </p>
        <DevCredit className="text-slate-400" />
      </footer>

    </div>
  );
}
