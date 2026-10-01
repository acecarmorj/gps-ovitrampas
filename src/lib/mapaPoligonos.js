/**
 * Apoio dos mapas de incidencia por poligono (quarteirao / praca / distrito).
 * Faixas de risco = escala oficial do projeto: 0 negativa, 1-20 baixa, 21-50 media, 51-100 alta, >100 critica.
 */
import { detectTerritoryFromGps } from './geoDetection';

export const FAIXAS_RISCO = [
  { id: 'sem_leitura', label: 'Sem leitura', cor: '#cbd5e1', min: null },
  { id: 'negativa', label: '0 ovos (negativa)', cor: '#2563eb', min: 0 },
  { id: 'baixa', label: '1 a 20', cor: '#16a34a', min: 1 },
  { id: 'media', label: '21 a 50', cor: '#eab308', min: 21 },
  { id: 'alta', label: '51 a 100', cor: '#f97316', min: 51 },
  { id: 'critica', label: 'Mais de 100', cor: '#dc2626', min: 101 }
];

export function faixaDeOvos(ovos) {
  if (ovos === null || ovos === undefined || Number.isNaN(Number(ovos))) return FAIXAS_RISCO[0];
  const n = Number(ovos);
  if (n > 100) return FAIXAS_RISCO[5];
  if (n > 50) return FAIXAS_RISCO[4];
  if (n > 20) return FAIXAS_RISCO[3];
  if (n > 0) return FAIXAS_RISCO[2];
  return FAIXAS_RISCO[1];
}

export function temLeitura(arm) {
  return arm.ultimosOvos !== null && arm.ultimosOvos !== undefined;
}

/** Descobre o poligono territorial (quarteirao/praca/distrito) onde a armadilha esta. */
export function poligonoDaArmadilha(arm) {
  const lat = Number(arm.latitude ?? arm.lat);
  const lng = Number(arm.longitude ?? arm.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || typeof window === 'undefined') return null;
  try {
    return detectTerritoryFromGps(lat, lng).polygon || null;
  } catch (_) {
    return null;
  }
}

/**
 * Agrupa armadilhas ja adaptadas a um ciclo por poligono.
 * A cor do poligono e a do pior foco (maior contagem) dentre as armadilhas lidas dentro dele.
 */
export function agruparPorPoligono(armadilhas = []) {
  const mapa = new Map();
  armadilhas.forEach((arm) => {
    const poly = poligonoDaArmadilha(arm);
    if (!poly) return;
    if (!mapa.has(poly.id)) mapa.set(poly.id, { poly, armadilhas: [], ovos: 0, lidas: 0, positivas: 0, maxOvos: null });
    const g = mapa.get(poly.id);
    g.armadilhas.push(arm);
    if (temLeitura(arm)) {
      const o = Number(arm.ultimosOvos);
      g.lidas += 1;
      g.ovos += o;
      if (o > 0) g.positivas += 1;
      g.maxOvos = g.maxOvos === null ? o : Math.max(g.maxOvos, o);
    }
  });
  return Array.from(mapa.values());
}

export function nomePoligono(poly) {
  if (!poly) return '-';
  if (poly.territoryType === 'distrito') return poly.name;
  if (poly.territoryType === 'praca') return poly.name;
  return `${poly.folder} · Q-${poly.name}`;
}

/** Rotulo de cada armadilha: ovos de A e de B lado a lado (cada ciclo separado, nunca somados). */
export function montarRotulosOvos(listaA = [], listaB = []) {
  const m = new Map();
  listaA.forEach((x) => m.set(String(x.numero), { a: temLeitura(x) ? Number(x.ultimosOvos) : null, b: null }));
  listaB.forEach((x) => {
    const atual = m.get(String(x.numero)) || { a: null, b: null };
    m.set(String(x.numero), { ...atual, b: temLeitura(x) ? Number(x.ultimosOvos) : null });
  });
  return m;
}

/**
 * Estima os ovos num ponto (ex.: centro de um quarteirao SEM armadilha) misturando as armadilhas proximas:
 * media ponderada pela distancia (nucleo gaussiano). Devolve { valor, cobertura } ou null se nao ha
 * armadilha por perto (cobertura baixa = longe de tudo, nao pinta).
 */
export function estimarOvosNoPonto(lat, lng, armadilhasLidas, sigmaM = 300) {
  const mLat = 110540;
  const mLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const inv2s2 = 1 / (2 * sigmaM * sigmaM);
  let somaK = 0;
  let somaKV = 0;
  armadilhasLidas.forEach((a) => {
    const la = Number(a.latitude);
    const lo = Number(a.longitude);
    const v = Number(a.ultimosOvos);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || !Number.isFinite(v)) return;
    const dx = (lng - lo) * mLng;
    const dy = (lat - la) * mLat;
    const k = Math.exp(-(dx * dx + dy * dy) * inv2s2);
    somaK += k;
    somaKV += k * v;
  });
  if (somaK < 0.05) return null;
  return { valor: somaKV / somaK, cobertura: somaK };
}

export function centroDoPoligono(coords = []) {
  if (!coords.length) return null;
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}
