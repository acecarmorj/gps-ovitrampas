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
  const isAnalisada = arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined);
  if (!isAnalisada) return 0; // Armadilhas não analisadas NÃO geram calor
  const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
  if (ovos === 0) return 0.10; // Monitorada negativa (zero ovos): azul frio
  if (ovos <= 20) return 0.35; // Poucos ovos (1 a 20): verde
  if (ovos <= 50) return 0.58; // Moderado (21 a 50): amarelo
  if (ovos < 100) return 0.78; // Alto (51 a 99): laranja
  return 1.0; // Foco Crítico (>= 100 ovos): vermelho intenso
}

// Gradiente térmico: Azul (0 ovos) -> Verde (1-20) -> Amarelo (21-50) -> Laranja (51-99) -> Vermelho (>100)
function corDoGradiente(t) {
  const stops = [
    { p: 0.0, c: [37, 99, 235] },   // azul (#2563eb) - zero ovos
    { p: 0.22, c: [2, 132, 199] },  // azul cerúleo (#0284c7)
    { p: 0.40, c: [22, 163, 74] },  // verde (#16a34a) - 1-20 ovos
    { p: 0.62, c: [234, 179, 8] },  // amarelo (#eab308) - 21-50 ovos
    { p: 0.80, c: [234, 88, 12] },  // laranja (#ea580c) - 51-99 ovos
    { p: 1.0, c: [220, 38, 38] }    // vermelho vivo (#dc2626) - >100 ovos
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

function latLngToTileFraction(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function tileToLatLng(x, y, zoom) {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

function carregarImagemAsync(url) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      return resolve(null);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(null), 2500);
  });
}

async function desenharTilesBaseMapa(ctx, minLat, maxLat, minLng, maxLng, W, H, project) {
  try {
    const latRad1 = (minLat * Math.PI) / 180;
    const latRad2 = (maxLat * Math.PI) / 180;
    const y1 = Math.log(Math.tan(Math.PI / 4 + latRad1 / 2));
    const y2 = Math.log(Math.tan(Math.PI / 4 + latRad2 / 2));
    const dy = Math.abs(y2 - y1);
    let zoom = Math.floor(Math.log2((H * 2 * Math.PI) / (256 * dy)));
    zoom = Math.max(13, Math.min(16, zoom));

    const pNW = latLngToTileFraction(maxLat, minLng, zoom);
    const pSE = latLngToTileFraction(minLat, maxLng, zoom);

    const minTileX = Math.floor(pNW.x);
    const maxTileX = Math.floor(pSE.x);
    const minTileY = Math.floor(pNW.y);
    const maxTileY = Math.floor(pSE.y);

    const tilePromises = [];
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;
        tilePromises.push(
          carregarImagemAsync(url).then((img) => {
            if (!img) return null;
            const nw = tileToLatLng(tx, ty, zoom);
            const se = tileToLatLng(tx + 1, ty + 1, zoom);
            return { img, nw, se };
          })
        );
      }
    }

    const tiles = await Promise.all(tilePromises);
    ctx.save();
    ctx.globalAlpha = 0.92;
    for (const t of tiles) {
      if (!t || !t.img) continue;
      const [x1, y1] = project(t.nw.lat, t.nw.lng);
      const [x2, y2] = project(t.se.lat, t.se.lng);
      ctx.drawImage(t.img, x1, y1, x2 - x1, y2 - y1);
    }
    ctx.restore();
  } catch (err) {
    console.warn('[PDF MAP] Falha ao carregar tiles base (usando vetor puro):', err);
  }
}

/**
 * Monta a base compartilhada: bounding box territorial + função de projeção
 * lat/lng -> pixel, tiles cartográficos (ruas e casas) e contorno dos quarteirões e distritos.
 */
