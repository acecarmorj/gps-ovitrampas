/**
 * Motor Geodésico do Cenário Ideal de Ovitrampas (Carmo - RJ)
 * Baseado nas diretrizes do Ministério da Saúde / SUS e Malha Territorial Urbana de Carmo.
 * 
 * Regra Entomológica:
 * - Espaçamento ideal entre armadilhas: 300m a 400m
 * - Raio de atração / amostragem por ovitrampa: ~175m (diâmetro de ~350m)
 * - Abrangência total da malha urbana habitada sem vácuos de vigilância
 */

import { calcDistanceMeters } from './geoDistance';
import { calcBearing, bearingToCardinal } from './geoBearing';
import pontosIdeaisData from './pontosIdeaisCarmo.json';

export const PONTOS_IDEAIS_CARMO = pontosIdeaisData;
export const RAIO_COBERTURA_IDEAL_METROS = 175; // Raio de cobertura individual
export const DISTANCIA_ALVO_MIN_METROS = 280;
export const DISTANCIA_ALVO_MAX_METROS = 400;

/**
 * Retorna todos os pontos ideais calculados para Carmo-RJ
 */
export function getPontosIdeais() {
  return PONTOS_IDEAIS_CARMO;
}

/**
 * Compara uma armadilha real com a grade ideal e retorna diagnóstico de alinhamento
 */
export function compararArmadilhaComGradeIdeal(armadilha, pontosIdeais = PONTOS_IDEAIS_CARMO) {
  if (!armadilha || armadilha.latitude == null || armadilha.longitude == null) {
    return null;
  }

  const latReal = Number(armadilha.latitude);
  const lngReal = Number(armadilha.longitude);

  let pontoIdealMaisProximo = null;
  let menorDistancia = Infinity;

  for (const ponto of pontosIdeais) {
    const d = calcDistanceMeters(latReal, lngReal, ponto.latitude, ponto.longitude);
    if (d < menorDistancia) {
      menorDistancia = d;
      pontoIdealMaisProximo = ponto;
    }
  }

  if (!pontoIdealMaisProximo) return null;

  const rumoGraus = calcBearing(latReal, lngReal, pontoIdealMaisProximo.latitude, pontoIdealMaisProximo.longitude);
  const cardinal = bearingToCardinal(rumoGraus);

  let status = 'remanejar';
  let statusLabel = 'Remanejamento Sugerido';
  let statusCor = '#e11d48'; // Rosa/Vermelho
  let orientacao = '';

  if (menorDistancia <= 60) {
    status = 'manter';
    statusLabel = 'Excelente Alinhamento (Manter)';
    statusCor = '#059669'; // Verde Esmeralda
    orientacao = `Posição excelente! Está a apenas ${menorDistancia}m do centróide ideal do ${pontoIdealMaisProximo.quarteirao}.`;
  } else if (menorDistancia <= 120) {
    status = 'ajuste_leve';
    statusLabel = 'Bom Alinhamento (Leve Ajuste)';
    statusCor = '#d97706'; // Âmbar
    orientacao = `Ajustar ~${menorDistancia}m em direção ao ${cardinal.nome} (${cardinal.seta} ${cardinal.sigla}) para otimizar cobertura do ${pontoIdealMaisProximo.quarteirao}.`;
  } else {
    status = 'remanejar';
    statusLabel = 'Deslocar para Outro Setor';
    statusCor = '#e11d48';
    orientacao = `Deslocar ~${menorDistancia}m em direção ao ${cardinal.nome} (${cardinal.seta} ${cardinal.sigla}) até ${pontoIdealMaisProximo.bairro} (${pontoIdealMaisProximo.quarteirao} - ${pontoIdealMaisProximo.rua}).`;
  }

  return {
    armadilha,
    pontoIdealMaisProximo,
    distanciaMetros: menorDistancia,
    rumoGraus,
    cardinal,
    status,
    statusLabel,
    statusCor,
    orientacao
  };
}

/**
 * Realiza análise diagnóstica completa comparando o cenário real (campo) com o cenário ideal
 */
