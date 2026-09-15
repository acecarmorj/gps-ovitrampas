import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Download, Search, Filter,
  MapPin, Eye, Calendar, RefreshCw,
  FlaskConical, CheckCircle2, AlertTriangle,
  X, Layers, ExternalLink, Trash2, BellRing,
  PieChart, Activity, User
} from 'lucide-react';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { excluirArmadilha } from '../../lib/storage';
import { playNewRequestSound } from '../../lib/soundAlert';

export function PainelAdminScreen({
  armadilhas = [],
  userPos,
  onAtualizarArmadilhas
}) {
  const [modoVisualizacao, setModoVisualizacao] = useState('dividido'); // 'dividido' | 'mapa' | 'tabela'
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMicroarea, setFiltroMicroarea] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [armadilhaSelecionada, setArmadilhaSelecionada] = useState(null);
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
      'Hora Instalação',
      'Status',
      'Quantidade Ovos',
      'Resultado Lab',
      'Observações'
    ];

    const linhas = armadilhas.map((a) => {
      const dataInst = new Date(a.instaladaEm);
      const dataStr = dataInst.toLocaleDateString('pt-BR');
      const horaStr = dataInst.toLocaleTimeString('pt-BR');
      const statusStr = a.status === 'analisada' ? 'Lida' : 'Em Campo';
      const resultadoStr = a.status === 'analisada' ? (a.ultimosOvos > 0 ? 'Positiva' : 'Negativa') : 'Pendente';

      return [
        `"OV-${a.numero}"`,
        `"${(a.moradorNome || '').replace(/"/g, '""')}"`,
        `"${a.palheta || 'P-01'}"`,
        `"${(a.rua || '').replace(/"/g, '""')}"`,
        `"${(a.microarea || '').replace(/"/g, '""')}"`,
        `"${(a.quarteirao || '').replace(/"/g, '""')}"`,
        a.latitude,
        a.longitude,
        a.precisaoGps || '',
        `"${dataStr}"`,
        `"${horaStr}"`,
        `"${statusStr}"`,
        a.ultimosOvos !== undefined ? a.ultimosOvos : '',
        `"${resultadoStr}"`,
        `"${(a.observacoes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [colunas.join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ovitrampas_carmo_${new Date().toISOString().slice(0, 10)}.csv`);
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
    <div className="w-full h-full bg-[#F1F2F5] text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      
      {/* ALERTA DE NOVO REGISTRO EM TEMPO REAL */}
      {notificacaoNovo && (
        <div className="bg-emerald-600 text-white px-4 py-3 shadow-md flex items-center justify-between gap-3 animate-in fade-in duration-300 z-50 shrink-0 border-b border-emerald-500">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
            <BellRing className="w-5 h-5 animate-bounce text-emerald-100 shrink-0" />
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

      {/* TOPO: DASHBOARD COM INDICADORES EPIDEMIOLÓGICOS (CLEAN & ADAPTADO PARA TABLET) */}
      <div className="bg-white/95 border-b border-slate-200/90 p-3 sm:p-4 shrink-0 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Painel do Administrador
                </h1>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TEMPO REAL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoramento territorial de Ovitrampas em Carmo/RJ
              </p>
            </div>
          </div>

          {/* BOTÕES DE VISUALIZAÇÃO E EXPORTAÇÃO (ADAPTADOS PARA TABLET & MOBILE) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center shadow-xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('dividido')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  modoVisualizacao === 'dividido'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exibir Mapa e Tabela juntos"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Dividido</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('mapa')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  modoVisualizacao === 'mapa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exibir somente o Mapa Geral"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Só Mapa</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('tabela')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  modoVisualizacao === 'tabela'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exibir somente a Tabela de Dados"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Só Tabela</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportarCsv}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
              title="Baixar planilha CSV para Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* CARDS DE INDICADORES: GRADE 5 COLUNAS EM TABLET E DESKTOP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center">
          <div className="bg-slate-50 border border-slate-200/90 p-2.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Total OVs</span>
            <span className="text-lg font-black text-slate-900">{totalArmadilhas}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 p-2.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Lidas (Lab)</span>
            <span className="text-lg font-black text-blue-600">{totalLidas}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 p-2.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Positivas</span>
            <span className="text-lg font-black text-rose-600">{totalPositivas}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 p-2.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">IPO (% Posit.)</span>
            <span className="text-lg font-black text-amber-700">{ipo}%</span>
          </div>

          <div className="col-span-2 sm:col-span-1 md:col-span-1 bg-slate-50 border border-slate-200/90 p-2.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Total Ovos (IDO)</span>
            <span className="text-lg font-black text-emerald-700">{totalOvos} <span className="text-xs text-slate-500 font-medium">({ido}/OV)</span></span>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Pesquisar por Morador, OV, Rua ou Quarteirão..."
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

          <div className="flex items-center gap-2">
            <select
              value={filtroMicroarea}
              onChange={(e) => setFiltroMicroarea(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2 rounded-2xl focus:outline-none"
            >
              <option value="todas">Todas as Microáreas</option>
              {microareasDisponiveis.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2 rounded-2xl focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="positivas">Positivas (com ovos)</option>
              <option value="negativas">Negativas (0 ovos)</option>
              <option value="pendentes">Sem leitura (em campo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO: DIVIDIDO (MAPA + TABELA LADO A LADO EM TABLET MD E DESKTOP LG) */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col md:flex-row">
        
        {/* MAPA GERAL DENTRO DO PAINEL DO ADMINISTRADOR */}
        {(modoVisualizacao === 'dividido' || modoVisualizacao === 'mapa') && (
          <div
            className={`relative transition-all ${
              modoVisualizacao === 'mapa'
                ? 'w-full h-full'
                : 'w-full h-[40vh] md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 shrink-0'
            }`}
          >
            <MapaGrandeOvitrampa
              userPos={userPos}
              armadilhas={armadilhasFiltradas}
              armadilhaSelecionada={armadilhaSelecionada}
              onSelectArmadilha={(arm) => setArmadilhaSelecionada(arm)}
              mostrarTodosPontos={true}
            />

            {/* Badge flutuante sobre o mapa em modo dividido */}
            {modoVisualizacao === 'dividido' && (
              <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Mapa de Carmo ({armadilhasFiltradas.length} OVs)</span>
              </div>
            )}
          </div>
        )}

        {/* TABELA ADMINISTRATIVA COM DADOS E AÇÕES (CLEAN & TOUCH TABLET FRIENDLY) */}
        {(modoVisualizacao === 'dividido' || modoVisualizacao === 'tabela') && (
          <div
            className={`overflow-auto flex-1 p-2.5 sm:p-4 ${
              modoVisualizacao === 'dividido'
                ? 'w-full md:w-1/2 h-[60vh] md:h-full'
                : 'w-full h-full'
            }`}
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-3 px-3">OV</th>
                    <th className="py-3 px-3">Morador</th>
                    <th className="py-3 px-3">Palheta</th>
                    <th className="py-3 px-3">Endereço (GPS)</th>
                    <th className="py-3 px-3">Quarteirão</th>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Resultado</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {armadilhasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 font-bold">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    armadilhasFiltradas.map((arm) => {
                      const isSelected = armadilhaSelecionada?.id === arm.id;
                      return (
                        <tr
                          key={arm.id}
                          onClick={() => setArmadilhaSelecionada(arm)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 border-l-4 border-emerald-500'
                              : 'hover:bg-slate-50/80'
                          }`}
                          title="Clique para localizar e aproximar no mapa"
                        >
                          <td className="py-3 px-3 font-black text-emerald-700">
                            ARM-{arm.numero}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            {arm.moradorNome || <span className="text-slate-400 italic">Não informado</span>}
                          </td>
                          <td className="py-3 px-3 font-bold text-blue-700">
                            {arm.palheta || 'P-01'}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 leading-tight">{arm.rua}</p>
                            <span className="text-[10px] text-slate-500">{arm.microarea}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md text-[10px] border border-slate-200">
                              {arm.quarteirao}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500">
                            {new Date(arm.instaladaEm).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-3">
                            {arm.status === 'analisada' ? (
                              arm.ultimosOvos > 0 ? (
                                <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  {arm.ultimosOvos} ovos (Positiva)
                                </span>
                              ) : (
                                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  Negativa (0)
                                </span>
                              )
                            ) : (
                              <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                Em campo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setArmadilhaSelecionada(arm)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors border border-slate-200"
                                title="Ver detalhes da armadilha"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluir(arm.id, arm.numero)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 transition-colors border border-rose-200"
                                title="Excluir armadilha"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE DETALHES DA ARMADILHA (CLEAN & MODERNO) */}
      {armadilhaSelecionada && (
        <div
          onClick={() => setArmadilhaSelecionada(null)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detalhes da Ovitrampa</span>
                <h3 className="text-base font-black text-emerald-700">ARM-{armadilhaSelecionada.numero}</h3>
              </div>
              <button
                onClick={() => setArmadilhaSelecionada(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Morador:</span>
                <span className="font-extrabold text-slate-900">{armadilhaSelecionada.moradorNome || 'Não informado'}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Palheta:</span>
                <span className="font-extrabold text-blue-700">{armadilhaSelecionada.palheta || 'P-01'}</span>
              </div>

              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 col-span-2">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Endereço Detectado via GPS:</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{armadilhaSelecionada.rua}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{armadilhaSelecionada.microarea} • Quarteirão: <span className="text-emerald-700 font-extrabold">{armadilhaSelecionada.quarteirao}</span></p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Instalação:</span>
                  <span className="font-bold text-slate-800">{new Date(armadilhaSelecionada.instaladaEm).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block text-right">Resultado:</span>
                  <span className="font-black text-emerald-700">
                    {armadilhaSelecionada.ultimosOvos !== undefined ? `${armadilhaSelecionada.ultimosOvos} ovos` : 'Em campo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${armadilhaSelecionada.latitude},${armadilhaSelecionada.longitude}`, '_blank')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Abrir Rota no Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => handleExcluir(armadilhaSelecionada.id, armadilhaSelecionada.numero)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1 border border-rose-200 transition-colors"
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
