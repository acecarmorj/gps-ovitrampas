// Service worker minimo do GPS Ovitrampas.
// Objetivo unico: o app precisa ABRIR mesmo sem internet. Sem isso, se o
// agente fechar o navegador/app numa area sem sinal, o proximo carregamento
// pede o index.html e o JS pra rede - e falha com a tela padrao de "sem
// internet" do navegador, mesmo o app sendo "offline-first" por dentro
// (IndexedDB/localStorage). So cobre recursos do PROPRIO app (mesma
// origem) - tiles de mapa e fontes de CDN externos passam direto, sem cache
// (nao sao essenciais pra abrir a tela e cadastrar uma armadilha).

const CACHE_NAME = 'ovitrampas-shell-v7';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/').catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return; // so mesma origem

  // Navegacao (abrir o app ou trocar de tela: /campo, /admin, /mapa...):
  // tenta a rede primeiro; se falhar, devolve o index.html salvo - o
  // roteamento e feito pelo proprio React depois que o app carrega.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Demais recursos do proprio app (JS/CSS com hash, dados territoriais):
  // rede primeiro pra sempre pegar a versao mais nova quando online; cai
  // pro cache salvo quando estiver offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
