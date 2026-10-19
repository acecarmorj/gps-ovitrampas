/**
 * Gerenciador dos Ciclos Epidemiológicos de Carmo - RJ:
 * - Ciclos / Campanhas Anuais:
 *   * Ciclo Anterior (Ano Passado): '2025_2026' (Preservado intacto - Setembro/2026)
 *   * Ciclo Atual (Novo Ciclo): '2026_NOVO' (Novo monitoramento em campo)
 *   * Todos / Consolidado Histórico: 'todos'
 * - Fases do Ciclo:
 *   * Ciclo A (Semana 1): Palhetas A (01A ... 56A)
 *   * Ciclo B (Semana 2): Palhetas B (01B ... 56B)
 *   * Ambas (Consolidado): Visualização combinada e comparativa (A + B)
 */

import { normalizarNumeroArmadilha } from './storage.js';

// Constantes das semanas / palhetas dentro do ciclo
export const CICLO_SEMANA_1 = 'A';
export const CICLO_SEMANA_2 = 'B';
export const CICLO_AMBAS = 'ambas';

// Constantes dos Ciclos Anuais / Campanhas
export const CICLO_ID_ANTERIOR = '2025_2026';
export const CICLO_ID_ATUAL = '2026_NOVO';
export const CICLO_ID_TODOS = 'todos';
// Campanha historica (somente leitura), vinda do Conta Ovos: Fev/2025, 40 armadilhas em pontos diferentes dos de 2026.
export const CICLO_ID_FEV2025 = '2025_FEV';

export const CAMPANHAS_OFICIAIS = [
  {
    id: CICLO_ID_ANTERIOR,
    rotulo: 'Ciclo Anterior (Ano Passado)',
    rotuloCurto: 'Ano Passado',
    badge: '2025/2026',
    ano: '2025/2026',
    descricao: 'Ciclo consolidado de Setembro/2026 (Preservado)',
    ativo: true,
    dataCorte: '2026-09-01'
  },
  {
    id: CICLO_ID_ATUAL,
    rotulo: 'Ciclo Atual (2026/2027)',
    rotuloCurto: 'Novo Ciclo',
    badge: '2026/2027',
    ano: '2026/2027',
    descricao: 'Novo ciclo epidemiológico em andamento',
    ativo: false,
    dataCorte: '2026-10-10'
  },
  {
    id: CICLO_ID_FEV2025,
    rotulo: 'Fev/2025 (histórico)',
    rotuloCurto: 'Fev/2025',
    badge: 'Fev/2025',
    ano: '2025',
    descricao: 'Campanha de fevereiro de 2025 (Conta Ovos, somente leitura). Semanas epidemiológicas 7 e 8.',
    ativo: false,
    historico: true,
    periodo: '10 a 28/02/2025'
  }
];

/** Campanhas historicas sao so para consulta: nunca gravam leitura e nunca viram a campanha ativa do campo/laboratorio. */
export function ehCampanhaHistorica(campanhaId) {
  return campanhaId === CICLO_ID_FEV2025;
}

const STORAGE_KEY_CAMPANHA_ATIVA = 'ovitrampa_campanha_ativa';

/**
 * Retorna o ID da campanha ativa no sistema
 */
export function getCampanhaAtiva() {
  if (typeof window !== 'undefined') {
    const salva = localStorage.getItem(STORAGE_KEY_CAMPANHA_ATIVA);
    if (salva === CICLO_ID_ANTERIOR || salva === CICLO_ID_TODOS) return salva;
  }
  return CICLO_ID_ANTERIOR; // Padrão seguro: exibe os dados consolidados existentes
}

/**
 * Define e persiste a campanha ativa no sistema
 */
export function setCampanhaAtiva(campanhaId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CAMPANHA_ATIVA, campanhaId);
    window.dispatchEvent(new CustomEvent('ovitrampa_campanha_alterada', { detail: campanhaId }));
  }
}

/**
 * Retorna a lista de ciclos/campanhas disponíveis
 */
export function getCiclosDisponiveis(todasLeituras = []) {
  const mapa = new Map();
  CAMPANHAS_OFICIAIS.forEach((c) => mapa.set(c.id, { ...c }));

  if (Array.isArray(todasLeituras)) {
    todasLeituras.forEach((l) => {
      const cid = l.cicloId || l.campanhaId;
      if (cid && !mapa.has(cid)) {
        mapa.set(cid, {
          id: cid,
          rotulo: `Ciclo ${cid}`,
          rotuloCurto: cid,
          badge: cid,
          ano: cid,
          descricao: `Ciclo personalizado ${cid}`,
          ativo: false
        });
      }
    });
  }

  return Array.from(mapa.values());
}

/**
 * Determina se uma leitura pertence ao Ciclo Anterior ou ao Novo Ciclo
 */
