/**
 * Gerenciador de Armazenamento Permanente e Sincronização em Segundo Plano:
 * - IndexedDB: Armazenamento permanente de Fotos, Armadilhas e Leituras (NÃO apaga ao fechar o app).
 * - LocalStorage: Espelho rápido dos metadados para carregamento instantâneo.
 * - Persistent Storage API: Solicita persistência incondicional ao Android/Chrome/iOS.
 * - Background Sync: Fila de envio automático assim que o aparelho detectar internet.
 */

import { getChaveEquipe, getAgente } from './acessoEquipe.js';
import trapsOficiaisJson from './trapsOficiaisCarmo.json';
import readingsOficiaisJson from './readingsOficiaisCarmo.json';

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

// BroadcastChannel NUNCA entrega mensagem pra propria aba que a enviou (e
// especificacao do navegador, nao bug). Sem isso, o painel "tempo real" so
// atualizava quando OUTRA aba/aparelho mudava algo - quem acabou de
// cadastrar/editar/excluir na PROPRIA tela so via a lista mudar depois de
// um F5 manual.
const localUpdateListeners = new Set();

function notificarAtualizacaoStorage(payload) {
  if (broadcast) {
    broadcast.postMessage(payload);
  }
  localUpdateListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {}
  });
}

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
const API_BASE_URL = (typeof window !== 'undefined' && window.VITE_API_BASE_URL)
  || import.meta.env.VITE_API_BASE_URL
  || 'https://ovitrampas-api.acecarmorj.workers.dev';

const API_SYNC_ENDPOINT = `${API_BASE_URL}/api/sync`;
const API_TRAPS_ENDPOINT = `${API_BASE_URL}/api/traps`;
const API_READINGS_ENDPOINT = `${API_BASE_URL}/api/readings`;

/**
 * Executa fetch com timeout resiliente (padrão 8s).
 * Evita travamentos em redes 3G/Edge oscilantes que mantêm socket TCP aberto sem transmitir dados.
 */
export async function fetchComTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Aparelho da equipe envia a chave: o servidor so entrega nome/rua/numero do imovel com ela.
    const opcoes = { ...options, signal: controller.signal };
    const chaveEquipe = getChaveEquipe();
    if (chaveEquipe && String(url).startsWith(API_BASE_URL)) {
      opcoes.headers = { ...(options.headers || {}), 'X-Team-Key': chaveEquipe };
    }
    const res = await fetch(url, opcoes);
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Le o corpo JSON de uma resposta com o mesmo limite de tempo do fetch.
 * fetchComTimeout so protege ate os cabecalhos chegarem - res.json() roda
 * DEPOIS, sem nenhum timeout. Numa 3G que trava no meio do download do
 * corpo, essa leitura ficava pendurada pra sempre e syncInProgress nunca
 * voltava a false, travando toda sincronizacao futura ate reiniciar o app.
 */
export async function lerJsonComTimeout(res, timeoutMs = 8000) {
  return Promise.race([
    res.json().catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
  ]);
}

const SYNC_ERRORS_KEY = 'ovitrampas_sync_errors';

export function getSyncErrors() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SYNC_ERRORS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function setSyncErrors(errors) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SYNC_ERRORS_KEY, JSON.stringify(errors));
    notificarAtualizacaoStorage({ type: 'SYNC_ERRORS_UPDATE', errors });
  } catch (e) {}
}

export function limparSyncErrors() {
  setSyncErrors([]);
}

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

