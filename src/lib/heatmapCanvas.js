import { getAllPolygons } from './geoDetection';
import { buildTrapDistanceNetwork } from './geoDistance';

/**
 * Geração dos mapas estáticos (canvas) usados no relatório PDF consolidado:
 * - Mapa de calor (densidade/risco de ovos) sobre o contorno territorial de Carmo.
 * - Mapa de distâncias entre armadilhas (linhas metrificadas, regra 300-400m).
 * Não depende de tiles de mapa (evita problemas de CORS/captura de imagem de
 * terceiros) - desenha o contorno dos quarteirões a partir dos mesmos polígonos
 * já usados no mapa Leaflet (geoDetection.js).
 */

function intensidadePorArmadilha(arm) {
  if (arm.status !== 'analisada' || arm.ultimosOvos == null) return 0.25; // instalada, aguardando leitura
  const ovos = arm.ultimosOvos;
  if (ovos === 0) return 0.35;
  if (ovos <= 20) return 0.55;
  if (ovos <= 50) return 0.75;
  if (ovos <= 100) return 0.9;
  return 1.0;
}

// Gradiente de cor do mapa de calor (estilo clássico: azul -> ciano -> verde -> amarelo -> vermelho)
function corDoGradiente(t) {
  const stops = [
    { p: 0.0, c: [37, 99, 235] },   // azul
    { p: 0.35, c: [6, 182, 212] },  // ciano
    { p: 0.55, c: [16, 185, 129] }, // verde esmeralda
    { p: 0.75, c: [234, 179, 8] },  // amarelo
    { p: 1.0, c: [225, 29, 72] }    // vermelho/rosa
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].p && t <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = b.p - a.p || 1;
  const local = (t - a.p) / span;
  return [
    Math.round(a.c[0] + (b.c[0] - a.c[0]) * local),
    Math.round(a.c[1] + (b.c[1] - a.c[1]) * local),
    Math.round(a.c[2] + (b.c[2] - a.c[2]) * local)
  ];
}

/**
 * Monta a base compartilhada: bounding box territorial + função de projeção
 * lat/lng -> pixel, e desenha o fundo claro com o contorno dos quarteirões.
 */