export function classificarCampanhaLeitura(leitura) {
  if (!leitura) return CICLO_ID_ANTERIOR;

  // 1. Identificador explícito gravado na leitura
  if (leitura.cicloId) return String(leitura.cicloId);
  if (leitura.campanhaId) return String(leitura.campanhaId);

  // 2. Classificação temporal de corte (Semana de Setembro/2026 vs Novo Ciclo)
  const dataIso = leitura.lidaEm || leitura.lida_em;
  if (dataIso) {
    try {
      const d = new Date(dataIso);
      // Leituras a partir de 10/10/2026 pertencem ao Novo Ciclo
      if (d >= new Date('2026-10-10T00:00:00Z')) {
        return CICLO_ID_ATUAL;
      }
    } catch (_) {}
  }

  // Fallback padrão: dados legados pertencem ao ciclo anterior (ano passado)
  return CICLO_ID_ANTERIOR;
}

/**
 * Classifica uma palheta ou leitura no Ciclo A (Semana 1) ou Ciclo B (Semana 2)
 */
export function classificarCiclo(nomePalheta, dataLeitura) {
  const p = String(nomePalheta || '').trim().toUpperCase();
  if (p.endsWith('B') || p.includes('B')) return CICLO_SEMANA_2;
  if (p.endsWith('A') || p.includes('A')) return CICLO_SEMANA_1;

  // Fallback por data
  if (dataLeitura) {
    try {
      const d = new Date(dataLeitura);
      // Para o ciclo anterior (Set/2026), corte da semana 2 foi em 27/09/2026
      if (d < new Date('2026-10-10T00:00:00Z') && d >= new Date('2026-09-27T00:00:00Z')) {
        return CICLO_SEMANA_2;
      }
    } catch (_) {}
  }
  return CICLO_SEMANA_1;
}

/**
 * Mapeia todas as leituras existentes pelo número da armadilha e separa por ciclo semanal,
 * com suporte a filtro estrito por Campanha/AnoCiclo ('2025_2026', '2026_NOVO' ou 'todos').
 */
export function agruparLeiturasPorArmadilha(todasLeituras = [], anoCiclo = null) {
  const mapa = new Map();

  todasLeituras.forEach((leit) => {
    const num = normalizarNumeroArmadilha(leit.numeroArmadilha || leit.numero_armadilha);
    if (!num) return;

    // Filtro estrito de ciclo anual/campanha (evita misturar palheta 01A do ano passado com 01A do novo ciclo)
    if (anoCiclo && anoCiclo !== CICLO_ID_TODOS) {
      const campLeit = classificarCampanhaLeitura(leit);
      if (campLeit !== anoCiclo) {
        return; // Pula leitura que não pertence ao ciclo selecionado
      }
    }

    if (!mapa.has(num)) {
      mapa.set(num, {
        leiturasA: [],
        leiturasB: [],
        todasLeituras: []
      });
    }

    mapa.get(num).todasLeituras.push(leit);

    const cicloSemana = classificarCiclo(leit.numeroPalheta || leit.numero_palheta, leit.lidaEm || leit.lida_em);
    if (cicloSemana === CICLO_SEMANA_2) {
      mapa.get(num).leiturasB.push(leit);
    } else {
      mapa.get(num).leiturasA.push(leit);
    }
  });

  return mapa;
}

/**
 * Se a mesma palheta foi lida mais de uma vez (recontagem), vale a leitura MAIS RECENTE.
 */
function maisRecente(lista = []) {
  if (lista.length === 0) return null;
  return lista.reduce((m, l) => (String(l.lidaEm || l.lida_em || '') >= String(m.lidaEm || m.lida_em || '') ? l : m), lista[0]);
}

/**
 * Resolve os dados detalhados dos ciclos para uma armadilha,
 * respeitando o isolamento do ano/campanha.
 */
