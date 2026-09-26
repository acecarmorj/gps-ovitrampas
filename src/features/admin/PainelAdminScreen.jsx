import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Download, Search, Filter,
  MapPin, Eye, Calendar, RefreshCw,
  FlaskConical, CheckCircle2, AlertTriangle, AlertCircle,
  X, Layers, ExternalLink, Trash2, BellRing,
  PieChart, Activity, User, FileText, Pencil, RotateCcw,
  Save, Check, Info, Flame
} from 'lucide-react';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { excluirArmadilha, atualizarArmadilha, limparTodasArmadilhas } from '../../lib/storage';
import { playNewRequestSound } from '../../lib/soundAlert';
import { findNearbyTraps } from '../../lib/geoDistance';
import { gerarRelatorioPdfConsolidado } from '../../lib/pdfRelatorioConsolidado';
import { gerarRelatorioPdfEntomologico } from '../../lib/pdfRelatorioEntomologico';
import { gerarRelatorioPdfConsolidadoUnico } from '../../lib/pdfRelatorioConsolidadoUnico';
import { PainelInteligenciaIA } from './PainelInteligenciaIA';
import { PainelResumoGpsCampo } from './PainelResumoGpsCampo';
import { Satellite, Award } from 'lucide-react';
import { Sparkles, Tag, EyeOff } from 'lucide-react';
import { SeletorCicloPalheta } from '../../components/SeletorCicloPalheta';
import { calcularMetricasCiclo } from '../../lib/ciclosOvitrampas';

// Bairros e microáreas oficiais de Carmo - RJ
const MICROAREAS_CARMO_OFICIAIS = [
  'Centro',
  'Val Paraíso',
  'Progresso',
  'Morro do Estado',
  'Jardim Centenário',
  "Caixa d'Água",
  'Boa Ideia',
  'Botafogo',
  'DISTRITOS'
];

