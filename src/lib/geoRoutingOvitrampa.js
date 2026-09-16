/**
 * Motor de Roteirização Otimizada para Coleta de Palhetas (Carmo - RJ)
 * Algoritmo TSP (Traveling Salesperson Problem) com heurística Nearest-Neighbor + 2-Opt.
 * Suporta 1 Veículo (circuito único) ou 2 Veículos (partição geográfica balanceada).
 */

import { calcDistanceMeters } from './geoDistance';

/**
 * Resolve o problema do caixeiro viajante (TSP) usando Nearest Neighbor + 2-Opt
 */
function resolverTsp2Opt(pontos) {
  const n = pontos.length;
  if (n <= 1) return { paradas: pontos, kmTotal: 0, tempoMinutos: n * 4, tempoFormatado: `${n * 4} min` };
  if (n === 2) {
    const d = calcDistanceMeters(pontos[0].latitude, pontos[0].longitude, pontos[1].latitude, pontos[1].longitude);
    const km = Number((d / 1000).toFixed(2));
    const tm = Math.round(km * 3.5) + 8;
    return {
      paradas: [
        { ...pontos[0], ordem: 1, distanciaDoAnteriorMetros: 0, distanciaAcumuladaMetros: 0 },
        { ...pontos[1], ordem: 2, distanciaDoAnteriorMetros: d, distanciaAcumuladaMetros: d }
      ],
      kmTotal: km,
      tempoMinutos: tm,
      tempoFormatado: formatarTempo(tm)
    };
  }

  // 1. Tour Inicial com Nearest Neighbor
  const unvisited = new Set();
  for (let i = 1; i < n; i++) unvisited.add(i);

  const tour = [0];
  while (unvisited.size > 0) {
    const curr = tour[tour.length - 1];
    let bestDist = Infinity;
    let bestNode = null;

    unvisited.forEach((node) => {
      const d = calcDistanceMeters(
        pontos[curr].latitude,
        pontos[curr].longitude,
        pontos[node].latitude,
        pontos[node].longitude
      );
      if (d < bestDist) {
        bestDist = d;
        bestNode = node;
      }
    });

    tour.push(bestNode);
    unvisited.delete(bestNode);
  }

  // 2. Refinamento com 2-Opt (Desfaz cruzamentos de retas para menor km)
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (j === n - 1 && i === 0) continue;

        const d1 = calcDistanceMeters(
          pontos[tour[i]].latitude,
          pontos[tour[i]].longitude,
          pontos[tour[i + 1]].latitude,
          pontos[tour[i + 1]].longitude
        );
        const d2 = calcDistanceMeters(
          pontos[tour[j]].latitude,
          pontos[tour[j]].longitude,
          pontos[tour[(j + 1) % n]].latitude,
          pontos[tour[(j + 1) % n]].longitude
        );

        const d3 = calcDistanceMeters(
          pontos[tour[i]].latitude,
          pontos[tour[i]].longitude,
          pontos[tour[j]].latitude,
          pontos[tour[j]].longitude
        );
        const d4 = calcDistanceMeters(
          pontos[tour[i + 1]].latitude,
          pontos[tour[i + 1]].longitude,
          pontos[tour[(j + 1) % n]].latitude,
          pontos[tour[(j + 1) % n]].longitude
        );

        if (d3 + d4 < d1 + d2) {
          // Inverter segmento entre i+1 e j
          const sub = tour.slice(i + 1, j + 1).reverse();
          tour.splice(i + 1, sub.length, ...sub);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // 3. Montar paradas sequenciais com distância acumulada
  const paradas = [];
  let metrosTotais = 0;

  for (let k = 0; k < tour.length; k++) {
    const p = pontos[tour[k]];
    let distDoAnterior = 0;
    if (k > 0) {
      const prev = pontos[tour[k - 1]];
      distDoAnterior = calcDistanceMeters(prev.latitude, prev.longitude, p.latitude, p.longitude);
      metrosTotais += distDoAnterior;
    }

    paradas.push({
      ...p,
      ordem: k + 1,
      distanciaDoAnteriorMetros: distDoAnterior,
      distanciaAcumuladaMetros: metrosTotais
    });
  }

  const kmTotal = Number((metrosTotais / 1000).toFixed(2));
  const tempoDeslocamentoMin = Math.round(kmTotal * 3.5);
  const tempoColetaMin = paradas.length * 4;
  const tempoMinutos = tempoDeslocamentoMin + tempoColetaMin;

  return {
    paradas,
    kmTotal,
    tempoMinutos,
    tempoFormatado: formatarTempo(tempoMinutos)
  };
}

function formatarTempo(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m > 0 ? `${m}min` : ''}`;
}

/**
 * Calcula a partição geográfica em 2 setores balanceados
 */
function dividirEmDoisSetores(pontos) {
  if (pontos.length <= 1) return { setor1: pontos, setor2: [] };

  const avgLat = pontos.reduce((acc, p) => acc + Number(p.latitude), 0) / pontos.length;
  const avgLng = pontos.reduce((acc, p) => acc + Number(p.longitude), 0) / pontos.length;

  const sorted = [...pontos].sort((a, b) => {
    const scoreA = (Number(a.latitude) - avgLat) * 1.2 + (Number(a.longitude) - avgLng);
    const scoreB = (Number(b.latitude) - avgLat) * 1.2 + (Number(b.longitude) - avgLng);
    return scoreA - scoreB;
  });

  const metade = Math.ceil(sorted.length / 2);
  const setor1 = sorted.slice(0, metade);
  const setor2 = sorted.slice(metade);

  return { setor1, setor2 };
}

/**
 * Gera roteiro otimizado para coleta de palhetas
 */
export function calcularRotaColetaOtimizada(pontos = [], numVeiculos = 1) {
  const validos = pontos.filter(p => p.latitude != null && p.longitude != null);
  if (validos.length === 0) return null;

  if (numVeiculos === 1) {
    const rota = resolverTsp2Opt(validos);
    const textoWhatsApp = gerarTextoWhatsAppRota(rota.paradas, 'Veículo 1 (Frota Completa)', rota.kmTotal, rota.tempoFormatado);

    return {
      numVeiculos: 1,
      kmTotalGlobal: rota.kmTotal,
      tempoEstimadoGlobal: rota.tempoFormatado,
      rotas: [
        {
          id: 'v1',
          nome: 'Carro 1 (Circuito Completo)',
          cor: '#2563eb', // Azul
          ...rota,
          textoWhatsApp
        }
      ]
    };
  }

  // 2 Veículos: Partição e Roteamento Independente
  const { setor1, setor2 } = dividirEmDoisSetores(validos);
  const rota1 = resolverTsp2Opt(setor1);
  const rota2 = resolverTsp2Opt(setor2);

  const kmTotalGlobal = Number((rota1.kmTotal + rota2.kmTotal).toFixed(2));
  const tempoMax = Math.max(rota1.tempoMinutos, rota2.tempoMinutos);

  const textoWhatsApp1 = gerarTextoWhatsAppRota(rota1.paradas, 'Carro 1 • Setor Sul / Centro', rota1.kmTotal, rota1.tempoFormatado);
  const textoWhatsApp2 = gerarTextoWhatsAppRota(rota2.paradas, 'Carro 2 • Setor Norte / Morro do Estado', rota2.kmTotal, rota2.tempoFormatado);

  return {
    numVeiculos: 2,
    kmTotalGlobal,
    tempoEstimadoGlobal: formatarTempo(tempoMax),
    rotas: [
      {
        id: 'v1',
        nome: 'Carro 1 (Setor Sul / Centro)',
        cor: '#2563eb',
        ...rota1,
        textoWhatsApp: textoWhatsApp1
      },
      {
        id: 'v2',
        nome: 'Carro 2 (Setor Norte / Morro do Estado)',
        cor: '#d97706',
        ...rota2,
        textoWhatsApp: textoWhatsApp2
      }
    ]
  };
}

/**
 * Formata mensagem de WhatsApp pronta para envio ao motorista/equipe
 */
function gerarTextoWhatsAppRota(paradas, nomeVeiculo, km, tempo) {
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  let msg = `🚗 *ROTEIRO DE COLETA DE PALHETAS • ${nomeVeiculo.toUpperCase()}*\n`;
  msg += `📍 *Município de Carmo - RJ | Vigilância Ambiental*\n`;
  msg += `📅 *Data:* ${dataHoje}\n`;
  msg += `📊 *Total de Paradas:* ${paradas.length} armadilhas\n`;
  msg += `🛣️ *Distância Total:* ~${km} km | ⏱️ *Tempo Estimado:* ~${tempo}\n\n`;

  msg += `📋 *ORDEM SEQUENCIAL DE PARADAS (ROTA MAIS CURTA):*\n`;
  paradas.forEach((p) => {
    const num = p.numero || p.codigo;
    const end = p.rua || 'S/N';
    const bairro = p.bairro || 'Carmo';
    const morador = p.moradorNome ? ` (Morador: ${p.moradorNome})` : '';
    const prox = p.distanciaDoAnteriorMetros > 0 ? ` [➔ +${p.distanciaDoAnteriorMetros}m]` : ' [Ponto de Início]';

    msg += `*Parada ${String(p.ordem).padStart(2, '0')}* ➔ *ARM-${num}* ${prox}\n`;
    msg += `   📍 ${end} - ${bairro}${morador}\n`;
    msg += `   🗺️ GPS: ${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}\n\n`;
  });

  msg += `🌐 *Acesse o Mapa Interativo de Rota:*\n`;
  msg += `https://gps-ovitrampas.pages.dev/planejamento`;

  return msg;
}