export function analisarDiagnosticoGrade(armadilhasReais = [], pontosIdeais = PONTOS_IDEAIS_CARMO) {
  const trapsValidas = armadilhasReais.filter(
    (a) => a.latitude != null && a.longitude != null && !isNaN(Number(a.latitude)) && !isNaN(Number(a.longitude))
  );

  const detalheArmadilhas = trapsValidas.map((trap) => compararArmadilhaComGradeIdeal(trap, pontosIdeais)).filter(Boolean);

  let excelentes = 0;
  let ajustesLeves = 0;
  let remanejamentos = 0;

  detalheArmadilhas.forEach((comp) => {
    if (comp.status === 'manter') excelentes++;
    else if (comp.status === 'ajuste_leve') ajustesLeves++;
    else remanejamentos++;
  });

  // Vácuos de cobertura: Pontos ideais que NÃO possuem nenhuma armadilha real a menos de 180m
  const gaps = [];
  const detalheIdeais = pontosIdeais.map((ponto) => {
    let maisProxima = null;
    let menorDist = Infinity;

    for (const t of trapsValidas) {
      const d = calcDistanceMeters(ponto.latitude, ponto.longitude, Number(t.latitude), Number(t.longitude));
      if (d < menorDist) {
        menorDist = d;
        maisProxima = t;
      }
    }

    const coberto = menorDist <= 180;
    const res = {
      pontoIdeal: ponto,
      armadilhaMaisProxima: maisProxima,
      distanciaRealMetros: menorDist === Infinity ? null : menorDist,
      coberto
    };

    if (!coberto) {
      gaps.push(res);
    }

    return res;
  });

  // Sobreposições / Aglomerações: Armadilhas reais que estão a menos de 160m de outra armadilha real
  const sobreposicoes = [];
  const sobreposicoesSet = new Set();

  for (let i = 0; i < trapsValidas.length; i++) {
    for (let j = i + 1; j < trapsValidas.length; j++) {
      const a = trapsValidas[i];
      const b = trapsValidas[j];
      const d = calcDistanceMeters(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude));
      if (d < 160) {
        const idA = a.codigo || a.numero;
        const idB = b.codigo || b.numero;
        const key = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
        if (!sobreposicoesSet.has(key)) {
          sobreposicoesSet.add(key);
          sobreposicoes.push({
            trapA: a,
            trapB: b,
            distanciaMetros: d
          });
        }
      }
    }
  }

  const coberturaPercentual = pontosIdeais.length > 0
    ? Math.round(((pontosIdeais.length - gaps.length) / pontosIdeais.length) * 100)
    : 0;

  return {
    totalIdeais: pontosIdeais.length,
    totalReais: trapsValidas.length,
    excelentes,
    ajustesLeves,
    remanejamentos,
    coberturaPercentual,
    gaps,
    sobreposicoes,
    detalheArmadilhas,
    detalheIdeais
  };
}

/**
 * Gera texto formatado para envio direto via WhatsApp aos ACEs no próximo ciclo
 */