// Lista as fotos de palheta salvas no IndexedDB deste aparelho, cruzadas com
// as leituras (numero, palheta, ovos, data). As fotos nunca saem do aparelho
// onde foram tiradas - isso existe para o tecnico baixar e enviar por fora
// (WhatsApp, e-mail) quando precisar delas noutro lugar.
export async function listarFotosDeLeituras() {
  const leituras = getLeituras();
  const comFoto = [];
  for (const leitura of leituras) {
    const foto = await obterFotoArmadilha(leitura.id).catch(() => null);
    if (foto) comFoto.push({ leitura, foto });
  }
  comFoto.sort((a, b) => new Date(b.leitura.lidaEm || 0) - new Date(a.leitura.lidaEm || 0));
  return comFoto;
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

export const VERSAO_AUDITORIA_CADASTRO = '2026-10-15_AUDITORIA_OFICIAL_56_V2';
const VERSAO_AUDITORIA_KEY = 'gps_ovitrampas_auditoria_cadastral_ver';

// Mapa das 56 armadilhas oficiais auditadas de Carmo-RJ (15/10/2026)
const mapaOficialPorNumero = new Map();
if (Array.isArray(trapsOficiaisJson)) {
  trapsOficiaisJson.forEach((t) => {
    const num = normalizarNumeroArmadilha(t.numero);
    if (num) {
      mapaOficialPorNumero.set(num.padStart(2, '0'), t);
      mapaOficialPorNumero.set(String(parseInt(num, 10)), t);
    }
  });
}

/**
 * Reconcilia registros locais ou recebidos da rede com a base oficial auditada de 15/10/2026.
 * Preserva o status operacional de campo (palheta, leituras, ovos, status),
 * mas assegura que as atualizações cadastrais auditadas (morador, logradouro, número predial, bairro, quarteirão e GPS)
 * entrem no programa e tenham precedência estrita para as 56 armadilhas oficiais.
 */
export function reconciliarArmadilhaComBaseOficial(trap) {
  if (!trap) return trap;
  const numNorm = normalizarNumeroArmadilha(trap.numero);
  const baseOficial = mapaOficialPorNumero.get(numNorm.padStart(2, '0')) || mapaOficialPorNumero.get(String(parseInt(numNorm, 10))) || null;

  if (!baseOficial) return trap;

  // A base oficial auditada em campo (RELATORIO_AUDITORIA_ENDERECOS_CAMPO.md / trapsOficiaisCarmo.json)
  // é a autoridade máxima para as 56 armadilhas de Carmo-RJ.
  const morador = baseOficial.morador_nome || baseOficial.moradorNome || (trap.moradorNome && trap.moradorNome.trim()) || (trap.morador_nome && trap.morador_nome.trim()) || '';
  const rua = baseOficial.rua || (trap.rua && trap.rua.trim()) || '';
  const numeroImovel = (baseOficial.numero_imovel && String(baseOficial.numero_imovel).trim()) || (baseOficial.numeroImovel && String(baseOficial.numeroImovel).trim()) || (trap.numeroImovel && String(trap.numeroImovel).trim()) || (trap.numero_imovel && String(trap.numero_imovel).trim()) || '';
  const quarteirao = baseOficial.quarteirao || ((trap.quarteirao || '').trim() && !/distrito/i.test((trap.quarteirao || '').trim()) ? trap.quarteirao.trim() : 'Q-01');
  const bairro = baseOficial.bairro || (trap.bairro && trap.bairro.trim()) || 'Carmo';
  const microarea = baseOficial.microarea || baseOficial.bairro || (trap.microarea && trap.microarea.trim()) || bairro;

  const lat = Number.isFinite(Number(baseOficial.latitude)) && Number(baseOficial.latitude) !== 0 ? Number(baseOficial.latitude) : Number(trap.latitude);
  const lng = Number.isFinite(Number(baseOficial.longitude)) && Number(baseOficial.longitude) !== 0 ? Number(baseOficial.longitude) : Number(trap.longitude);

  const ultOvos = trap.ultimosOvos !== undefined ? trap.ultimosOvos : (trap.ultimos_ovos !== undefined ? trap.ultimos_ovos : baseOficial.ultimos_ovos);
  const ultPalheta = trap.ultimaPalheta || trap.ultima_palheta || baseOficial.ultima_palheta || trap.palheta;
  const ultLeitura = trap.ultimaLeituraEm || trap.ultima_leitura_em || baseOficial.ultima_leitura_em || null;

  return {
    ...trap,
    id: trap.id || baseOficial.id,
    numero: numNorm,
    palheta: trap.palheta || baseOficial.palheta || `${numNorm}A`,
    moradorNome: morador,
    morador_nome: morador,
    rua,
    numeroImovel,
    numero_imovel: numeroImovel,
    bairro,
    microarea,
    quarteirao,
    latitude: lat,
    longitude: lng,
    status: trap.status || baseOficial.status || 'instalada',
    ultimosOvos: ultOvos,
    ultimos_ovos: ultOvos,
    ultimaPalheta: ultPalheta,
    ultima_palheta: ultPalheta,
    ultimaLeituraEm: ultLeitura,
    ultima_leitura_em: ultLeitura
  };
}

export function reconciliarArmadilhasComBaseOficial(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return trapsOficiaisJson || [];
  return lista.map(reconciliarArmadilhaComBaseOficial);
}

export function getArmadilhas() {
  if (typeof window === 'undefined') return trapsOficiaisJson || [];
  try {
    const versaoAudit = localStorage.getItem(VERSAO_AUDITORIA_KEY);
    const raw = localStorage.getItem(TRAPS_STORAGE_KEY);

    // Se ainda não aplicou a auditoria de 15/10/2026 no localStorage do navegador:
    if (versaoAudit !== VERSAO_AUDITORIA_CADASTRO) {
      let lista = trapsOficiaisJson || [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            lista = reconciliarArmadilhasComBaseOficial(parsed);
          }
        } catch (_) {}
      }
      try {
        localStorage.setItem(TRAPS_STORAGE_KEY, JSON.stringify(lista));
        localStorage.setItem(VERSAO_AUDITORIA_KEY, VERSAO_AUDITORIA_CADASTRO);
      } catch (_) {}
      return lista;
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return reconciliarArmadilhasComBaseOficial(parsed);
      }
    }
    return trapsOficiaisJson || [];
  } catch (e) {
    return trapsOficiaisJson || [];
  }
}

