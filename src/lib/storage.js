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

/**
 * O campo `numero` guarda SEMPRE o numero cru ("02"), sem prefixo.
 * Todas as telas montam o rotulo adicionando o prefixo na hora de exibir
 * ("ARM-02", "OV-02"). Se o prefixo fosse gravado junto, apareceria
 * duplicado ("OV-OV-02", "ARM-OV-02"). O campo `palheta`, ao contrario,
 * guarda COM prefixo ("PL-02") porque e exibido direto, sem montagem.
 */
export function normalizarNumeroArmadilha(valor) {
  return String(valor ?? '').trim().replace(/^OV[-_ ]*/i, '').trim();
}

// Endpoints da API de sincronização (Cloudflare Worker + D1)
const API_BASE_URL = typeof window !== 'undefined' && window.VITE_API_BASE_URL
  ? window.VITE_API_BASE_URL
  : 'https://ovitrampas-api.acecarmorj.workers.dev';

const API_SYNC_ENDPOINT = `${API_BASE_URL}/api/sync`;
const API_TRAPS_ENDPOINT = `${API_BASE_URL}/api/traps`;
const API_READINGS_ENDPOINT = `${API_BASE_URL}/api/readings`;

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

    // Grava também no IndexedDB para redundância total.
    // Limpa antes de regravar: o IndexedDB precisa ser um espelho fiel da
    // lista. Antes so fazia `put`, entao registro removido (apagado pelo
    // usuario ou apagado no servidor) continuava la e voltava a aparecer no
    // proximo boot, via carregarArmadilhasDoIndexedDB().
    const db = await openOvitrampasDB();
    const tx = db.transaction(TRAPS_STORE, 'readwrite');
    const store = tx.objectStore(TRAPS_STORE);
    store.clear();
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
    numero: normalizarNumeroArmadilha(numero),
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

const DELETED_TRAPS_KEY = 'gps_ovitrampas_deleted_traps_v1';

function getDeletedTrapIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_TRAPS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function marcarTrapComoDeletada(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const ids = getDeletedTrapIds();
    ids.add(id);
    localStorage.setItem(DELETED_TRAPS_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {}
}

export async function atualizarArmadilha(id, dadosAtualizados) {
  if (!id) return null;
  const todas = getArmadilhas();
  const index = todas.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const anterior = todas[index];

  const armadilhaAtualizada = {
    ...anterior,
    numero: dadosAtualizados.numero !== undefined ? normalizarNumeroArmadilha(dadosAtualizados.numero) : anterior.numero,
    palheta: dadosAtualizados.palheta !== undefined ? String(dadosAtualizados.palheta).trim() : anterior.palheta,
    moradorNome: dadosAtualizados.moradorNome !== undefined ? String(dadosAtualizados.moradorNome).trim() : anterior.moradorNome,
    rua: dadosAtualizados.rua !== undefined ? String(dadosAtualizados.rua).trim() : anterior.rua,
    numeroImovel: dadosAtualizados.numeroImovel !== undefined ? String(dadosAtualizados.numeroImovel).trim() : (anterior.numeroImovel || ''),
    bairro: dadosAtualizados.bairro !== undefined ? String(dadosAtualizados.bairro).trim() : (anterior.bairro || 'Carmo'),
    microarea: dadosAtualizados.microarea !== undefined ? String(dadosAtualizados.microarea).trim() : anterior.microarea,
    quarteirao: dadosAtualizados.quarteirao !== undefined ? String(dadosAtualizados.quarteirao).trim() : anterior.quarteirao,
    observacoes: dadosAtualizados.observacoes !== undefined ? String(dadosAtualizados.observacoes).trim() : (anterior.observacoes || ''),
    status: dadosAtualizados.status !== undefined ? dadosAtualizados.status : anterior.status,
    ultimosOvos: dadosAtualizados.ultimosOvos !== undefined
      ? (dadosAtualizados.ultimosOvos === '' || dadosAtualizados.ultimosOvos === null ? null : Math.max(0, parseInt(dadosAtualizados.ultimosOvos, 10) || 0))
      : anterior.ultimosOvos,
    atualizadaEm: new Date().toISOString(),
    syncStatus: 'pendente'
  };

  todas[index] = armadilhaAtualizada;
  await salvarArmadilhas(todas);

  // Sincroniza em segundo plano com o D1
  tentarSincronizarEmSegundoPlano();

  return armadilhaAtualizada;
}

export async function excluirArmadilha(id) {
  if (!id) return;
  marcarTrapComoDeletada(id);
  await excluirFotoArmadilha(id);
  const todas = getArmadilhas().filter((a) => a.id !== id);
  await salvarArmadilhas(todas);

  try {
    const db = await openOvitrampasDB();
    const tx = db.transaction(TRAPS_STORE, 'readwrite');
    tx.objectStore(TRAPS_STORE).delete(id);
  } catch (e) {}

  // Exclui imediatamente no Cloudflare D1 se houver conexão
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await fetch(`${API_TRAPS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Exclusão remota falhou (permanece deletada localmente):', e);
    }
  }
}

export async function limparTodasArmadilhas() {
  try {
    localStorage.removeItem(TRAPS_STORAGE_KEY);
    localStorage.removeItem(LAB_STORAGE_KEY);
    localStorage.removeItem(DELETED_TRAPS_KEY);

    const db = await openOvitrampasDB();
    const tx = db.transaction([TRAPS_STORE, LAB_STORE, PHOTO_STORE], 'readwrite');
    tx.objectStore(TRAPS_STORE).clear();
    tx.objectStore(LAB_STORE).clear();
    tx.objectStore(PHOTO_STORE).clear();

    if (broadcast) {
      broadcast.postMessage({ type: 'TRAPS_UPDATE', traps: [] });
      broadcast.postMessage({ type: 'LAB_UPDATE', readings: [] });
    }

    // Chama endpoint remoto de limpeza total se online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/api/traps/clear`, { method: 'POST' });
      } catch (e) {
        console.warn('Limpeza remota D1 falhou:', e);
      }
    }
  } catch (e) {
    console.warn('Erro ao limpar todas as armadilhas:', e);
  }
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
    numeroArmadilha: normalizarNumeroArmadilha(numeroArmadilha),
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
  const numeroNormalizado = normalizarNumeroArmadilha(numeroArmadilha).toLowerCase();
  const index = todasArmadilhas.findIndex(
    (a) => a.id === armadilhaId ||
      (a.numero && normalizarNumeroArmadilha(a.numero).toLowerCase() === numeroNormalizado)
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

  const pendentesArm = getArmadilhas().filter((a) => a.syncStatus === 'pendente');
  const pendentesLeit = getLeituras().filter((l) => l.syncStatus === 'pendente');

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

function mapD1TrapToLocal(row) {
  return {
    id: row.id,
    // Normaliza registros legados que foram gravados com o prefixo junto ("OV-02")
    numero: normalizarNumeroArmadilha(row.numero),
    palheta: row.palheta || 'P-01',
    moradorNome: row.morador_nome || '',
    rua: row.rua || '',
    numeroImovel: row.numero_imovel || '',
    bairro: row.bairro || 'Carmo',
    microarea: row.microarea || '',
    quarteirao: row.quarteirao || '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    precisaoGps: row.precisao_gps != null ? Number(row.precisao_gps) : 10,
    temFoto: Boolean(row.tem_foto),
    status: row.status || 'instalada',
    instaladaEm: row.instalada_em,
    atualizadaEm: row.atualizada_em || row.instalada_em,
    ultimosOvos: row.ultimos_ovos != null ? Number(row.ultimos_ovos) : undefined,
    ultimaPalheta: row.ultima_palheta || undefined,
    ultimaLeituraEm: row.ultima_leitura_em || undefined,
    syncStatus: 'sincronizado'
  };
}

/**
 * Puxa armadilhas cadastradas por OUTROS aparelhos/agentes na central via D1
 */
export async function sincronizarDadosDoServidor() {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  try {
    const res = await fetch(API_TRAPS_ENDPOINT);
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !Array.isArray(data.traps)) return;

    const armadilhasLocais = getArmadilhas();
    const deletedIds = getDeletedTrapIds();
    const map = new Map();

    // 1. Carrega dados vindos do servidor D1 (exceto as deletadas)
    data.traps.forEach((row) => {
      if (deletedIds.has(row.id)) return;
      const parsed = mapD1TrapToLocal(row);
      map.set(parsed.id, parsed);
    });

    // 2. Preserva APENAS registros locais ainda pendentes de envio.
    // Registros ja marcados como 'sincronizado' que sumiram do servidor foram
    // apagados no D1 - devem sumir daqui tambem. Antes eles eram preservados
    // (`|| !map.has(loc.id)`), o que fazia registro apagado no servidor
    // "reviver" para sempre no aparelho, deixando cada dispositivo com uma
    // lista diferente.
    armadilhasLocais.forEach((loc) => {
      if (loc.syncStatus === 'pendente') {
        map.set(loc.id, loc);
      }
    });

    const final = Array.from(map.values()).sort(
      (a, b) => new Date(b.instaladaEm).getTime() - new Date(a.instaladaEm).getTime()
    );

    // Se houve alteração de tamanho ou novo registro, persiste
    if (final.length !== armadilhasLocais.length || data.traps.length > 0) {
      await salvarArmadilhas(final);
    }
    return final;
  } catch (err) {
    console.warn('Falha ao sincronizar dados do servidor D1:', err);
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

  // 3. Sincronização inicial ao abrir
  if (navigator.onLine) {
    sincronizarDadosDoServidor();
    tentarSincronizarEmSegundoPlano();
  }

  // 4. Dispara sincronização assim que o dispositivo ficar online
  window.addEventListener('online', () => {
    console.log('Dispositivo conectou à internet. Sincronizando com D1...');
    sincronizarDadosDoServidor();
    tentarSincronizarEmSegundoPlano();
  });

  window.addEventListener('offline', () => {
    notificarStatusSync(getStatusSincronizacao());
  });

  // 5. Polling a cada 10 segundos para receber registros feitos por outros agentes na rua
  setInterval(() => {
    if (navigator.onLine) {
      sincronizarDadosDoServidor();
      tentarSincronizarEmSegundoPlano();
    }
  }, 10000);
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
