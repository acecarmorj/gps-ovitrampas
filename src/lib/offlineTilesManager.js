/**
 * Gerenciador de Pré-carregamento de Mapas Offline para Distritos Rurais:
 * - Córrego da Prata (4º Distrito)
 * - Porto Velho do Cunha (3º Distrito)
 * - Ilha dos Pombos / Usina Light
 * - Influência (2º Distrito)
 * - Sede (Progresso, Centro, Jardim Centenário, Val Paraíso, Caixa d'Água)
 *
 * Salva os blocos de satélite e ruas diretamente no Cache Storage do navegador.
 * Garante que o agente visualize os mapas mesmo onde não há sinal de celular.
 */

import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE } from '../maps/leafletIcons';

export const PONTOS_CRITICOS_OFFLINE = [
  { nome: 'Córrego da Prata (4º Dist.)', lat: -21.9891200, lng: -42.6789100, zoom: [15, 16] },
  { nome: 'Porto Velho do Cunha (3º Dist.)', lat: -21.8791200, lng: -42.5482300, zoom: [15, 16] },
  { nome: 'Ilha dos Pombos / Usina Light', lat: -21.8456100, lng: -42.5891200, zoom: [15, 16] },
  { nome: 'Influência (2º Dist.)', lat: -21.9056157, lng: -42.6393661, zoom: [15, 16] },
  { nome: 'Progresso • Pousada Valle do Sol', lat: -21.9312450, lng: -42.6078120, zoom: [15, 16] },
  { nome: 'Centro • R. Oscar Curty', lat: -21.9351200, lng: -42.6094500, zoom: [15, 16] },
  { nome: 'Jardim Centenário', lat: -21.9284500, lng: -42.6101200, zoom: [15, 16] },
  { nome: 'Val Paraíso', lat: -21.9372100, lng: -42.6045300, zoom: [15, 16] },
  { nome: 'Barra de São Francisco (5º Dist.)', lat: -21.8214500, lng: -42.5123400, zoom: [15, 16] }
];

// Converte latitude/longitude em coordenadas de tile (x, y, z)
function latLngToTile(lat, lng, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

// Gera a lista de URLs de tiles para uma área (grid 3x3 ao redor do ponto)
function gerarUrlsTilesParaPonto(lat, lng, zooms) {
  const urls = [];
  const templates = [
    MAP_TILE_STANDARD.url, // Ruas / OSM
    MAP_TILE_SATELLITE.url // Satélite ESRI
  ];

  zooms.forEach((z) => {
    const center = latLngToTile(lat, lng, z);
    // Grid 3x3 de tiles (cobre ~1.5km ao redor do foco)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = center.x + dx;
        const y = center.y + dy;

        templates.forEach((tmpl) => {
          const s = ['a', 'b', 'c'][Math.abs(x + y) % 3];
          const url = tmpl
            .replace('{s}', s)
            .replace('{z}', z)
            .replace('{x}', x)
            .replace('{y}', y);
          urls.push(url);
        });
      }
    }
  });

  return urls;
}

/**
 * Baixa e armazena em cache todos os tiles dos distritos sem internet.
 * @param {Function} onProgress callback com (atual, total, pontoNome)
 */
export async function baixarMapasOfflineDistritos(onProgress) {
  if (!('caches' in window)) {
    throw new Error('Cache Storage não suportado neste navegador.');
  }

  const cache = await caches.open('ovitrampas-tiles-v1');
  const todasUrls = [];

  PONTOS_CRITICOS_OFFLINE.forEach((p) => {
    const urls = gerarUrlsTilesParaPonto(p.lat, p.lng, p.zoom);
    urls.forEach((u) => {
      todasUrls.push({ url: u, nome: p.nome });
    });
  });

  const total = todasUrls.length;
  let concluidos = 0;

  for (const item of todasUrls) {
    try {
      const match = await cache.match(item.url);
      if (!match) {
        const res = await fetch(item.url, { mode: 'no-cors' });
        if (res) {
          await cache.put(item.url, res);
        }
      }
    } catch (_) {
      // Ignora falhas pontuais de conexão
    }
    concluidos++;
    onProgress?.(concluidos, total, item.nome);
  }

  try {
    localStorage.setItem('ovitrampas_mapas_offline_baixados', 'true');
    localStorage.setItem('ovitrampas_mapas_offline_data', new Date().toISOString());
  } catch (_) {}

  return { total, concluidos };
}

/**
 * Verifica se os mapas offline já foram baixados no aparelho.
 */
export function verificarStatusMapasOffline() {
  try {
    const baixado = localStorage.getItem('ovitrampas_mapas_offline_baixados') === 'true';
    const data = localStorage.getItem('ovitrampas_mapas_offline_data');
    return { baixado, data };
  } catch (_) {
    return { baixado: false, data: null };
  }
}
