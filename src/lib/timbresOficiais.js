/**
 * Timbres oficiais da Prefeitura de Carmo para relatórios em PDF.
 * Carregamento assíncrono via fetch/DataURL a partir de /timbres/
 * para máxima performance e leveza no empacotamento (evita estouro de memória no esbuild).
 */

export const PROPORCAO_BRASAO_CARMO = 0.8467;
export const PROPORCAO_LOGO_PREFEITURA = 2.42;
export const PROPORCAO_FAIXA_CARMO = 9.2555;

export let TIMBRE_BRASAO_CARMO = null;
export let TIMBRE_LOGO_PREFEITURA = null;
export let TIMBRE_FAIXA_CARMO = null;

async function carregarImagemParaDataUrl(url) {
  try {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`[Timbres] Não foi possível carregar ${url}:`, err);
    return null;
  }
}

export async function carregarTimbresOficiais() {
  if (!TIMBRE_BRASAO_CARMO) {
    TIMBRE_BRASAO_CARMO = await carregarImagemParaDataUrl('/timbres/brasao_carmo_opt.png');
  }
  if (!TIMBRE_LOGO_PREFEITURA) {
    TIMBRE_LOGO_PREFEITURA = await carregarImagemParaDataUrl('/timbres/logo_prefeitura_opt.png');
  }
  return {
    TIMBRE_BRASAO_CARMO,
    TIMBRE_LOGO_PREFEITURA,
    TIMBRE_FAIXA_CARMO
  };
}
