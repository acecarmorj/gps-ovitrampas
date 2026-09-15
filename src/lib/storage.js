/**
 * Gerenciador de Armazenamento Permanente e Sincronização em Segundo Plano:
 * - IndexedDB: Armazenamento permanente de Fotos, Armadilhas e Leituras (NÃO apaga ao fechar o app).
 * - LocalStorage: Espelho rápido dos metadados para carregamento instantâneo.
 * - Persistent Storage API: Solicita persistência incondicional ao Android/Chrome/iOS.
 * - Background Sync: Fila de envio automático assim que o aparelho detectar internet.
 */

const DB_NAME = 'gps_ovitrampas_db';
const DB_VERSION = 2;
const PHOTO_STORE = 'trap_photos';
const TRAPS_STORE = 'traps_offline';
const LAB_STORE = 'lab_readings_offline';

const TRAPS_STORAGE_KEY = 'gps_ovitrampas_traps_v2';
const LAB_STORAGE_KEY = 'gps_ovitrampas_lab_readings_v2';

const broadcast = typeof window !== 'undefined' && window.BroadcastChannel
  ? new BroadcastChannel('gps_ovitrampas_sync')
  : null;

// Endpoint da API de sincronização (Cloudflare Worker ou mock local)
const API_SYNC_ENDPOINT = typeof window !== 'undefined' && window.VITE_API_SYNC_URL
  ? window.VITE_API_SYNC_URL
  : 'https://ovitrampas-api.acecarmorj.workers.dev/api/sync';

// Solicita persistência garantida no navegador (evita limpeza automática do cache)
export async function solicitarArmazenamentoPermanente() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const persistente = await navigator.storage.persist();
      console.log('Armazenamento permanente concedido:', persistente);
      return persistente;
    } catch (e) {
      console.warn('Falha ao solicitar persistência:', e);
    }
  }
  return false;
}

