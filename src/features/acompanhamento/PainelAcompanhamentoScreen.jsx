import React, { useState, useEffect } from 'react';
import {
  MapPin, Navigation, Calendar, CheckCircle2,
  AlertTriangle, X, Search, Filter, Trash2,
  ExternalLink, Layers, Eye, FlaskConical, Clock, RotateCw
} from 'lucide-react';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { SeletorAgenteModal } from '../../components/SeletorAgenteModal';
import { getMeuAgente } from '../../lib/agentLiveTracking';
import { Users, User, Radio, Tag, EyeOff } from 'lucide-react';
import { excluirArmadilha, trocarPalhetaArmadilha } from '../../lib/storage';
import { calcularSituacaoArmadilha } from '../../lib/situacaoOvitrampa';
import { findNearbyTraps } from '../../lib/geoDistance';

// Sugere o codigo da proxima palheta como numero-da-armadilha + letra do
// ciclo (ex: armadilha 35 -> 35A no 1o ciclo, 35B no 2o...). Sem barra "/"
// de proposito: em papel a lapis sob sol, "/" borra e vira 1 ou 7. A letra
// nao se confunde com os digitos do numero, e o numero da armadilha vai
// junto na palheta - essencial pra rastrear ela solta na bancada.
function sugerirProximaPalheta(armadilha) {
  const numero = armadilha?.numero || '';
  const numInt = parseInt(numero, 10);
  const atual = String(armadilha?.palheta || '').trim().toUpperCase();
  const regex = Number.isNaN(numInt)
    ? new RegExp(`^${numero}([A-Z]+)$`)
    : new RegExp(`^(?:${numero}|0*${numInt})([A-Z]+)$`);
  const match = atual.match(regex);
  if (match) {
    const letras = match[1].split('');
    let i = letras.length - 1;
    while (i >= 0) {
      if (letras[i] !== 'Z') {
        letras[i] = String.fromCharCode(letras[i].charCodeAt(0) + 1);
        break;
      }
      letras[i] = 'A';
      i -= 1;
    }
    if (i < 0) letras.unshift('A');
    return `${numero}${letras.join('')}`;
  }
  return `${numero}A`;
}

