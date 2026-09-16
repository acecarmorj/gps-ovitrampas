/**
 * Motor de Orientacao Cardeal e Rumo de Navegacao (Carmo - RJ)
 * Calcula o rumo (bearing em graus 0-360) e os pontos cardeais (N, S, L, O)
 * para orientar o agente no campo sobre onde caminhar para respeitar
 * a regra de espacamento de 300m a 400m entre armadilhas.
 */

import { calcDistanceMeters } from './geoDistance';

/**
 * Calcula o azimute / rumo inicial em graus (0 a 360) de ponto 1 para ponto 2.
 * 0 = Norte, 90 = Leste, 180 = Sul, 270 = Oeste
 */
export function calcBearing(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const phi1 = (Number(lat1) * Math.PI) / 180;
  const phi2 = (Number(lat2) * Math.PI) / 180;
  const deltaLambda = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const degrees = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(degrees);
}

/**
 * Converte graus de azimute (0-360) para o ponto cardeal / colateral correspondente em portugues.
 */
export function bearingToCardinal(degrees) {
  const deg = (Number(degrees) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) {
    return { sigla: 'N', nome: 'Norte', seta: '↑', angulo: 0 };
  } else if (deg >= 22.5 && deg < 67.5) {
    return { sigla: 'NE', nome: 'Nordeste', seta: '↗', angulo: 45 };
  } else if (deg >= 67.5 && deg < 112.5) {
    return { sigla: 'L', nome: 'Leste', seta: '→', angulo: 90 };
  } else if (deg >= 112.5 && deg < 157.5) {
    return { sigla: 'SE', nome: 'Sudeste', seta: '↘', angulo: 135 };
  } else if (deg >= 157.5 && deg < 202.5) {
    return { sigla: 'S', nome: 'Sul', seta: '↓', angulo: 180 };
  } else if (deg >= 202.5 && deg < 247.5) {
    return { sigla: 'SO', nome: 'Sudoeste', seta: '↙', angulo: 225 };
  } else if (deg >= 247.5 && deg < 292.5) {
    return { sigla: 'O', nome: 'Oeste', seta: '←', angulo: 270 };
  } else {
    return { sigla: 'NO', nome: 'Noroeste', seta: '↖', angulo: 315 };
  }
}

/**
 * Retorna o rumo diametralmente oposto (para onde o agente deve se afastar).
 */
export function getOppositeBearing(degrees) {
  return (Number(degrees) + 180) % 360;
}

/**
 * Analisa a posicao do agente em relacao as armadilhas cadastradas e gera orientacao tatica de navegacao.
 */
export function calculateNavigationGuidance(userPos, allTraps = []) {
  if (!userPos || userPos.latitude == null || userPos.longitude == null) {
    return {
      status: 'sem_gps',
      distancia: 0,
      rumoGraus: 0,
      cardinal: { sigla: 'N', nome: 'Norte', seta: '↑', angulo: 0 },
      orientacao: 'Aguardando localizacao GPS do satelite...',
      acao: 'Fique sob ceu aberto.',
      cor: '#64748b'
    };
  }

  const validTraps = allTraps.filter(
    (t) => t.latitude != null && t.longitude != null
  );

  if (validTraps.length === 0) {
    return {
      status: 'primeira',
      distancia: 0,
      rumoGraus: 0,
      cardinal: { sigla: 'N', nome: 'Norte', seta: '↑', angulo: 0 },
      orientacao: 'Primeira armadilha deste ciclo em Carmo!',
      acao: 'Instale no centro do quarteirao em local sombreado e protegido.',
      cor: '#10b981'
    };
  }

  // Encontra a armadilha mais proxima
  let nearestTrap = null;
  let shortestDist = Infinity;

  for (const trap of validTraps) {
    const d = calcDistanceMeters(
      userPos.latitude,
      userPos.longitude,
      trap.latitude,
      trap.longitude
    );
    if (d < shortestDist) {
      shortestDist = d;
      nearestTrap = trap;
    }
  }

  // Rumo da posicao do agente ate a armadilha mais proxima
  const rumoArmadilha = calcBearing(
    userPos.latitude,
    userPos.longitude,
    nearestTrap.latitude,
    nearestTrap.longitude
  );
  const cardArmadilha = bearingToCardinal(rumoArmadilha);

  // Rumo de afastamento (direcao oposta a armadilha)
  const rumoAfastamento = getOppositeBearing(rumoArmadilha);
  const cardAfastamento = bearingToCardinal(rumoAfastamento);

  // Caso 1: Muito proximo (< 280 metros) -> Alerta de aproximacao excessiva
  if (shortestDist < 280) {
    const faltaMeters = 300 - shortestDist;
    return {
      status: 'afastar',
      armadilhaNumero: nearestTrap.numero,
      distancia: shortestDist,
      rumoArmadilhaGraus: rumoArmadilha,
      cardinalArmadilha: cardArmadilha,
      rumoSugeridoGraus: rumoAfastamento,
      cardinalSugerido: cardAfastamento,
      orientacao: `OV-${nearestTrap.numero} esta a apenas ${shortestDist}m ao ${cardArmadilha.nome} (${cardArmadilha.sigla}).`,
      acao: `Caminhe cerca de ${faltaMeters}m mais em direcao ao ${cardAfastamento.nome.toUpperCase()} (${cardAfastamento.seta} ${cardAfastamento.sigla}) para atingir o raio de 300m.`,
      cor: '#e11d48',
      corBg: '#fff1f2',
      corBorder: '#fecdd3'
    };
  }

  // Caso 2: Espacamento ideal (280m a 420m) -> Ponto perfeito
  if (shortestDist >= 280 && shortestDist <= 420) {
    return {
      status: 'ideal',
      armadilhaNumero: nearestTrap.numero,
      distancia: shortestDist,
      rumoArmadilhaGraus: rumoArmadilha,
      cardinalArmadilha: cardArmadilha,
      rumoSugeridoGraus: rumoAfastamento,
      cardinalSugerido: cardAfastamento,
      orientacao: `Ponto excelente! Distancia de ${shortestDist}m da OV-${nearestTrap.numero} (${cardArmadilha.sigla}).`,
      acao: 'Atende perfeitamente a diretriz entomologica oficial de 300m a 400m!',
      cor: '#059669',
      corBg: '#ecfdf5',
      corBorder: '#a7f3d0'
    };
  }

  // Caso 3: Espacamento amplo (> 420m) -> Area bem distante
  return {
    status: 'amplo',
    armadilhaNumero: nearestTrap.numero,
    distancia: shortestDist,
    rumoArmadilhaGraus: rumoArmadilha,
    cardinalArmadilha: cardArmadilha,
    rumoSugeridoGraus: rumoAfastamento,
    cardinalSugerido: cardAfastamento,
    orientacao: `Espacamento amplo (${shortestDist}m da OV-${nearestTrap.numero} ao ${cardArmadilha.sigla}).`,
    acao: 'Area nova sem cobertura proxima. Pode instalar para expandir a malha.',
    cor: '#0284c7',
    corBg: '#f0f9ff',
    corBorder: '#bae6fd'
  };
}