export async function salvarArmadilhas(lista) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRAPS_STORAGE_KEY, JSON.stringify(lista));
    notificarAtualizacaoStorage({ type: 'TRAPS_UPDATE', traps: lista });

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
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error('ALERTA: Limite de armazenamento (quota) do navegador atingido!', e);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('ovitrampas_quota_exceeded', { detail: { error: e } }));
      }
    }
    console.warn('Erro ao persistir armadilhas:', e);
    // Repassa o erro: quem chamou (ex: cadastrarArmadilha) precisa saber que
    // NAO salvou de verdade, em vez de seguir como se tivesse dado certo e
    // mostrar "registrado com sucesso" pro agente com o dado perdido.
    throw e;
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
        const final = reconciliarArmadilhasComBaseOficial(Array.from(map.values())).sort(
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
  if (!String(moradorNome || '').trim()) throw new Error('Nome do morador é obrigatório.');
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
    // Nunca inventa precisao: se nao veio fix real de GPS, fica null (visivel
    // como "sem GPS" nos relatorios) em vez de fingir 10m - um valor de 10m
    // fabricado é indistinguivel de um fix bom de verdade.
    precisaoGps: precisaoGps != null ? Math.round(precisaoGps) : null,
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
    ultimaPalheta: dadosAtualizados.ultimaPalheta !== undefined ? String(dadosAtualizados.ultimaPalheta).trim() : anterior.ultimaPalheta,
    moradorNome: dadosAtualizados.moradorNome !== undefined ? String(dadosAtualizados.moradorNome).trim() : anterior.moradorNome,
    rua: dadosAtualizados.rua !== undefined ? String(dadosAtualizados.rua).trim() : anterior.rua,
    numeroImovel: dadosAtualizados.numeroImovel !== undefined ? String(dadosAtualizados.numeroImovel).trim() : (anterior.numeroImovel || ''),
    bairro: dadosAtualizados.bairro !== undefined ? String(dadosAtualizados.bairro).trim() : (anterior.bairro || 'Carmo'),
    microarea: dadosAtualizados.microarea !== undefined ? String(dadosAtualizados.microarea).trim() : anterior.microarea,
    quarteirao: dadosAtualizados.quarteirao !== undefined ? String(dadosAtualizados.quarteirao).trim() : anterior.quarteirao,
    observacoes: dadosAtualizados.observacoes !== undefined ? String(dadosAtualizados.observacoes).trim() : (anterior.observacoes || ''),
    status: dadosAtualizados.status !== undefined ? dadosAtualizados.status : anterior.status,
    instaladaEm: dadosAtualizados.instaladaEm !== undefined ? dadosAtualizados.instaladaEm : anterior.instaladaEm,
    recolhidaEm: dadosAtualizados.recolhidaEm !== undefined ? dadosAtualizados.recolhidaEm : anterior.recolhidaEm,
    palhetaRecolhida: dadosAtualizados.palhetaRecolhida !== undefined ? dadosAtualizados.palhetaRecolhida : anterior.palhetaRecolhida,
    historicoPalhetas: dadosAtualizados.historicoPalhetas !== undefined ? dadosAtualizados.historicoPalhetas : (anterior.historicoPalhetas || []),
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

/**
 * Realiza o recolhimento/retirada da armadilha e palheta no campo,
 * preparando o material recolhido para contagem no laboratório.
 */
export async function recolherArmadilhaEPalheta(id, { dataRecolhimento, condicoes, observacao, cicloId } = {}) {
  if (!id) return null;
  const todas = getArmadilhas();
  const arm = todas.find((a) => a.id === id);
  if (!arm) return null;

  const dataRecolhimentoIso = dataRecolhimento ? new Date(dataRecolhimento).toISOString() : new Date().toISOString();
  const palhetaRecolhida = arm.palheta || 'P-01';
  const cicloResolvido = cicloId || (typeof window !== 'undefined' ? localStorage.getItem('ovitrampa_campanha_ativa') : null) || '2026_NOVO';

  const itemHistorico = {
    tipo: 'recolhimento',
    palhetaRecolhida,
    recolhidaEm: dataRecolhimentoIso,
    condicoes: condicoes || 'Armadilha e palheta recolhidas intactas',
    observacao: observacao || '',
    cicloId: cicloResolvido
  };

  const historicoAtualizado = [itemHistorico, ...(arm.historicoPalhetas || [])];

  const infoRecolhimento = `Recolhida em ${new Date(dataRecolhimentoIso).toLocaleDateString('pt-BR')}${condicoes ? ' (' + condicoes + ')' : ''}${observacao ? ': ' + observacao : ''}`;
  const obsCompleta = arm.observacoes ? `${arm.observacoes} | ${infoRecolhimento}` : infoRecolhimento;

  return atualizarArmadilha(id, {
    status: 'recolhida',
    recolhidaEm: dataRecolhimentoIso,
    palhetaRecolhida,
    ultimaPalheta: palhetaRecolhida,
    historicoPalhetas: historicoAtualizado,
    observacoes: obsCompleta
  });
}

/**
 * Realiza a troca de palheta mantendo integralmente a identidade da armadilha
 * (mesmo número, mesmo morador, mesmo endereço, mesmas coordenadas GPS).
 * Inicia um novo ciclo de campo oficial (DIAS_CICLO_PADRAO, hoje 5 dias -
 * ver src/lib/situacaoOvitrampa.js).
 */
export async function trocarPalhetaArmadilha(id, { novaPalheta, dataTroca, observacao, cicloId } = {}) {
  if (!id) return null;
  const todas = getArmadilhas();
  const arm = todas.find((a) => a.id === id);
  if (!arm) return null;

  const dataInicioCiclo = dataTroca ? new Date(dataTroca).toISOString() : new Date().toISOString();
  const palhetaAtual = String(novaPalheta || '').trim() || `PL-${arm.numero}`;
  const cicloResolvido = cicloId || (typeof window !== 'undefined' ? localStorage.getItem('ovitrampa_campanha_ativa') : null) || '2026_NOVO';

  const itemHistorico = {
    palhetaAnterior: arm.palheta || 'P-01',
    trocadaEm: dataInicioCiclo,
    novaPalheta: palhetaAtual,
    ovosCicloAnterior: arm.ultimosOvos != null ? arm.ultimosOvos : null,
    observacao: observacao || '',
    cicloId: cicloResolvido
  };

  const historicoAtualizado = [itemHistorico, ...(arm.historicoPalhetas || [])];

  return atualizarArmadilha(id, {
    palheta: palhetaAtual,
    ultimaPalheta: arm.palheta || 'P-01',
    status: 'instalada',
    ultimosOvos: null,
    instaladaEm: dataInicioCiclo,
    historicoPalhetas: historicoAtualizado,
    observacoes: observacao ? `${arm.observacoes ? arm.observacoes + ' | ' : ''}${observacao}` : arm.observacoes
  });
}

/**
 * Inicia com segurança o Novo Ciclo em uma armadilha específica,
 * configurando-a com Palheta A para a nova campanha sem apagar o histórico anterior.
 */
export async function iniciarNovoCicloArmadilha(id, { novaPalheta, dataInicio, cicloId = '2026_NOVO' } = {}) {
  if (!id) return null;
  const todas = getArmadilhas();
  const arm = todas.find((a) => a.id === id);
  if (!arm) return null;

  const dataInicioIso = dataInicio ? new Date(dataInicio).toISOString() : new Date().toISOString();
  const palhetaInicial = novaPalheta || `${normalizarNumeroArmadilha(arm.numero)}A`;

  const itemHistorico = {
    tipo: 'inicio_novo_ciclo',
    palhetaAnterior: arm.palheta || 'P-01',
    novaPalheta: palhetaInicial,
    iniciadoEm: dataInicioIso,
    ovosCicloAnterior: arm.ultimosOvos != null ? arm.ultimosOvos : null,
    cicloId,
    observacao: `Novo ciclo ${cicloId} iniciado com palheta ${palhetaInicial}`
  };

  const historicoAtualizado = [itemHistorico, ...(arm.historicoPalhetas || [])];

  return atualizarArmadilha(id, {
    palheta: palhetaInicial,
    ultimaPalheta: arm.palheta || 'P-01',
    status: 'instalada',
    ultimosOvos: null,
    instaladaEm: dataInicioIso,
    historicoPalhetas: historicoAtualizado
  });
}

/**
 * Prepara o banco oficial para a abertura de um Novo Ciclo de Campo (ex: 2026_NOVO):
 * - Preserva todo o histórico e leituras anteriores intactos.
 * - Coloca as armadilhas no status 'instalada' com sua Palheta A correspondente.
 */
export async function iniciarNovoCicloCampo({ cicloId = '2026_NOVO', dataInicio } = {}) {
  const todas = getArmadilhas();
  const dataInicioIso = dataInicio ? new Date(dataInicio).toISOString() : new Date().toISOString();

  const atualizadas = todas.map((arm) => {
    const num = normalizarNumeroArmadilha(arm.numero);
    const palhetaInicial = `${num}A`;
    const itemHistorico = {
      tipo: 'inicio_novo_ciclo',
      palhetaAnterior: arm.palheta || 'P-01',
      novaPalheta: palhetaInicial,
      iniciadoEm: dataInicioIso,
      ovosCicloAnterior: arm.ultimosOvos != null ? arm.ultimosOvos : null,
      cicloId,
      observacao: `Novo ciclo ${cicloId} iniciado em campo`
    };

    return {
      ...arm,
      palheta: palhetaInicial,
      ultimaPalheta: arm.palheta || 'P-01',
      status: 'instalada',
      ultimosOvos: null,
      instaladaEm: dataInicioIso,
      historicoPalhetas: [itemHistorico, ...(arm.historicoPalhetas || [])],
      atualizadaEm: new Date().toISOString(),
      syncStatus: 'pendente'
    };
  });

  await salvarArmadilhas(atualizadas);
  tentarSincronizarEmSegundoPlano();
  return atualizadas;
}

export async function excluirArmadilha(id) {
  // BANCO OFICIAL PROTEGIDO: exclusão desativada para proteger as 56 armadilhas oficiais
  console.warn('[STORAGE] Exclusão bloqueada: banco oficial de Carmo protegido contra remoção acidental.');
  return false;
}

export async function limparTodasArmadilhas() {
  // BANCO OFICIAL PROTEGIDO: zeramento do banco permanentemente bloqueado
  console.warn('[STORAGE] Limpeza total bloqueada: banco oficial de Carmo protegido contra zeramento.');
  return false;
}

// ---------------------------------------------------------------------------
// GESTÃO DO LABORATÓRIO E PERSISTÊNCIA
// ---------------------------------------------------------------------------

export function getLeituras() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LAB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (Array.isArray(readingsOficiaisJson) && readingsOficiaisJson.length > 0) {
      return readingsOficiaisJson.map(mapD1ReadingToLocal);
    }
    return [];
  } catch (e) {
    return (readingsOficiaisJson || []).map(mapD1ReadingToLocal);
  }
}

