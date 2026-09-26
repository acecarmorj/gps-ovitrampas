import React, { useMemo, useState } from 'react';
import {
  FileText, Satellite, Download, ClipboardList,
  Flame, BarChart3, Users, EyeOff, Eye, Search,
  Calendar, CheckCircle2, AlertTriangle, Clock, Layers
} from 'lucide-react';
import { gerarRelatorioPdfEntomologico } from '../../lib/pdfRelatorioEntomologico';
import { gerarRelatorioPdfOperacional } from '../../lib/pdfRelatorioConsolidado';
import {
  gerarPdfIndicesIpoIdoComGraficos,
  gerarPdfFocosCriticosComGraficos,
  gerarPdfPendenciasCampoComGraficos,
  gerarPdfInventarioCompleto
} from '../../lib/pdfRelatoriosGraficos';
import { calcularSituacaoArmadilha, classificarRiscoOvos } from '../../lib/situacaoOvitrampa';

const lida = (a) => a.status === 'analisada' && a.ultimosOvos != null;
const ovosDe = (a) => Number(a.ultimosOvos) || 0;
const bairroDe = (a) => (a.bairro || a.microarea || 'Sem bairro').trim();

// IPO = % de ovitrampas lidas que tem ovos. IDO = média de ovos por
// ovitrampa positiva. Regra oficial de vigilância entomológica.
function indicesDe(lista) {
  const lidas = lista.filter(lida);
  const positivas = lidas.filter((a) => ovosDe(a) > 0);
  const totalOvos = lidas.reduce((soma, a) => soma + ovosDe(a), 0);
  return {
    armadilhas: lista.length,
    lidas: lidas.length,
    positivas: positivas.length,
    totalOvos,
    ipo: lidas.length ? (positivas.length / lidas.length) * 100 : null,
    ido: positivas.length ? totalOvos / positivas.length : null
  };
}