export function PainelAcompanhamentoScreen({
  armadilhas = [],
  userPos,
  outrosAgentes = [],
  onExcluirArmadilha,
  onIrParaLaboratorio
}) {
  const [selecionada, setSelecionada] = useState(null);
  const [agenteSelecionado, setAgenteSelecionado] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas'); // 'todas' | 'instalada' | 'analisada'
  const [mostrarLista, setMostrarLista] = useState(false);
  const [mostrarColegas, setMostrarColegas] = useState(false);
  const [mostrarRotulos, setMostrarRotulos] = useState(true);
  const [mostrarPainelFlutuante, setMostrarPainelFlutuante] = useState(true);
  const [modalSeletorAberto, setModalSeletorAberto] = useState(false);
  const [modalTrocaPalhetaAberto, setModalTrocaPalhetaAberto] = useState(false);
  const [armadilhaParaTroca, setArmadilhaParaTroca] = useState(null);
  const [meuAgente, setMeuAgenteState] = useState(getMeuAgente);

  useEffect(() => {
    const handleAgenteAlterado = (e) => {
      if (e.detail) setMeuAgenteState(e.detail);
    };
    window.addEventListener('ovitrampas_agente_alterado', handleAgenteAlterado);
    return () => window.removeEventListener('ovitrampas_agente_alterado', handleAgenteAlterado);
  }, []);

  // Filtragem
  const armadilhasFiltradas = armadilhas.filter((arm) => {
    const matchTexto =
      !filtroTexto.trim() ||
      arm.numero.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (arm.rua && arm.rua.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (arm.microarea && arm.microarea.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (arm.quarteirao && arm.quarteirao.toLowerCase().includes(filtroTexto.toLowerCase()));

    const matchStatus =
      filtroStatus === 'todas' ||
      (filtroStatus === 'analisada' && arm.status === 'analisada') ||
      (filtroStatus === 'instalada' && arm.status !== 'analisada');

    return matchTexto && matchStatus;
  });

  const totalArmadilhas = armadilhas.length;
  const totalAnalisadas = armadilhas.filter((a) => a.status === 'analisada').length;
  const totalPositivas = armadilhas.filter((a) => a.ultimosOvos && a.ultimosOvos > 0).length;

  const handleAbrirGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleAbrirWaze = (lat, lng) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };

  const handleExcluir = async (id, numero) => {
    if (window.confirm(`Tem certeza que deseja remover a armadilha ARM-${numero}?`)) {
      await excluirArmadilha(id);
      if (selecionada?.id === id) setSelecionada(null);
      if (onExcluirArmadilha) onExcluirArmadilha(id);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden font-sans select-none">
      {/* 1. MAPA DE CARMO EM TELA CHEIA */}
      <div className="absolute inset-0 z-0">
        <MapaGrandeOvitrampa
          userPos={userPos}
          armadilhas={armadilhasFiltradas}
          armadilhaSelecionada={selecionada}
          onSelectArmadilha={(arm) => {
            setSelecionada(arm);
            setAgenteSelecionado(null);
          }}
          mostrarTodosPontos={true}
          controlTop={mostrarPainelFlutuante ? 108 : 16}
          showLabels={mostrarRotulos}
          onToggleLabels={() => setMostrarRotulos((prev) => !prev)}
          showPanel={mostrarPainelFlutuante}
          onTogglePanel={() => setMostrarPainelFlutuante((prev) => !prev)}
          outrosAgentes={outrosAgentes}
          agenteSelecionado={agenteSelecionado}
          onSelectAgente={(ag) => {
            setAgenteSelecionado(ag);
            setSelecionada(null);
          }}
        />
      </div>

      {/* 2. BARRA MINIMALISTA QUANDO JANELA ESTIVER OCULTA */}
      {!mostrarPainelFlutuante && (
        <div className="absolute top-2.5 left-3 z-20 flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setMostrarPainelFlutuante(true)}
            className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-slate-800 text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 hover:bg-slate-50 transition-all"
            title="Mostrar janela de dados flutuante"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Janela de Dados ({totalArmadilhas} OVs)</span>
          </button>
        </div>
      )}

      {/* 2. TOPO FLUTUANTE: RESUMO E BUSCA (OTIMIZADO PARA TABLET SAMSUNG E MOBILE) */}
      {mostrarPainelFlutuante && (
      <div className="absolute top-2.5 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none max-w-lg md:max-w-2xl mx-auto">
        {/* Resumo Rápido */}
        <div className="bg-white/95 backdrop-blur-md text-slate-800 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/10 flex items-center justify-between pointer-events-auto text-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Armadilhas</span>
              <span className="font-black text-slate-900 text-sm sm:text-base">{totalArmadilhas}</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Lidas (Lab)</span>
              <span className="font-black text-blue-600 text-sm sm:text-base">{totalAnalisadas}</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Positivas</span>
              <span className="font-black text-rose-600 text-sm sm:text-base">{totalPositivas}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Seletor do meu crachá ACE */}
            <button
              type="button"
              onClick={() => setModalSeletorAberto(true)}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 px-2 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95"
              title="Clique para alterar seu crachá (ACE 1, ACE 2...)"
            >
              <User className="w-3 h-3 text-blue-600" />
              <span>{meuAgente.label}</span>
              <span className="text-[9px] text-blue-500">▾</span>
            </button>

            {/* Colegas em campo */}
            <button
              type="button"
              onClick={() => setMostrarColegas(!mostrarColegas)}
              className={`font-black text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                mostrarColegas || outrosAgentes.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title="Ver colegas em tempo real no mapa"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{outrosAgentes.length}</span>
            </button>

            {/* Ocultar janela flutuante */}
            <button
              type="button"
              onClick={() => setMostrarPainelFlutuante(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs px-2 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-xs active:scale-95"
              title="Ocultar janela flutuante para ver o mapa limpo"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ocultar</span>
            </button>

            {/* Ver lista de armadilhas */}
            <button
              type="button"
              onClick={() => setMostrarLista(!mostrarLista)}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mostrarLista ? 'Ocultar' : 'Lista'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtro de Status */}
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/10 flex items-center gap-2 pointer-events-auto">
          <div className="flex-1 flex items-center gap-2 bg-slate-50/90 px-3 py-2 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar Nº, morador, rua ou quarteirão..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none w-full font-medium"
            />
            {filtroTexto && (
              <button onClick={() => setFiltroTexto('')}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
              </button>
            )}
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-slate-50/90 border border-slate-200 text-slate-800 text-xs font-bold px-2.5 py-2 rounded-xl focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="instalada">Sem Leitura</option>
            <option value="analisada">Lidas</option>
          </select>
        </div>
      </div>
      )}

      {/* 3. MODAL DE LISTA DE ARMADILHAS (LADO DIREITO NO TABLET / CENTRAL NO MOBILE) */}
      {mostrarLista && (
        <div className="absolute top-28 left-3 right-3 bottom-20 md:top-24 md:left-auto md:right-4 md:bottom-6 md:w-[440px] md:max-w-none z-30 max-w-lg mx-auto bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl p-4 flex flex-col pointer-events-auto overflow-hidden text-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Armadilhas Registradas ({armadilhasFiltradas.length})
            </h3>
            <button
              onClick={() => setMostrarLista(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {armadilhasFiltradas.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">Nenhuma armadilha encontrada com esses filtros.</p>
            ) : (
              armadilhasFiltradas.map((arm) => (
                <div
                  key={arm.id}
                  onClick={() => {
                    setSelecionada(arm);
                    setMostrarLista(false);
                  }}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-emerald-500/50 p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-700 text-sm">ARM-{arm.numero}</span>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                        {arm.quarteirao}
                      </span>
                      {arm.status === 'analisada' && (
                        <span className="text-[10px] bg-blue-100 border border-blue-200 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          {arm.ultimosOvos} ovos
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {arm.moradorNome ? <span className="font-bold text-slate-900 mr-1.5">{arm.moradorNome} •</span> : ''}
                      {arm.rua} {arm.numeroImovel ? `Nº ${arm.numeroImovel}` : ''} • {arm.microarea}
                    </p>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. CARD FLUTUANTE DE DETALHES DA ARMADILHA SELECIONADA (FLUTUA À DIREITA NO TABLET) */}
      {selecionada && (() => {
        const vizinhasMaisProximas = findNearbyTraps(selecionada, armadilhas, 3, selecionada.id);
        const sit = calcularSituacaoArmadilha(selecionada);

        return (
          <div className="absolute left-0 right-0 bottom-0 md:left-auto md:right-4 md:top-24 md:bottom-auto md:w-[410px] md:max-w-none md:p-0 z-30 p-2.5 sm:p-4 max-w-lg mx-auto w-full pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/15 border border-white/80 p-4 space-y-3 pointer-events-auto max-h-[75dvh] md:max-h-[82vh] overflow-y-auto text-slate-800">
              
              {/* Cabeçalho do Card */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>ARMADILHA ARM-{selecionada.numero}</span>
                      <span className={`text-[10px] ${sit.corBg} border ${sit.corBorda} ${sit.corTexto} font-black px-2 py-0.5 rounded-full`}>
                        {sit.titulo}
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelecionada(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informações de Localização */}
              <div className="space-y-2 text-xs">
                {selecionada.moradorNome && (
                  <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Morador(a):</span>
                    <span className="text-xs font-black text-slate-900">{selecionada.moradorNome}</span>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900 text-xs">
                      {selecionada.rua} {selecionada.numeroImovel ? `Nº ${selecionada.numeroImovel}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {selecionada.microarea} • Quarteirão: <span className="text-emerald-700 font-extrabold">{selecionada.quarteirao}</span>
                    </p>
                  </div>
                </div>

                {/* IDENTIFICAÇÃO DA PALHETA ATUAL */}
                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] uppercase font-bold text-slate-500">Palheta em Campo:</span>
                  </div>
                  <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {selecionada.palheta || 'P-01'}
                  </span>
                </div>

                {/* CICLO OFICIAL DE 6 DIAS */}
                <div className="flex flex-col gap-1.5 text-[11px] text-slate-600 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Instalação:
                    </span>
                    <span className="font-bold text-slate-800">
                      {new Date(selecionada.instaladaEm).toLocaleDateString('pt-BR')} ({new Date(selecionada.instaladaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Troca da Palheta (6 dias):
                    </span>
                    <span className="font-black text-emerald-700">
                      {sit.dataPrevistaFormatada || 'N/D'} ({sit.diaSemana || ''})
                    </span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border ${sit.corBorda} ${sit.corBg} text-[11px]`}>
                  <span className={`font-black ${sit.corTexto} block mb-0.5`}>Situação da OV: {sit.titulo}</span>
                  <p className="text-slate-700 text-[10px] leading-relaxed">{sit.descricao}</p>
                </div>

                {/* DISTÂNCIAS DAS 3 OVs VIZINHAS MAIS PRÓXIMAS (DIRETRIZ 300m - 400m) */}
                {vizinhasMaisProximas.length > 0 && (
                  <div className="bg-slate-50/95 rounded-2xl p-2.5 border border-slate-200/90 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        3 OVs Mais Próximas (Regra 300m-400m)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Toque p/ focar</span>
                    </div>

                    <div className="space-y-1.5">
                      {vizinhasMaisProximas.map((viz) => (
                        <button
                          type="button"
                          key={viz.armadilha.id}
                          onClick={() => setSelecionada(viz.armadilha)}
                          className="w-full text-left flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all cursor-pointer group shadow-2xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs text-emerald-700 group-hover:text-emerald-800">
                                ARM-{viz.armadilha.numero}
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1 rounded">
                                {viz.armadilha.quarteirao}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 truncate mt-0.5">
                              {viz.armadilha.moradorNome || viz.armadilha.rua || 'S/N'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-0.5">
                            <span className="font-black text-xs text-slate-900">
                              {viz.distancia} m
                            </span>
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                              style={{
                                backgroundColor: viz.corFundo,
                                borderColor: viz.corBorda,
                                color: viz.cor
                              }}
                            >
                              {viz.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selecionada.observacoes && (
                  <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold">Obs:</span> {selecionada.observacoes}
                  </p>
                )}
              </div>

            {/* BOTÕES DE AÇÃO: ROTA NO MAPS, WAZE, TROCAR PALHETA, LABORATÓRIO E EXCLUIR */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleAbrirGoogleMaps(selecionada.latitude, selecionada.longitude)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => handleAbrirWaze(selecionada.latitude, selecionada.longitude)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-600" />
                <span>Waze</span>
              </button>

              {/* BOTÃO PRINCIPAL: TROCA DE PALHETA (NOVO CICLO 6 DIAS) */}
              <button
                type="button"
                onClick={() => {
                  setArmadilhaParaTroca(selecionada);
                  setModalTrocaPalhetaAberto(true);
                }}
                className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-700/20 active:scale-[0.98]"
              >
                <RotateCw className="w-4 h-4" />
                <span>TROCAR PALHETA (NOVO CICLO 6 DIAS)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onIrParaLaboratorio) onIrParaLaboratorio(selecionada);
                }}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-700/20 active:scale-[0.98]"
              >
                <FlaskConical className="w-4 h-4" />
                <span>LANÇAR LEITURA NO LABORATÓRIO</span>
              </button>

              <button
                type="button"
                onClick={() => handleExcluir(selecionada.id, selecionada.numero)}
                className="col-span-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover esta armadilha</span>
              </button>
            </div>

          </div>
        </div>
      ); })()}

      {/* 2.1. PAINEL FLUTUANTE DE COLEGAS ACE ATIVOS EM TEMPO REAL */}
      {mostrarColegas && (
        <div className="absolute top-28 left-3 right-3 z-30 max-w-md mx-auto bg-white/98 backdrop-blur-md rounded-3xl p-4 border border-blue-200 shadow-2xl space-y-3 animate-in slide-in-from-top-4 duration-200 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Colegas ACE em Tempo Real</h4>
                <p className="text-[10px] text-slate-500">
                  {outrosAgentes.length === 0 ? 'Nenhum outro agente com app aberto agora' : `${outrosAgentes.length} agente(s) ativo(s) na área`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarColegas(false)}
              className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {outrosAgentes.length === 0 ? (
            <div className="text-center py-5 text-slate-400 space-y-1">
              <p className="text-xs font-bold text-slate-600">Nenhum colega ativo no momento</p>
              <p className="text-[10px]">Quando outro agente abrir o aplicativo em Carmo-RJ, ele aparecerá aqui com distância e localização no mapa.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {outrosAgentes.map((ag) => {
                const isSelected = agenteSelecionado && agenteSelecionado.agentId === ag.agentId;
                return (
                  <div
                    key={ag.agentId}
                    onClick={() => {
                      setAgenteSelecionado(ag);
                      setSelecionada(null);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/50'
                        : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{ag.label}</span>
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
                          {ag.bairro || 'Carmo-RJ'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Sinal GPS: {ag.segundosAtras < 60 ? 'Agora há pouco' : `há ${Math.round(ag.segundosAtras / 60)} min`}
                      </div>
                    </div>

                    <div className="text-right">
                      {ag.distanciaMetros != null ? (
                        <div className="text-xs font-black text-blue-700">
                          {ag.distanciaMetros} m
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Calculando...</div>
                      )}
                      <span className="text-[9px] font-bold text-slate-400">
                        {isSelected ? 'Linha no mapa ✓' : 'Tocar para traçar linha'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE TROCA DE PALHETA (MANTÉM O MESMO NÚMERO DE ARMADILHA) */}
      {modalTrocaPalhetaAberto && armadilhaParaTroca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Trocar Palheta — ARM-{armadilhaParaTroca.numero}</h3>
                  <p className="text-[11px] text-slate-500">Mantém ponto GPS, imóvel e morador cadastrados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalTrocaPalhetaAberto(false);
                  setArmadilhaParaTroca(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-blue-50/80 rounded-2xl p-3 border border-blue-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Imóvel:</span>
                <span className="font-bold text-slate-800 text-right">{armadilhaParaTroca.rua || 'S/N'}{armadilhaParaTroca.numeroImovel ? ', Nº ' + armadilhaParaTroca.numeroImovel : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Morador(a):</span>
                <span className="font-bold text-slate-800">{armadilhaParaTroca.moradorNome || 'Não informado'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-blue-200/60">
                <span className="text-slate-500 font-bold">Palheta Atual (recolhida):</span>
                <span className="font-black text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">{armadilhaParaTroca.palheta || 'P-01'}</span>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              const novaPalheta = form.novaPalheta.value.trim();
              const dataTroca = form.dataTroca.value;
              const observacao = form.observacao.value.trim();

              if (!novaPalheta) {
                alert('Informe o código da nova palheta instalada!');
                return;
              }

              const atualizada = await trocarPalhetaArmadilha(armadilhaParaTroca.id, {
                novaPalheta,
                dataTroca: dataTroca ? new Date(dataTroca).toISOString() : new Date().toISOString(),
                observacao
              });

              if (atualizada) {
                setSelecionada(atualizada);
              }
              setModalTrocaPalhetaAberto(false);
              setArmadilhaParaTroca(null);
              alert(`Palheta trocada com sucesso para ${novaPalheta}! Novo ciclo de 6 dias iniciado.`);
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Código da Nova Palheta Instalada *
                </label>
                <input
                  type="text"
                  name="novaPalheta"
                  required
                  defaultValue={sugerirProximaPalheta(armadilhaParaTroca)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: P-02, PL-02"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Data e Hora da Troca (Início do Novo Ciclo de 6 dias)
                </label>
                <input
                  type="datetime-local"
                  name="dataTroca"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Observações da Troca (Opcional)
                </label>
                <input
                  type="text"
                  name="observacao"
                  placeholder="Ex: Palheta recolhida úmida, infusão renovada"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalTrocaPalhetaAberto(false);
                    setArmadilhaParaTroca(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-700/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Confirmar Troca</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SELETOR DE IDENTIFICAÇÃO DE AGENTE (QUEM É VOCÊ?) */}
      <SeletorAgenteModal
        aberto={modalSeletorAberto}
        onClose={() => setModalSeletorAberto(false)}
        onAgenteSelecionado={(novo) => setMeuAgenteState(novo)}
      />

    </div>
  );
}
