import React, { useState, useMemo } from 'react';
import {
  Compass, MapPin, Target, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, Share2, Copy, Check,
  FileText, ExternalLink, Filter, Search, ChevronRight,
  ShieldAlert, Info, Layers, RefreshCw, X, Zap, Sliders,
  RotateCcw, Eye, Navigation, User
} from 'lucide-react';
import { MapaCenarioIdeal } from './MapaCenarioIdeal';
import {
  getPontosIdeais,
  gerarGradeIdealDinamica,
  analisarDiagnosticoGrade,
  gerarGuiaWhatsApp,
  gerarParecerTecnicoIa,
  RAIO_COBERTURA_IDEAL_METROS
} from '../../lib/geoIdealGrid';

export function CenarioIdealScreen({
  armadilhas = [],
  onVoltar
}) {
  // Modo de visualização do cenário: 'atual' (Realidade do Campo) | 'ideal' (Grade do Zero) | 'comparar' (Comparativo)
  const [modoCenario, setModoCenario] = useState('atual'); // Começa mostrando a REALIDADE como o usuário pediu!

  // Estado da grade ativa (padrão 35 pontos ou gerada dinamicamente do zero)
  const [gradeCustomizada, setGradeCustomizada] = useState(null);
  const [tipoGradeAtiva, setTipoGradeAtiva] = useState('padrao'); // 'padrao' | 'denso' | 'amplo' | 'custom'

  // Pontos ideais ativos
  const pontosIdeais = useMemo(() => gradeCustomizada || getPontosIdeais(), [gradeCustomizada]);
  
  // Diagnóstico geodésico
  const diagnostico = useMemo(() => analisarDiagnosticoGrade(armadilhas, pontosIdeais), [armadilhas, pontosIdeais]);

  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  const [armadilhaSelecionada, setArmadilhaSelecionada] = useState(null);
  const [bairroFiltro, setBairroFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [abaVisualizacao, setAbaVisualizacao] = useState('mapa'); // 'mapa' | 'tabela'
  const [showLabels, setShowLabels] = useState(true);
  const [modalParecerAberto, setModalParecerAberto] = useState(false);
  const [modalGeradorAberto, setModalGeradorAberto] = useState(false);
  const [copiadoWhatsapp, setCopiadoWhatsapp] = useState(false);
  const [copiadoParecer, setCopiadoParecer] = useState(false);

  // Estados do Gerador Dinâmico
  const [geradorTipo, setGeradorTipo] = useState('padrao');
  const [geradorQtd, setGeradorQtd] = useState(35);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Executa geração dinâmica do zero
  const handleAplicarGeracao = (tipo, qtd) => {
    const novaGrade = gerarGradeIdealDinamica(tipo, tipo === 'custom' ? qtd : null);
    setGradeCustomizada(novaGrade);
    setTipoGradeAtiva(tipo);
    setModoCenario('ideal'); // Ao gerar do zero, pula automaticamente para o modo ideal
    setPontoSelecionado(null);
    setArmadilhaSelecionada(null);
    setModalGeradorAberto(false);
    showToast(`⚡ Nova grade ideal de ${novaGrade.length} pontos gerada com sucesso a partir dos 119 quarteirões habitados!`);
  };

  // Restaura a grade canônica de 35 pontos
  const handleRestaurarPadrao = () => {
    setGradeCustomizada(null);
    setTipoGradeAtiva('padrao');
    setPontoSelecionado(null);
    setArmadilhaSelecionada(null);
    setModalGeradorAberto(false);
    showToast(`✅ Grade padrão do Ministério da Saúde restaurada (35 pontos).`);
  };

  // Filtragem dos pontos ideais
  const pontosFiltrados = useMemo(() => {
    return diagnostico.detalheIdeais.filter((item) => {
      const p = item.pontoIdeal;
      const matchBairro = bairroFiltro === 'todos' || p.bairro === bairroFiltro;

      let matchStatus = true;
      if (statusFiltro === 'alinhados') {
        matchStatus = item.distanciaRealMetros != null && item.distanciaRealMetros <= 60;
      } else if (statusFiltro === 'ajuste_leve') {
        matchStatus = item.distanciaRealMetros != null && item.distanciaRealMetros > 60 && item.distanciaRealMetros <= 120;
      } else if (statusFiltro === 'remanejar') {
        matchStatus = item.distanciaRealMetros != null && item.distanciaRealMetros > 120;
      } else if (statusFiltro === 'vacuo') {
        matchStatus = !item.coberto;
      }

      const matchBusca =
        !busca.trim() ||
        p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        p.bairro.toLowerCase().includes(busca.toLowerCase()) ||
        p.quarteirao.toLowerCase().includes(busca.toLowerCase()) ||
        p.rua.toLowerCase().includes(busca.toLowerCase());

      return matchBairro && matchStatus && matchBusca;
    });
  }, [diagnostico, bairroFiltro, statusFiltro, busca]);

  // Filtragem das armadilhas reais (para modo 'atual')
  const armadilhasFiltradas = useMemo(() => {
    return armadilhas.filter((t) => {
      const matchBairro = bairroFiltro === 'todos' || (t.bairro && t.bairro === bairroFiltro);
      const matchBusca =
        !busca.trim() ||
        String(t.numero).includes(busca) ||
        (t.bairro && t.bairro.toLowerCase().includes(busca.toLowerCase())) ||
        (t.rua && t.rua.toLowerCase().includes(busca.toLowerCase())) ||
        (t.moradorNome && t.moradorNome.toLowerCase().includes(busca.toLowerCase())) ||
        (t.quarteirao && t.quarteirao.toLowerCase().includes(busca.toLowerCase()));

      return matchBairro && matchBusca;
    });
  }, [armadilhas, bairroFiltro, busca]);

  const handleCopiarWhatsApp = () => {
    const titulo = modoCenario === 'atual'
      ? 'Cenário Atual de Campo'
      : tipoGradeAtiva === 'padrao' ? 'Grade Padrão ~300m' : `Grade Dinâmica (${pontosIdeais.length} OVs)`;
    const texto = gerarGuiaWhatsApp(armadilhas, pontosIdeais, titulo);
    navigator.clipboard.writeText(texto);
    setCopiadoWhatsapp(true);
    setTimeout(() => setCopiadoWhatsapp(false), 3000);
  };

  const handleCompartilharWhatsApp = () => {
    const titulo = modoCenario === 'atual'
      ? 'Cenário Atual de Campo'
      : tipoGradeAtiva === 'padrao' ? 'Grade Padrão ~300m' : `Grade Dinâmica (${pontosIdeais.length} OVs)`;
    const texto = gerarGuiaWhatsApp(armadilhas, pontosIdeais, titulo);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const parecerTecnico = useMemo(() => gerarParecerTecnicoIa(diagnostico), [diagnostico]);

  const handleCopiarParecer = () => {
    const texto = [
      `🏛️ ${parecerTecnico.titulo.toUpperCase()}`,
      `📍 ${parecerTecnico.municipio} | Data: ${parecerTecnico.data}`,
      ``,
      `📋 RESUMO EXECUTIVO:`,
      parecerTecnico.resumoExecutivo,
      ``,
      `🔬 FUNDAMENTAÇÃO TÉCNICA (MINISTÉRIO DA SAÚDE / SUS):`,
      parecerTecnico.fundamentacao,
      ``,
      `🎯 RECOMENDAÇÕES PARA O PRÓXIMO CICLO:`,
      ...parecerTecnico.recomendacoes.map((r, i) => `${i + 1}. ${r}`),
      ``,
      `💡 CONCLUSÃO:`,
      parecerTecnico.conclusao
    ].join('\n');

    navigator.clipboard.writeText(texto);
    setCopiadoParecer(true);
    setTimeout(() => setCopiadoParecer(false), 3000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F1F2F5] text-slate-900 font-sans select-none overflow-hidden relative">
      
      {/* TOAST FLUTUANTE DE NOTIFICAÇÃO */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-purple-500/50 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. BARRA SUPERIOR DE CONTROLE E VISUALIZAÇÃO */}
      <header className="bg-white/95 border-b border-slate-200/90 backdrop-blur-md px-3 sm:px-5 py-2.5 shrink-0 shadow-xs z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Título & Badge de Modo */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              modoCenario === 'atual'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : modoCenario === 'ideal'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {modoCenario === 'atual' ? <MapPin className="w-4 h-4" /> : modoCenario === 'ideal' ? <Target className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  {modoCenario === 'atual' ? 'Cenário Atual (Realidade no Campo)' : modoCenario === 'ideal' ? 'Cenário Ideal (Grade do Zero)' : 'Comparativo: Realidade vs Ideal'}
                </h2>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  modoCenario === 'atual'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : modoCenario === 'ideal'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  <Sparkles className="w-2.5 h-2.5" />
                  {modoCenario === 'atual' ? `${armadilhas.length} Armadilhas Ativas` : `${pontosIdeais.length} Pontos Calculados`}
                </span>
                {gradeCustomizada && modoCenario !== 'atual' && (
                  <button
                    type="button"
                    onClick={handleRestaurarPadrao}
                    className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1 transition-all"
                    title="Voltar para a grade padrão de 35 pontos"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Restaurar 35 Padrão
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {modoCenario === 'atual'
                  ? 'Visualização da distribuição real das armadilhas instaladas hoje em Carmo-RJ'
                  : 'Planejamento geoespacial otimizado sobre a malha de 119 quarteirões habitados de Carmo'}
              </p>
            </div>
          </div>

          {/* SELETOR PRINCIPAL DE CENÁRIO (ATUAL vs IDEAL vs COMPARAR) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-300 text-xs font-black shadow-inner">
            <button
              type="button"
              onClick={() => setModoCenario('atual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                modoCenario === 'atual'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
              }`}
              title="Ver o Cenário Atual (a realidade das 35 armadilhas que estão hoje no campo)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Mostrar Atual ({armadilhas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setModoCenario('ideal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                modoCenario === 'ideal'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
              }`}
              title="Ver o Cenário Ideal Puro (grade regular calculada do zero)"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Cenário Ideal ({pontosIdeais.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setModoCenario('comparar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                modoCenario === 'comparar'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
              }`}
              title="Comparar o Cenário Atual com o Cenário Ideal (mostra as linhas de deslocamento)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Comparar</span>
            </button>
          </div>

          {/* Botões de Ação: Gerar do Zero, WhatsApp & Parecer Técnico */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setModalGeradorAberto(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md border border-purple-400/30"
              title="Gerar uma nova grade ideal do zero sem as armadilhas atuais"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Gerar Grade do Zero</span>
            </button>

            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs"
              title="Compartilhar roteiro via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setModalParecerAberto(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 active:scale-95 rounded-xl text-xs font-black transition-all shadow-xs"
              title="Ver Parecer Técnico Oficial para a Gestão / SUS"
            >
              <FileText className="w-3.5 h-3.5 text-purple-700" />
              <span className="hidden sm:inline">Parecer SUS</span>
            </button>
          </div>

        </div>

        {/* 2. LINHA DE KPIS E FILTROS */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          
          {/* Indicadores Conforme o Modo Ativo */}
          {modoCenario === 'atual' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-emerald-800 uppercase">Armadilhas no Campo</div>
                <div className="text-sm font-black text-emerald-900">{armadilhas.length} OVs</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-rose-800 uppercase">Sobreposições (&lt;160m)</div>
                <div className="text-sm font-black text-rose-900">{diagnostico.sobreposicoes.length} pares</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-purple-800 uppercase">Vácuos Descobertos</div>
                <div className="text-sm font-black text-purple-900">{diagnostico.gaps.length} setores</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-indigo-800 uppercase">Cobertura Urbana</div>
                <div className="text-sm font-black text-indigo-900">{diagnostico.coberturaPercentual}%</div>
              </div>
            </div>
          ) : modoCenario === 'ideal' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <div className="bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-purple-800 uppercase">Pontos Calculados</div>
                <div className="text-sm font-black text-purple-900">{diagnostico.totalIdeais}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-emerald-800 uppercase">Cobertura Projetada</div>
                <div className="text-sm font-black text-emerald-900">100% Habitada</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-indigo-800 uppercase">Espaçamento Regular</div>
                <div className="text-sm font-black text-indigo-900">~300m regular</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-emerald-800 uppercase">Manter (≤60m)</div>
                <div className="text-sm font-black text-emerald-900">{diagnostico.excelentes}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-amber-800 uppercase">Ajuste Leve</div>
                <div className="text-sm font-black text-amber-900">{diagnostico.ajustesLeves}</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-rose-800 uppercase">Remanejar</div>
                <div className="text-sm font-black text-rose-900">{diagnostico.remanejamentos}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shrink-0">
                <div className="text-[9px] font-black text-indigo-800 uppercase">Cobertura</div>
                <div className="text-sm font-black text-indigo-900">{diagnostico.coberturaPercentual}%</div>
              </div>
            </div>
          )}

          {/* Alternador de Modo: Mapa vs Lista */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black">
            <button
              type="button"
              onClick={() => setAbaVisualizacao('mapa')}
              className={`px-3 py-1 rounded-lg transition-all ${
                abaVisualizacao === 'mapa'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗺️ Mapa
            </button>
            <button
              type="button"
              onClick={() => setAbaVisualizacao('tabela')}
              className={`px-3 py-1 rounded-lg transition-all ${
                abaVisualizacao === 'tabela'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Lista ({modoCenario === 'atual' ? armadilhasFiltradas.length : pontosFiltrados.length})
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative flex items-center min-w-[140px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ponto / rua..."
              className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-800 text-[11px] font-bold pl-8 pr-2.5 py-1 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 transition-all"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL (MAPA OU TABELA) */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        
        {/* ABA: MAPA INTERATIVO */}
        {abaVisualizacao === 'mapa' && (
          <div className="relative w-full h-full">
            <MapaCenarioIdeal
              pontosIdeais={pontosFiltrados.map((i) => i.pontoIdeal)}
              todosPontosIdeais={pontosIdeais}
              armadilhasReais={armadilhas}
              pontoSelecionado={pontoSelecionado}
              onSelectPonto={(p) => setPontoSelecionado(p)}
              armadilhaSelecionada={armadilhaSelecionada}
              onSelectArmadilha={(t) => setArmadilhaSelecionada(t)}
              showLabels={showLabels}
              onToggleLabels={() => setShowLabels((prev) => !prev)}
              modoCenario={modoCenario}
              onChangeModoCenario={(m) => setModoCenario(m)}
            />

            {/* CARD FLUTUANTE DE DETALHE DE ARMADILHA REAL SELECIONADA (MODO ATUAL) */}
            {armadilhaSelecionada && modoCenario === 'atual' && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-200 shadow-2xl p-4 z-30 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs shadow-xs">
                      ARM-{armadilhaSelecionada.numero}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {armadilhaSelecionada.bairro || 'Carmo'}
                      </h4>
                      <p className="text-[11px] text-emerald-700 font-bold">
                        {armadilhaSelecionada.quarteirao || 'Quarteirão não informado'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setArmadilhaSelecionada(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">Endereço:</span>
                    <span className="font-extrabold text-slate-900">{armadilhaSelecionada.rua || 'S/N'}</span>
                  </div>
                  {armadilhaSelecionada.moradorNome && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-500">Morador:</span>
                      <span className="font-bold text-slate-800">{armadilhaSelecionada.moradorNome}</span>
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-slate-500">
                    GPS: {Number(armadilhaSelecionada.latitude).toFixed(6)}, {Number(armadilhaSelecionada.longitude).toFixed(6)}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${armadilhaSelecionada.latitude}, ${armadilhaSelecionada.longitude}`);
                      showToast('GPS da armadilha copiado!');
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black text-center transition-all"
                  >
                    Copiar GPS
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${armadilhaSelecionada.latitude},${armadilhaSelecionada.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black text-center flex items-center justify-center gap-1 transition-all"
                  >
                    <span>Como Chegar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* CARD FLUTUANTE DE DETALHE DO PONTO SELECIONADO (MODO IDEAL OU COMPARAR) */}
            {pontoSelecionado && modoCenario !== 'atual' && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-purple-200 shadow-2xl p-4 z-30 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-black text-xs shadow-xs">
                      {pontoSelecionado.codigo}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {pontoSelecionado.bairro}
                      </h4>
                      <p className="text-[11px] text-purple-700 font-bold">
                        {pontoSelecionado.quarteirao}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPontoSelecionado(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">Logradouro:</span>
                    <span className="font-extrabold text-slate-900">{pontoSelecionado.rua}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                    <span>GPS: {pontoSelecionado.latitude.toFixed(6)}, {pontoSelecionado.longitude.toFixed(6)}</span>
                  </div>
                </div>

                {/* Armadilha mais próxima no modo Comparar */}
                {modoCenario === 'comparar' && (() => {
                  const comp = diagnostico.detalheIdeais.find((i) => i.pontoIdeal.codigo === pontoSelecionado.codigo);
                  if (!comp || !comp.armadilhaMaisProxima) return null;
                  const d = comp.distanciaRealMetros;
                  const t = comp.armadilhaMaisProxima;
                  const isOk = d <= 60;
                  const isMid = d <= 120;

                  return (
                    <div className={`mt-3 p-2.5 rounded-xl border text-xs font-bold ${
                      isOk
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : isMid
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span>Armadilha no Campo: ARM-{t.numero}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white font-black text-[10px] shadow-xs">
                          {d}m de distância
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed">
                        {isOk
                          ? '✅ Posição atual perfeita! Recomenda-se manter no mesmo imóvel.'
                          : isMid
                          ? '⚠️ Alinhamento razoável. Pequeno ajuste no mesmo quarteirão melhorará a distribuição.'
                          : '🔄 Distância considerável. Recomenda-se deslocar a armadilha para cobrir este setor.'}
                      </p>
                    </div>
                  );
                })()}

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${pontoSelecionado.latitude}, ${pontoSelecionado.longitude}`);
                      showToast('Coordenadas GPS copiadas!');
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black text-center transition-all"
                  >
                    Copiar GPS
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${pontoSelecionado.latitude},${pontoSelecionado.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black text-center flex items-center justify-center gap-1 transition-all"
                  >
                    <span>Como Chegar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: LISTA TABELAR (CONFORME O MODO SELECIONADO) */}
        {abaVisualizacao === 'tabela' && (
          <div className="w-full h-full overflow-y-auto p-3 sm:p-5 space-y-3">
            <div className="max-w-4xl mx-auto space-y-3">
              
              {/* Header da Lista */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {modoCenario === 'atual'
                        ? `Armadilhas em Campo (${armadilhasFiltradas.length} OVs exibidas)`
                        : `Grade Ideal de Vigilância (${pontosFiltrados.length} pontos exibidos)`}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {modoCenario === 'atual'
                        ? 'Lista de armadilhas atualmente instaladas e ativas nos bairros de Carmo'
                        : 'Diretrizes geoespaciais e logradouros calculados para cobertura equilibrada'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopiarWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all border border-slate-200"
                  >
                    {copiadoWhatsapp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoWhatsapp ? 'Copiado!' : 'Copiar Roteiro'}</span>
                  </button>
                </div>
              </div>

              {/* LISTA NO MODO ATUAL (ARMADILHAS REAIS) */}
              {modoCenario === 'atual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {armadilhasFiltradas.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setArmadilhaSelecionada(t);
                        setAbaVisualizacao('mapa');
                      }}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200">
                              ARM-{t.numero}
                            </span>
                            <div>
                              <h4 className="text-xs font-black text-slate-900 leading-tight">
                                {t.bairro || 'Carmo'}
                              </h4>
                              <span className="text-[10px] font-bold text-emerald-700">
                                {t.quarteirao || 'S/Q'}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                            📦 Ativa
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 line-clamp-1">
                          📍 {t.rua || 'Logradouro não informado'}
                        </p>
                        {t.moradorNome && (
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            👤 {t.moradorNome}
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {Number(t.latitude).toFixed(6)}, {Number(t.longitude).toFixed(6)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="text-[10px] text-slate-400">Instalada no campo</span>
                        <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1 hover:underline">
                          Ver no Mapa <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LISTA NO MODO IDEAL OU COMPARAR */}
              {modoCenario !== 'atual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pontosFiltrados.map((item) => {
                    const p = item.pontoIdeal;
                    const t = item.armadilhaMaisProxima;
                    const d = item.distanciaRealMetros;
                    const isOk = d != null && d <= 60;
                    const isMid = d != null && d > 60 && d <= 120;
                    const isGap = !item.coberto;

                    return (
                      <div
                        key={p.codigo}
                        onClick={() => {
                          setPontoSelecionado(p);
                          setAbaVisualizacao('mapa');
                        }}
                        className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center border border-purple-200">
                                {p.codigo}
                              </span>
                              <div>
                                <h4 className="text-xs font-black text-slate-900 leading-tight">
                                  {p.bairro}
                                </h4>
                                <span className="text-[10px] font-bold text-purple-700">
                                  {p.quarteirao}
                                </span>
                              </div>
                            </div>

                            {modoCenario === 'comparar' && (
                              <>
                                {isOk && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                                    ✅ Manter ({d}m)
                                  </span>
                                )}
                                {isMid && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                                    ⚠️ Ajuste ({d}m)
                                  </span>
                                )}
                                {!isOk && !isMid && !isGap && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black">
                                    🔄 Deslocar ({d}m)
                                  </span>
                                )}
                                {isGap && (
                                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-black">
                                    🚨 Vácuo
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <p className="text-xs font-bold text-slate-800 line-clamp-1">
                            📍 {p.rua}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                          <span className="text-[11px] font-medium">
                            {t ? `Mais próxima: ARM-${t.numero}` : 'Nenhuma OV próxima'}
                          </span>
                          <span className="text-purple-600 font-bold text-[11px] flex items-center gap-1 hover:underline">
                            Ver no Mapa <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* 4. MODAL: GERADOR DINÂMICO DE GRADE DO ZERO */}
      {modalGeradorAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95">
            
            <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white p-4 sm:p-5 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black text-purple-200 uppercase tracking-wider block mb-1">
                  Inteligência Geoespacial • Malha Habitada de Carmo-RJ
                </span>
                <h3 className="text-base sm:text-lg font-black leading-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  Gerar Cenário Ideal do Zero
                </h3>
                <p className="text-xs text-purple-200 font-medium mt-1">
                  Calcule uma distribuição 100% nova sem depender das armadilhas instaladas atualmente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalGeradorAberto(false)}
                className="p-1 text-purple-300 hover:text-white rounded-xl hover:bg-purple-600/50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs text-slate-700">
              <p className="font-bold text-slate-800">
                Selecione o modelo de cobertura desejado para o recálculo dos 119 quarteirões urbanos habitados:
              </p>

              <div className="space-y-2.5">
                <div
                  onClick={() => setGeradorTipo('padrao')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    geradorTipo === 'padrao'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    geradorTipo === 'padrao' ? 'border-purple-600 bg-purple-600' : 'border-slate-400'
                  }`}>
                    {geradorTipo === 'padrao' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">Padrão Ministério da Saúde (35 OVs)</span>
                      <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">Recomendado</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Espaçamento regular de ~300m. 1 armadilha em cada bairro + preenchimento ótimo dos quarteirões mais povoados.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setGeradorTipo('denso')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    geradorTipo === 'denso'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    geradorTipo === 'denso' ? 'border-purple-600 bg-purple-600' : 'border-slate-400'
                  }`}>
                    {geradorTipo === 'denso' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">Alta Densidade / Período Epidêmico (~42 OVs)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Espaçamento mais curto (~240m). Aumenta a amostragem em áreas críticas e quarteirões com alta densidade demográfica.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setGeradorTipo('amplo')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    geradorTipo === 'amplo'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    geradorTipo === 'amplo' ? 'border-purple-600 bg-purple-600' : 'border-slate-400'
                  }`}>
                    {geradorTipo === 'amplo' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">Econômica / Malha Ampla (~28 OVs)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Espaçamento estendido de ~350m. Menos armadilhas mantendo cobertura dos principais bairros urbanos.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setGeradorTipo('custom')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    geradorTipo === 'custom'
                      ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    geradorTipo === 'custom' ? 'border-purple-600 bg-purple-600' : 'border-slate-400'
                  }`}>
                    {geradorTipo === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-xs">Quantidade Personalizada</span>
                      <span className="font-black text-purple-700 text-xs">{geradorQtd} Armadilhas</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={20}
                        max={50}
                        step={1}
                        value={geradorQtd}
                        onChange={(e) => {
                          setGeradorQtd(Number(e.target.value));
                          setGeradorTipo('custom');
                        }}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Arraste para escolher entre 20 e 50 armadilhas. A IA calculará a melhor posição geodésica.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-200 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Oficial (35)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalGeradorAberto(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAplicarGeracao(geradorTipo, geradorQtd)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Calcular e Gerar Grade</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL: PARECER TÉCNICO OFICIAL PARA GESTÃO / SUS */}
      {modalParecerAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="bg-purple-900 text-white p-4 sm:p-6 flex items-start justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider block mb-1">
                  Vigilância Ambiental em Saúde • Carmo - RJ
                </span>
                <h3 className="text-base sm:text-lg font-black leading-tight">
                  {parecerTecnico.titulo}
                </h3>
                <p className="text-xs text-purple-200 font-medium mt-1">
                  Diretrizes Técnicas e Entomológicas (Ministério da Saúde / PNCA)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalParecerAberto(false)}
                className="p-1 text-purple-300 hover:text-white rounded-xl hover:bg-purple-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
              
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5">
                <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Resumo Executivo
                </h4>
                <p className="text-purple-950 font-medium leading-relaxed">
                  {parecerTecnico.resumoExecutivo}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-1">
                  1. Fundamentação Técnica & Entomológica
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  {parecerTecnico.fundamentacao}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                  2. Recomendações Estratégicas para a Próxima Implantação
                </h4>
                <ul className="space-y-2">
                  {parecerTecnico.recomendacoes.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-1">
                  3. Conclusão da Coordenação
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  {parecerTecnico.conclusao}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
                <span>Relatório emitido em: {parecerTecnico.data}</span>
                <span className="font-bold text-slate-700">Vigilância Ambiental • Município de Carmo - RJ</span>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopiarParecer}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs"
              >
                {copiadoParecer ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiadoParecer ? 'Parecer Copiado!' : 'Copiar Parecer Completo'}</span>
              </button>
              <button
                type="button"
                onClick={() => setModalParecerAberto(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-all"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