async function montarBaseTerritorial(armadilhas, width, height, options = {}) {
  const { tituloTerritorio = '', distritoKey = null } = options;
  const polygons = getAllPolygons();
  const pontos = (armadilhas || []).filter((a) => a.latitude != null && a.longitude != null);

  // Enquadramento SEMPRE pelas armadilhas
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  const acumula = (lat, lng) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };
  pontos.forEach((a) => acumula(Number(a.latitude), Number(a.longitude)));

  if (isFinite(minLat)) {
    // Garante vão mínimo de ~0.007 graus (~770m) para que localidades ou distritos
    // com poucas armadilhas não fiquem excessivamente aproximados nem cortem
    // as circunferências de 175m de raio e os rótulos
    const spanLat = maxLat - minLat;
    const spanLng = maxLng - minLng;
    const minSpan = 0.007;
    if (spanLat < minSpan) {
      const diff = (minSpan - spanLat) / 2;
      minLat -= diff;
      maxLat += diff;
    }
    if (spanLng < minSpan) {
      const diff = (minSpan - spanLng) / 2;
      minLng -= diff;
      maxLng += diff;
    }

    const padLat = Math.max((maxLat - minLat) * 0.18, 0.0025);
    const padLng = Math.max((maxLng - minLng) * 0.18, 0.0025);
    minLat -= padLat; maxLat += padLat;
    minLng -= padLng; maxLng += padLng;
  } else {
    // Sem armadilhas: fallback no centro de Carmo
    minLat = -21.945; maxLat = -21.925; minLng = -42.62; maxLng = -42.60;
  }

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

  // Raio exato em pixels correspondente a 175 metros na projeção
  const grausLat175m = 175 / 111139;
  const raio175px = (grausLat175m / alturaGeo) * H;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, W, H);

  // 1. Desenha os tiles oficiais de mapa (ruas, casas, estradas de Carmo e distritos)
  await desenharTilesBaseMapa(ctx, minLat, maxLat, minLng, maxLng, W, H, project);

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

  return { canvas, ctx, W, H, project, pontos, raio175px };
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
    if (item.isRing) {
      ctx.save();
      ctx.strokeStyle = item.cor;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x0 + padding + 6, y - 4, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = item.cor;
      ctx.beginPath();
      ctx.arc(x0 + padding + 6, y - 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#334155';
    ctx.font = '11px Arial';
    ctx.fillText(item.label, x0 + padding + 20, y);
  });
}

/**
 * Mapa de calor: densidade/risco de ovos das armadilhas sobre o contorno de Carmo.
 */
