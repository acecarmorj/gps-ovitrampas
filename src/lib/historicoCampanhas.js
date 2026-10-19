/**
 * Historico de campanhas anteriores (somente leitura), servido por GET /api/historico.
 * Exige a chave da equipe (traz o ponto exato das armadilhas). Sem chave, devolve erro 'equipe_necessaria'
 * e a tela deve avisar em vez de mostrar mapa vazio.
 * Formato devolvido igual ao do app: armadilhas (1 por numero, com latitude/longitude do proprio ano)
 * e leituras com cicloId = campanha, lidaEm = data de COLETA, numeroPalheta '01A'/'01B'.
 * Nunca grava nada no servidor nem no aparelho.
 */
import { URL_API_EQUIPE, getChaveEquipe } from './acessoEquipe.js';

const cache = new Map();

/**
 * @returns {Promise<{ok:true, armadilhas:Array, leituras:Array} | {ok:false, erro:'equipe_necessaria'|'rede'|'invalido', mensagem:string}>}
 */
export async function carregarHistoricoCampanha(campanhaId, { forcar = false } = {}) {
  if (!forcar && cache.has(campanhaId)) return cache.get(campanhaId);

  const chave = getChaveEquipe();
  if (!chave) {
    return { ok: false, erro: 'equipe_necessaria', mensagem: 'Entre com a senha da equipe para ver o histórico de campanhas anteriores.' };
  }

  try {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 12000);
    let res;
    try {
      res = await fetch(`${URL_API_EQUIPE}/api/historico?campanha=${encodeURIComponent(campanhaId)}`, {
        headers: { 'X-Team-Key': chave },
        signal: controle.signal
      });
    } finally {
      clearTimeout(limite);
    }
    if (res.status === 401) {
      return { ok: false, erro: 'equipe_necessaria', mensagem: 'A senha da equipe não foi aceita. Entre de novo para ver o histórico.' };
    }
    if (!res.ok) {
      return { ok: false, erro: 'invalido', mensagem: 'O servidor não devolveu o histórico desta campanha.' };
    }
    const dados = await res.json();
    const resultado = {
      ok: true,
      armadilhas: Array.isArray(dados.armadilhas) ? dados.armadilhas : [],
      leituras: Array.isArray(dados.leituras) ? dados.leituras : []
    };
    cache.set(campanhaId, resultado);
    return resultado;
  } catch (_) {
    return { ok: false, erro: 'rede', mensagem: 'Sem conexão para buscar o histórico. Tente de novo com internet.' };
  }
}
