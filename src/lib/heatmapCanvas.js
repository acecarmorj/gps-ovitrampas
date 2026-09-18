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
 * lat/lng -> pixel, e desenha o fundo claro com o contorno dos quarteirões e distritos.
 */
function montarBaseTerritorial(armadilhas, width, height, options = {}) {
  const { tituloTerritorio = '', distritoKey = null } = options;
  const polygons = getAllPolygons();
  const pontos = (armadilhas || []).filter((a) => a.latitude != null && a.longitude != null);

  // Enquadramento SEMPRE pelas armadilhas e pelo polígono do distrito correspondente
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const acumula = (lat, lng) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };
  pontos.forEach((a) => acumula(Number(a.latitude), Number(a.longitude)));

  // Se houver chave de distrito correspondente, garante que o polígono oficial do distrito seja enquadrado
  if (distritoKey) {
    const keyLower = String(distritoKey).toLowerCase().trim();
    const dPoly = polygons.find((p) =>
      p.folder === 'DISTRITOS' &&
      (p.name.toLowerCase().includes(keyLower) || keyLower.includes(p.name.toLowerCase()))
    );
    if (dPoly && Array.isArray(dPoly.coordinates)) {
      dPoly.coordinates.forEach(([lat, lng]) => acumula(lat, lng));
    }
  }

  if (!isFinite(minLat)) {
    // Sem armadilhas: fallback no centro de Carmo
    minLat = -21.945; maxLat = -21.925; minLng = -42.62; maxLng = -42.60;
  }

  // Padding generoso (mínimo ~150m) para não cortar os pontos nas bordas e dar
  // contexto de rua e limites territoriais ao redor.
  const padLat = Math.max((maxLat - minLat) * 0.16, 0.0015);
  const padLng = Math.max((maxLng - minLng) * 0.16, 0.0015);
  minLat -= padLat; maxLat += padLat;
  minLng -= padLng; maxLng += padLng;

  // Desenha os polígonos territoriais que caem dentro da área enquadrada
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

  // Desenha os quarteirões territoriais e perímetros de distritos com preenchimento sutil
  polygonsNaArea.forEach((poly) => {
    const coords = poly.coordinates;
    if (!coords || coords.length < 3) return;
    ctx.beginPath();
    coords.forEach(([lat, lng], idx) => {
      const [x, y] = project(lat, lng);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const isDistrito = poly.territoryType === 'distrito' || poly.folder === 'DISTRITOS';
    if (isDistrito) {
      ctx.fillStyle = 'rgba(236, 253, 245, 0.65)'; // emerald-50 sutil
      ctx.fill();
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.75)'; // emerald-600
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Rótulo oficial do distrito no centroide
      let cLat = 0, cLng = 0;
      coords.forEach(([lat, lng]) => { cLat += lat; cLng += lng; });
      cLat /= coords.length;
      cLng /= coords.length;
      const [cx, cy] = project(cLat, cLng);
      ctx.fillStyle = 'rgba(4, 120, 87, 0.55)';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(poly.name.toUpperCase(), cx, cy + 3);
      ctx.textAlign = 'start';
    } else {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Rótulo discreto do Quarteirão no centroide quando a área estiver focada
      if (poly.properties?.quarteirao && polygonsNaArea.length <= 40) {
        let cLat = 0, cLng = 0;
        coords.forEach(([lat, lng]) => { cLat += lat; cLng += lng; });
        cLat /= coords.length;
        cLng /= coords.length;
        const [cx, cy] = project(cLat, cLng);
        ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(poly.properties.quarteirao, cx, cy + 3);
        ctx.textAlign = 'start';
      }
    }
  });

  // Badge institucional superior com o nome do território e contagem de armadilhas
  if (tituloTerritorio) {
    const badgeTitulo = String(tituloTerritorio).toUpperCase();
    const badgeSub = `${pontos.length} OVITRAMPA(S) MONITORADA(S)`;
    ctx.font = 'bold 10px Arial';
    const textW = Math.max(ctx.measureText(badgeTitulo).width, ctx.measureText(badgeSub).width);
    const bW = textW + 22;
    const bH = 34;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(14, 14, bW, bH, 5) : ctx.rect(14, 14, bW, bH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.5px Arial';
    ctx.fillText(badgeTitulo, 24, 28);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 8px Arial';
    ctx.fillText(badgeSub, 24, 40);
  }

  return { canvas, ctx, W, H, project, pontos };
}

// Rosa dos Ventos / Indicador Oficial de Norte Cartográfico
function desenharNorte(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Fundo circular sutil com sombra
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ponta Norte (Slate escuro)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(4, 2);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();

  // Ponta Sul (Cinza médio)
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-4, 2);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();

  // Letra N
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 8.5px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -13);

  ctx.restore();
}