export async function salvarLeituras(lista) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(lista));
    notificarAtualizacaoStorage({ type: 'LAB_UPDATE', readings: lista });

    const db = await openOvitrampasDB();
    const tx = db.transaction(LAB_STORE, 'readwrite');
    const store = tx.objectStore(LAB_STORE);
    store.clear();
    lista.forEach((item) => store.put(item));
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error('ALERTA: Limite de armazenamento (quota) do navegador atingido ao salvar leituras!', e);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('ovitrampas_quota_exceeded', { detail: { error: e } }));
      }
    }
    console.warn('Erro ao persistir leituras:', e);
    // Repassa o erro: quem chamou (ex: registrarLeituraLaboratorio) precisa
    // saber que NAO salvou de verdade, em vez de mostrar sucesso falso.
    throw e;
  }
}

export async function registrarLeituraLaboratorio({
  armadilhaId,
  numeroArmadilha,
  numeroPalheta,
  ovos,
  tecnicoNome,
  fotoPalhetaDataUrl,
  laudoAuditoria = null,
  cicloId
}) {
  if (!getChaveEquipe() || !getAgente()) {
    throw new Error('Digite seu nome e a senha da equipe antes de lançar palhetas.');
  }
  const leituraId = 'leit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const qtdOvos = Math.max(0, parseInt(ovos, 10) || 0);
  const cicloResolvido = cicloId || (typeof window !== 'undefined' ? localStorage.getItem('ovitrampa_campanha_ativa') : null) || '2026_NOVO';

  const novaLeitura = {
    id: leituraId,
    armadilhaId,
    numeroArmadilha: normalizarNumeroArmadilha(numeroArmadilha),
    numeroPalheta: String(numeroPalheta).trim() || 'P-01',
    ovos: qtdOvos,
    positiva: qtdOvos > 0,
    cicloId: cicloResolvido,
    campanhaId: cicloResolvido,
    tecnicoNome: getAgente() || tecnicoNome || 'Laboratório Carmo',
    // Como a contagem foi feita (app, IA, correções à mão). Antes os campos
    // da IA chegavam aqui e eram descartados - nenhuma leitura guardava de
    // onde veio o número. Vai para o D1 como JSON (coluna laudo_auditoria).
    laudoAuditoria: laudoAuditoria || null,
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
    const arm = todasArmadilhas[index];
    const isLeituraPalhetaAtual = !arm.palheta || arm.palheta.toLowerCase() === novaLeitura.numeroPalheta.toLowerCase();

    todasArmadilhas[index] = {
      ...arm,
      // Se a leitura for da palheta que está atualmente em campo, marca como analisada.
      // Se for de uma palheta anterior que foi recolhida, preserva o status 'instalada' do novo ciclo em campo.
      status: isLeituraPalhetaAtual ? 'analisada' : arm.status,
      ultimosOvos: isLeituraPalhetaAtual ? qtdOvos : arm.ultimosOvos,
      ultimaPalheta: novaLeitura.numeroPalheta,
      ultimaLeituraEm: novaLeitura.lidaEm,
      atualizadaEm: new Date().toISOString(),
      syncStatus: 'pendente',
      leituras: [novaLeitura, ...(arm.leituras || [])]
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
  const syncErrors = getSyncErrors();

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncInProgress,
    totalPendentes,
    pendentesArm,
    pendentesLeit,
    syncErrors: syncErrors.length
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

    // Ids realmente enviados neste lote. Registro que o agente cadastrar
    // DURANTE o fetch (3G lento = 10s ou mais) nao esta aqui e nao pode ser
    // marcado como sincronizado.
    const idsArmEnviados = new Set(pendentesArm.map((a) => a.id));
    const idsLeitEnviados = new Set(pendentesLeit.map((l) => l.id));

    let armAceitos = null;
    let leitAceitos = null;

    try {
      const res = await fetchComTimeout(API_SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 8000);

      if (res.ok) {
        const data = await lerJsonComTimeout(res, 8000);
        // So confia na confirmacao explicita do servidor (lista de ids
        // gravados). Antes bastava res.ok - mas o servidor podia descartar
        // itens em silencio, e portal de wi-fi publico tambem responde 200.
        // O registro era marcado como sincronizado, saia da fila e depois era
        // apagado do aparelho pelo proximo poll: dado perdido de vez.
        if (data && data.ok === true && Array.isArray(data.trapsAceitos)) {
          armAceitos = new Set(data.trapsAceitos);
          leitAceitos = new Set(Array.isArray(data.readingsAceitos) ? data.readingsAceitos : []);

          const recusados = [
            ...(Array.isArray(data.trapsRecusados) ? data.trapsRecusados : []),
            ...(Array.isArray(data.readingsRecusados) ? data.readingsRecusados : [])
          ];
          if (recusados.length > 0) {
            console.warn('Registros recusados pelo servidor (continuam pendentes):', recusados);
            setSyncErrors(recusados);
          } else {
            limparSyncErrors();
          }
        }
      } else if (res.status === 401) {
        // servidor exige o Acesso da equipe para gravar; nada se perde, fica pendente no aparelho
        setSyncErrors([{ id: null, motivo: 'Para sincronizar, ative o "Acesso da equipe" na tela inicial deste aparelho.' }]);
      }
    } catch (netErr) {
      // Se a rota remota ainda não estiver no ar ou falhar a rede,
      // os dados permanecem 100% seguros localmente no aparelho!
      console.log('Servidor remoto inacessível no momento. Dados mantidos salvos localmente.');
    }

    if (armAceitos) {
      // Rele a lista AGORA: entre o snapshot e a resposta o agente pode ter
      // cadastrado outra armadilha. Gravar o snapshot antigo apagava esse
      // cadastro do localStorage e do IndexedDB.
      const armadilhasAtualizadas = getArmadilhas().map((a) =>
        a.syncStatus === 'pendente' && idsArmEnviados.has(a.id) && armAceitos.has(a.id)
          ? { ...a, syncStatus: 'sincronizado' }
          : a
      );
      const leiturasAtualizadas = getLeituras().map((l) =>
        l.syncStatus === 'pendente' && idsLeitEnviados.has(l.id) && leitAceitos.has(l.id)
          ? { ...l, syncStatus: 'sincronizado' }
          : l
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
  const numNorm = normalizarNumeroArmadilha(row.numero);
  const baseOficial = mapaOficialPorNumero.get(numNorm.padStart(2, '0')) || mapaOficialPorNumero.get(String(parseInt(numNorm, 10))) || null;

  // A base oficial auditada de 15/10/2026 é a autoridade cadastral das 56 armadilhas oficiais de Carmo-RJ
  const morador = (baseOficial && (baseOficial.morador_nome || baseOficial.moradorNome)) || (row.morador_nome && row.morador_nome.trim()) || '';
  const rua = (baseOficial && baseOficial.rua) || (row.rua && row.rua.trim()) || '';
  const numeroImovel = (baseOficial && (baseOficial.numero_imovel || baseOficial.numeroImovel)) || (row.numero_imovel && String(row.numero_imovel).trim()) || '';

  // Quarteirão: nunca aceita o placeholder obsoleto 'Q-Distrito' se a base oficial tiver o quarteirão real auditado (ex: Q-10, Q-01, Q-05)
  const quarteiraoBruto = (row.quarteirao || '').trim();
  const quarteirao = (baseOficial && baseOficial.quarteirao)
    ? baseOficial.quarteirao
    : ((quarteiraoBruto && !/distrito/i.test(quarteiraoBruto)) ? quarteiraoBruto : 'Q-01');

  const bairro = (baseOficial && baseOficial.bairro) || (row.bairro && row.bairro.trim()) || 'Carmo';
  const microarea = (baseOficial && (baseOficial.microarea || baseOficial.bairro)) || (row.microarea && row.microarea.trim()) || bairro;

  const lat = baseOficial && Number.isFinite(Number(baseOficial.latitude)) && Number(baseOficial.latitude) !== 0 ? Number(baseOficial.latitude) : Number(row.latitude);
  const lng = baseOficial && Number.isFinite(Number(baseOficial.longitude)) && Number(baseOficial.longitude) !== 0 ? Number(baseOficial.longitude) : Number(row.longitude);

  const ultOvos = row.ultimos_ovos != null ? Number(row.ultimos_ovos) : (baseOficial ? baseOficial.ultimosOvos : undefined);

  return {
    id: row.id,
    numero: numNorm,
    palheta: row.palheta || (baseOficial ? baseOficial.palheta : 'P-01'),
    moradorNome: morador,
    morador_nome: morador,
    rua,
    numeroImovel,
    numero_imovel: numeroImovel,
    bairro,
    microarea,
    quarteirao,
    latitude: lat,
    longitude: lng,
    precisaoGps: row.precisao_gps != null ? Number(row.precisao_gps) : null,
    temFoto: Boolean(row.tem_foto),
    status: row.status || (baseOficial ? baseOficial.status : 'instalada'),
    instaladaEm: row.instalada_em || (baseOficial ? baseOficial.instaladaEm : undefined),
    atualizadaEm: row.atualizada_em || row.instalada_em,
    ultimosOvos: ultOvos,
    ultimos_ovos: ultOvos,
    ultimaPalheta: row.ultima_palheta || (baseOficial ? baseOficial.ultimaPalheta : undefined),
    ultima_palheta: row.ultima_palheta || (baseOficial ? baseOficial.ultimaPalheta : undefined),
    ultimaLeituraEm: row.ultima_leitura_em || (baseOficial ? baseOficial.ultimaLeituraEm : undefined),
    ultima_leitura_em: row.ultima_leitura_em || (baseOficial ? baseOficial.ultimaLeituraEm : undefined),
    observacoes: row.observacoes || '',
    historicoPalhetas: (() => {
      if (!row.historico_palhetas) return (baseOficial ? (baseOficial.historicoPalhetas || []) : []);
      try {
        const parsed = JSON.parse(row.historico_palhetas);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    })(),
    syncStatus: 'sincronizado'
  };
}

/**
 * Puxa armadilhas cadastradas por OUTROS aparelhos/agentes na central via D1
 */
function mapD1ReadingToLocal(row) {
  let laudo = null;
  if (row.laudo_auditoria) {
    if (typeof row.laudo_auditoria === 'string') {
      try {
        laudo = JSON.parse(row.laudo_auditoria);
      } catch (e) {
        laudo = null;
      }
    } else {
      laudo = row.laudo_auditoria;
    }
  }

  return {
    id: row.id,
    armadilhaId: row.armadilha_id,
    numeroArmadilha: normalizarNumeroArmadilha(row.numero_armadilha),
    numeroPalheta: String(row.numero_palheta || 'P-01').trim(),
    ovos: Number(row.ovos || 0),
    positiva: Boolean(row.positiva),
    // A coluna do D1 e tecnico_nome; lida_por nunca existiu (o nome se perdia ao puxar).
    tecnicoNome: row.tecnico_nome || row.lida_por || 'Laboratório Carmo',
    observacao: row.observacao || '',
    fotoPalheta: row.foto_palheta || null,
    lidaEm: row.lida_em,
    laudoAuditoria: laudo,
    cicloId: row.ciclo_id || row.cicloId || (row.lida_em && new Date(row.lida_em) >= new Date('2026-10-10T00:00:00Z') ? '2026_NOVO' : '2025_2026'),
    campanhaId: row.ciclo_id || row.cicloId || (row.lida_em && new Date(row.lida_em) >= new Date('2026-10-10T00:00:00Z') ? '2026_NOVO' : '2025_2026'),
    syncStatus: 'sincronizado'
  };
}

/**
 * Puxa leituras de laboratório cadastradas por OUTROS aparelhos/agentes na central via D1
 */
export async function sincronizarLeiturasDoServidor() {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  try {
    const res = await fetchComTimeout(API_READINGS_ENDPOINT, {}, 8000);
    if (!res.ok) return;
    const data = await lerJsonComTimeout(res, 8000);
    if (!data || !Array.isArray(data.readings)) return;

    const leiturasLocais = getLeituras();
    const localizadasSincronizadas = leiturasLocais.filter((l) => l.syncStatus === 'sincronizado');

    // Trava de seguranca: servidor devolver lista vazia com leituras ja sincronizadas
    // no aparelho nao apaga nada.
    if (data.readings.length === 0 && localizadasSincronizadas.length > 0) {
      console.warn('Servidor devolveu lista de leituras vazia com dados locais presentes - nada apagado.');
      return leiturasLocais;
    }

    const map = new Map();

    // 1. Carrega dados vindos do servidor D1
    data.readings.forEach((row) => {
      const parsed = mapD1ReadingToLocal(row);
      map.set(parsed.id, parsed);
    });

    // 2. Preserva registros locais ainda pendentes de envio
    leiturasLocais.forEach((loc) => {
      if (loc.syncStatus === 'pendente') {
        map.set(loc.id, loc);
      }
    });

    const final = Array.from(map.values()).sort(
      (a, b) => new Date(b.lidaEm || 0).getTime() - new Date(a.lidaEm || 0).getTime()
    );

    if (final.length !== leiturasLocais.length || data.readings.length > 0) {
      await salvarLeituras(final);
    }
    return final;
  } catch (err) {
    console.warn('Falha ao sincronizar leituras do servidor D1:', err);
  }
}

/**
 * Puxa armadilhas cadastradas por OUTROS aparelhos/agentes na central via D1
 */
export async function sincronizarDadosDoServidor() {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  try {
    const res = await fetchComTimeout(API_TRAPS_ENDPOINT, {}, 8000);
    if (!res.ok) return;
    const data = await lerJsonComTimeout(res, 8000);
    if (!data || !Array.isArray(data.traps)) return;

    const armadilhasLocais = getArmadilhas();
    const deletedIds = getDeletedTrapIds();

    // TRAVA DE SEGURANCA: servidor devolver lista vazia enquanto o aparelho
    // tem registros sincronizados nao pode apagar nada. Sem isso, um D1
    // zerado por engano, uma migracao mal feita ou um binding errado
    // apagaria o trabalho de TODOS os celulares em ate 10 segundos (o
    // proximo poll), inclusive o IndexedDB. So confia em lista vazia se o
    // aparelho tambem ja estiver vazio (ex: acabou de dar "zerar dados").
    const localizadosSincronizados = armadilhasLocais.filter((a) => a.syncStatus === 'sincronizado');
    if (data.traps.length === 0 && localizadosSincronizados.length > 0) {
      console.warn('Servidor devolveu lista vazia com dados locais sincronizados presentes - nada foi apagado.');
      return armadilhasLocais;
    }

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

    const final = reconciliarArmadilhasComBaseOficial(Array.from(map.values())).sort(
      (a, b) => new Date(b.instaladaEm).getTime() - new Date(a.instaladaEm).getTime()
    );

    // Se houve alteração de tamanho ou novo registro, persiste
    if (final.length !== armadilhasLocais.length || data.traps.length > 0) {
      await salvarArmadilhas(final);
    }

    // Sincroniza também as leituras de laboratório feitas por outros aparelhos
    await sincronizarLeiturasDoServidor();

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
  // Listener local: dispara pra atualizacoes feitas NESTA propria aba
  // (BroadcastChannel nao entrega mensagem pra quem a enviou).
  localUpdateListeners.add(callback);

  const handleMessage = (evt) => {
    if (evt.data && (evt.data.type === 'TRAPS_UPDATE' || evt.data.type === 'LAB_UPDATE')) {
      callback();
    }
  };
  if (broadcast) {
    broadcast.addEventListener('message', handleMessage);
  }

  return () => {
    localUpdateListeners.delete(callback);
    if (broadcast) {
      broadcast.removeEventListener('message', handleMessage);
    }
  };
}