// Inicialização do IndexedDB com Stores de Fotos, Armadilhas e Leituras
function openOvitrampasDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TRAPS_STORE)) {
        db.createObjectStore(TRAPS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LAB_STORE)) {
        db.createObjectStore(LAB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// GESTÃO DE FOTOS NO INDEXEDDB (ILIMITADO E PERMANENTE)
// ---------------------------------------------------------------------------

export async function salvarFotoArmadilha(id, dataUrlOrBlob) {
  try {
    const db = await openOvitrampasDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      const store = tx.objectStore(PHOTO_STORE);
      store.put({ id, data: dataUrlOrBlob, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Erro ao salvar foto no IndexedDB:', err);
    return false;
  }
}

export async function obterFotoArmadilha(id) {
  try {
    const db = await openOvitrampasDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readonly');
      const store = tx.objectStore(PHOTO_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Erro ao obter foto do IndexedDB:', err);
    return null;
  }
}

export async function excluirFotoArmadilha(id) {
  try {
    const db = await openOvitrampasDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      const store = tx.objectStore(PHOTO_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

export function compressImage(file, maxDimension = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// ---------------------------------------------------------------------------
// GESTÃO DE ARMADILHAS E PERSISTÊNCIA INQUEBRÁVEL
// ---------------------------------------------------------------------------

export function getArmadilhas() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRAPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function salvarArmadilhas(lista) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRAPS_STORAGE_KEY, JSON.stringify(lista));
    if (broadcast) {
      broadcast.postMessage({ type: 'TRAPS_UPDATE', traps: lista });
    }

    // Grava também no IndexedDB para redundância total
    const db = await openOvitrampasDB();
    const tx = db.transaction(TRAPS_STORE, 'readwrite');
    const store = tx.objectStore(TRAPS_STORE);
    lista.forEach((item) => store.put(item));
  } catch (e) {
    console.warn('Erro ao persistir armadilhas:', e);
  }
}

export async function carregarArmadilhasDoIndexedDB() {
  try {
    const db = await openOvitrampasDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TRAPS_STORE, 'readonly');
      const store = tx.objectStore(TRAPS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const idbList = req.result || [];
        const localList = getArmadilhas();
        // Mescla sem duplicidade
        const map = new Map();
        localList.forEach((a) => map.set(a.id, a));
        idbList.forEach((a) => map.set(a.id, a));
        const final = Array.from(map.values()).sort(
          (a, b) => new Date(b.instaladaEm).getTime() - new Date(a.instaladaEm).getTime()
        );
        salvarArmadilhas(final);
        resolve(final);
      };
      req.onerror = () => resolve(getArmadilhas());
    });
  } catch (e) {
    return getArmadilhas();
  }
}

/**
 * Cria armadilha com garantia 100% offline
 */
export async function cadastrarArmadilha({
  numero,
  palheta,
  rua,
  numeroImovel,
  bairro,
  microarea,
  quarteirao,
  latitude,
  longitude,
  precisaoGps,
  moradorNome,
  fotoDataUrl
}) {
  const id = 'arm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

  const novaArmadilha = {
    id,
    numero: String(numero).trim(),
    palheta: String(palheta || 'P-01').trim(),
    moradorNome: String(moradorNome || '').trim(),
    rua: rua || 'Logradouro não identificado',
    numeroImovel: numeroImovel || '',
    bairro: bairro || 'Carmo',
    microarea: microarea || 'Centro',
    quarteirao: quarteirao || 'Q-01',
    latitude: Number(latitude),
    longitude: Number(longitude),
    precisaoGps: precisaoGps ? Math.round(precisaoGps) : 10,
    temFoto: Boolean(fotoDataUrl),
    status: 'instalada',
    syncStatus: 'pendente', // 'pendente' | 'sincronizado'
    instaladaEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString(),
    leituras: []
  };

  // 1. Salva a foto no IndexedDB
  if (fotoDataUrl) {
    await salvarFotoArmadilha(id, fotoDataUrl);
  }

  // 2. Salva a armadilha no LocalStorage e no IndexedDB
  const todas = getArmadilhas();
  todas.unshift(novaArmadilha);
  await salvarArmadilhas(todas);

  // 3. Tenta envio imediato em segundo plano se houver conexão
  tentarSincronizarEmSegundoPlano();

  return novaArmadilha;
}

export async function excluirArmadilha(id) {
  await excluirFotoArmadilha(id);
  const todas = getArmadilhas().filter((a) => a.id !== id);
  await salvarArmadilhas(todas);

  try {
    const db = await openOvitrampasDB();
    const tx = db.transaction(TRAPS_STORE, 'readwrite');
    tx.objectStore(TRAPS_STORE).delete(id);
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// GESTÃO DO LABORATÓRIO E PERSISTÊNCIA
// ---------------------------------------------------------------------------

export function getLeituras() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LAB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function salvarLeituras(lista) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(lista));
    if (broadcast) {
      broadcast.postMessage({ type: 'LAB_UPDATE', readings: lista });
    }

    const db = await openOvitrampasDB();
    const tx = db.transaction(LAB_STORE, 'readwrite');
    const store = tx.objectStore(LAB_STORE);
    lista.forEach((item) => store.put(item));
  } catch (e) {}
}

export async function registrarLeituraLaboratorio({
  armadilhaId,
  numeroArmadilha,
  numeroPalheta,
  ovos,
  tecnicoNome,
  fotoPalhetaDataUrl
}) {
  const leituraId = 'leit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const qtdOvos = Math.max(0, parseInt(ovos, 10) || 0);

  const novaLeitura = {
    id: leituraId,
    armadilhaId,
    numeroArmadilha: String(numeroArmadilha).trim(),
    numeroPalheta: String(numeroPalheta).trim() || 'P-01',
    ovos: qtdOvos,
    positiva: qtdOvos > 0,
    tecnicoNome: tecnicoNome || 'Laboratório Carmo',
    syncStatus: 'pendente',
    lidaEm: new Date().toISOString()
  };

  if (fotoPalhetaDataUrl) {
    await salvarFotoArmadilha(leituraId, fotoPalhetaDataUrl);
  }

  const todasLeituras = getLeituras();
  todasLeituras.unshift(novaLeitura);
  await salvarLeituras(todasLeituras);

  // Atualiza a armadilha correspondente
  const todasArmadilhas = getArmadilhas();
  const index = todasArmadilhas.findIndex(
    (a) => a.id === armadilhaId || (a.numero && a.numero.toLowerCase() === String(numeroArmadilha).toLowerCase())
  );

  if (index !== -1) {
    todasArmadilhas[index] = {
      ...todasArmadilhas[index],
      status: 'analisada',
      ultimosOvos: qtdOvos,
      ultimaPalheta: novaLeitura.numeroPalheta,
      ultimaLeituraEm: novaLeitura.lidaEm,
      atualizadaEm: new Date().toISOString(),
      syncStatus: 'pendente',
      leituras: [novaLeitura, ...(todasArmadilhas[index].leituras || [])]
    };
    await salvarArmadilhas(todasArmadilhas);
  }

  // Tenta sincronização em segundo plano
  tentarSincronizarEmSegundoPlano();

  return novaLeitura;
}

// ---------------------------------------------------------------------------
// MOTOR DE SINCRONIZAÇÃO EM SEGUNDO PLANO (BACKGROUND SYNC)
// ---------------------------------------------------------------------------

let syncInProgress = false;
const syncListeners = new Set();

export function onSyncStatusChange(callback) {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

function notificarStatusSync(status) {
  syncListeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {}
  });
}

export function getStatusSincronizacao() {
  const armadilhas = getArmadilhas();
  const leituras = getLeituras();
  const pendentesArm = armadilhas.filter((a) => a.syncStatus === 'pendente').length;
  const pendentesLeit = leituras.filter((l) => l.syncStatus === 'pendente').length;
  const totalPendentes = pendentesArm + pendentesLeit;

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncInProgress,
    totalPendentes,
    pendentesArm,
    pendentesLeit
  };
}