export async function gerarCanvasMapaCalor(armadilhas = [], { width = 1500, height = 950, tituloTerritorio = '', distritoKey = null, somenteVerificadas = true } = {}) {
  // Filtra somente as armadilhas verificadas/analisadas quando solicitado
  const todasComCoords = (armadilhas || []).filter((a) => a.latitude != null && a.longitude != null);
  const verificadas = todasComCoords.filter((a) => a.status === 'analisada' || (a.ultimosOvos != null && a.ultimosOvos !== undefined));
  
  // Base territorial: se tiver verificadas e flag ativa, enquadra nas verificadas; senão em todas
  const armadilhasEnquadramento = (somenteVerificadas && verificadas.length > 0) ? verificadas : todasComCoords;

  const { canvas, ctx, W, H, project, pontos, raio175px } = await montarBaseTerritorial(armadilhasEnquadramento, width, height, { tituloTerritorio, distritoKey });

  // 1. Circunferência de referência de 175m (raio de cobertura oficial entomológico) apenas para armadilhas exibidas
  pontos.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, raio175px, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.75)'; // Indigo nítido
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.06)';
    ctx.fill();
    ctx.restore();
  });

  const heat = document.createElement('canvas');
  heat.width = W;
  heat.height = H;
  const hctx = heat.getContext('2d');
  const raioBase = Math.max(18, Math.min(W, H) * 0.026);

  // GERAÇÃO DO CALOR: EXCLUSIVAMENTE SOBRE AS ARMADILHAS JÁ VERIFICADAS
  const pontosCalor = pontos.filter((arm) => arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined));

  pontosCalor.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    const intensidade = intensidadePorArmadilha(arm);
    if (intensidade <= 0) return;
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
    px[i + 3] = Math.min(255, Math.round(alpha * 240));
  }
  hctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 0.85;
  ctx.drawImage(heat, 0, 0);
  ctx.globalAlpha = 1;

  // Renderização dos Pins e Etiquetas
  pontos.forEach((arm) => {
    const isAnalisada = arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined);
    const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));

    // Cor do Pin
    let pinCor = '#94a3b8'; // cinza neutro se não analisada
    if (isAnalisada) {
      if (ovos > 50) pinCor = '#ef4444'; // vermelho
      else if (ovos > 20) pinCor = '#f97316'; // laranja
      else if (ovos > 0) pinCor = '#eab308'; // amarelo
      else pinCor = '#10b981'; // verde (0 ovos)
    }

    // Ponto marcador central com borda branca destacada
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = pinCor;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Etiqueta detalhada da OV com número de ovos
    const label = isAnalisada
      ? `OV-${arm.numero}: ${ovos} ovo${ovos === 1 ? '' : 's'}`
      : `OV-${arm.numero} (Pendente)`;

    ctx.font = 'bold 12.5px Arial';
    const textW = ctx.measureText(label).width;
    const badgeW = textW + 14;
    const badgeH = 22;
    const badgeX = x + 10;
    const badgeY = y - 11;

    // Fundo branco sólido com borda colorida por gravidade
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();
    ctx.strokeStyle = isAnalisada && ovos > 0 ? (ovos > 50 ? '#ef4444' : '#f97316') : '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Texto da armadilha
    ctx.fillStyle = isAnalisada && ovos > 50 ? '#991b1b' : '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(label, badgeX + badgeW / 2, badgeY + 15);
    ctx.textAlign = 'start';
  });

  // Desenha Rosa dos Ventos / Norte no canto superior direito
  desenharNorte(ctx, W - 30, 30);

  desenharLegenda(ctx, W, H, [
    { cor: 'rgba(99, 102, 241, 0.85)', label: 'Raio de atração (175m)', isRing: true },
    { cor: 'rgb(239, 68, 68)', label: 'Foco Crítico (> 50 ovos)' },
    { cor: 'rgb(249, 115, 22)', label: 'Médio/Alto (21 a 50 ovos)' },
    { cor: 'rgb(234, 179, 8)', label: 'Baixo (1 a 20 ovos)' },
    { cor: 'rgb(34, 197, 94)', label: 'Negativa (0 ovos verificados)' }
  ], 'MAPA DE CALOR (OVOS)');

  return { canvas, width: W, height: H };
}

/**
 * Mapa de distâncias: linhas metrificadas ligando as armadilhas próximas
 * (mesma regra de 300-400m usada no mapa ao vivo do app), com legenda.
 */
export async function gerarCanvasMapaDistancias(armadilhas = [], { width = 1500, height = 950, maxNeighbors = 3, maxDistance = null, tituloTerritorio = '', distritoKey = null } = {}) {
  const effectiveMaxDistance = maxDistance != null ? maxDistance : (armadilhas.length <= 8 ? 2000 : 900);
  const { canvas, ctx, W, H, project, pontos, raio175px } = await montarBaseTerritorial(armadilhas, width, height, { tituloTerritorio, distritoKey });

  // 1. Circunferência de referência de 175m (raio de cobertura oficial entomológico)
  pontos.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, raio175px, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.7)'; // Violeta nítido
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.fill();
    ctx.restore();
  });

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
    { cor: 'rgba(124, 58, 237, 0.85)', label: 'Raio de atração (175m)', isRing: true },
    { cor: 'rgb(5,150,105)', label: 'Ideal (300m - 400m)' },
    { cor: 'rgb(217,119,6)', label: 'Abaixo do ideal (< 300m)' },
    { cor: 'rgb(225,29,72)', label: 'Acima do ideal (> 400m)' }
  ], 'ESPAÇAMENTO');

  return { canvas, width: W, height: H, totalLigacoes: edges.length };
}