export function PainelAdminScreen({
  armadilhas = [],
  armadilhasBrutas = [],
  todasLeituras = [],
  cicloAtivo = 'ambas',
  onMudarCiclo,
  userPos,
  outrosAgentes = [],
  onAtualizarArmadilhas
}) {
  const [modoVisualizacao, setModoVisualizacao] = useState('dividido'); // 'dividido' | 'mapa' | 'tabela'
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMicroarea, setFiltroMicroarea] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [armadilhaSelecionada, setArmadilhaSelecionada] = useState(null);
  const [notificacaoNovo, setNotificacaoNovo] = useState(null);

  // Modais de Edição, Exclusão e Limpeza Total
  const [armadilhaEmEdicao, setArmadilhaEmEdicao] = useState(null);
  const [armadilhaParaExcluir, setArmadilhaParaExcluir] = useState(null);
  const [modalLimparTudoAberto, setModalLimparTudoAberto] = useState(false);
  const [nomeResponsavelLimpeza, setNomeResponsavelLimpeza] = useState('');
  const [textoConfirmacaoZerar, setTextoConfirmacaoZerar] = useState('');
  const [toastMensagem, setToastMensagem] = useState(null);
  const [mostrarRotulosAdmin, setMostrarRotulosAdmin] = useState(true);
  const [mostrarPainelAdmin, setMostrarPainelAdmin] = useState(true);

  // Estado do formulário de edição
  const [editForm, setEditForm] = useState({
    numero: '',
    palheta: '',
    moradorNome: '',
    rua: '',
    numeroImovel: '',
    bairro: '',
    microarea: '',
    quarteirao: '',
    status: 'instalada',
    ultimosOvos: '',
    observacoes: ''
  });

  const prevCountRef = useRef(armadilhas.length);

  // Carrega dados no formulário ao abrir edição
  useEffect(() => {
    if (armadilhaEmEdicao) {
      setEditForm({
        numero: armadilhaEmEdicao.numero || '',
        palheta: armadilhaEmEdicao.palheta || 'P-01',
        moradorNome: armadilhaEmEdicao.moradorNome || '',
        rua: armadilhaEmEdicao.rua || '',
        numeroImovel: armadilhaEmEdicao.numeroImovel || '',
        bairro: armadilhaEmEdicao.bairro || 'Carmo',
        microarea: armadilhaEmEdicao.microarea || 'Centro',
        quarteirao: armadilhaEmEdicao.quarteirao || 'Q-01',
        status: armadilhaEmEdicao.status || 'instalada',
        ultimosOvos: armadilhaEmEdicao.ultimosOvos !== undefined && armadilhaEmEdicao.ultimosOvos !== null
          ? String(armadilhaEmEdicao.ultimosOvos)
          : '',
        observacoes: armadilhaEmEdicao.observacoes || ''
      });
    }
  }, [armadilhaEmEdicao]);

  const mostrarToast = (texto, tipo = 'sucesso') => {
    setToastMensagem({ texto, tipo });
    setTimeout(() => {
      setToastMensagem(null);
    }, 4500);
  };

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
  const metricasCiclo = useMemo(() => {
    return calcularMetricasCiclo(armadilhas);
  }, [armadilhas]);

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
    new Set([...MICROAREAS_CARMO_OFICIAIS, ...armadilhas.map((a) => a.microarea).filter(Boolean)])
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

  // Salvar Edição
  const handleSalvarEdicao = async (e) => {
    if (e) e.preventDefault();
    if (!armadilhaEmEdicao) return;

    const armAtualizada = await atualizarArmadilha(armadilhaEmEdicao.id, editForm);
    if (armAtualizada) {
      if (armadilhaSelecionada?.id === armadilhaEmEdicao.id) {
        setArmadilhaSelecionada(armAtualizada);
      }
      setArmadilhaEmEdicao(null);
      mostrarToast(`Ovitrampa ARM-${armAtualizada.numero} atualizada com sucesso!`, 'sucesso');
      if (onAtualizarArmadilhas) onAtualizarArmadilhas();
    }
  };

  // Confirmar Exclusão Individual
  const handleConfirmarExclusao = async () => {
    if (!armadilhaParaExcluir) return;
    const num = armadilhaParaExcluir.numero;
    await excluirArmadilha(armadilhaParaExcluir.id);
    if (armadilhaSelecionada?.id === armadilhaParaExcluir.id) {
      setArmadilhaSelecionada(null);
    }
    setArmadilhaParaExcluir(null);
    mostrarToast(`Ovitrampa ARM-${num} removida com sucesso.`, 'info');
    if (onAtualizarArmadilhas) onAtualizarArmadilhas();
  };

  // Confirmar Limpeza Total (Zerar ciclo para novo dia com trava tripla e auditoria)
  const handleConfirmarLimpezaTotal = async () => {
    if (!nomeResponsavelLimpeza || nomeResponsavelLimpeza.trim().length < 3) {
      alert('Por segurança, informe o nome completo do responsável pela limpeza do banco.');
      return;
    }
    if (textoConfirmacaoZerar.trim().toUpperCase() !== 'ZERAR') {
      alert('Digite exatamente a palavra ZERAR para confirmar a exclusão definitiva.');
      return;
    }

    console.warn(`[AUDITORIA SEGURANÇA] Limpeza total autorizada por: ${nomeResponsavelLimpeza.trim()} em ${new Date().toISOString()}`);
    await limparTodasArmadilhas();
    setArmadilhaSelecionada(null);
    setArmadilhaEmEdicao(null);
    setArmadilhaParaExcluir(null);
    setNomeResponsavelLimpeza('');
    setTextoConfirmacaoZerar('');
    setModalLimparTudoAberto(false);
    mostrarToast(`Banco zerado com sucesso por ${nomeResponsavelLimpeza.trim()}. Pronto para novo ciclo.`, 'sucesso');
    if (onAtualizarArmadilhas) onAtualizarArmadilhas();
  };

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

  // Geração do Relatório de Resultados Consolidado (10 Páginas • Palhetas A, B e Total)
  const handleGerarRelatorioConsolidadoUnico = async () => {
    try {
      setToastMensagem({ tipo: 'info', texto: 'Gerando Relatório de Resultados Consolidado (10 Páginas)...' });
      const filtroDescricao = 'Vigilância Entomológica de Carmo/RJ • Palhetas A, B e Consolidado • 56 Ovitrampas';
      await gerarRelatorioPdfConsolidadoUnico(
        armadilhasBrutas && armadilhasBrutas.length > 0 ? armadilhasBrutas : armadilhas,
        todasLeituras,
        { filtroDescricao }
      );
      setToastMensagem({ tipo: 'sucesso', texto: 'Relatório de Resultados baixado com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado único:', err);
      setToastMensagem({ tipo: 'erro', texto: 'Erro ao gerar relatório unificado. Tente novamente.' });
    }
  };

  // Geração do Relatório Entomológico Oficial (Fotos de Satélite Google + Nevoeiro Radiante)
  const handleGerarRelatorioEntomologico = async () => {
    try {
      setToastMensagem({ tipo: 'info', texto: 'Gerando Relatório Entomológico Oficial (Fotos de Satélite Google + Nevoeiro)...' });
      const filtroDescricao = 'Vigilância Entomológica • Cobertura Municipal Completa (56 Armadilhas) • Base Satélite';
      await gerarRelatorioPdfEntomologico(armadilhas, {
        filtroDescricao,
        nomeArquivo: 'RELATORIO_EPIDEMIOLOGICO_MAPA_CALOR_CARMO.pdf'
      });
      setToastMensagem({ tipo: 'sucesso', texto: 'Relatório Entomológico baixado com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar relatório entomológico:', err);
      setToastMensagem({ tipo: 'erro', texto: 'Erro ao gerar relatório entomológico. Tente novamente.' });
    }
  };

  // Geração do Relatório Consolidado Oficial (Gestão Operacional de Campo, Troca de Palhetas e Espaçamento 300-400m)
  const handleGerarRelatorioConsolidado = async () => {
    try {
      setToastMensagem({ tipo: 'info', texto: 'Gerando Relatório Consolidado Operacional de Campo...' });
      const filtroDescricao = 'Gestão Operacional de Campo • 56 Ovitrampas • Troca de Palhetas e Espaçamento 300-400m';
      await gerarRelatorioPdfConsolidado(armadilhas, {
        filtroDescricao,
        nomeArquivo: 'RELATORIO_CONSOLIDADO_OPERACIONAL_CARMO.pdf'
      });
      setToastMensagem({ tipo: 'sucesso', texto: 'Relatório Consolidado baixado com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado:', err);
      setToastMensagem({ tipo: 'erro', texto: 'Erro ao gerar relatório operacional. Tente novamente.' });
    }
  };

  // Geração do Relatório PDF (respeitando filtros atuais de busca/bairro)
  const handleGerarPdf = async () => {
    try {
      setToastMensagem({ tipo: 'info', texto: 'Gerando Relatório Entomológico em PDF...' });
      const filtroDescricao = [
        filtroMicroarea !== 'todas' ? filtroMicroarea : null,
        filtroStatus !== 'todos' ? filtroStatus : null,
        filtroTexto.trim() || null
      ]
        .filter(Boolean)
        .join(' • ') || 'Todos os Registros';

      await gerarRelatorioPdfEntomologico(armadilhasFiltradas, { filtroDescricao });
      setToastMensagem({ tipo: 'sucesso', texto: 'Relatório PDF baixado com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar relatório PDF:', err);
      setToastMensagem({ tipo: 'erro', texto: 'Erro ao gerar PDF. Tente novamente.' });
    }
  };

  return (
    <div className="w-full h-full bg-[#F1F2F5] text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      
      {/* TOAST DE FEEDBACK DE AÇÕES */}
      {toastMensagem && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-top-2 duration-200">
          <div className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-black ${
            toastMensagem.tipo === 'sucesso'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMensagem.tipo === 'info'
              ? 'bg-slate-800 text-white border-slate-700'
              : 'bg-rose-600 text-white border-rose-500'
          }`}>
            {toastMensagem.tipo === 'sucesso' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {toastMensagem.tipo === 'info' && <Info className="w-4 h-4 shrink-0" />}
            {toastMensagem.tipo === 'erro' && <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{toastMensagem.texto}</span>
            <button
              onClick={() => setToastMensagem(null)}
              className="p-1 hover:opacity-80 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
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
                Monitoramento territorial, edição e gestão de Ovitrampas • Carmo/RJ
              </p>
            </div>
          </div>

          {/* BOTÕES DE VISUALIZAÇÃO E AÇÕES GERAIS (TABLET TOUCH FRIENDLY) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center shadow-xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('dividido')}
                className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                  modoVisualizacao === 'dividido'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exibir Mapa e Tabela juntos"
              >
                <Layers className="w-4 h-4" />
                <span>Dividido</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('mapa')}
                className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                  modoVisualizacao === 'mapa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exibir somente o Mapa Geral"
              >
                <MapPin className="w-4 h-4" />
                <span>Só Mapa</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('calor')}
                className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                  modoVisualizacao === 'calor'
                    ? 'bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-md shadow-orange-600/25'
                    : 'text-orange-700 bg-orange-50/80 hover:bg-orange-100'
                }`}
                title="Exibir Mapa de Calor das Armadilhas Verificadas"
              >
                <Flame className="w-4 h-4 text-orange-500 animate-bounce" />
                <span>🔥 Mapa de Calor</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('resumo_gps')}
                className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                  modoVisualizacao === 'resumo_gps'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-blue-700 bg-blue-50/80 hover:bg-blue-100'
                }`}
                title="Resumo Consolidado de GPS e Auditoria de Campo"
              >
                <Satellite className="w-4 h-4 text-blue-500" />
                <span>🛰️ GPS Resumo Geral</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('ia')}
                className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                  modoVisualizacao === 'ia'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                    : 'text-purple-700 bg-purple-50/80 hover:bg-purple-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Inteligência IA</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('tabela')}
                className={`px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ${
                  modoVisualizacao === 'tabela'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exibir somente a Tabela de Dados"
              >
                <Activity className="w-4 h-4" />
                <span>Só Tabela</span>
              </button>
            </div>

              {/* Ocultar/Mostrar painel superior no modo mapa */}
              {modoVisualizacao === 'mapa' && (
                <button
                  type="button"
                  onClick={() => setMostrarPainelAdmin(!mostrarPainelAdmin)}
                  className="px-3 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700"
                  title="Ocultar/mostrar painel de filtros para tela cheia do mapa"
                >
                  {mostrarPainelAdmin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-blue-600" />}
                  <span className="hidden sm:inline">{mostrarPainelAdmin ? 'Ocultar Topo' : 'Mostrar Topo'}</span>
                </button>
              )}

            <button
              type="button"
              onClick={handleExportarCsv}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
              title="Baixar planilha CSV para Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* BOTÃO MASTER: RELATÓRIO DE RESULTADOS CONSOLIDADO (10 PÁGS • A+B+3 MAPAS) */}
            <button
              type="button"
              onClick={handleGerarRelatorioConsolidadoUnico}
              className="bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 hover:from-amber-400 hover:to-emerald-500 active:scale-95 text-white px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 border border-amber-300/50 cursor-pointer"
              title="Relatório Oficial de Resultados (10 Páginas): Palhetas A, B e Total Acumulado, Gráficos Vetoriais, Todos os 3 Mapas de Satélite (Sede, Distritos e Panorâmica Municipal), Focos Críticos e Diretrizes Operacionais com Assinaturas"
            >
              <Award className="w-4 h-4 text-amber-200" />
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse hidden sm:inline" />
              <span>Relatório de Resultados (10 Págs)</span>
            </button>

            {/* BOTÃO RELATÓRIO ENTOMOLÓGICO OFICIAL (FOTOS DE SATÉLITE + NEVOEIRO) */}
            <button
              type="button"
              onClick={handleGerarRelatorioEntomologico}
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-700/20 border border-emerald-400/40"
              title="Baixar Relatório Entomológico Oficial (6 Páginas com Mapas de Calor em Foto de Satélite Google e Nevoeiro)"
            >
              <Satellite className="w-4 h-4 text-emerald-200" />
              <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Relatório Entomológico</span>
            </button>

            {/* BOTÃO RELATÓRIO CONSOLIDADO OPERACIONAL */}
            <button
              type="button"
              onClick={handleGerarRelatorioConsolidado}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs border border-slate-700"
              title="Gerar Relatório Consolidado Operacional de Campo em PDF (Ciclo de Palhetas de 5 dias e Espaçamento 300-400m)"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Relatório Consolidado</span>
            </button>

            {/* BOTÃO PARA ZERAR DADOS DE TESTE / INICIAR NOVO CICLO */}
            <button
              type="button"
              onClick={() => setModalLimparTudoAberto(true)}
              className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
              title="Zerar dados de teste e começar ciclo limpo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Zerar Dados</span>
            </button>
          </div>
        </div>

        {/* SELETOR DE CICLOS DE PALHETAS (A, B, AMBAS) E BANNER COMPARATIVO */}
        {mostrarPainelAdmin && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700">Filtrar por Ciclo / Palheta:</span>
                {cicloAtivo === 'A' && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                    1ª Semana (Palhetas A)
                  </span>
                )}
                {cicloAtivo === 'B' && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                    2ª Semana (Palhetas B)
                  </span>
                )}
                {cicloAtivo === 'ambas' && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                    Consolidado Geral (Palheta A + B)
                  </span>
                )}
              </div>

              {onMudarCiclo && (
                <SeletorCicloPalheta
                  cicloAtivo={cicloAtivo}
                  onMudarCiclo={onMudarCiclo}
                  tamanho="compacto"
                />
              )}
            </div>

            {/* BANNER COMPARATIVO ENTRE SEMANA 1 (PALHETA A) E SEMANA 2 (PALHETA B) */}
            {cicloAtivo === 'ambas' && metricasCiclo.comparativo.lidasA > 0 && (
              <div className="bg-gradient-to-r from-blue-900/90 via-slate-900/95 to-indigo-900/90 text-white rounded-2xl p-3 border border-slate-700 shadow-md">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider pb-1.5 border-b border-slate-700/60 mb-2">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Activity className="w-3.5 h-3.5" />
                    Comparativo Oficial: 1ª Semana (Palheta A) vs 2ª Semana (Palheta B)
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Consolidado Municipal
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block font-bold">Ovos Palheta A (Sem. 1)</span>
                    <span className="text-base font-black text-blue-400">{metricasCiclo.comparativo.ovosA} ovos</span>
                    <span className="text-[9px] text-slate-400 block">IPO: {metricasCiclo.comparativo.ipoA.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block font-bold">Ovos Palheta B (Sem. 2)</span>
                    <span className="text-base font-black text-indigo-400">{metricasCiclo.comparativo.ovosB} ovos</span>
                    <span className="text-[9px] text-slate-400 block">
                      {metricasCiclo.comparativo.lidasB > 0 ? `IPO: ${metricasCiclo.comparativo.ipoB.toFixed(1)}%` : 'Coleta em andamento'}
                    </span>
                  </div>
                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block font-bold">Total Acumulado (A + B)</span>
                    <span className="text-base font-black text-emerald-400">{totalOvos} ovos</span>
                    <span className="text-[9px] text-slate-400 block">Média: {(totalOvos / (totalPositivas || 1)).toFixed(1)} ovos/pos</span>
                  </div>
                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block font-bold">Variação de Infestação</span>
                    {metricasCiclo.comparativo.lidasB > 0 ? (
                      <span className={`text-base font-black ${metricasCiclo.comparativo.diferencaOvos <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {metricasCiclo.comparativo.diferencaOvos > 0 ? '+' : ''}{metricasCiclo.comparativo.diferencaOvos} ovos ({metricasCiclo.comparativo.variacaoOvosPct.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-300">Aguardando contagem Sem. 2</span>
                    )}
                    <span className="text-[9px] text-slate-400 block">Tendência Epidemiológica</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARDS DE INDICADORES: GRADE 5 COLUNAS EM TABLET E DESKTOP */}
        {mostrarPainelAdmin && (
          <>
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
        </>
        )}
      </div>

      {/* ÁREA DE CONTEÚDO */}
      {modoVisualizacao === 'ia' ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/70">
          <PainelInteligenciaIA armadilhas={armadilhas} />
        </div>
      ) : modoVisualizacao === 'resumo_gps' ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/70">
          <PainelResumoGpsCampo armadilhas={armadilhas} />
        </div>
      ) : modoVisualizacao === 'calor' ? (
        <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
          {/* BANNER DO MAPA DE CALOR */}
          <div className="bg-gradient-to-r from-orange-600 via-rose-600 to-red-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Flame className="w-5 h-5 text-amber-200 animate-bounce" />
              </span>
              <div>
                <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                  <span>MAPA DE CALOR EPIDEMIOLÓGICO — 26 ARMADILHAS VERIFICADAS</span>
                  <span className="bg-white/25 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                    Focos Reais
                  </span>
                </div>
                <div className="text-[11px] text-orange-100 flex items-center gap-3 mt-0.5 flex-wrap">
                  <span>🥚 <b>{totalOvos} ovos</b> apurados</span>
                  <span>📊 <b>IPO: {ipo}%</b> ({totalPositivas} pos. / {totalNegativas} neg.)</span>
                  <span>📈 <b>IDO: {ido}</b> ovos/arm. positiva</span>
                  <span>🔥 Focos: <b>P-23 (147)</b> e <b>P-21 (100)</b> em Progresso</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGerarPdf}
                className="bg-white text-orange-700 hover:bg-orange-50 active:scale-95 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Baixar Relatório com Mapa de Calor (PDF)</span>
              </button>
            </div>
          </div>

          <div className="flex-1 relative w-full h-full">
            <MapaGrandeOvitrampa
              userPos={userPos}
              armadilhas={armadilhas}
              armadilhaSelecionada={armadilhaSelecionada}
              onSelectArmadilha={(arm) => setArmadilhaSelecionada(arm)}
              mostrarTodosPontos={true}
              outrosAgentes={outrosAgentes}
              showHeatmap={true}
              showLabels={mostrarRotulosAdmin}
              onToggleLabels={() => setMostrarRotulosAdmin((prev) => !prev)}
              showPanel={false}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col lg:flex-row">
        
        {/* MAPA GERAL DENTRO DO PAINEL DO ADMINISTRADOR */}
        {(modoVisualizacao === 'dividido' || modoVisualizacao === 'mapa') && (
          <div
            className={`relative transition-all ${
              modoVisualizacao === 'mapa'
                ? 'w-full h-full'
                : 'w-full h-[45vh] lg:h-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0'
            }`}
          >
            <MapaGrandeOvitrampa
              userPos={userPos}
              armadilhas={armadilhasFiltradas}
              armadilhaSelecionada={armadilhaSelecionada}
              onSelectArmadilha={(arm) => setArmadilhaSelecionada(arm)}
              mostrarTodosPontos={true}
              outrosAgentes={outrosAgentes}
              showLabels={mostrarRotulosAdmin}
              onToggleLabels={() => setMostrarRotulosAdmin((prev) => !prev)}
              showPanel={mostrarPainelAdmin}
              onTogglePanel={() => setMostrarPainelAdmin((prev) => !prev)}
            />

            {/* Badge flutuante sobre o mapa em modo dividido */}
            {modoVisualizacao === 'dividido' && (
              <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Mapa de Carmo ({armadilhasFiltradas.length} OVs)</span>
              </div>
            )}
          </div>
        )}

        {/* TABELA ADMINISTRATIVA COM DADOS E AÇÕES (OTIMIZADA PARA TOUCH TABLET SAMSUNG) */}
        {(modoVisualizacao === 'dividido' || modoVisualizacao === 'tabela') && (
          <div
            className={`overflow-auto flex-1 p-2.5 sm:p-4 ${
              modoVisualizacao === 'dividido'
                ? 'w-full lg:w-1/2 h-[55vh] lg:h-full'
                : 'w-full h-full'
            }`}
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full min-w-[620px] text-left text-xs text-slate-700">
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
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-bold space-y-1">
                        <p className="text-sm text-slate-500">Nenhum registro encontrado no sistema.</p>
                        <p className="text-[11px] text-slate-400">As armadilhas cadastradas pelos agentes aparecerão aqui automaticamente.</p>
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
                          <td className="py-3 px-3">
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px]">
                                {arm.palheta || `P-${arm.numero}`}
                              </span>
                              {arm.ultimaPalheta && arm.ultimaPalheta !== (arm.palheta || `P-${arm.numero}`) && (
                                <span className="text-[9px] text-slate-400 font-bold">
                                  Ant: {arm.ultimaPalheta}
                                </span>
                              )}
                            </div>
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
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors border border-slate-200 active:scale-95"
                                title="Ver detalhes da armadilha"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setArmadilhaEmEdicao(arm)}
                                className="p-2 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-700 transition-colors border border-amber-200 active:scale-95"
                                title="Editar dados da ovitrampa"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setArmadilhaParaExcluir(arm)}
                                className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 transition-colors border border-rose-200 active:scale-95"
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
      )}

      {/* MODAL DE DETALHES DA ARMADILHA (CLEAN & MODERNO) */}
      {armadilhaSelecionada && (
        <div
          onClick={() => setArmadilhaSelecionada(null)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150 my-auto"
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
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Palheta em Campo:</span>
                <span className="font-extrabold text-blue-700 text-sm">{armadilhaSelecionada.palheta || `P-${armadilhaSelecionada.numero}`}</span>
                {armadilhaSelecionada.ultimaPalheta && armadilhaSelecionada.ultimaPalheta !== (armadilhaSelecionada.palheta || `P-${armadilhaSelecionada.numero}`) && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">Última coletada: <strong className="text-slate-700">{armadilhaSelecionada.ultimaPalheta}</strong></span>
                )}
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

              {/* Observações, se houver */}
              {armadilhaSelecionada.observacoes && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Observações Técnicas:</span>
                  <p className="font-medium text-slate-700 mt-0.5 text-xs">{armadilhaSelecionada.observacoes}</p>
                </div>
              )}

              {/* DISTÂNCIAS DAS OVs VIZINHAS MAIS PRÓXIMAS (DIRETRIZ 300m - 400m) */}
              {(() => {
                const vizinhas = findNearbyTraps(armadilhaSelecionada, armadilhas, 3, armadilhaSelecionada.id);
                if (vizinhas.length === 0) return null;
                return (
                  <div className="bg-slate-50/95 rounded-2xl p-2.5 border border-slate-200/90 col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        3 OVs Vizinhas Mais Próximas (Regra 300m-400m)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Toque p/ focar</span>
                    </div>
                    <div className="space-y-1.5">
                      {vizinhas.map((viz) => (
                        <button
                          type="button"
                          key={viz.armadilha.id}
                          onClick={() => setArmadilhaSelecionada(viz.armadilha)}
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
                              style={{ backgroundColor: viz.corFundo, borderColor: viz.corBorda, color: viz.cor }}
                            >
                              {viz.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${armadilhaSelecionada.latitude},${armadilhaSelecionada.longitude}`, '_blank')}
                className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Rota no Maps</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setArmadilhaEmEdicao(armadilhaSelecionada);
                }}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 border border-amber-200 transition-colors active:scale-95"
                title="Editar dados da ovitrampa"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => setArmadilhaParaExcluir(armadilhaSelecionada)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 border border-rose-200 transition-colors active:scale-95"
                title="Excluir armadilha"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE DADOS DA OVITRAMPA */}
      {armadilhaEmEdicao && (
        <div
          onClick={() => setArmadilhaEmEdicao(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col"
          >
            {/* Cabeçalho do modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Correção Cadastral
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Editar ARM-{armadilhaEmEdicao.numero}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setArmadilhaEmEdicao(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com scroll suave */}
            <form onSubmit={handleSalvarEdicao} className="overflow-y-auto space-y-3.5 pr-1 flex-1">
              
              {/* Grupo 1: Identificação */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                  1. Identificação Operacional
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nº da Ovitrampa:
                    </label>
                    <input
                      type="text"
                      value={editForm.numero}
                      onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })}
                      placeholder="Ex: 01, 14"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Sem prefixo OV (ex: 01)</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nº da Palheta:
                    </label>
                    <input
                      type="text"
                      value={editForm.palheta}
                      onChange={(e) => setEditForm({ ...editForm, palheta: e.target.value })}
                      placeholder="Ex: P-01, PL-01"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-blue-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Grupo 2: Morador & Endereço */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                  2. Morador & Localização
                </span>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nome do Morador:
                  </label>
                  <input
                    type="text"
                    value={editForm.moradorNome}
                    onChange={(e) => setEditForm({ ...editForm, moradorNome: e.target.value })}
                    placeholder="Nome completo ou 'Não informado'"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Logradouro / Rua:
                    </label>
                    <input
                      type="text"
                      value={editForm.rua}
                      onChange={(e) => setEditForm({ ...editForm, rua: e.target.value })}
                      placeholder="Rua, Travessa ou Praça"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nº Imóvel:
                    </label>
                    <input
                      type="text"
                      value={editForm.numeroImovel}
                      onChange={(e) => setEditForm({ ...editForm, numeroImovel: e.target.value })}
                      placeholder="Ex: 125, S/N"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Microárea / Bairro:
                    </label>
                    <select
                      value={editForm.microarea}
                      onChange={(e) => setEditForm({ ...editForm, microarea: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {microareasDisponiveis.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Quarteirão:
                    </label>
                    <input
                      type="text"
                      value={editForm.quarteirao}
                      onChange={(e) => setEditForm({ ...editForm, quarteirao: e.target.value })}
                      placeholder="Ex: Q-01, Q-05"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Grupo 3: Leitura e Laboratório */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                  3. Situação de Campo & Laboratório
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Status da Armadilha:
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="instalada">Em campo (Pendente)</option>
                      <option value="analisada">Lida (Laboratório)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Qtd de Ovos (se lida):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.ultimosOvos}
                      onChange={(e) => setEditForm({ ...editForm, ultimosOvos: e.target.value })}
                      placeholder="0 para negativa"
                      disabled={editForm.status !== 'analisada'}
                      className={`w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:border-emerald-500 ${
                        editForm.status !== 'analisada' ? 'opacity-50 bg-slate-100 cursor-not-allowed' : 'text-emerald-700'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Grupo 4: Observações Técnicas */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Observações Técnicas / Ponto de Referência:
                </label>
                <textarea
                  rows={2}
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                  placeholder="Local de fixação no quintal, permissão do morador, recomendações..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setArmadilhaEmEdicao(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO INDIVIDUAL */}
      {armadilhaParaExcluir && (
        <div
          onClick={() => setArmadilhaParaExcluir(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3.5 text-slate-900 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Excluir ARM-{armadilhaParaExcluir.numero}?
                </h3>
                <p className="text-xs text-slate-500">
                  Morador: {armadilhaParaExcluir.moradorNome || 'Não informado'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
              Esta ação removerá a armadilha do mapa, do relatório consolidado e da sincronização com os tablets de todos os agentes.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setArmadilhaParaExcluir(null)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA TOTAL COM TRAVA TRIPLA DE SEGURANÇA */}
      {modalLimparTudoAberto && (
        <div
          onClick={() => {
            setModalLimparTudoAberto(false);
            setNomeResponsavelLimpeza('');
            setTextoConfirmacaoZerar('');
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-rose-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 animate-in zoom-in-95 duration-150"
          >
            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Operação Crítica e Irreversível
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Zerar Todos os Dados do Sistema?
                </h3>
              </div>
            </div>

            {/* Etapa 1: Alerta dos Dados Reais */}
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ETAPA 1: Confirmação do Impacto ({armadilhas.length} armadilhas ativas)
              </p>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Esta ação vai <strong>apagar definitivamente</strong> todas as <strong>{armadilhas.length} armadilhas</strong> cadastradas em campo, tanto na memória deste aparelho quanto no banco em nuvem (Cloudflare D1). Não há como desfazer após confirmar.
              </p>
            </div>

            {/* Etapa 2: Nome do Responsável Obrigatório */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                ETAPA 2: Nome do Responsável Autorizado <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={nomeResponsavelLimpeza}
                onChange={(e) => setNomeResponsavelLimpeza(e.target.value)}
                placeholder="Ex: Carlos Oliveira - Coordenador de Vigilância"
                className="w-full bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500">
                O nome ficará registrado no log de auditoria técnica do município de Carmo-RJ.
              </p>
            </div>

            {/* Etapa 3: Palavra de Confirmação ZERAR */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                ETAPA 3: Digite a palavra <span className="text-rose-600 uppercase font-mono tracking-widest bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">ZERAR</span> para liberar <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={textoConfirmacaoZerar}
                onChange={(e) => setTextoConfirmacaoZerar(e.target.value)}
                placeholder="Digite ZERAR aqui"
                className="w-full bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none transition-all tracking-wider uppercase"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setModalLimparTudoAberto(false);
                  setNomeResponsavelLimpeza('');
                  setTextoConfirmacaoZerar('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors active:scale-95"
              >
                Cancelar e Manter Dados
              </button>
              
              <button
                type="button"
                disabled={nomeResponsavelLimpeza.trim().length < 3 || textoConfirmacaoZerar.trim().toUpperCase() !== 'ZERAR'}
                onClick={handleConfirmarLimpezaTotal}
                className={`px-4 py-2.5 text-xs font-black rounded-2xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  nomeResponsavelLimpeza.trim().length >= 3 && textoConfirmacaoZerar.trim().toUpperCase() === 'ZERAR'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-rose-600/30'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sim, Limpar e Zerar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
