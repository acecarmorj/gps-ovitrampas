/**
 * Acesso da equipe: a chave libera nome do morador, rua e numero do imovel vindos do servidor.
 * Fica so no aparelho (localStorage); nunca vai no codigo do app.
 */
const CHAVE_LS = 'ovi_team_key';
const AGENTE_LS = 'ovi_agente_nome';
// Mesmo endereco usado pelo storage.js (inclui o ajuste de homologacao window.VITE_API_BASE_URL e import.meta.env).
export const URL_API_EQUIPE =
  (typeof window !== 'undefined' && window.VITE_API_BASE_URL)
    || import.meta.env.VITE_API_BASE_URL
    || 'https://ovitrampas-api.acecarmorj.workers.dev';

export function getChaveEquipe() {
  try {
    return localStorage.getItem(CHAVE_LS) || '';
  } catch (_) {
    return '';
  }
}

export function getAgente() {
  try {
    return localStorage.getItem(AGENTE_LS) || '';
  } catch (_) {
    return '';
  }
}

export function temAcessoEquipe() {
  return getChaveEquipe().length > 0;
}

export function sairDaEquipe() {
  try {
    localStorage.removeItem(CHAVE_LS);
    localStorage.removeItem(AGENTE_LS);
  } catch (_) {
    /* sem armazenamento */
  }
}

/** Confere a chave no servidor; so grava no aparelho se for valida. */
export async function entrarNaEquipe(chave, nome = '') {
  const k = String(chave || '').trim().toUpperCase();
  const agente = String(nome || '').trim().slice(0, 60);
  if (!agente) return { ok: false, motivo: 'Digite seu nome.' };
  if (!k) return { ok: false, motivo: 'Digite a senha da equipe.' };
  try {
    // limite de 8 s: com sinal ruim o botao nao pode ficar preso em "Verificando..."
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 8000);
    let res;
    try {
      res = await fetch(`${URL_API_EQUIPE}/api/auth/check`, { headers: { 'X-Team-Key': k }, signal: controle.signal });
    } finally {
      clearTimeout(limite);
    }
    const dados = await res.json();
    if (!dados.equipe) return { ok: false, motivo: 'Senha incorreta.' };
    try {
      localStorage.setItem(CHAVE_LS, k);
      localStorage.setItem(AGENTE_LS, agente);
    } catch (_) {
      return { ok: false, motivo: 'A senha está certa, mas o navegador não deixou salvar neste aparelho (aba anônima ou armazenamento bloqueado). Abra o app em uma aba normal.' };
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, motivo: 'Sem conexão com o servidor (ou sinal muito fraco). Tente de novo com internet.' };
  }
}
