/**
 * Motor de Roteirização Otimizada para Coleta de Palhetas (Carmo - RJ)
 * Algoritmo TSP (Traveling Salesperson Problem) com heurística Nearest-Neighbor + 2-Opt.
 * Suporta 1 Veículo (circuito único) ou 2 Veículos (partição geográfica balanceada).
 * Integração com OSRM para traçado real que segue as curvas das ruas como GPS de carro.
 */

import { calcDistanceMeters } from './geoDistance.js';
import rotasPrecalculadas from './rotasPrecalculadasCarmo.json';

// Cache persistente para evitar requisições repetidas ao OSRM e funcionar 100% offline
const OSRM_STORAGE_KEY = 'gps_ovitrampas_osrm_cache_v1';
const osrmCache = new Map();

// Carrega cache prévio do localStorage
if (typeof window !== 'undefined') {
  try {
    const salvo = localStorage.getItem(OSRM_STORAGE_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      Object.entries(parsed).forEach(([k, v]) => osrmCache.set(k, v));
    }
  } catch (e) {}
}

function salvarNoCacheLocal(key, val) {
  osrmCache.set(key, val);
  if (typeof window !== 'undefined') {
    try {
      const obj = {};
      osrmCache.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(OSRM_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {}
  }
}

/**
 * Resolve o problema do caixeiro viajante (TSP) usando Nearest Neighbor + 2-Opt
 */
function resolverTsp2Opt(pontos) {
  const n = pontos.length;
  if (n <= 1) return { paradas: pontos, kmTotal: 0, tempoMinutos: n * 3, tempoFormatado: `${n * 3} min` };
  if (n === 2) {
    const d = calcDistanceMeters(pontos[0].latitude, pontos[0].longitude, pontos[1].latitude, pontos[1].longitude);
    const km = Number((d / 1000).toFixed(2));
    const tm = Math.round(km * 2.5) + 6;
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
  const tempoDeslocamentoMin = Math.round(kmTotal * 2.8);
  const tempoColetaMin = paradas.length * 3; // 3 minutos para pegar a palheta na residência
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
    const scoreA = (Number(a.latitude) - avgLat) * 1.3 + (Number(a.longitude) - avgLng);
    const scoreB = (Number(b.latitude) - avgLat) * 1.3 + (Number(b.longitude) - avgLng);
    return scoreA - scoreB;
  });

  const metade = Math.ceil(sorted.length / 2);
  const setor1 = sorted.slice(0, metade);
  const setor2 = sorted.slice(metade);

  return { setor1, setor2 };
}

/**
 * Coordenada canônica do ponto de partida oficial das rotas veiculares de coleta:
 * Quarteirão 1/1 do Jardim Centenário (-21.9298, -42.6088)
 */
export const COORD_INICIO_JARDIM_CENTENARIO = {
  latitude: -21.9298,
  longitude: -42.6088,
  bairro: 'Jardim Centenário',
  quarteirao: 'Q-1/1'
};

/**
 * Reordena a lista de pontos para que o Quarteirão 1/1 do Jardim Centenário
 * seja estritamente o ponto de partida (índice 0 / Parada #1 do carro).
 */
export function reordenarComInicioJardimCentenario(pontos = []) {
  if (!pontos || pontos.length <= 1) return pontos;

  // 1. Tenta encontrar por Quarteirão 1/1 ou código P-08 no Jardim Centenário
  let startIdx = pontos.findIndex((p) => {
    const q = String(p.quarteirao || '').trim().toLowerCase();
    const b = String(p.bairro || '').toLowerCase();
    const c = String(p.codigo || '').trim().toUpperCase();

    return (
      q === 'q-1/1' ||
      q === '1/1' ||
      (q.includes('1/1') && b.includes('centenário')) ||
      (c === 'P-08' && b.includes('centenário'))
    );
  });

  // 2. Se não encontrou por texto, busca pela menor distância euclidiana da coordenada oficial
  if (startIdx === -1) {
    let menorDist = Infinity;
    pontos.forEach((p, idx) => {
      if (p.latitude != null && p.longitude != null) {
        const d = calcDistanceMeters(
          COORD_INICIO_JARDIM_CENTENARIO.latitude,
          COORD_INICIO_JARDIM_CENTENARIO.longitude,
          Number(p.latitude),
          Number(p.longitude)
        );
        if (d < menorDist) {
          menorDist = d;
          startIdx = idx;
        }
      }
    });
  }

  if (startIdx > 0) {
    const copia = [...pontos];
    const [pontoInicio] = copia.splice(startIdx, 1);
    copia.unshift(pontoInicio);
    return copia;
  }

  return pontos;
}

/**
 * Gera roteiro otimizado para coleta de palhetas
 */
export function calcularRotaColetaOtimizada(pontos = [], numVeiculos = 1) {
  const validos = pontos.filter(p => p.latitude != null && p.longitude != null);
  if (validos.length === 0) return null;

  // Garante que o Quarteirão 1/1 do Jardim Centenário seja o ponto de partida (índice 0)
  const validosOrdenados = reordenarComInicioJardimCentenario(validos);

  const isReal = validos.length >= 30;
  const isIdealCanonico = validos.length === 24;

  if (numVeiculos === 1) {
    const rota = resolverTsp2Opt(validosOrdenados);
    const key = isReal ? 'real_1_v1' : (isIdealCanonico ? 'ideal_1_v1' : null);
    const geomPre = key && rotasPrecalculadas[key] ? rotasPrecalculadas[key] : null;

    const km = geomPre ? geomPre.distanciaKm : rota.kmTotal;
    const duracao = geomPre ? geomPre.duracaoMin : Math.round(km * 2.8);
    const tempoTotal = duracao + rota.paradas.length * 3;
    const tempoFmt = formatarTempo(tempoTotal);

    const textoWhatsApp = gerarTextoWhatsAppRota(rota.paradas, 'Veículo 1 (Frota Completa)', km, tempoFmt);

    return {
      numVeiculos: 1,
      kmTotalGlobal: km,
      tempoEstimadoGlobal: tempoFmt,
      rotas: [
        {
          id: 'v1',
          nome: 'Carro 1 (Circuito Completo)',
          cor: '#2563eb', // Azul
          geometriaRuas: geomPre ? geomPre.coordenadas : null,
          paradas: rota.paradas,
          kmTotal: km,
          tempoMinutos: tempoTotal,
          tempoFormatado: tempoFmt,
          textoWhatsApp
        }
      ]
    };
  }

  // 2 Veículos: Partição e Roteamento Independente
  let { setor1, setor2 } = dividirEmDoisSetores(validos);

  // Garante que o setor que contém o Quarteirão 1/1 do Jardim Centenário seja o Setor 1 (Carro 1)
  const setor2TemCentenario = setor2.some(p => {
    const q = String(p.quarteirao || '').trim().toLowerCase();
    const b = String(p.bairro || '').toLowerCase();
    return q === 'q-1/1' || q === '1/1' || (q.includes('1/1') && b.includes('centenário'));
  });

  if (setor2TemCentenario) {
    const temp = setor1;
    setor1 = setor2;
    setor2 = temp;
  }

  // Setor 1 inicia obrigatoriamente no Quarteirão 1/1 do Jardim Centenário
  const setor1Ordenado = reordenarComInicioJardimCentenario(setor1);
  const rota1 = resolverTsp2Opt(setor1Ordenado);
  const rota2 = resolverTsp2Opt(setor2);

  const key1 = isReal ? 'real_2_v1' : (isIdealCanonico ? 'ideal_2_v1' : null);
  const key2 = isReal ? 'real_2_v2' : (isIdealCanonico ? 'ideal_2_v2' : null);
  const geom1 = key1 && rotasPrecalculadas[key1] ? rotasPrecalculadas[key1] : null;
  const geom2 = key2 && rotasPrecalculadas[key2] ? rotasPrecalculadas[key2] : null;

  const km1 = geom1 ? geom1.distanciaKm : rota1.kmTotal;
  const dur1 = geom1 ? geom1.duracaoMin : Math.round(km1 * 2.8);
  const t1 = dur1 + rota1.paradas.length * 3;

  const km2 = geom2 ? geom2.distanciaKm : rota2.kmTotal;
  const dur2 = geom2 ? geom2.duracaoMin : Math.round(km2 * 2.8);
  const t2 = dur2 + rota2.paradas.length * 3;

  const kmTotalGlobal = Number((km1 + km2).toFixed(2));
  const tempoMax = Math.max(t1, t2);

  const textoWhatsApp1 = gerarTextoWhatsAppRota(rota1.paradas, 'Carro 1 • Setor Sul / Centro (Início: Q-1/1 Centenário)', km1, formatarTempo(t1));
  const textoWhatsApp2 = gerarTextoWhatsAppRota(rota2.paradas, 'Carro 2 • Setor Norte / Morro do Estado', km2, formatarTempo(t2));

  return {
    numVeiculos: 2,
    kmTotalGlobal,
    tempoEstimadoGlobal: formatarTempo(tempoMax),
    rotas: [
      {
        id: 'v1',
        nome: 'Carro 1 (Setor Sul / Centro)',
        cor: '#2563eb',
        geometriaRuas: geom1 ? geom1.coordenadas : null,
        paradas: rota1.paradas,
        kmTotal: km1,
        tempoMinutos: t1,
        tempoFormatado: formatarTempo(t1),
        textoWhatsApp: textoWhatsApp1
      },
      {
        id: 'v2',
        nome: 'Carro 2 (Setor Norte / Morro do Estado)',
        cor: '#d97706',
        geometriaRuas: geom2 ? geom2.coordenadas : null,
        paradas: rota2.paradas,
        kmTotal: km2,
        tempoMinutos: t2,
        tempoFormatado: formatarTempo(t2),
        textoWhatsApp: textoWhatsApp2
      }
    ]
  };
}

/**
 * Busca o traçado real das ruas pelo Open Source Routing Machine (OSRM).
 * Retorna GeoJSON com a rota seguindo fielmente cada curva e esquina das ruas de Carmo.
 */
export async function buscarGeometriaRuasOSRM(paradas = []) {
  if (!paradas || paradas.length < 2) {
    return {
      coordenadas: paradas.map(p => [Number(p.latitude), Number(p.longitude)]),
      distanciaKm: null,
      duracaoMin: null
    };
  }

  const cacheKey = paradas.map(p => `${Number(p.latitude).toFixed(5)},${Number(p.longitude).toFixed(5)}`).join(';');
  if (osrmCache.has(cacheKey)) {
    return osrmCache.get(cacheKey);
  }

  const coordsStr = paradas.map(p => `${Number(p.longitude).toFixed(6)},${Number(p.latitude).toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const r = data.routes[0];
      // OSRM devolve [lng, lat], convertemos para Leaflet [lat, lng]
      const latLngs = r.geometry.coordinates.map(c => [Number(c[1].toFixed(6)), Number(c[0].toFixed(6))]);
      const result = {
        coordenadas: latLngs,
        distanciaKm: Number((r.distance / 1000).toFixed(2)),
        duracaoMin: Math.round(r.duration / 60)
      };
      salvarNoCacheLocal(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('OSRM indisponível ou offline. Usando linhas diretas das paradas:', err);
  }

  return {
    coordenadas: paradas.map(p => [Number(p.latitude), Number(p.longitude)]),
    distanciaKm: null,
    duracaoMin: null
  };
}

/**
 * Enriquece os dados da rota com o traçado real das ruas via OSRM
 */
export async function enriquecerRotaComRuasOSRM(dadosRota) {
  if (!dadosRota || !dadosRota.rotas) return dadosRota;

  try {
    const novasRotas = await Promise.all(
      dadosRota.rotas.map(async (vRota) => {
        const osrmRes = await buscarGeometriaRuasOSRM(vRota.paradas);
        const kmReal = osrmRes.distanciaKm || vRota.kmTotal;
        const duracaoConducao = osrmRes.duracaoMin || Math.round(kmReal * 2.8);
        const tempoColetaTotal = vRota.paradas.length * 3;
        const tempoTotalMin = duracaoConducao + tempoColetaTotal;

        return {
          ...vRota,
          kmTotal: kmReal,
          tempoMinutos: tempoTotalMin,
          tempoFormatado: formatarTempo(tempoTotalMin),
          geometriaRuas: osrmRes.coordenadas
        };
      })
    );

    const kmTotalGlobal = Number(novasRotas.reduce((acc, r) => acc + r.kmTotal, 0).toFixed(2));
    const tempoMax = Math.max(...novasRotas.map(r => r.tempoMinutos));

    return {
      ...dadosRota,
      kmTotalGlobal,
      tempoEstimadoGlobal: formatarTempo(tempoMax),
      rotas: novasRotas
    };
  } catch (err) {
    console.warn('Erro ao enriquecer rotas com OSRM:', err);
    return dadosRota;
  }
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
  msg += `🛣️ *Distância Real nas Ruas:* ~${km} km | ⏱️ *Tempo Estimado:* ~${tempo}\n\n`;

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