function montarBaseTerritorial(armadilhas, width, height) {
  const polygons = getAllPolygons();
  const pontos = (armadilhas || []).filter((a) => a.latitude != null && a.longitude != null);

  // Enquadramento SEMPRE pelas armadilhas (não pelo território inteiro do município,
  // que é bem maior e deixaria o mapa minúsculo no meio de espaço vazio).
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const acumula = (lat, lng) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };
  pontos.forEach((a) => acumula(Number(a.latitude), Number(a.longitude)));

  if (!isFinite(minLat)) {
    // Sem armadilhas: fallback no centro de Carmo
    minLat = -21.945; maxLat = -21.925; minLng = -42.62; maxLng = -42.60;
  }

  // Padding generoso (mínimo ~120m) para não cortar os pontos nas bordas e dar
  // contexto de rua ao redor, mesmo quando as armadilhas estão muito próximas.
  const padLat = Math.max((maxLat - minLat) * 0.18, 0.0012);
  const padLng = Math.max((maxLng - minLng) * 0.18, 0.0012);
  minLat -= padLat; maxLat += padLat;
  minLng -= padLng; maxLng += padLng;

  // Só desenha os polígonos territoriais que realmente caem dentro (ou perto) da
  // área enquadrada - os demais (outras pontas do município) ficam de fora.
  const polygonsNaArea = polygons.filter((poly) =>
    (poly.coordinates || []).some(
      ([lat, lng]) => lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
    )
  );

  const midLatRad = ((minLat + maxLat) / 2) * Math.PI / 180;
  const corr = Math.cos(midLatRad) || 1; // compensa o encolhimento de longitude fora do equador

  const larguraGeo = (maxLng - minLng) * corr;
  const alturaGeo = (maxLat - minLat);
  const aspectGeo = larguraGeo / alturaGeo;

  let W = width, H = height;
  if (aspectGeo > W / H) {
    H = Math.round(W / aspectGeo);
  } else {
    W = Math.round(H * aspectGeo);
  }

  const project = (lat, lng) => {
    const x = ((lng - minLng) * corr / larguraGeo) * W;
    const y = H - ((lat - minLat) / alturaGeo) * H;
    return [x, y];
  };

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
  ctx.lineWidth = 1;
  polygons.forEach((poly) => {
    const coords = poly.coordinates;
    if (!coords || coords.length < 3) return;
    ctx.beginPath();
    coords.forEach(([lat, lng], idx) => {
      const [x, y] = project(lat, lng);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  });

  return { canvas, ctx, W, H, project, pontos };
}

function desenharLegenda(ctx, W, H, itens) {
  const padding = 12;
  const boxW = 230;
  const lineH = 20;
  const boxH = padding * 2 + itens.length * lineH + 18;
  const x0 = W - boxW - padding;
  const y0 = H - boxH - padding;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = 'rgba(148,163,184,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x0, y0, boxW, boxH, 8) : ctx.rect(x0, y0, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('LEGENDA', x0 + padding, y0 + padding + 10);

  itens.forEach((item, idx) => {
    const y = y0 + padding + 24 + idx * lineH;
    ctx.fillStyle = item.cor;
    ctx.beginPath();
    ctx.arc(x0 + padding + 6, y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.font = '11px Arial';
    ctx.fillText(item.label, x0 + padding + 20, y);
  });
}

/**
 * Mapa de calor: densidade/risco de ovos das armadilhas sobre o contorno de Carmo.
 */
export function gerarCanvasMapaCalor(armadilhas = [], { width = 1500, height = 950 } = {}) {
  const { canvas, ctx, W, H, project, pontos } = montarBaseTerritorial(armadilhas, width, height);

  const heat = document.createElement('canvas');
  heat.width = W;
  heat.height = H;
  const hctx = heat.getContext('2d');
  const raioBase = Math.max(28, Math.min(W, H) * 0.045);

  pontos.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    const intensidade = intensidadePorArmadilha(arm);
    const raio = raioBase * (0.7 + intensidade * 0.6);

    const grad = hctx.createRadialGradient(x, y, 0, x, y, raio);
    grad.addColorStop(0, `rgba(0,0,0,${intensidade})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.arc(x, y, raio, 0, Math.PI * 2);
    hctx.fill();
  });

  const imgData = hctx.getImageData(0, 0, W, H);
  const px = imgData.data;
  for (let i = 0; i < px.length; i += 4) {
    const alpha = px[i + 3] / 255;
    if (alpha <= 0.02) {
      px[i + 3] = 0;
      continue;
    }
    const [r, g, b] = corDoGradiente(Math.min(1, alpha));
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = Math.min(255, Math.round(alpha * 235));
  }
  hctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 0.82;
  ctx.drawImage(heat, 0, 0);
  ctx.globalAlpha = 1;

  pontos.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });

  desenharLegenda(ctx, W, H, [
    { cor: 'rgb(37,99,235)', label: 'Sem leitura / negativa' },
    { cor: 'rgb(16,185,129)', label: 'Baixo risco (1-20 ovos)' },
    { cor: 'rgb(234,179,8)', label: 'Médio risco (21-50 ovos)' },
    { cor: 'rgb(225,29,72)', label: 'Alto / crítico (>50 ovos)' }
  ]);

  return { canvas, width: W, height: H };
}

/**
 * Mapa de distâncias: linhas metrificadas ligando as armadilhas próximas
 * (mesma regra de 300-400m usada no mapa ao vivo do app), com legenda.
 */
export function gerarCanvasMapaDistancias(armadilhas = [], { width = 1500, height = 950, maxNeighbors = 3, maxDistance = 900 } = {}) {
  const { canvas, ctx, W, H, project, pontos } = montarBaseTerritorial(armadilhas, width, height);

  const edges = buildTrapDistanceNetwork(pontos, maxNeighbors, maxDistance);

  ctx.lineWidth = 3.5;
  ctx.font = 'bold 11px Arial';
  edges.forEach((edge) => {
    const [x1, y1] = project(Number(edge.trapA.latitude), Number(edge.trapA.longitude));
    const [x2, y2] = project(Number(edge.trapB.latitude), Number(edge.trapB.longitude));

    ctx.strokeStyle = edge.cor;
    ctx.setLineDash(edge.status === 'ideal' ? [10, 7] : [5, 7]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const label = `${edge.distancia} m`;
    const labelW = ctx.measureText(label).width + 10;

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = edge.cor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(mx - labelW / 2, my - 9, labelW, 16, 8) : ctx.rect(mx - labelW / 2, my - 9, labelW, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = edge.cor;
    ctx.textAlign = 'center';
    ctx.fillText(label, mx, my + 3);
    ctx.textAlign = 'start';
  });

  pontos.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`OV-${arm.numero}`, x + 7, y - 6);
  });

  desenharLegenda(ctx, W, H, [
    { cor: 'rgb(5,150,105)', label: 'Ideal (300m - 400m)' },
    { cor: 'rgb(217,119,6)', label: 'Abaixo do ideal (< 300m)' },
    { cor: 'rgb(37,99,235)', label: 'Acima do ideal (> 400m)' }
  ]);

  return { canvas, width: W, height: H, totalLigacoes: edges.length };
}