export function resolverLeiturasArmadilha(armadilha, mapaLeituras = new Map(), anoCiclo = null) {
  const num = normalizarNumeroArmadilha(armadilha.numero);
  const agrupado = mapaLeituras.get(num) || { leiturasA: [], leiturasB: [], todasLeituras: [] };
  const bruta = !armadilha.cicloAtivo;

  // Palheta A: busca da leitura no store da campanha ativa
  let leituraA = maisRecente(agrupado.leiturasA);
  let ovosA = leituraA != null ? Number(leituraA.ovos ?? leituraA.qtdOvos ?? 0) : null;

  // IMPORTANTE: Fallbacks do objeto armadilha (dados de setembro gravados direto no cadastro)
  // pertencem EXCLUSIVAMENTE ao Ciclo Anterior (2025_2026).
  // Eles NUNCA devem poluir o Novo Ciclo (2026_NOVO).
  const ehCicloAnteriorOuLegado = !anoCiclo || anoCiclo === CICLO_ID_ANTERIOR || anoCiclo === CICLO_ID_TODOS;

  if (ovosA === null && bruta && ehCicloAnteriorOuLegado) {
    // 0. Campo auditado explícito da Semana 1 (Ciclo A)
    if (armadilha.ovosSem1 !== undefined && armadilha.ovosSem1 !== null) {
      ovosA = Number(armadilha.ovosSem1);
    }
    // 1. Checa histórico de palhetas
    if (ovosA === null && Array.isArray(armadilha.historicoPalhetas)) {
      const itemA = armadilha.historicoPalhetas.find((h) => {
        const palhAnt = (h.palhetaAnterior || '').toUpperCase();
        return palhAnt.endsWith('A') || palhAnt.includes('A');
      });
      if (itemA && itemA.ovosCicloAnterior != null) {
        ovosA = Number(itemA.ovosCicloAnterior);
      }
    }
    // 2. Se a armadilha está com palheta A e tem ultimosOvos
    if (ovosA === null && (armadilha.palheta || '').toUpperCase().endsWith('A') && armadilha.ultimosOvos != null) {
      ovosA = Number(armadilha.ultimosOvos);
    }
    // 3. Fallback: se a armadilha tem ultimosOvos e nunca foi trocada, é da Palheta A (Semana 1)
    if (ovosA === null && armadilha.ultimosOvos != null && (!armadilha.historicoPalhetas || armadilha.historicoPalhetas.length === 0)) {
      ovosA = Number(armadilha.ultimosOvos);
    }
  }

  // Palheta B: busca da leitura do Ciclo B
  let leituraB = maisRecente(agrupado.leiturasB);
  let ovosB = leituraB != null ? Number(leituraB.ovos ?? leituraB.qtdOvos ?? 0) : null;

  // 0. Campo auditado explícito da Semana 2 (Ciclo B)
  if (ovosB === null && bruta && ehCicloAnteriorOuLegado && armadilha.ovosSem2 !== undefined && armadilha.ovosSem2 !== null) {
    ovosB = Number(armadilha.ovosSem2);
  }

  // Se a armadilha está atualmente com palheta B e foi analisada no laboratório (apenas no ciclo anterior)
  if (ovosB === null && bruta && ehCicloAnteriorOuLegado && (armadilha.palheta || '').toUpperCase().endsWith('B')) {
    if (armadilha.status === 'analisada' && armadilha.ultimosOvos != null) {
      ovosB = Number(armadilha.ultimosOvos);
    }
  }

  const temLeituraA = ovosA !== null;
  const temLeituraB = ovosB !== null;

  // Totais combinados
  const ovosTotal = (temLeituraA || temLeituraB)
    ? (Number(ovosA || 0) + Number(ovosB || 0))
    : null;

  const palhetaA = leituraA?.numeroPalheta || `${num}A`;
  const palhetaB = leituraB?.numeroPalheta || `${num}B`;

  return {
    numero: num,
    palhetaA,
    palhetaB,
    leituraA,
    leituraB,
    ovosA,
    ovosB,
    ovosTotal,
    temLeituraA,
    temLeituraB,
    temLeituraAmbas: temLeituraA || temLeituraB,
    positivaA: temLeituraA ? ovosA > 0 : null,
    positivaB: temLeituraB ? ovosB > 0 : null,
    positivaAmbas: (ovosTotal != null && ovosTotal > 0),
    campanha: anoCiclo || CICLO_ID_ANTERIOR
  };
}

/**
 * Transforma a lista de armadilhas para exibir no mapa, gráficos e tabelas
 * conforme o ciclo selecionado ('A', 'B' ou 'ambas') E o ano/campanha selecionado ('2025_2026', '2026_NOVO', 'todos').
 */
