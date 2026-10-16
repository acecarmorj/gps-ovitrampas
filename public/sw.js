// Service Worker GPS Ovitrampas Carmo-RJ
// Suporte 100% Offline para App, Fichas e Mapas de Satélite/Ruas
// Áreas sem sinal de operadora: Córrego da Prata, Porto Velho do Cunha e Usina Light

const CACHE_SHELL = 'ovitrampas-shell-v43';
const CACHE_TILES = 'ovitrampas-tiles-v1';

// Domínios de tiles de mapas para cache offline persistente
const MAP_DOMAINS = [
  'server.arcgisonline.com',
  'services.arcgisonline.com',
  'tile.openstreetmap.org',
  'basemaps.cartocdn.com',
  'cartodb-basemaps'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf',
        '/GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf',
        '/PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf',
        '/TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf'
      ]).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_SHELL && k !== CACHE_TILES) {
            return caches.delete(k);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. REQUISIÇÕES DE TILES DE MAPA (ARCGIS / OPENSTREETMAP) - CACHE-FIRST COM OFFLINE SEGURO
  const isMapTile = MAP_DOMAINS.some((d) => url.hostname.includes(d));
  if (isMapTile) {
    event.respondWith(
      caches.open(CACHE_TILES).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch (err) {
          // Se estiver sem internet e não tiver tile, retorna resposta vazia amigável
          return new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } });
        }
      })
    );
    return;
  }

  // 2. APENAS RECURSOS DA MESMA ORIGEM DAQUI EM DIANTE
  if (!request.url.startsWith(self.location.origin)) return;

  // 3. NAVEGAÇÃO ENTRE ROTAS (/campo, /acao, /plano, /mapa...)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_SHELL).then((cache) => cache.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // 4. DEMAIS RECURSOS DO APP (JS, CSS, PDFS, IMAGENS)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Atualiza em segundo plano se houver conexão
        fetch(request)
          .then((res) => {
            if (res && res.ok) {
              caches.open(CACHE_SHELL).then((cache) => cache.put(request, res));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
