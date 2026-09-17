/**
 * Gerenciador Centralizado de Chave de API e Conexão com Google Gemini
 * Suporta armazenamento no localStorage do aparelho, variáveis Vite e validação em tempo real.
 */

const STORAGE_KEY = 'ovitrampas_gemini_key';

// Modelos oficiais do Google Generative Language API
export const GEMINI_MODELOS = {
  FLASH_2_5: 'gemini-2.5-flash',
  FLASH_2_0: 'gemini-2.0-flash',
  FLASH_1_5: 'gemini-1.5-flash'
};

export const MODELO_PADRAO = GEMINI_MODELOS.FLASH_2_5;

/**
 * Obtém a chave ativa para chamadas ao Gemini
 */
export function getGeminiApiKey() {
  if (typeof window !== 'undefined') {
    const salva = window.localStorage.getItem(STORAGE_KEY);
    if (salva && salva.trim()) {
      return salva.trim();
    }
  }

  // Variável opcional injetada pelo Vite build
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY.trim();
    if (envKey) return envKey;
  }

  return '';
}

/**
 * Salva a chave de API no localStorage do aparelho
 */
export function setGeminiApiKey(chave) {
  if (typeof window === 'undefined') return;
  const limpa = String(chave || '').trim();
  if (limpa) {
    window.localStorage.setItem(STORAGE_KEY, limpa);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Remove a chave salva
 */
export function removerGeminiApiKey() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Verifica se há chave configurada
 */
export function temChaveConfigurada() {
  return Boolean(getGeminiApiKey());
}

/**
 * Testa a validade de uma chave de API contra o endpoint oficial do Google
 * @param {string} chave 
 * @returns {Promise<{ ok: boolean, mensagem: string }>}
 */
export async function testarChaveGemini(chave) {
  const key = String(chave || '').trim();
  if (!key) {
    return { ok: false, mensagem: 'Digite a chave de API antes de testar.' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    if (res.ok) {
      return { ok: true, mensagem: 'Chave válida e autenticada com sucesso no Google AI!' };
    }

    const data = await res.json().catch(() => null);
    const erroMsg = data?.error?.message || '';

    if (res.status === 401 || res.status === 400 || res.status === 403) {
      if (erroMsg.toLowerCase().includes('deleted') || erroMsg.toLowerCase().includes('disabled')) {
        return { ok: false, mensagem: 'Esta chave foi desativada ou vinculada a uma conta excluída no Google Cloud (401).' };
      }
      return { ok: false, mensagem: `Chave não autorizada pelo Google (${res.status}): ${erroMsg || 'Verifique se a chave foi digitada corretamente.'}` };
    }

    return { ok: false, mensagem: `Erro na validação da chave (${res.status}): ${erroMsg || 'Falha na resposta do servidor.'}` };
  } catch (err) {
    return { ok: false, mensagem: 'Sem conexão com a internet para validar a chave.' };
  }
}

/**
 * Executa requisição generateContent com failover inteligente de modelos
 */
export async function chamarGeminiGenerateContent(payload, chaveManual = null) {
  const chave = chaveManual || getGeminiApiKey();
  if (!chave) {
    const erro = new Error('Chave de API do Google Gemini não configurada.');
    erro.code = 'ERR_CHAVE_AUSENTE';
    throw erro;
  }

  const modelosTentativa = [
    GEMINI_MODELOS.FLASH_2_5,
    GEMINI_MODELOS.FLASH_2_0,
    GEMINI_MODELOS.FLASH_1_5
  ];

  let ultimoErro = null;

  for (const modelo of modelosTentativa) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': chave
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      }

      const errorText = await response.text();
      console.warn(`Tentativa com ${modelo} retornou ${response.status}:`, errorText);

      if (response.status === 401 || response.status === 403) {
        const erro = new Error('Chave de API do Google Gemini inválida ou expirada (401/403).');
        erro.code = 'ERR_CHAVE_INVALIDA';
        erro.status = response.status;
        throw erro;
      }

      // Se o modelo específico não foi encontrado (404), tenta o próximo da lista
      if (response.status === 404) {
        ultimoErro = new Error(`Modelo ${modelo} indisponível (404).`);
        continue;
      }

      const erro = new Error(`Falha na comunicação com a IA do Google (${response.status}).`);
      erro.status = response.status;
      throw erro;
    } catch (fetchErr) {
      if (fetchErr.code === 'ERR_CHAVE_INVALIDA') {
        throw fetchErr;
      }
      ultimoErro = fetchErr;
    }
  }

  throw ultimoErro || new Error('Não foi possível obter resposta da IA do Google.');
}