export function adaptarArmadilhasParaCiclo(armadilhas = [], todasLeituras = [], ciclo = 'ambas', anoCiclo = null) {
  const campanha = anoCiclo || (typeof window !== 'undefined' ? getCampanhaAtiva() : CICLO_ID_ANTERIOR);
  const mapaLeituras = agruparLeiturasPorArmadilha(todasLeituras, campanha);
  const ehNovoCiclo = campanha === CICLO_ID_ATUAL;

  return armadilhas.map((arm) => {
    const dados = resolverLeiturasArmadilha(arm, mapaLeituras, campanha);

    if (ciclo === CICLO_SEMANA_1) {
      // MODO CICLO A (Semana 1)
      const lida = dados.temLeituraA;
      return {
        ...arm,
        cicloAtivo: CICLO_SEMANA_1,
        campanhaAtiva: campanha,
        cicloLabel: 'Palheta A (1ª Semana)',
        palheta: dados.palhetaA,
        ultimosOvos: dados.ovosA,
        status: lida ? 'analisada' : 'instalada',
        dadosCiclos: dados
      };
    }

    if (ciclo === CICLO_SEMANA_2) {
      // MODO CICLO B (Semana 2)
      const lida = dados.temLeituraB;
      const statusB = lida
        ? 'analisada'
        : (!ehNovoCiclo && arm.status === 'recolhida')
        ? 'recolhida'
        : 'instalada';

      return {
        ...arm,
        cicloAtivo: CICLO_SEMANA_2,
        campanhaAtiva: campanha,
        cicloLabel: 'Palheta B (2ª Semana)',
        palheta: dados.palhetaB,
        ultimosOvos: dados.ovosB,
        status: statusB,
        dadosCiclos: dados
      };
    }

    // MODO CONSOLIDADO (AMBAS AS PALHETAS A + B)
    const algumaLida = dados.temLeituraAmbas;
    const statusConsolidado = algumaLida
      ? 'analisada'
      : (!ehNovoCiclo && arm.status === 'recolhida')
      ? 'recolhida'
      : 'instalada';

    return {
      ...arm,
      cicloAtivo: CICLO_AMBAS,
      campanhaAtiva: campanha,
      cicloLabel: 'Ambas (Consolidado A + B)',
      palheta: `${dados.palhetaA} + ${dados.palhetaB}`,
      ultimosOvos: dados.ovosTotal,
      status: statusConsolidado,
      dadosCiclos: dados
    };
  });
}

/**
 * Calcula métricas epidemiológicas e comparativas completas de um ciclo
 */
export function calcularMetricasCiclo(armadilhasAdaptadas = []) {
  const total = armadilhasAdaptadas.length;
  const lidas = armadilhasAdaptadas.filter((a) => a.ultimosOvos !== null && a.ultimosOvos !== undefined);
  const positivas = lidas.filter((a) => Number(a.ultimosOvos) > 0);
  const negativas = lidas.filter((a) => Number(a.ultimosOvos) === 0);
  const totalOvos = lidas.reduce((soma, a) => soma + Number(a.ultimosOvos || 0), 0);

  const ipo = lidas.length > 0 ? (positivas.length / lidas.length) * 100 : 0;
  const ido = positivas.length > 0 ? totalOvos / positivas.length : 0;

  // Estratificação de Risco
  const criticos = positivas.filter((a) => Number(a.ultimosOvos) > 100).length;
  const altos = positivas.filter((a) => Number(a.ultimosOvos) > 50 && Number(a.ultimosOvos) <= 100).length;
  const medios = positivas.filter((a) => Number(a.ultimosOvos) > 20 && Number(a.ultimosOvos) <= 50).length;
  const baixos = positivas.filter((a) => Number(a.ultimosOvos) > 0 && Number(a.ultimosOvos) <= 20).length;

  // Comparativo Direto entre Ciclo A e Ciclo B
  let ovosA_total = 0;
  let ovosB_total = 0;
  let lidasA_total = 0;
  let lidasB_total = 0;
  let posA_total = 0;
  let posB_total = 0;

  armadilhasAdaptadas.forEach((a) => {
    if (a.dadosCiclos) {
      if (a.dadosCiclos.temLeituraA) {
        lidasA_total += 1;
        ovosA_total += Number(a.dadosCiclos.ovosA || 0);
        if (a.dadosCiclos.ovosA > 0) posA_total += 1;
      }
      if (a.dadosCiclos.temLeituraB) {
        lidasB_total += 1;
        ovosB_total += Number(a.dadosCiclos.ovosB || 0);
        if (a.dadosCiclos.ovosB > 0) posB_total += 1;
      }
    }
  });

  const ipoA = lidasA_total > 0 ? (posA_total / lidasA_total) * 100 : 0;
  const ipoB = lidasB_total > 0 ? (posB_total / lidasB_total) * 100 : 0;
  const idoA = posA_total > 0 ? ovosA_total / posA_total : 0;
  const idoB = posB_total > 0 ? ovosB_total / posB_total : 0;

  return {
    total,
    totalLidas: lidas.length,
    totalPositivas: positivas.length,
    totalNegativas: negativas.length,
    totalOvos,
    ipo,
    ido,
    criticos,
    altos,
    medios,
    baixos,
    comparativo: {
      ovosA: ovosA_total,
      ovosB: ovosB_total,
      diferencaOvos: ovosB_total - ovosA_total,
      lidasA: lidasA_total,
      lidasB: lidasB_total,
      posA: posA_total,
      posB: posB_total,
      ipoA,
      ipoB,
      idoA,
      idoB,
      variacaoOvosPct: ovosA_total > 0 ? (((ovosB_total - ovosA_total) / ovosA_total) * 100) : 0,
      variacaoIpoPct: ipoA > 0 ? (ipoB - ipoA) : 0
    }
  };
}
