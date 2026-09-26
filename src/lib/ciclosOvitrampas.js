/**
 * Gerenciador dos Ciclos Epidemiológicos de Carmo - RJ:
 * - Ciclo A (Semana 1): Palhetas A (01A ... 56A)
 * - Ciclo B (Semana 2): Palhetas B (01B ... 56B)
 * - Ambas (Consolidado): Visualização combinada e comparativa (A + B)
 */

import { normalizarNumeroArmadilha } from './storage';

export const CICLO_SEMANA_1 = 'A';
export const CICLO_SEMANA_2 = 'B';
export const CICLO_AMBAS = 'ambas';

/**
 * Classifica uma palheta ou leitura no Ciclo A ou Ciclo B
 */
export function classificarCiclo(nomePalheta, dataLeitura) {
  const p = String(nomePalheta || '').trim().toUpperCase();
  if (p.endsWith('B') || p.includes('B')) return CICLO_SEMANA_2;
  if (p.endsWith('A') || p.includes('A')) return CICLO_SEMANA_1;

  // Fallback por data (Semana 1 foi analisada até 26/09/2026; Semana 2 a partir de 27/09/2026)
  if (dataLeitura) {
    try {
      const d = new Date(dataLeitura);
      if (d >= new Date('2026-09-27T00:00:00Z')) return CICLO_SEMANA_2;
    } catch (_) {}
  }
  return CICLO_SEMANA_1;
}

/**
 * Mapeia todas as leituras existentes pelo número da armadilha e separa por ciclo
 */
export function agruparLeiturasPorArmadilha(todasLeituras = []) {
  const mapa = new Map();

  todasLeituras.forEach((leit) => {
    const num = normalizarNumeroArmadilha(leit.numeroArmadilha || leit.numero_armadilha);
    if (!num) return;

    if (!mapa.has(num)) {
      mapa.set(num, {
        leiturasA: [],
        leiturasB: []
      });
    }

    const ciclo = classificarCiclo(leit.numeroPalheta || leit.numero_palheta, leit.lidaEm || leit.lida_em);
    if (ciclo === CICLO_SEMANA_2) {
      mapa.get(num).leiturasB.push(leit);
    } else {
      mapa.get(num).leiturasA.push(leit);
    }
  });

  return mapa;
}

/**
 * Resolve os dados detalhados dos dois ciclos para uma armadilha
 */
export function resolverLeiturasArmadilha(armadilha, mapaLeituras = new Map()) {
  const num = normalizarNumeroArmadilha(armadilha.numero);
  const agrupado = mapaLeituras.get(num) || { leiturasA: [], leiturasB: [] };

  // Palheta A: busca da leitura ou do histórico da armadilha
  let leituraA = agrupado.leiturasA[0] || null;
  let ovosA = leituraA != null ? Number(leituraA.ovos ?? leituraA.qtdOvos ?? 0) : null;

  // Se não encontrou no store de leituras, checa se a própria armadilha tem registro de Palheta A
  if (ovosA === null) {
    // 1. Checa histórico de palhetas
    if (Array.isArray(armadilha.historicoPalhetas)) {
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
  let leituraB = agrupado.leiturasB[0] || null;
  let ovosB = leituraB != null ? Number(leituraB.ovos ?? leituraB.qtdOvos ?? 0) : null;

  // Se a armadilha está atualmente com palheta B e foi analisada no laboratório
  if (ovosB === null && (armadilha.palheta || '').toUpperCase().endsWith('B')) {
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
  const palhetaB = leituraB?.numeroPalheta || (armadilha.palheta && armadilha.palheta.toUpperCase().endsWith('B') ? armadilha.palheta : `${num}B`);

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
    positivaAmbas: (ovosTotal != null && ovosTotal > 0)
  };
}

/**
 * Transforma a lista de armadilhas para exibir no mapa, gráficos e tabelas
 * conforme o ciclo selecionado ('A', 'B' ou 'ambas').
 */
export function adaptarArmadilhasParaCiclo(armadilhas = [], todasLeituras = [], ciclo = 'ambas') {
  const mapaLeituras = agruparLeiturasPorArmadilha(todasLeituras);

  return armadilhas.map((arm) => {
    const dados = resolverLeiturasArmadilha(arm, mapaLeituras);

    if (ciclo === CICLO_SEMANA_1) {
      // MODO CICLO A (Semana 1)
      const lida = dados.temLeituraA;
      return {
        ...arm,
        cicloAtivo: CICLO_SEMANA_1,
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
        : arm.status === 'recolhida'
        ? 'recolhida'
        : 'instalada';

      return {
        ...arm,
        cicloAtivo: CICLO_SEMANA_2,
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
      : arm.status === 'recolhida'
      ? 'recolhida'
      : 'instalada';

    return {
      ...arm,
      cicloAtivo: CICLO_AMBAS,
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