function baixarCsv(nome, colunas, linhas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const conteudo =
    '\ufeff' + [colunas.map(esc).join(';'), ...linhas.map((l) => l.map(esc).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const fmt = (n, casas = 1) => (n == null ? '-' : n.toFixed(casas).replace('.', ','));

export function PainelRelatorios({ armadilhas = [], onAbrirPainelCompleto }) {
  const [bairro, setBairro] = useState('todos');
  const [situacao, setSituacao] = useState('todas');
  const [busca, setBusca] = useState('');
  const [ocultarMorador, setOcultarMorador] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('palhetas'); // 'palhetas' | 'bairros'

  const avisar = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 4000);
  };

  const bairros = useMemo(
    () => [...new Set(armadilhas.map(bairroDe))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [armadilhas]
  );

  const filtradas = useMemo(
    () =>
      armadilhas.filter((a) => {
        if (bairro !== 'todos' && bairroDe(a) !== bairro) return false;

        const sit = calcularSituacaoArmadilha(a);
        if (situacao === 'lidas' && !lida(a)) return false;
        if (situacao === 'positivas' && !(lida(a) && ovosDe(a) > 0)) return false;
        if (situacao === 'campo' && lida(a)) return false;
        if (situacao === 'urgentes' && sit.fase !== 'hoje' && sit.fase !== 'atrasada') return false;

        if (busca.trim()) {
          const termo = busca.toLowerCase().trim();
          const matchNum = String(a.numero || '').toLowerCase().includes(termo);
          const matchPalh = String(a.palheta || '').toLowerCase().includes(termo);
          const matchUltPalh = String(a.ultimaPalheta || '').toLowerCase().includes(termo);
          const matchBairro = bairroDe(a).toLowerCase().includes(termo);
          const matchMorador = String(a.moradorNome || '').toLowerCase().includes(termo);
          const matchQuart = String(a.quarteirao || '').toLowerCase().includes(termo);
          const matchRua = String(a.rua || '').toLowerCase().includes(termo);
          if (!matchNum && !matchPalh && !matchUltPalh && !matchBairro && !matchMorador && !matchQuart && !matchRua) {
            return false;
          }
        }

        return true;
      }),
    [armadilhas, bairro, situacao, busca]
  );

  const geral = useMemo(() => indicesDe(filtradas), [filtradas]);

  const porBairro = useMemo(() => {
    const grupos = new Map();
    filtradas.forEach((a) => {
      const chave = bairroDe(a);
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(a);
    });
    return [...grupos.entries()]
      .map(([nome, lista]) => ({ nome, ...indicesDe(lista) }))
      .sort((a, b) => b.totalOvos - a.totalOvos);
  }, [filtradas]);

  // Estatísticas de Ciclo de Campo (5 Dias)
  const estatisticasCiclo = useMemo(() => {
    let emDia = 0;
    let trocarHoje = 0;
    let atrasadas = 0;
    let analisadas = 0;

    filtradas.forEach((a) => {
      if (lida(a)) {
        analisadas += 1;
      } else {
        const s = calcularSituacaoArmadilha(a);
        if (s.fase === 'hoje') trocarHoje += 1;
        else if (s.fase === 'atrasada') atrasadas += 1;
        else emDia += 1;
      }
    });

    return {
      totalCampo: filtradas.length - analisadas,
      emDia,
      trocarHoje,
      atrasadas,
      analisadas
    };
  }, [filtradas]);

  const filtroTexto = [
    bairro !== 'todos' ? bairro : 'Todos os bairros',
    {
      todas: 'Todas as armadilhas',
      campo: 'Palhetas em campo',
      urgentes: 'Trocas urgentes (Hoje/Atrasadas)',
      lidas: 'Somente lidas',
      positivas: 'Somente positivas'
    }[situacao],
    busca ? `Busca: "${busca}"` : null
  ]
    .filter(Boolean)
    .join(' • ');

  const morador = (a) => (ocultarMorador ? 'Protegido' : a.moradorNome || 'Não informado');
  const endereco = (a) =>
    ocultarMorador ? 'Oculto por privacidade' : [a.rua, a.numeroImovel].filter(Boolean).join(', ') || 'Sem endereço';

  // -------------------------------------------------------------------------
  // FUNÇÕES DE EXPORTAÇÃO (PLANILHAS CSV)
  // -------------------------------------------------------------------------

  const planilhaGeral = () =>
    baixarCsv(
      'ovitrampas_palhetas_inventario',
      ['Nº', 'Palheta em Campo', 'Última Palheta Analisada', 'Bairro', 'Quarteirão', 'Morador', 'Endereço', 'Situação', 'Ovos', 'Risco', 'Instalada em', 'Última leitura'],
      filtradas.map((a) => [
        a.numero,
        a.palheta || `P-${a.numero}`,
        a.ultimaPalheta || (lida(a) ? a.palheta : '-'),
        bairroDe(a),
        a.quarteirao,
        morador(a),
        endereco(a),
        lida(a) ? (ovosDe(a) > 0 ? 'Positiva' : 'Negativa') : 'Em campo',
        lida(a) ? ovosDe(a) : '',
        lida(a) ? classificarRiscoOvos(ovosDe(a)).nivel : '',
        a.instaladaEm ? new Date(a.instaladaEm).toLocaleDateString('pt-BR') : '',
        a.ultimaLeituraEm ? new Date(a.ultimaLeituraEm).toLocaleDateString('pt-BR') : ''
      ])
    );

  const planilhaIndices = () =>
    baixarCsv(
      'indices_ipo_ido',
      ['Bairro', 'Armadilhas', 'Lidas', 'Positivas', 'Total de ovos', 'IPO (%)', 'IDO (ovos/positiva)'],
      [...porBairro, { nome: 'TOTAL MUNICIPAL', ...geral }].map((b) => [
        b.nome,
        b.armadilhas,
        b.lidas,
        b.positivas,
        b.totalOvos,
        fmt(b.ipo),
        fmt(b.ido)
      ])
    );

  const planilhaFocos = () => {
    const focos = filtradas.filter((a) => lida(a) && ovosDe(a) > 50).sort((a, b) => ovosDe(b) - ovosDe(a));
    if (!focos.length) return avisar('Nenhuma armadilha com mais de 50 ovos neste filtro.');
    baixarCsv(
      'focos_alto_e_critico',
      ['Nº', 'Palheta em Campo', 'Bairro', 'Quarteirão', 'Morador', 'Endereço', 'Ovos', 'Risco', 'Latitude', 'Longitude'],
      focos.map((a) => [
        a.numero,
        a.palheta || `P-${a.numero}`,
        bairroDe(a),
        a.quarteirao,
        morador(a),
        endereco(a),
        ovosDe(a),
        classificarRiscoOvos(ovosDe(a)).nivel,
        a.latitude,
        a.longitude
      ])
    );
  };

  const planilhaPendencias = () => {
    const pendentes = filtradas
      .filter((a) => !lida(a))
      .map((a) => ({ a, s: calcularSituacaoArmadilha(a) }))
      .filter(({ s }) => s.fase === 'atrasada' || s.fase === 'hoje' || s.fase === 'vespera');
    if (!pendentes.length) return avisar('Nenhuma pendência neste filtro.');
    baixarCsv(
      'pendencias_troca_palhetas',
      ['Nº', 'Palheta em Campo', 'Bairro', 'Quarteirão', 'Morador', 'Endereço', 'Situação', 'Dias em Campo', 'Data Prevista'],
      pendentes.map(({ a, s }) => [
        a.numero,
        a.palheta || `P-${a.numero}`,
        bairroDe(a),
        a.quarteirao,
        morador(a),
        endereco(a),
        s.titulo,
        s.diasCorridos != null ? `${s.diasCorridos} dias` : '-',
        s.dataPrevistaFormatada || '-'
      ])
    );
  };

  // -------------------------------------------------------------------------
  // FUNÇÕES DE EXPORTAÇÃO (PDF COM GRÁFICOS)
  // -------------------------------------------------------------------------

  const executarGeracaoPdf = async (tarefa, nomeSucesso) => {
    try {
      avisar('Gerando PDF com gráficos vetoriais, aguarde...');
      await tarefa();
      avisar(`${nomeSucesso} baixado com sucesso!`);
    } catch (err) {
      console.error(err);
      avisar('Não foi possível gerar o PDF. Verifique os dados e tente de novo.');
    }
  };

  const gerarPdfIndices = () =>
    executarGeracaoPdf(
      () => gerarPdfIndicesIpoIdoComGraficos(porBairro, geral, { filtroDescricao: filtroTexto }),
      'Relatório de Índices IPO/IDO'
    );

  const gerarPdfFocos = () => {
    const focos = filtradas.filter((a) => lida(a) && ovosDe(a) > 50);
    if (!focos.length) return avisar('Nenhum foco com mais de 50 ovos encontrado no filtro atual.');
    return executarGeracaoPdf(
      () => gerarPdfFocosCriticosComGraficos(focos, { filtroDescricao: filtroTexto, ocultarMorador }),
      'Relatório de Focos Críticos'
    );
  };

  const gerarPdfPendencias = () => {
    const pendentes = filtradas
      .filter((a) => !lida(a))
      .map((a) => ({ a, s: calcularSituacaoArmadilha(a) }));
    return executarGeracaoPdf(
      () => gerarPdfPendenciasCampoComGraficos(pendentes, estatisticasCiclo, { filtroDescricao: filtroTexto, ocultarMorador }),
      'Relatório de Palhetas e Pendências'
    );
  };

  const gerarPdfInventario = () =>
    executarGeracaoPdf(
      () => gerarPdfInventarioCompleto(filtradas, { filtroDescricao: filtroTexto, ocultarMorador }),
      'Inventário Completo de Palhetas'
    );

  const gerarPdfEntomologicoOficial = () =>
    executarGeracaoPdf(
      () => gerarRelatorioPdfEntomologico(filtradas, { filtroDescricao: filtroTexto }),
      'Relatório Entomológico Oficial (6 Páginas)'
    );

  const gerarPdfOperacionalOficial = () =>
    executarGeracaoPdf(
      () => gerarRelatorioPdfOperacional(filtradas, { filtroDescricao: filtroTexto }),
      'Relatório Operacional Consolidado'
    );

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* CABEÇALHO */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Central de Relatórios & Palhetas</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                CARMO/RJ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Baixe relatórios executivos em <b>PDF com gráficos</b> ou planilhas Excel/CSV. Monitore palhetas ativas em campo (ex: P-02B).
            </p>
          </div>
          <button
            type="button"
            onClick={onAbrirPainelCompleto}
            className="text-xs font-bold text-slate-700 hover:text-emerald-700 underline underline-offset-2 whitespace-nowrap self-start"
          >
            Ir para Painel com Mapa e Edição →
          </button>
        </header>

        {/* CARDS DE INDICADORES (CLEAN & EPIDEMIOLÓGICO) */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
          <div className="bg-white border border-slate-200 rounded-2xl py-3 px-2 shadow-2xs">
            <div className="text-2xl font-black text-slate-900">{geral.armadilhas}</div>
            <div className="text-[11px] font-bold text-slate-500">Total Armadilhas</div>
          </div>
          <div className="bg-white border border-blue-200 bg-blue-50/30 rounded-2xl py-3 px-2 shadow-2xs">
            <div className="text-2xl font-black text-blue-700">{estatisticasCiclo.totalCampo}</div>
            <div className="text-[11px] font-bold text-blue-800">Palhetas em Campo</div>
          </div>
          <div className="bg-white border border-emerald-200 bg-emerald-50/30 rounded-2xl py-3 px-2 shadow-2xs">
            <div className="text-2xl font-black text-emerald-700">{geral.lidas}</div>
            <div className="text-[11px] font-bold text-emerald-800">Lidas no Lab</div>
          </div>
          <div className="bg-white border border-amber-200 bg-amber-50/30 rounded-2xl py-3 px-2 shadow-2xs">
            <div className="text-2xl font-black text-amber-600">
              {estatisticasCiclo.trocarHoje + estatisticasCiclo.atrasadas}
            </div>
            <div className="text-[11px] font-bold text-amber-800">Trocas Urgentes</div>
          </div>
          <div className="bg-white border border-rose-200 bg-rose-50/30 rounded-2xl py-3 px-2 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-2xl font-black text-rose-600">{geral.totalOvos}</div>
            <div className="text-[11px] font-bold text-rose-800">Total de Ovos</div>
          </div>
        </section>

        {/* FILTROS E BUSCA */}
        <section className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2.5 shadow-2xs">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar Nº, Palheta (ex: P-02B), Bairro, Morador..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-emerald-500 font-medium"
            />
          </div>

          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            Bairro:
            <select
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-medium bg-white"
            >
              <option value="todos">Todos os bairros</option>
              {bairros.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            Filtro:
            <select
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
              className="border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-medium bg-white"
            >
              <option value="todas">Todas as armadilhas</option>
              <option value="campo">Palhetas em campo</option>
              <option value="urgentes">Urgentes (Hoje / Atrasadas)</option>
              <option value="lidas">Lidas no laboratório</option>
              <option value="positivas">Somente com ovos (&gt;0)</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setOcultarMorador((v) => !v)}
            className={`ml-auto text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border transition-all active:scale-95 ${
              ocultarMorador
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
            title="Alternar visibilidade de dados privados nos relatórios e tabelas"
          >
            {ocultarMorador ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {ocultarMorador ? 'Privacidade: ON' : 'Privacidade: OFF'}
          </button>
        </section>

        {/* CARDS DE DOWNLOAD (PDF COM GRÁFICOS & PLANILHAS EXCEL) */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* 1. RELATÓRIO ENTOMOLÓGICO */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                <Satellite className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black flex items-center gap-1.5">
                  Relatório Entomológico
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    6 PÁGINAS
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Oficial municipal: KPIs, tabelas de bairros e mapas de calor em satélite e nevoeiro.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={gerarPdfEntomologicoOficial}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar PDF Oficial
            </button>
          </div>

          {/* 2. RELATÓRIO OPERACIONAL */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black flex items-center gap-1.5">
                  Relatório Operacional
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                    PAISAGEM
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Coordenação de campo: status de palhetas, raio 300m-400m e planejamento para os ACEs.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={gerarPdfOperacionalOficial}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar PDF Operacional
            </button>
          </div>

          {/* 3. ÍNDICES IPO E IDO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Índices IPO e IDO</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Positividade e densidade de ovos por bairro, com gráficos comparativos e linha de corte.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={gerarPdfIndices}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                title="Gera PDF executivo com gráficos de barras do IPO e IDO"
              >
                <Download className="w-3.5 h-3.5" />
                PDF com Gráficos
              </button>
              <button
                type="button"
                onClick={planilhaIndices}
                className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
                title="Baixar planilha CSV/Excel"
              >
                Excel
              </button>
            </div>
          </div>

          {/* 4. FOCOS ALTO E CRÍTICO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Focos Alto e Crítico</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Armadilhas com &gt; 50 ovos. Gráfico de ranking, epicentros e plano de bloqueio 150m-300m.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={gerarPdfFocos}
                className="flex-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                title="Gera PDF com ranking visual e áreas de bloqueio recomendadas"
              >
                <Download className="w-3.5 h-3.5" />
                PDF com Gráficos
              </button>
              <button
                type="button"
                onClick={planilhaFocos}
                className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
                title="Baixar planilha CSV/Excel"
              >
                Excel
              </button>
            </div>
          </div>

          {/* 5. PENDÊNCIAS DE CAMPO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Pendências de Campo</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Cronograma de 5 dias. Gráfico donut de distribuição, trocas de hoje e atrasadas.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={gerarPdfPendencias}
                className="flex-1 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                title="Gera PDF com gráfico de ciclo e ações de recolhimento"
              >
                <Download className="w-3.5 h-3.5" />
                PDF com Gráficos
              </button>
              <button
                type="button"
                onClick={planilhaPendencias}
                className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
                title="Baixar planilha CSV/Excel"
              >
                Excel
              </button>
            </div>
          </div>

          {/* 6. TODOS OS DADOS / INVENTÁRIO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Inventário de Palhetas</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Dados completos: armadilha, palheta em campo, ciclo anterior, datas e coordenadas.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={gerarPdfInventario}
                className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-black py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                title="Gera PDF em orientação paisagem com todas as colunas"
              >
                <Download className="w-3.5 h-3.5" />
                PDF Completo
              </button>
              <button
                type="button"
                onClick={planilhaGeral}
                className="px-2.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
                title="Baixar planilha CSV/Excel completa"
              >
                Excel
              </button>
            </div>
          </div>

        </section>

        {/* ABAS DE VISUALIZAÇÃO INTERATIVA (PALHETAS EM CAMPO / RESUMO POR BAIRRO) */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          
          <div className="border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAbaAtiva('palhetas')}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                  abaAtiva === 'palhetas'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Palhetas em Campo & Ciclos ({filtradas.length})
              </button>
              <button
                type="button"
                onClick={() => setAbaAtiva('bairros')}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                  abaAtiva === 'bairros'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Resumo por Bairro ({porBairro.length})
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              {filtradas.length} de {armadilhas.length} armadilhas exibidas
            </span>
          </div>

          {/* CONTEÚDO DA ABA 1: TABELA DE PALHETAS EM CAMPO E CICLOS */}
          {abaAtiva === 'palhetas' && (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200 text-[11px]">
                    <th className="py-2 pr-3">Armadilha</th>
                    <th className="pr-3">Palheta em Campo</th>
                    <th className="pr-3">Status do Ciclo</th>
                    <th className="pr-3">Última Leitura / Lab</th>
                    <th className="pr-3">Bairro / Quarteirão</th>
                    <th className="pr-3">Morador</th>
                    <th>Instalação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Nenhuma armadilha corresponde ao filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((a) => {
                      const sit = calcularSituacaoArmadilha(a);
                      const isLida = lida(a);
                      const palhetaEmCampo = a.palheta || `P-${a.numero}`;
                      const ultimaPalheta = a.ultimaPalheta;

                      return (
                        <tr key={a.id || a.numero} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Nº Armadilha */}
                          <td className="py-2.5 pr-3 font-black text-slate-900 whitespace-nowrap">
                            ARM-{a.numero}
                          </td>

                          {/* Palheta Atual em Campo */}
                          <td className="pr-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                              {palhetaEmCampo}
                            </span>
                          </td>

                          {/* Status do Ciclo de 5 dias */}
                          <td className="pr-3 whitespace-nowrap">
                            {isLida ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Analisada
                              </span>
                            ) : sit.fase === 'hoje' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                                <Clock className="w-3 h-3 text-amber-700" />
                                Trocar Hoje!
                              </span>
                            ) : sit.fase === 'atrasada' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-rose-700" />
                                Atrasada ({sit.diasRestantes ? Math.abs(sit.diasRestantes) : '1+'} d)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                Em campo ({sit.diasCorridos || 0}d)
                              </span>
                            )}
                          </td>

                          {/* Última Leitura de Laboratório */}
                          <td className="pr-3 whitespace-nowrap">
                            {isLida ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800">
                                  {a.ultimosOvos} ovos
                                </span>
                                {ultimaPalheta && ultimaPalheta !== palhetaEmCampo && (
                                  <span className="text-[10px] text-slate-400">
                                    ({ultimaPalheta})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                {ultimaPalheta ? `Ant: ${ultimaPalheta}` : 'Aguardando coleta'}
                              </span>
                            )}
                          </td>

                          {/* Localização */}
                          <td className="pr-3">
                            <span className="font-bold text-slate-800">{bairroDe(a)}</span>
                            <span className="text-slate-400 text-[10px] block">
                              Quart. {a.quarteirao || '-'}
                            </span>
                          </td>

                          {/* Morador / Endereço */}
                          <td className="pr-3">
                            <span className="font-medium text-slate-700 block truncate max-w-[140px]">
                              {morador(a)}
                            </span>
                            <span className="text-slate-400 text-[10px] block truncate max-w-[140px]">
                              {endereco(a)}
                            </span>
                          </td>

                          {/* Data de Instalação */}
                          <td className="whitespace-nowrap text-slate-500 text-[11px]">
                            {a.instaladaEm ? new Date(a.instaladaEm).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CONTEÚDO DA ABA 2: RESUMO POR BAIRRO */}
          {abaAtiva === 'bairros' && (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200 text-[11px]">
                    <th className="py-2 pr-2">Bairro</th>
                    <th className="pr-2">Armadilhas</th>
                    <th className="pr-2">Lidas</th>
                    <th className="pr-2">Positivas</th>
                    <th className="pr-2">Total de Ovos</th>
                    <th className="pr-2">IPO (%)</th>
                    <th>IDO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {porBairro.map((b) => (
                    <tr key={b.nome} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 pr-2 font-bold text-slate-800">{b.nome}</td>
                      <td className="pr-2">{b.armadilhas}</td>
                      <td className="pr-2">{b.lidas}</td>
                      <td className="pr-2">{b.positivas}</td>
                      <td className="pr-2 font-black text-rose-600">{b.totalOvos}</td>
                      <td className="pr-2 font-bold text-slate-900">{fmt(b.ipo)}%</td>
                      <td className="font-bold text-slate-700">{fmt(b.ido)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-black bg-slate-50/70">
                    <td className="py-2 pr-2 text-slate-900">TOTAL MUNICIPAL</td>
                    <td className="pr-2">{geral.armadilhas}</td>
                    <td className="pr-2">{geral.lidas}</td>
                    <td className="pr-2">{geral.positivas}</td>
                    <td className="pr-2 text-rose-700">{geral.totalOvos}</td>
                    <td className="pr-2">{fmt(geral.ipo)}%</td>
                    <td>{fmt(geral.ido)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[11px] text-slate-400 mt-2 px-1">
                IPO = % de armadilhas lidas com ovos. IDO = média de ovos por armadilha positiva.
              </p>
            </div>
          )}

        </section>

      </div>

      {/* TOAST DE FEEDBACK FLUTUANTE */}
      {aviso && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-2xl z-50 animate-in fade-in duration-150 border border-slate-700">
          {aviso}
        </div>
      )}
    </div>
  );
}
