import React, { useState, useEffect } from 'react';
import {
  MapPin, Navigation, Calendar, CheckCircle2,
  AlertTriangle, X, Search, Filter, Trash2,
  ExternalLink, Layers, Eye, FlaskConical, Clock
} from 'lucide-react';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { excluirArmadilha } from '../../lib/storage';
import { calcularSituacaoArmadilha } from '../../lib/situacaoOvitrampa';

export function PainelAcompanhamentoScreen({
  armadilhas = [],
  userPos,
  onExcluirArmadilha,
  onIrParaLaboratorio
}) {
  const [selecionada, setSelecionada] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas'); // 'todas' | 'instalada' | 'analisada'
  const [mostrarLista, setMostrarLista] = useState(false);

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
          onSelectArmadilha={(arm) => setSelecionada(arm)}
          mostrarTodosPontos={true}
        />
      </div>

      {/* 2. TOPO FLUTUANTE: RESUMO E BUSCA */}
      <div className="absolute top-2.5 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none max-w-lg mx-auto">
        {/* Resumo Rápido */}
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between pointer-events-auto text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block">Armadilhas</span>
              <span className="font-black text-white text-sm">{totalArmadilhas}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <span className="text-[10px] text-slate-400 block">Lidas (Lab)</span>
              <span className="font-black text-blue-400 text-sm">{totalAnalisadas}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <span className="text-[10px] text-slate-400 block">Positivas</span>
              <span className="font-black text-rose-400 text-sm">{totalPositivas}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMostrarLista(!mostrarLista)}
            className="bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mostrarLista ? 'Ocultar' : 'Lista'}</span>
          </button>
        </div>

        {/* Barra de Busca e Filtro de Status */}
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-2 pointer-events-auto">
          <div className="flex-1 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar Nº, rua ou microárea..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none w-full"
            />
            {filtroTexto && (
              <button onClick={() => setFiltroTexto('')}>
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 text-white text-[11px] font-bold px-2 py-1.5 rounded-xl focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="instalada">Sem Leitura</option>
            <option value="analisada">Lidas</option>
          </select>
        </div>
      </div>

      {/* 3. MODAL DE LISTA DE ARMADILHAS */}
      {mostrarLista && (
        <div className="absolute top-28 left-3 right-3 bottom-20 z-30 max-w-lg mx-auto bg-slate-900/98 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-4 flex flex-col pointer-events-auto overflow-hidden text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Armadilhas Registradas ({armadilhasFiltradas.length})
            </h3>
            <button
              onClick={() => setMostrarLista(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {armadilhasFiltradas.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">Nenhuma armadilha encontrada com esses filtros.</p>
            ) : (
              armadilhasFiltradas.map((arm) => (
                <div
                  key={arm.id}
                  onClick={() => {
                    setSelecionada(arm);
                    setMostrarLista(false);
                  }}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400 text-sm">ARM-{arm.numero}</span>
                      <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-bold">
                        {arm.quarteirao}
                      </span>
                      {arm.status === 'analisada' && (
                        <span className="text-[10px] bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold px-1.5 py-0.5 rounded">
                          {arm.ultimosOvos} ovos
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 truncate mt-0.5">
                      {arm.moradorNome ? <span className="font-bold text-white mr-1.5">{arm.moradorNome} •</span> : ''}
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

      {/* 4. CARD FLUTUANTE DE DETALHES DA ARMADILHA SELECIONADA */}
      {selecionada && (
        <div className="absolute left-0 right-0 bottom-0 z-30 p-3 sm:p-4 max-w-lg mx-auto w-full pointer-events-none">
          <div className="bg-slate-900/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-800 p-4 space-y-3 pointer-events-auto max-h-[75dvh] overflow-y-auto text-white">
            
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>ARMADILHA ARM-{selecionada.numero}</span>
                    {(() => {
                      const sit = calcularSituacaoArmadilha(selecionada);
                      return (
                        <span className={`text-[10px] ${sit.corBg} border ${sit.corBorda} ${sit.corTexto} font-black px-2 py-0.5 rounded-full`}>
                          {sit.titulo}
                        </span>
                      );
                    })()}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelecionada(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informações de Localização */}
            <div className="space-y-2 text-xs">
              {selecionada.moradorNome && (
                <div className="bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Morador(a):</span>
                  <span className="text-xs font-black text-emerald-300">{selecionada.moradorNome}</span>
                </div>
              )}

              <div className="flex items-start gap-2 text-slate-300 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white text-xs">
                    {selecionada.rua} {selecionada.numeroImovel ? `Nº ${selecionada.numeroImovel}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selecionada.microarea} • Quarteirão: <span className="text-emerald-400 font-bold">{selecionada.quarteirao}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Instalada em: {new Date(selecionada.instaladaEm).toLocaleDateString('pt-BR')} ({new Date(selecionada.instaladaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})</span>
              </div>

              {(() => {
                const sit = calcularSituacaoArmadilha(selecionada);
                return (
                  <div className={`p-2.5 rounded-xl border ${sit.corBorda} ${sit.corBg} text-[11px]`}>
                    <span className={`font-black ${sit.corTexto} block mb-0.5`}>Situação da OV: {sit.titulo}</span>
                    <p className="text-slate-200 text-[10px] leading-relaxed">{sit.descricao}</p>
                  </div>
                );
              })()}

              {selecionada.observacoes && (
                <p className="text-[11px] text-slate-300 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 font-bold">Obs:</span> {selecionada.observacoes}
                </p>
              )}
            </div>

            {/* BOTÕES DE AÇÃO: ROTA NO MAPS, WAZE, LABORATÓRIO E EXCLUIR */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleAbrirGoogleMaps(selecionada.latitude, selecionada.longitude)}
                className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => handleAbrirWaze(selecionada.latitude, selecionada.longitude)}
                className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Waze</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onIrParaLaboratorio) onIrParaLaboratorio(selecionada);
                }}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <FlaskConical className="w-4 h-4" />
                <span>LANÇAR LEITURA NO LABORATÓRIO</span>
              </button>

              <button
                type="button"
                onClick={() => handleExcluir(selecionada.id, selecionada.numero)}
                className="col-span-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover esta armadilha</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
