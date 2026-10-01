/**
 * Fundo de satelite (Esri World Imagery) para os mapas dos PDFs.
 * Monta uma imagem unica que cobre exatamente a caixa lat/lng pedida, em projecao Web Mercator
 * (a mesma usada nos tiles), para os poligonos vetoriais ficarem alinhados por cima.
 */
const TILE = 256;
const URL_SATELITE = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

/** Latitude -> posicao vertical normalizada (0 no topo do mundo, 1 embaixo). */
export function mercN(lat) {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
}

export function invMercN(n) {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * n))) * 180) / Math.PI;
}

function carregarImagem(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Caixa (ja com a proporcao da moldura) -> data URL JPEG com o satelite. Retorna null se falhar. */
export async function gerarFundoSatelite(caixa, larguraAlvoPx = 1500) {
  const { latMin, latMax, lngMin, lngMax } = caixa;
  const mundoX = (lngMax - lngMin) / 360; // fracao do mundo em largura
  let z = 8;
  while (z < 18 && mundoX * TILE * 2 ** (z + 1) <= larguraAlvoPx * 1.4) z += 1;

  const n = 2 ** z;
  const x0 = ((lngMin + 180) / 360) * n;
  const x1 = ((lngMax + 180) / 360) * n;
  const y0 = mercN(latMax) * n;
  const y1 = mercN(latMin) * n;
  const larg = Math.max(1, Math.round((x1 - x0) * TILE));
  const alt = Math.max(1, Math.round((y1 - y0) * TILE));
  if (larg * alt > 40e6) return null;

  const canvas = document.createElement('canvas');
  canvas.width = larg;
  canvas.height = alt;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(0, 0, larg, alt);

  const tarefas = [];
  for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++) {
    for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++) {
      if (ty < 0 || ty >= n) continue;
      const txw = ((tx % n) + n) % n;
      tarefas.push(
        carregarImagem(URL_SATELITE(z, txw, ty)).then((img) => {
          if (img) ctx.drawImage(img, (tx - x0) * TILE, (ty - y0) * TILE, TILE, TILE);
        })
      );
    }
  }
  if (tarefas.length > 160) return null;
  await Promise.all(tarefas);
  try {
    return canvas.toDataURL('image/jpeg', 0.78);
  } catch (_) {
    return null; // canvas contaminado (CORS)
  }
}
