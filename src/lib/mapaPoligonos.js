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

/** Rotulo de cada armadilha: ovos de A e de B lado a lado. */
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

/**
 * "Ambas" = Ciclo A e Ciclo B juntos.
 *  - ovosAmbas = SOMA dos ovos das duas palhetas (total informativo);
 *  - ultimosOvos = MEDIA por palheta (soma / palhetas lidas): e o valor usado para a COR/faixa, porque a escala
 *    de risco (0, 1-20, 21-50, 51-100, >100) e por palheta. Assim 60 + 60 = media 60 (faixa 51 a 100), nao "critica".
 * Armadilha lida so em um dos ciclos conta com o que tem (o B esta parcial).
 */
export function mesclarCiclos(listaA = [], listaB = []) {
  const porNumero = new Map(listaB.map((b) => [String(b.numero), b]));
  return listaA.map((x) => {
    const y = porNumero.get(String(x.numero));
    const oA = temLeitura(x) ? Number(x.ultimosOvos) : null;
    const oB = y && temLeitura(y) ? Number(y.ultimosOvos) : null;
    const n = (oA === null ? 0 : 1) + (oB === null ? 0 : 1);
    const soma = n === 0 ? null : (oA ?? 0) + (oB ?? 0);
    const media = n === 0 ? null : Math.round((soma / n) * 10) / 10;
    return { ...x, ultimosOvos: media, ovosA: oA, ovosB: oB, ovosAmbas: soma, palhetasLidas: n };
  });
}

/** Indicadores de "Ambas" (lista vinda de mesclarCiclos): IPO por armadilha (positiva em A ou B), IDO/IDV por palheta. */
export function metricasAmbas(lista = []) {
  const lidas = lista.filter((a) => a.palhetasLidas > 0);
  const pos = lidas.filter((a) => a.ovosAmbas > 0);
  const ovos = lidas.reduce((s, a) => s + a.ovosAmbas, 0);
  const palhetas = lidas.reduce((s, a) => s + a.palhetasLidas, 0);
  const palPos = lidas.reduce((s, a) => s + (a.ovosA > 0 ? 1 : 0) + (a.ovosB > 0 ? 1 : 0), 0);
  return {
    total: lista.length,
    totalLidas: lidas.length,
    totalPositivas: pos.length,
    totalOvos: ovos,
    palhetasLidas: palhetas,
    ipo: lidas.length ? (pos.length / lidas.length) * 100 : 0,
    ido: palPos ? ovos / palPos : 0,
    idv: palhetas ? ovos / palhetas : 0,
    criticos: lidas.filter((a) => Number(a.ultimosOvos) > 100).length
  };
}

/** IDV de um ciclo: ovos / armadilhas examinadas (positivas ou nao) - Nota Tecnica MS 3/2025, item 4.27. */
export function idvDe(m) {
  return m && m.totalLidas ? m.totalOvos / m.totalLidas : 0;
}

// Cor do TEXTO de cada faixa (mais escura que a do mapa para ler bem no papel; mesma familia das 5 cores).
const COR_TEXTO_FAIXA = {
  sem_leitura: [107, 114, 128],
  negativa: [37, 99, 235],
  baixa: [22, 163, 74],
  media: [202, 138, 4],
  alta: [234, 88, 12],
  critica: [220, 38, 38]
};

export function corTextoDaFaixa(id) {
  return COR_TEXTO_FAIXA[id] || COR_TEXTO_FAIXA.sem_leitura;
}

/**
 * Cor do nome de cada bairro/local = faixa do PIOR FOCO (maior contagem) dentre as armadilhas lidas dele.
 * Ex.: Progresso tem um foco de 147 ovos -> o nome "Progresso" sai em vermelho no relatorio.
 * Devolve Map(nome -> [r, g, b]).
 */
export function coresDosBairros(lista = [], nomeFn) {
  const pior = new Map();
  lista.forEach((a) => {
    const n = nomeFn(a);
    if (!pior.has(n)) pior.set(n, null);
    if (temLeitura(a)) {
      const v = Number(a.ultimosOvos);
      const p = pior.get(n);
      if (p === null || v > p) pior.set(n, v);
    }
  });
  const out = new Map();
  pior.forEach((v, n) => out.set(n, corTextoDaFaixa(faixaDeOvos(v).id)));
  return out;
}
