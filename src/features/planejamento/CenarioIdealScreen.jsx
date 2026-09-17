import React, { useState, useMemo } from 'react';
import {
  Compass, MapPin, Target, Sparkles, Share2, Copy, Check,
  FileText, ExternalLink, Search, ChevronRight, X, Zap, RotateCcw,
  Car, Navigation, CheckCircle2, Send
} from 'lucide-react';
import { MapaCenarioIdeal } from './MapaCenarioIdeal';
import {
  getPontosIdeais,
  gerarGradeIdealDinamica,
  analisarDiagnosticoGrade,
  gerarGuiaWhatsApp,
  gerarParecerTecnicoIa
} from '../../lib/geoIdealGrid';
import {
  calcularRotaColetaOtimizada,
  enriquecerRotaComRuasOSRM
} from '../../lib/geoRoutingOvitrampa';

export function CenarioIdealScreen({
  armadilhas = [],
  onVoltar
}) {
  // Modos de Operação:
  // 'atual' -> Realidade do Campo (35 armadilhas ativas)
  // 'ideal' -> Grade Ideal calculada (~300m regular)
  // 'rota'  -> Rota de Coleta Otimizada para Veículos (1 ou 2 carros)
  const [modoCenario, setModoCenario] = useState('atual');

  // Quantidade de veículos para coleta: 1 ou 2
  const [numVeiculos, setNumVeiculos] = useState(1);

  // Grade ativa calculada (com persistência de alterações manuais no localStorage)
  const [gradeCustomizada, setGradeCustomizada] = useState(() => {
    try {
      const salvo = localStorage.getItem('gps_ovitrampas_grade_customizada');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar grade personalizada salva:', e);
    }
    return null;
  });

  const salvarGrade = (novaGrade) => {
    setGradeCustomizada(novaGrade);
    try {
      localStorage.setItem('gps_ovitrampas_grade_customizada', JSON.stringify(novaGrade));
    } catch (e) {
      console.warn('Erro ao salvar grade no localStorage:', e);
    }
  };

  const handleUpdatePonto = (pontoAtualizado) => {
    const lista = gradeCustomizada || getPontosIdeais();
    const novaGrade = lista.map((p) =>
      p.codigo === pontoAtualizado.codigo ? { ...p, ...pontoAtualizado } : p
    );
    salvarGrade(novaGrade);
    showToast(`📍 Armadilha ${pontoAtualizado.codigo} reposicionada em ${pontoAtualizado.bairro} (${pontoAtualizado.quarteirao})!`);
  };

  const handleAddPonto = (novoPonto) => {
    const lista = gradeCustomizada || getPontosIdeais();
    const novaGrade = [...lista, novoPonto];
    salvarGrade(novaGrade);
    showToast(`✨ Armadilha ${novoPonto.codigo} inserida com sucesso no ${novoPonto.bairro}!`);
  };

  const handleDeletePonto = (codigo) => {
    const lista = gradeCustomizada || getPontosIdeais();
    const novaGrade = lista.filter((p) => p.codigo !== codigo);
    salvarGrade(novaGrade);
    if (pontoSelecionado?.codigo === codigo) setPontoSelecionado(null);
    showToast(`🗑️ Armadilha ${codigo} excluída.`);
  };

  // Pontos ideais ativos
  const pontosIdeais = useMemo(() => gradeCustomizada || getPontosIdeais(), [gradeCustomizada]);
  
  // Diagnóstico geodésico
  const diagnostico = useMemo(() => analisarDiagnosticoGrade(armadilhas, pontosIdeais), [armadilhas, pontosIdeais]);

  // Rota de Coleta Otimizada calculada em tempo real e enriquecida com traçado real de ruas (OSRM)
  const [dadosRota, setDadosRota] = useState(null);

  React.useEffect(() => {
    const pontosBase = armadilhas && armadilhas.length > 0 ? armadilhas : pontosIdeais;
    const rotaInicial = calcularRotaColetaOtimizada(pontosBase, numVeiculos);
    setDadosRota(rotaInicial);

    if (!rotaInicial) return;

    let ativo = true;
    enriquecerRotaComRuasOSRM(rotaInicial)
      .then((rotaEnriquecida) => {
        if (ativo && rotaEnriquecida) {
          setDadosRota(rotaEnriquecida);
        }
      })
      .catch((err) => {
        console.warn('Fallback para rota direta:', err);
      });

    return () => {
      ativo = false;
    };
  }, [armadilhas, pontosIdeais, numVeiculos]);

  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  const [armadilhaSelecionada, setArmadilhaSelecionada] = useState(null);
  const [busca, setBusca] = useState('');
  const [abaVisualizacao, setAbaVisualizacao] = useState('mapa'); // 'mapa' | 'tabela'
  const [showLabels, setShowLabels] = useState(true);
  const [modalParecerAberto, setModalParecerAberto] = useState(false);
  const [modalGeradorAberto, setModalGeradorAberto] = useState(false);
  const [copiadoWhatsapp, setCopiadoWhatsapp] = useState(false);
  const [copiadoParecer, setCopiadoParecer] = useState(false);

  // Estados do Gerador Dinâmico
  const [geradorTipo, setGeradorTipo] = useState('recomendado');
  const [geradorQtd, setGeradorQtd] = useState(26);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Aplica geração dinâmica do zero
  const handleAplicarGeracao = (tipo, qtd) => {
    let n = 26;
    if (tipo === 'recomendado') n = 26;
    else if (tipo === 'completo') n = 35;
    else n = qtd;

    const novaGrade = gerarGradeIdealDinamica('custom', n);
    salvarGrade(novaGrade);
    setModoCenario('ideal');
    setPontoSelecionado(null);
    setArmadilhaSelecionada(null);
    setModalGeradorAberto(false);
    showToast(`⚡ Grade com ${novaGrade.length} pontos regulares gerada com sucesso!`);
  };

  const handleRestaurarPadrao = () => {
    try {
      localStorage.removeItem('gps_ovitrampas_grade_customizada');
    } catch (e) {}
    setGradeCustomizada(null);
    setPontoSelecionado(null);
    setArmadilhaSelecionada(null);
    setModalGeradorAberto(false);
    showToast(`✅ Grade otimizada oficial restaurada.`);
  };

  // Filtragem rápida
  const armadilhasFiltradas = useMemo(() => {
    if (!busca.trim()) return armadilhas;
    const b = busca.toLowerCase();
    return armadilhas.filter(
      (t) =>
        String(t.numero).includes(b) ||
        (t.bairro && t.bairro.toLowerCase().includes(b)) ||
        (t.rua && t.rua.toLowerCase().includes(b)) ||
        (t.moradorNome && t.moradorNome.toLowerCase().includes(b))
    );
  }, [armadilhas, busca]);

  const pontosFiltrados = useMemo(() => {
    if (!busca.trim()) return pontosIdeais;
    const b = busca.toLowerCase();
    return pontosIdeais.filter(
      (p) =>
        p.codigo.toLowerCase().includes(b) ||
        p.bairro.toLowerCase().includes(b) ||
        p.quarteirao.toLowerCase().includes(b) ||
        p.rua.toLowerCase().includes(b)
    );
  }, [pontosIdeais, busca]);

  // Compartilhamento da Rota de Coleta via WhatsApp
  const handleCompartilharRota = (veiculoIndex = 0) => {
    if (!dadosRota || !dadosRota.rotas || !dadosRota.rotas[veiculoIndex]) return;
    const texto = dadosRota.rotas[veiculoIndex].textoWhatsApp;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleCopiarRota = (veiculoIndex = 0) => {
    if (!dadosRota || !dadosRota.rotas || !dadosRota.rotas[veiculoIndex]) return;
    const texto = dadosRota.rotas[veiculoIndex].textoWhatsApp;
    navigator.clipboard.writeText(texto);
    showToast(`Roteiro do ${dadosRota.rotas[veiculoIndex].nome} copiado!`);
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
      
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-2xl shadow-2xl border border-purple-500/50 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DO MÓDULO (MAPA DE PLANEJAMENTO DAS AÇÕES) */}
      <header className="bg-white/95 border-b border-slate-200/90 backdrop-blur-md px-3 sm:px-5 py-2.5 shrink-0 shadow-xs z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Título Oficial */}
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              modoCenario === 'rota'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : modoCenario === 'atual'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-purple-100 text-purple-700 border border-purple-300'
            }`}>
              {modoCenario === 'rota' ? <Car className="w-5 h-5" /> : modoCenario === 'atual' ? <MapPin className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Mapa de Planejamento das Ações
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  modoCenario === 'rota'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : modoCenario === 'atual'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-purple-50 text-purple-800 border-purple-300'
                }`}>
                  {modoCenario === 'rota'
                    ? `Rota Otimizada (${numVeiculos} ${numVeiculos === 1 ? 'Veículo' : 'Veículos'})`
                    : modoCenario === 'atual'
                    ? `${armadilhas.length} Armadilhas Ativas`
                    : `${pontosIdeais.length} Pontos Calculados`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {modoCenario === 'rota'
                  ? 'Trajeto mais curto e econômico para recolhimento quinzenal das palhetas com carro'
                  : modoCenario === 'atual'
                  ? 'Visualização da distribuição real no campo com linhas de distância entre armadilhas'
                  : 'Grade homogênea calculada sobre os 119 quarteirões habitados de Carmo'}
              </p>
            </div>
          </div>

          {/* SELETOR DE MODOS PRINCIPAL (REALIDADE vs GRADE IDEAL vs ROTA DE COLETA) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-300 text-xs font-black shadow-inner self-start lg:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setModoCenario('atual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                modoCenario === 'atual'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Realidade Atual ({armadilhas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setModoCenario('ideal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                modoCenario === 'ideal'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Grade Ideal ({pontosIdeais.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setModoCenario('rota')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                modoCenario === 'rota'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Rota de Coleta 🚗</span>
            </button>
          </div>

          {/* BOTÕES DE AÇÃO ESPECÍFICOS */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {modoCenario === 'rota' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleCompartilharRota(0)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs"
                  title="Enviar Roteiro de Paradas para o Motorista via WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp {numVeiculos === 2 ? 'Carro 1' : 'Rota'}</span>
                </button>

                {numVeiculos === 2 && (
                  <button
                    type="button"
                    onClick={() => handleCompartilharRota(1)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs"
                    title="Enviar Roteiro do Carro 2 via WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Carro 2</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setModalGeradorAberto(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md"
                  title="Recalcular ou gerar uma nova grade do zero"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Gerar Nova Grade</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalParecerAberto(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 active:scale-95 rounded-xl text-xs font-black transition-all shadow-xs"
                  title="Ver Parecer Técnico Oficial para o SUS"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-700" />
                  <span className="hidden sm:inline">Parecer SUS</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* 2. SUB-BARRA DE INDICADORES E ROTEIRIZAÇÃO */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          
          {/* SELETORES DO MODO ROTA */}
          {modoCenario === 'rota' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">Frota disponível:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setNumVeiculos(1)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    numVeiculos === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🚗 1 Veículo (~{dadosRota?.rotas?.[0]?.kmTotal || 0} km)
                </button>
                <button
                  type="button"
                  onClick={() => setNumVeiculos(2)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    numVeiculos === 2 ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🚗🚙 2 Veículos (Divisão Norte/Sul)
                </button>
              </div>

              {dadosRota && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1 rounded-xl">
                  <span>⏱️ Tempo Estimado: ~{dadosRota.tempoEstimadoGlobal}</span>
                  <span>•</span>
                  <span>🛣️ Quilometragem Total: ~{dadosRota.kmTotalGlobal} km</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black">
              <button
                type="button"
                onClick={() => setAbaVisualizacao('mapa')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  abaVisualizacao === 'mapa' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🗺️ Ver Mapa
              </button>
              <button
                type="button"
                onClick={() => setAbaVisualizacao('tabela')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  abaVisualizacao === 'tabela' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Ver Lista ({modoCenario === 'atual' ? armadilhasFiltradas.length : pontosFiltrados.length})
              </button>
            </div>
          )}

          {/* Campo de Busca Rápida */}
          <div className="relative flex items-center min-w-[150px] max-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ponto, rua..."
              className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-800 text-xs font-bold pl-8 pr-2.5 py-1 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 transition-all"
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

      {/* 3. CONTEÚDO PRINCIPAL (MAPA OU ROTEIRO) */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        
        {/* VISUALIZAÇÃO MAPA */}
        {abaVisualizacao === 'mapa' && (
          <div className="relative w-full h-full">
            <MapaCenarioIdeal
              pontosIdeais={pontosFiltrados}
              armadilhasReais={armadilhasFiltradas}
              pontoSelecionado={pontoSelecionado}
              onSelectPonto={(p) => setPontoSelecionado(p)}
              armadilhaSelecionada={armadilhaSelecionada}
              onSelectArmadilha={(t) => setArmadilhaSelecionada(t)}
              showLabels={showLabels}
              onToggleLabels={() => setShowLabels((prev) => !prev)}
              modoCenario={modoCenario}
              onChangeModoCenario={(m) => setModoCenario(m)}
              dadosRota={dadosRota}
              numVeiculos={numVeiculos}
              onChangeNumVeiculos={(n) => setNumVeiculos(n)}
              onUpdatePonto={handleUpdatePonto}
              onAddPonto={handleAddPonto}
              onDeletePonto={handleDeletePonto}
              onRestaurarPadrao={handleRestaurarPadrao}
              isCustomizada={Boolean(gradeCustomizada)}
            />

            {/* CARD INFORMATIVO QUANDO NO MODO ROTA */}
            {modoCenario === 'rota' && dadosRota && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200 shadow-2xl p-4 z-30 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      🚗
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        Roteiro de Coleta de Palhetas
                      </h4>
                      <p className="text-[10px] text-blue-700 font-bold">
                        {numVeiculos === 1 ? '1 Carro • Circuito Completo' : '2 Carros • Coleta em Paralelo'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    ~{dadosRota.kmTotalGlobal} km
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  {dadosRota.rotas.map((r, i) => (
                    <div key={r.id} className="p-2 rounded-xl border bg-slate-50 border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block text-xs" style={{ color: r.cor }}>
                          {r.nome}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {r.paradas.length} paradas • ~{r.kmTotal} km • ~{r.tempoFormatado}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCompartilharRota(i)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>💡 Economia estimada: ~40% em combustível</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISUALIZAÇÃO TABELA / LISTA */}
        {abaVisualizacao === 'tabela' && (
          <div className="w-full h-full overflow-y-auto p-3 sm:p-5 space-y-3">
            <div className="max-w-4xl mx-auto space-y-3">
              
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {modoCenario === 'rota'
                      ? `Roteiro Sequencial de Paradas da Coleta (${dadosRota?.kmTotalGlobal || 0} km total)`
                      : modoCenario === 'atual'
                      ? `Armadilhas em Campo (${armadilhasFiltradas.length} ativas)`
                      : `Grade Ideal de Vigilância (${pontosFiltrados.length} pontos)`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {modoCenario === 'rota'
                      ? 'Sequência exata das paradas para colher palhetas pelo menor caminho'
                      : 'Lista detalhada com logradouros, quarteirões e coordenadas GPS'}
                  </p>
                </div>
                {modoCenario === 'rota' ? (
                  <button
                    type="button"
                    onClick={() => handleCompartilharRota(0)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Rota</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const t = modoCenario === 'atual' ? 'Realidade' : 'Grade Ideal';
                      const texto = gerarGuiaWhatsApp(armadilhas, pontosIdeais, t);
                      navigator.clipboard.writeText(texto);
                      showToast('Lista copiada!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all border border-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Lista</span>
                  </button>
                )}
              </div>

              {/* LISTA NO MODO ROTA: ITINERÁRIO SEQUENCIAL */}
              {modoCenario === 'rota' && dadosRota && (
                <div className="space-y-4">
                  {dadosRota.rotas.map((veiculo) => (
                    <div key={veiculo.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: veiculo.cor }} />
                          <h4 className="text-sm font-black text-slate-900">{veiculo.nome}</h4>
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {veiculo.paradas.length} paradas • {veiculo.kmTotal} km • ~{veiculo.tempoFormatado}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {veiculo.paradas.map((p) => (
                          <div key={p.ordem} className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 flex items-start gap-2.5 text-xs">
                            <span className="w-6 h-6 rounded-full text-white font-black text-[11px] flex items-center justify-center shrink-0" style={{ backgroundColor: veiculo.cor }}>
                              {p.ordem}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-900">ARM-{p.numero || p.codigo}</span>
                                {p.distanciaDoAnteriorMetros > 0 ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    +{p.distanciaDoAnteriorMetros}m
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    Partida
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-700 truncate mt-0.5">
                                📍 {p.rua || 'S/N'} • {p.bairro}
                              </p>
                              {p.moradorNome && (
                                <p className="text-[10px] text-slate-500 truncate">
                                  👤 {p.moradorNome}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LISTA NO MODO ATUAL OU IDEAL */}
              {modoCenario !== 'rota' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(modoCenario === 'atual' ? armadilhasFiltradas : pontosFiltrados).map((item, idx) => (
                    <div
                      key={item.id || item.codigo || idx}
                      onClick={() => {
                        if (modoCenario === 'atual') setArmadilhaSelecionada(item);
                        else setPontoSelecionado(item);
                        setAbaVisualizacao('mapa');
                      }}
                      className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center border ${
                            modoCenario === 'atual' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}>
                            {item.numero ? `ARM-${item.numero}` : item.codigo}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {item.bairro || 'Carmo'}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-500">
                              {item.quarteirao || 'S/Q'}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          modoCenario === 'atual' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {modoCenario === 'atual' ? '📦 Campo' : '🎯 ~300m'}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        📍 {item.rua || 'Logradouro não informado'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="text-[10px] font-mono">{Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}</span>
                        <span className="text-purple-600 font-bold text-[11px] flex items-center gap-1 hover:underline">
                          Ver no Mapa <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* 4. MODAL: GERADOR DE GRADE DO ZERO */}
      {modalGeradorAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95">
            
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 sm:p-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black leading-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  Gerar Grade Ideal do Zero
                </h3>
                <p className="text-xs text-purple-200 font-medium mt-0.5">
                  Distribuição calculada sobre os 119 quarteirões habitados de Carmo-RJ
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

            <div className="p-4 sm:p-5 space-y-3 text-xs text-slate-700">
              <p className="font-bold text-slate-800">
                Escolha o número de armadilhas para calcular a distribuição:
              </p>

              <div className="space-y-2">
                <div
                  onClick={() => setGeradorTipo('recomendado')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                    geradorTipo === 'recomendado' ? 'border-purple-600 bg-purple-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    geradorTipo === 'recomendado' ? 'border-purple-600 bg-purple-600' : 'border-slate-400'
                  }`}>
                    {geradorTipo === 'recomendado' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-xs">Grade Equilibrada (~26 OVs)</span>
                      <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">Recomendada</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                      Espaçamento regular de ~300m a 350m cobrindo toda a cidade sem sobreposições.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setGeradorTipo('completo')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                    geradorTipo === 'completo' ? 'border-purple-600 bg-purple-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    geradorTipo === 'completo' ? 'border-purple-600 bg-purple-600' : 'border-slate-400'
                  }`}>
                    {geradorTipo === 'completo' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-black text-slate-900 text-xs">Grade Oficial (35 OVs)</span>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                      Grade completa com 35 armadilhas distribuídas por toda a extensão municipal.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setGeradorTipo('custom')}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                    geradorTipo === 'custom' ? 'border-purple-600 bg-purple-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
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
                      <span className="font-black text-purple-700 text-xs">{geradorQtd} OVs</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={45}
                      step={1}
                      value={geradorQtd}
                      onChange={(e) => {
                        setGeradorQtd(Number(e.target.value));
                        setGeradorTipo('custom');
                      }}
                      className="w-full mt-1.5 accent-purple-600 cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar 35 Padrão</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalGeradorAberto(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAplicarGeracao(geradorTipo, geradorQtd)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Aplicar Grade</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL: PARECER TÉCNICO OFICIAL */}
      {modalParecerAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="bg-purple-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider block mb-1">
                  Vigilância Ambiental em Saúde • Carmo - RJ
                </span>
                <h3 className="text-base sm:text-lg font-black leading-tight">
                  {parecerTecnico.titulo}
                </h3>
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
                  Fundamentação Técnica (SUS / Ministério da Saúde)
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  {parecerTecnico.fundamentacao}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                  Recomendações Operacionais
                </h4>
                <ul className="space-y-1.5">
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
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopiarParecer}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs"
              >
                {copiadoParecer ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiadoParecer ? 'Parecer Copiado!' : 'Copiar Parecer'}</span>
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