/**
 * Tenta sincronizar todos os dados pendentes quando houver conexão com a internet
 */
export async function tentarSincronizarEmSegundoPlano() {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    notificarStatusSync(getStatusSincronizacao());
    return;
  }

  if (syncInProgress) return;

  const armadilhas = getArmadilhas();
  const leituras = getLeituras();
  const pendentesArm = armadilhas.filter((a) => a.syncStatus === 'pendente');
  const pendentesLeit = leituras.filter((l) => l.syncStatus === 'pendente');

  if (pendentesArm.length === 0 && pendentesLeit.length === 0) {
    notificarStatusSync(getStatusSincronizacao());
    return;
  }

  syncInProgress = true;
  notificarStatusSync({ ...getStatusSincronizacao(), syncInProgress: true });

  try {
    // Tenta enviar o lote para o servidor em background
    const payload = {
      traps: pendentesArm,
      readings: pendentesLeit,
      syncedAt: new Date().toISOString()
    };

    let sucessoEnvio = false;

    try {
      const res = await fetch(API_SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        sucessoEnvio = true;
      }
    } catch (netErr) {
      // Se a rota remota ainda não estiver no ar ou falhar a rede,
      // os dados permanecem 100% seguros localmente no aparelho!
      console.log('Servidor remoto inacessível no momento. Dados mantidos salvos localmente.');
    }

    if (sucessoEnvio) {
      // Marca como sincronizado no LocalStorage e IndexedDB
      const armadilhasAtualizadas = armadilhas.map((a) =>
        a.syncStatus === 'pendente' ? { ...a, syncStatus: 'sincronizado' } : a
      );
      const leiturasAtualizadas = leituras.map((l) =>
        l.syncStatus === 'pendente' ? { ...l, syncStatus: 'sincronizado' } : l
      );

      await salvarArmadilhas(armadilhasAtualizadas);
      await salvarLeituras(leiturasAtualizadas);
    }
  } catch (err) {
    console.warn('Erro durante tentativa de sync:', err);
  } finally {
    syncInProgress = false;
    notificarStatusSync(getStatusSincronizacao());
  }
}

/**
 * Inicia os observadores automáticos de reconexão de rede (Online Event + Heartbeat)
 */
export function iniciarMonitoramentoConectividade() {
  if (typeof window === 'undefined') return;

  // 1. Solicita armazenamento persistente
  solicitarArmazenamentoPermanente();

  // 2. Carrega dados do IndexedDB caso o LocalStorage tenha sido limpo
  carregarArmadilhasDoIndexedDB();

  // 3. Dispara sincronização assim que o dispositivo ficar online
  window.addEventListener('online', () => {
    console.log('Dispositivo conectou à internet. Disparando envio em segundo plano...');
    tentarSincronizarEmSegundoPlano();
  });

  window.addEventListener('offline', () => {
    notificarStatusSync(getStatusSincronizacao());
  });

  // 4. Heartbeat silencioso a cada 30 segundos para enviar pendências
  setInterval(() => {
    if (navigator.onLine) {
      tentarSincronizarEmSegundoPlano();
    }
  }, 30000);
}

export function onStorageUpdate(callback) {
  if (!broadcast) return () => {};

  const handleMessage = (evt) => {
    if (evt.data && (evt.data.type === 'TRAPS_UPDATE' || evt.data.type === 'LAB_UPDATE')) {
      callback();
    }
  };

  broadcast.addEventListener('message', handleMessage);
  return () => {
    broadcast.removeEventListener('message', handleMessage);
  };
}