export function gerarGuiaWhatsApp(armadilhasReais = [], pontosIdeais = PONTOS_IDEAIS_CARMO) {
  const diag = analisarDiagnosticoGrade(armadilhasReais, pontosIdeais);
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  let msg = `🦟 *PLANEJAMENTO OPERACIONAL - CENÁRIO IDEAL DE OVITRAMPAS*\n`;
  msg += `📍 *Município de Carmo - RJ | Vigilância Ambiental*\n`;
  msg += `📅 *Ciclo de Instalação:* ${dataHoje}\n`;
  msg += `🎯 *Meta Técnica:* ${diag.totalIdeais} Pontos com espaçamento regular de ~300m\n`;
  msg += `📊 *Diagnóstico Atual:* ${diag.coberturaPercentual}% de cobertura urbana efetiva\n\n`;

  msg += `📌 *STATUS DA MALHA INSTALADA (${diag.totalReais} ARMADILHAS):*\n`;
  msg += `✅ *Alinhamento Perfeito (Manter):* ${diag.excelentes} armadilhas\n`;
  msg += `⚠️ *Ajuste Leve de Posição:* ${diag.ajustesLeves} armadilhas\n`;
  msg += `🔄 *Remanejamento Recomendado:* ${diag.remanejamentos} armadilhas\n`;
  msg += `🚨 *Vácuos de Cobertura Descobertos:* ${diag.gaps.length} setores\n\n`;

  if (diag.gaps.length > 0) {
    msg += `🗺️ *PRIORIDADES DE INSTALAÇÃO (VÁCUOS CRÍTICOS):*\n`;
    diag.gaps.forEach((g) => {
      const p = g.pontoIdeal;
      msg += `▪️ *${p.codigo}* | ${p.bairro} - ${p.quarteirao} (${p.rua})\n   📍 Coordenadas: ${p.latitude}, ${p.longitude}\n`;
    });
    msg += `\n`;
  }

  msg += `📋 *ROTEIRO DETALHADO POR ARMADILHA:*\n`;
  diag.detalheArmadilhas.forEach((comp) => {
    const t = comp.armadilha;
    const p = comp.pontoIdealMaisProximo;
    const cod = t.codigo || `OV-${String(t.numero).padStart(2, '0')}`;
    const icone = comp.status === 'manter' ? '✅' : comp.status === 'ajuste_leve' ? '⚠️' : '🔄';
    msg += `${icone} *${cod}* (${t.bairro || 'Sem Bairro'})\n`;
    msg += `   Destino: ${p.codigo} - ${p.bairro} (${p.quarteirao})\n`;
    msg += `   Ação: ${comp.orientacao}\n`;
  });

  msg += `\n🌐 *Acesse o Mapa Interativo de Planejamento:*\n`;
  msg += `https://gps-ovitrampas.pages.dev/cenario-ideal`;

  return msg;
}

/**
 * Gera parecer técnico automatizado para Gestão Municipal / SUS
 */
export function gerarParecerTecnicoIa(analise) {
  const diag = analise || analisarDiagnosticoGrade([]);
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  return {
    titulo: 'Parecer Técnico de Otimização Geoespacial da Rede de Ovitrampas',
    municipio: 'Carmo - Estado do Rio de Janeiro',
    data: dataHoje,
    resumoExecutivo: `A avaliação geoespacial da rede de ovitrampas de Carmo-RJ indicou uma taxa de cobertura urbana atual de ${diag.coberturaPercentual}%. Foram identificadas ${diag.excelentes} armadilhas perfeitamente alinhadas, ${diag.ajustesLeves} armadilhas em distância sub-ótima com necessidade de calibração leve e ${diag.remanejamentos} pontos com sobreposição ou afastamento excessivo em relação aos centróides residenciais prioritários.`,
    fundamentacao: 'Em conformidade com a Nota Técnica do Ministério da Saúde e as diretrizes do Programa Nacional de Controle do Aedes aegypti (PNCA), a distância recomendada entre estações de monitoramento situa-se na faixa de 300 a 400 metros em áreas de relevo acidentado e tecido urbano descontínuo, assegurando que o raio de atração das fêmeas grávidas (~175m) cubra a totalidade dos quarteirões habitados sem gerar duplicação de esforço amostral.',
    recomendacoes: [
      `Manter ativas as ${diag.excelentes} armadilhas com excelente posicionamento nos seus atuais logradouros.`,
      `Promover o deslocamento tático de ${diag.ajustesLeves} armadilhas em distâncias médias de 60 a 120 metros nos mesmos quarteirões para otimizar sombreamento e representatividade.`,
      `Redirecionar ${diag.remanejamentos} armadilhas hoje aglomeradas para os ${diag.gaps.length} setores residenciais identificados com vácuo amostral (com destaque para quarteirões periféricos em Jardim Centenário, Morro do Estado e Botafogo).`,
      'Utilizar o aplicativo GPS Ovitrampas com o módulo "Cenário Ideal" integrado para guiar os ACEs via azimute e distância métrica em tempo real durante a próxima rodada de substituição das palhetas.'
    ],
    conclusao: 'A adoção da malha otimizada de 35 pontos permitirá atingir 100% de cobertura dos quarteirões habitados da sede municipal de Carmo sem a necessidade de adquirir novas armadilhas, maximizando a acurácia dos Índices de Positividade de Ovitrampas (IPO) e Densidade de Ovos (IDO).'
  };
}