function desenharLegenda(ctx, W, H, itens, titulo = 'LEGENDA') {
  const padding = 12;
  const boxW = 230;
  const lineH = 20;
  const boxH = padding * 2 + itens.length * lineH + 18;
  const x0 = W - boxW - padding;
  const y0 = H - boxH - padding;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.95)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x0, y0, boxW, boxH, 8) : ctx.rect(x0, y0, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(titulo, x0 + padding, y0 + padding + 10);

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
export function gerarCanvasMapaCalor(armadilhas = [], { width = 1500, height = 950, tituloTerritorio = '', distritoKey = null } = {}) {
  const { canvas, ctx, W, H, project, pontos } = montarBaseTerritorial(armadilhas, width, height, { tituloTerritorio, distritoKey });

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

    // Ponto marcador central destacado com aro duplo
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = arm.ultimosOvos > 0 ? '#e11d48' : '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Etiqueta da OV ampliada, com alto contraste e nitidez para impressão A4
    const label = `OV-${arm.numero}`;
    ctx.font = 'bold 13.5px Arial';
    const textW = ctx.measureText(label).width;
    const badgeW = textW + 14;
    const badgeH = 21;
    const badgeX = x + 10;
    const badgeY = y - 11;

    // Fundo branco sólido com borda nítida
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Texto da armadilha em preto chapado
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(label, badgeX + badgeW / 2, badgeY + 15);
    ctx.textAlign = 'start';
  });

  // Desenha Rosa dos Ventos / Norte no canto superior direito
  desenharNorte(ctx, W - 30, 30);

  desenharLegenda(ctx, W, H, [
    { cor: 'rgb(37,99,235)', label: 'Sem leitura / negativa' },
    { cor: 'rgb(16,185,129)', label: 'Baixo risco (1-20 ovos)' },
    { cor: 'rgb(234,179,8)', label: 'Médio risco (21-50 ovos)' },
    { cor: 'rgb(225,29,72)', label: 'Alto / crítico (>50 ovos)' }
  ], 'NÍVEL DE RISCO');

  return { canvas, width: W, height: H };
}

/**
 * Mapa de distâncias: linhas metrificadas ligando as armadilhas próximas
 * (mesma regra de 300-400m usada no mapa ao vivo do app), com legenda.
 */
export function gerarCanvasMapaDistancias(armadilhas = [], { width = 1500, height = 950, maxNeighbors = 3, maxDistance = null, tituloTerritorio = '', distritoKey = null } = {}) {
  const effectiveMaxDistance = maxDistance != null ? maxDistance : (armadilhas.length <= 8 ? 2000 : 900);
  const { canvas, ctx, W, H, project, pontos } = montarBaseTerritorial(armadilhas, width, height, { tituloTerritorio, distritoKey });

  const edges = buildTrapDistanceNetwork(pontos, maxNeighbors, effectiveMaxDistance);

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

    // Ponto marcador central verde destacado com aro branco duplo
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Etiqueta da OV ampliada, com alto contraste e nitidez para impressão A4
    const label = `OV-${arm.numero}`;
    ctx.font = 'bold 13.5px Arial';
    const textW = ctx.measureText(label).width;
    const badgeW = textW + 14;
    const badgeH = 21;
    const badgeX = x + 10;
    const badgeY = y - 11;

    // Fundo branco sólido com borda nítida
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Texto da armadilha em preto chapado
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(label, badgeX + badgeW / 2, badgeY + 15);
    ctx.textAlign = 'start';
  });

  // Desenha Rosa dos Ventos / Norte no canto superior direito
  desenharNorte(ctx, W - 30, 30);

  desenharLegenda(ctx, W, H, [
    { cor: 'rgb(5,150,105)', label: 'Ideal (300m - 400m)' },
    { cor: 'rgb(217,119,6)', label: 'Abaixo do ideal (< 300m)' },
    { cor: 'rgb(225,29,72)', label: 'Acima do ideal (> 400m)' }
  ], 'ESPAÇAMENTO');

  return { canvas, width: W, height: H, totalLigacoes: edges.length };
}
