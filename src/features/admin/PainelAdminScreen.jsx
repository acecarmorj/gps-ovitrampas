import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Download, Search, Filter,
  MapPin, Eye, Calendar, RefreshCw,
  FlaskConical, CheckCircle2, AlertTriangle,
  X, Layers, ExternalLink, Trash2, BellRing,
  PieChart, Activity, User
} from 'lucide-react';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { obterFotoArmadilha, excluirArmadilha } from '../../lib/storage';
import { playNewRequestSound } from '../../lib/soundAlert';

export function PainelAdminScreen({
  armadilhas = [],
  userPos,
  onAtualizarArmadilhas
}) {
  const [abaVisualizacao, setAbaVisualizacao] = useState('tabela'); // 'tabela' | 'mapa'
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMicroarea, setFiltroMicroarea] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [armadilhaSelecionada, setArmadilhaSelecionada] = useState(null);
  const [fotoModal, setFotoModal] = useState(null);
  const [notificacaoNovo, setNotificacaoNovo] = useState(null);

  const prevCountRef = useRef(armadilhas.length);

  // Monitora chegada de novos registros em tempo real
  useEffect(() => {
    if (armadilhas.length > prevCountRef.current) {
      const maisRecente = armadilhas[0];
      setNotificacaoNovo(
        `Nova Ovitrampa registrada na hora! OV-${maisRecente.numero} (Morador: ${maisRecente.moradorNome || 'Não informado'}) no ${maisRecente.quarteirao} - ${maisRecente.microarea}`
      );
      playNewRequestSound();

      setTimeout(() => {
        setNotificacaoNovo(null);
      }, 7000);
    }
    prevCountRef.current = armadilhas.length;
  }, [armadilhas]);

  // Carrega foto da armadilha selecionada
  useEffect(() => {
    if (armadilhaSelecionada?.id) {
      obterFotoArmadilha(armadilhaSelecionada.id).then((foto) => {
        setFotoModal(foto);
      });
    } else {
      setFotoModal(null);
    }
  }, [armadilhaSelecionada]);

  // Cálculos epidemiológicos oficiais
  const totalArmadilhas = armadilhas.length;
  const armadilhasLidas = armadilhas.filter((a) => a.status === 'analisada');
  const totalLidas = armadilhasLidas.length;
  const armadilhasPositivas = armadilhas.filter((a) => a.ultimosOvos && a.ultimosOvos > 0);
  const totalPositivas = armadilhasPositivas.length;
  const totalNegativas = armadilhasLidas.filter((a) => !a.ultimosOvos || a.ultimosOvos === 0).length;
  const totalOvos = armadilhas.reduce((acc, curr) => acc + (curr.ultimosOvos || 0), 0);

  // IPO: Índice de Positividade de Ovitrampas (% com ovos)
  const ipo = totalLidas > 0 ? ((totalPositivas / totalLidas) * 100).toFixed(1) : '0.0';

  // IDO: Índice de Densidade de Ovos (média de ovos por armadilha positiva)
  const ido = totalPositivas > 0 ? (totalOvos / totalPositivas).toFixed(1) : '0.0';

  // Lista de microáreas distintas encontradas
  const microareasDisponiveis = Array.from(
    new Set(armadilhas.map((a) => a.microarea).filter(Boolean))
  );

  // Filtragem dos dados
  const armadilhasFiltradas = armadilhas.filter((arm) => {
    const matchTexto =
      !filtroTexto.trim() ||
      arm.numero.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (arm.moradorNome && arm.moradorNome.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (arm.rua && arm.rua.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (arm.quarteirao && arm.quarteirao.toLowerCase().includes(filtroTexto.toLowerCase()));

    const matchMicroarea =
      filtroMicroarea === 'todas' || arm.microarea === filtroMicroarea;

    const matchStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'positivas' && arm.ultimosOvos > 0) ||
      (filtroStatus === 'negativas' && arm.status === 'analisada' && (!arm.ultimosOvos || arm.ultimosOvos === 0)) ||
      (filtroStatus === 'pendentes' && arm.status !== 'analisada');

    return matchTexto && matchMicroarea && matchStatus;
  });

  // Exportação para CSV / Excel
  const handleExportarCsv = () => {
    if (armadilhas.length === 0) {
      alert('Nenhum dado cadastrado para exportar.');
      return;
    }

    const colunas = [
      'Nº OV',
      'Morador',
      'Palheta',
      'Logradouro / Rua',
      'Microárea',
      'Quarteirão',
      'Latitude',
      'Longitude',
      'Precisão GPS (m)',
      'Data Instalação',
      'Status',
      'Ovos',
      'Resultado'
    ];

    const linhas = armadilhas.map((a) => [
      `"ARM-${a.numero}"`,
      `"${(a.moradorNome || '').replace(/"/g, '""')}"`,
      `"${a.palheta || 'P-01'}"`,
      `"${(a.rua || '').replace(/"/g, '""')}"`,
      `"${(a.microarea || '').replace(/"/g, '""')}"`,
      `"${a.quarteirao || ''}"`,
      a.latitude || '',
      a.longitude || '',
      a.precisaoGps || '',
      `"${new Date(a.instaladaEm).toLocaleString('pt-BR')}"`,
      `"${a.status || ''}"`,
      a.ultimosOvos ?? '',
      `"${a.ultimosOvos > 0 ? 'Positiva' : a.status === 'analisada' ? 'Negativa' : 'Pendente'}"`
    ]);

    const csvContent =
      '\uFEFF' + [colunas.join(';'), ...linhas.map((l) => l.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_ovitrampas_carmo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcluir = async (id, numero) => {
    if (window.confirm(`Tem certeza que deseja remover a armadilha ARM-${numero}?`)) {
      await excluirArmadilha(id);
      if (armadilhaSelecionada?.id === id) setArmadilhaSelecionada(null);
      if (onAtualizarArmadilhas) onAtualizarArmadilhas();
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      
      {/* ALERTA DE NOVO REGISTRO EM TEMPO REAL */}
      {notificacaoNovo && (
        <div className="bg-emerald-600 text-white px-4 py-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300 z-50 shrink-0 border-b border-emerald-400">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
            <BellRing className="w-5 h-5 animate-bounce text-emerald-200 shrink-0" />
            <span>{notificacaoNovo}</span>
          </div>
          <button
            onClick={() => setNotificacaoNovo(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOPO: DASHBOARD COM INDICADORES EPIDEMIOLÓGICOS NA HORA */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white">
                  Painel de Controle do Administrador
                </h1>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  TEMPO REAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoramento municipal de Ovitrampas em Carmo/RJ
              </p>
            </div>
          </div>

          {/* BOTÕES DE VISUALIZAÇÃO E EXPORTAÇÃO */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center">
              <button
                type="button"
                onClick={() => setAbaVisualizacao('tabela')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  abaVisualizacao === 'tabela'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tabela
              </button>
              <button
                type="button"
                onClick={() => setAbaVisualizacao('mapa')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  abaVisualizacao === 'mapa'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mapa Geral
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportarCsv}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
              title="Baixar planilha CSV para Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* CARDS DE INDICADORES: TOTAL, IPO, IDO, POSITIVAS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total OVs</span>
            <span className="text-lg font-black text-white">{totalArmadilhas}</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lidas (Lab)</span>
            <span className="text-lg font-black text-blue-400">{totalLidas}</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Positivas</span>
            <span className="text-lg font-black text-rose-400">{totalPositivas}</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IPO (% Posit.)</span>
            <span className="text-lg font-black text-amber-400">{ipo}%</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Ovos (IDO)</span>
            <span className="text-lg font-black text-emerald-400">{totalOvos} <span className="text-xs text-slate-400 font-normal">({ido}/OV)</span></span>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Pesquisar por Morador, OV, Rua ou Quarteirão..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-full"
            />
            {filtroTexto && (
              <button onClick={() => setFiltroTexto('')}>
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroMicroarea}
              onChange={(e) => setFiltroMicroarea(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-bold text-white px-3 py-2 rounded-2xl focus:outline-none"
            >
              <option value="todas">Todas as Microáreas</option>
              {microareasDisponiveis.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-bold text-white px-3 py-2 rounded-2xl focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="positivas">Positivas (com ovos)</option>
              <option value="negativas">Negativas (0 ovos)</option>
              <option value="pendentes">Sem leitura (em campo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO: TABELA OU MAPA */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        
        {/* VISUALIZAÇÃO EM TABELA ADMINISTRATIVA */}
        {abaVisualizacao === 'tabela' && (
          <div className="w-full h-full overflow-auto p-3 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">OV</th>
                    <th className="py-3 px-3">Morador</th>
                    <th className="py-3 px-3">Palheta</th>
                    <th className="py-3 px-3">Endereço Oficial (GPS)</th>
                    <th className="py-3 px-3">Quarteirão</th>
                    <th className="py-3 px-3">Instalada em</th>
                    <th className="py-3 px-3">Resultado</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {armadilhasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500 font-bold">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    armadilhasFiltradas.map((arm) => (
                      <tr key={arm.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-black text-emerald-400">
                          ARM-{arm.numero}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">
                          {arm.moradorNome || <span className="text-slate-500 italic">Não informado</span>}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-400">
                          {arm.palheta || 'P-01'}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-200">{arm.rua}</p>
                          <span className="text-[10px] text-slate-400">{arm.microarea}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            {arm.quarteirao}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          {new Date(arm.instaladaEm).toLocaleDateString('pt-BR')} {new Date(arm.instaladaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          {arm.status === 'analisada' ? (
                            arm.ultimosOvos > 0 ? (
                              <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {arm.ultimosOvos} ovos (Positiva)
                              </span>
                            ) : (
                              <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                Negativa (0)
                              </span>
                            )
                          ) : (
                            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                              Em campo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setArmadilhaSelecionada(arm)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
                              title="Ver detalhes e foto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluir(arm.id, arm.numero)}
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl text-rose-400 transition-colors"
                              title="Excluir armadilha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISUALIZAÇÃO EM MAPA GERAL */}
        {abaVisualizacao === 'mapa' && (
          <div className="w-full h-full">
            <MapaGrandeOvitrampa
              userPos={userPos}
              armadilhas={armadilhasFiltradas}
              armadilhaSelecionada={armadilhaSelecionada}
              onSelectArmadilha={(arm) => setArmadilhaSelecionada(arm)}
              mostrarTodosPontos={true}
            />
          </div>
        )}

      </div>

      {/* MODAL DE DETALHES E FOTO */}
      {armadilhaSelecionada && (
        <div
          onClick={() => setArmadilhaSelecionada(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detalhes da Ovitrampa</span>
                <h3 className="text-base font-black text-emerald-400">ARM-{armadilhaSelecionada.numero}</h3>
              </div>
              <button
                onClick={() => setArmadilhaSelecionada(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Foto do Local */}
            {fotoModal ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 max-h-56 flex items-center justify-center">
                <img src={fotoModal} alt="Foto da instalação" className="w-full h-56 object-cover" />
                <span className="absolute bottom-2 left-2 bg-black/80 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Foto do Ponto de Instalação
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500 font-bold">
                Sem foto anexada para esta armadilha.
              </div>
            )}

            {/* Informações */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Morador:</span>
                <span className="font-extrabold text-white">{armadilhaSelecionada.moradorNome || 'Não informado'}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Palheta:</span>
                <span className="font-extrabold text-blue-400">{armadilhaSelecionada.palheta || 'P-01'}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Endereço Detectado via GPS:</span>
                <p className="font-extrabold text-white">{armadilhaSelecionada.rua}</p>
                <p className="text-[11px] text-slate-400">{armadilhaSelecionada.microarea} • Quarteirão: <span className="text-emerald-400 font-bold">{armadilhaSelecionada.quarteirao}</span></p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de Instalação:</span>
                  <span className="font-bold text-slate-300">{new Date(armadilhaSelecionada.instaladaEm).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block text-right">Resultado:</span>
                  <span className="font-black text-emerald-400">
                    {armadilhaSelecionada.ultimosOvos !== undefined ? `${armadilhaSelecionada.ultimosOvos} ovos` : 'Em campo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${armadilhaSelecionada.latitude},${armadilhaSelecionada.longitude}`, '_blank')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Abrir Rota no Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => handleExcluir(armadilhaSelecionada.id, armadilhaSelecionada.numero)}
                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
