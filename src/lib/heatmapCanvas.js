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
    setTimeout(() => resolve(null), 8000);
  });
}

async function desenharTilesBaseMapa(ctx, minLat, maxLat, minLng, maxLng, W, H, project, provider = 'satellite') {
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
        const url = provider === 'satellite'
          ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`
          : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;
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
    ctx.globalAlpha = provider === 'satellite' ? 0.98 : 0.92;
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
  const { tituloTerritorio = '', distritoKey = null, provider = 'satellite' } = options;
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
    // Margem reforçada ao sul para que a legenda nunca sobreponha armadilhas do extremo sul (P-30 e P-31)
    minLat -= (padLat + 0.0085);
    maxLat += padLat;
    minLng -= (padLng + 0.004);
    maxLng += (padLng + 0.004);
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
  ctx.fillStyle = provider === 'satellite' ? '#090d16' : '#F8FAFC';
  ctx.fillRect(0, 0, W, H);

  // 1. Desenha os tiles oficiais de mapa (ruas ou satélite de Carmo e distritos)
  await desenharTilesBaseMapa(ctx, minLat, maxLat, minLng, maxLng, W, H, project, provider);

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
      if (provider === 'satellite') {
        ctx.fillStyle = 'rgba(5, 150, 105, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        let cLat = 0, cLng = 0;
        coords.forEach(([lat, lng]) => { cLat += lat; cLng += lng; });
        cLat /= coords.length;
        cLng /= coords.length;
        const [cx, cy] = project(cLat, cLng);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(poly.name.toUpperCase(), cx, cy + 3);
        ctx.textAlign = 'start';
      } else {
        ctx.fillStyle = 'rgba(236, 253, 245, 0.65)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(5, 150, 105, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

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
      }
    } else {
      if (provider === 'satellite') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        if (poly.properties?.quarteirao && polygonsNaArea.length <= 40) {
          let cLat = 0, cLng = 0;
          coords.forEach(([lat, lng]) => { cLat += lat; cLng += lng; });
          cLat /= coords.length;
          cLng /= coords.length;
          const [cx, cy] = project(cLat, cLng);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = 'bold 9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(poly.properties.quarteirao, cx, cy + 3);
          ctx.textAlign = 'start';
        }
      } else {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

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
function desenharNorte(ctx, x, y, isDark = false) {
  ctx.save();
  ctx.translate(x, y);

  // Fundo circular sutil com sombra
  ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.9)' : 'rgba(203, 213, 225, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ponta Norte
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(4, 2);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();

  // Ponta Sul
  ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-4, 2);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();

  // Letra N
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = 'bold 8.5px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -13);

  ctx.restore();
}

function desenharLegenda(ctx, W, H, itens, titulo = 'LEGENDA', isDark = false) {
  const padding = 12;
  const boxW = 230;
  const lineH = 20;
  const boxH = padding * 2 + itens.length * lineH + 18;
  const x0 = W - boxW - padding;
  const y0 = H - boxH - padding;

  ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.95)' : 'rgba(203, 213, 225, 0.95)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x0, y0, boxW, boxH, 8) : ctx.rect(x0, y0, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
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
    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
    ctx.font = '11px Arial';
    ctx.fillText(item.label, x0 + padding + 20, y);
  });
}

/**
 * Mapa de calor: densidade/risco de ovos das armadilhas sobre o contorno de Carmo.
 */
export async function gerarCanvasMapaCalor(armadilhas = [], { width = 1500, height = 950, tituloTerritorio = '', distritoKey = null, somenteVerificadas = true, provider = 'satellite' } = {}) {
  // Filtra somente as armadilhas verificadas/analisadas quando solicitado
  const todasComCoords = (armadilhas || []).filter((a) => a.latitude != null && a.longitude != null);
  const verificadas = todasComCoords.filter((a) => a.status === 'analisada' || (a.ultimosOvos != null && a.ultimosOvos !== undefined));
  
  // Base territorial: se tiver verificadas e flag ativa, enquadra nas verificadas; senão em todas
  const armadilhasEnquadramento = (somenteVerificadas && verificadas.length > 0) ? verificadas : todasComCoords;

  const { canvas, ctx, W, H, project, pontos, raio175px } = await montarBaseTerritorial(armadilhasEnquadramento, width, height, { tituloTerritorio, distritoKey, provider });

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
  // Ordena por ovos para que focos de maior risco sobreponham focos menores
  const pontosCalor = pontos
    .filter((arm) => arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined))
    .sort((a, b) => Number(a.ultimosOvos ?? a.ultimos_ovos ?? 0) - Number(b.ultimosOvos ?? b.ultimos_ovos ?? 0));

  pontosCalor.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
    const intensidade = intensidadePorArmadilha(arm);
    if (intensidade <= 0) return;
    const raio = raio175px * 1.15;

    const grad = hctx.createRadialGradient(x, y, 0, x, y, raio);
    if (ovos >= 100) {
      // Foco Crítico (> 100 ovos): Vermelho escuro -> Vermelho vivo -> Laranja -> Amarelo na borda -> Transparente (SEM AZUL!)
      grad.addColorStop(0.00, 'rgba(153, 27, 27, 0.94)');
      grad.addColorStop(0.35, 'rgba(220, 38, 38, 0.84)');
      grad.addColorStop(0.65, 'rgba(249, 115, 22, 0.70)');
      grad.addColorStop(0.85, 'rgba(234, 179, 8, 0.45)');
      grad.addColorStop(1.00, 'rgba(253, 224, 71, 0.00)');
    } else if (ovos > 50) {
      // Alto Risco (51 a 100 ovos): Laranja forte -> Laranja -> Amarelo -> Transparente
      grad.addColorStop(0.00, 'rgba(234, 88, 12, 0.90)');
      grad.addColorStop(0.40, 'rgba(249, 115, 22, 0.75)');
      grad.addColorStop(0.75, 'rgba(234, 179, 8, 0.45)');
      grad.addColorStop(1.00, 'rgba(253, 224, 71, 0.00)');
    } else if (ovos > 20) {
      // Médio Risco (21 a 50 ovos): Âmbar -> Amarelo -> Transparente
      grad.addColorStop(0.00, 'rgba(217, 119, 6, 0.84)');
      grad.addColorStop(0.50, 'rgba(245, 158, 11, 0.65)');
      grad.addColorStop(0.80, 'rgba(253, 224, 71, 0.35)');
      grad.addColorStop(1.00, 'rgba(254, 240, 138, 0.00)');
    } else if (ovos > 0) {
      // Baixo Risco (1 a 20 ovos): Verde -> Verde Limão -> Transparente
      grad.addColorStop(0.00, 'rgba(5, 150, 105, 0.78)');
      grad.addColorStop(0.50, 'rgba(16, 185, 129, 0.55)');
      grad.addColorStop(0.80, 'rgba(132, 204, 22, 0.30)');
      grad.addColorStop(1.00, 'rgba(190, 242, 100, 0.00)');
    } else {
      // Negativa (0 ovos): Azul -> Azul suave -> Transparente
      grad.addColorStop(0.00, 'rgba(37, 99, 235, 0.70)');
      grad.addColorStop(0.50, 'rgba(96, 165, 250, 0.45)');
      grad.addColorStop(0.80, 'rgba(147, 197, 253, 0.20)');
      grad.addColorStop(1.00, 'rgba(219, 234, 254, 0.00)');
    }

    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.arc(x, y, raio, 0, Math.PI * 2);
    hctx.fill();
  });

  ctx.globalAlpha = 0.90;
  ctx.drawImage(heat, 0, 0);
  ctx.globalAlpha = 1;

  // Renderização dos Pins e Etiquetas Centralizadas Acima do Ponto
  pontos.forEach((arm) => {
    const isAnalisada = arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined);
    const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));

    let badgeBg = '#2563eb';
    if (ovos > 100) badgeBg = '#dc2626';
    else if (ovos > 50) badgeBg = '#f97316';
    else if (ovos > 20) badgeBg = '#f59e0b';
    else if (ovos > 0) badgeBg = '#10b981';

    // Ponto marcador central com aro branco duplo
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = badgeBg;
    ctx.fill();

    const tag = isAnalisada
      ? (ovos > 0 ? `P-${arm.numero}: ${ovos} ovos` : `P-${arm.numero}: 0`)
      : `P-${arm.numero}`;

    ctx.font = 'bold 11px Arial';
    const textW = ctx.measureText(tag).width;
    const badgeW = textW + 14;
    const badgeH = 19;
    const badgeX = x - badgeW / 2;
    const badgeY = y - 7 - badgeH - 4;

    // Sombra sutil
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX + 1, badgeY + 1, badgeW, badgeH, 5) : ctx.rect(badgeX + 1, badgeY + 1, badgeW, badgeH);
    ctx.fill();

    // Badge com contorno branco
    ctx.fillStyle = badgeBg;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(tag, badgeX + badgeW / 2, badgeY + 13.5);
    ctx.textAlign = 'start';
  });

  // Topo do Mapa Oficial
  const headerW = W - 50;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(25, 25, headerW, 95, 12) : ctx.rect(25, 25, headerW, 95);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('VIGILÂNCIA ENTOMOLÓGICA • PREFEITURA MUNICIPAL DE CARMO/RJ', 45, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('MAPA DE CALOR EPIDEMIOLÓGICO — OVITRAMPAS (5 NÍVEIS OFICIAIS)', 45, 76);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px Arial';
  ctx.fillText(`Amostragem: ${pontos.length} armadilha(s) monitorada(s)  •  Raio Oficial: 175m  •  Data Base: 25/09/2026`, 45, 102);
  ctx.restore();

  // Legenda Oficial das 5 Cores na base inferior esquerda
  const legX = 30, legY = H - 155, legW = Math.min(560, W - 60), legH = 135;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(legX, legY, legW, legH, 12) : ctx.rect(legX, legY, legW, legH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('LEGENDA DAS 5 CORES OFICIAIS DE RISCO', legX + 18, legY + 24);

  const barX = legX + 18, barY = legY + 36, barW = legW - 36, barH = 16;
  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  gradient.addColorStop(0.00, '#2563eb');
  gradient.addColorStop(0.25, '#10b981');
  gradient.addColorStop(0.50, '#f59e0b');
  gradient.addColorStop(0.75, '#f97316');
  gradient.addColorStop(1.00, '#dc2626');
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#1d4ed8'; ctx.fillText('1. Azul (0)', barX, barY + 28);
  ctx.fillStyle = '#15803d'; ctx.fillText('2. Verde (1-20)', barX + 90, barY + 28);
  ctx.fillStyle = '#b45309'; ctx.fillText('3. Amarelo (21-50)', barX + 195, barY + 28);
  ctx.fillStyle = '#c2410c'; ctx.fillText('4. Laranja (51-100)', barX + 310, barY + 28);
  ctx.fillStyle = '#b91c1c'; ctx.fillText('5. Vermelho (>100)', barX + 420, barY + 28);

  const c1X = legX + 18, c2X = legX + 280;
  const items = [
    { cor: '#2563eb', txt: '1. Azul: Sem Ovos (Negativa)', x: c1X, y: legY + 86 },
    { cor: '#10b981', txt: '2. Verde: Baixo Risco (1 a 20 ovos)', x: c2X, y: legY + 86 },
    { cor: '#f59e0b', txt: '3. Amarelo: Médio Risco (21 a 50 ovos)', x: c1X, y: legY + 104 },
    { cor: '#f97316', txt: '4. Laranja: Alto Risco (51 a 100 ovos)', x: c2X, y: legY + 104 },
    { cor: '#dc2626', txt: '5. Vermelho: Crítico (> 100 ovos)', x: c1X, y: legY + 122 },
    { cor: '#6366f1', txt: 'Circunferência: Raio 175m (MS)', x: c2X, y: legY + 122 }
  ];
  items.forEach((it) => {
    ctx.fillStyle = it.cor;
    ctx.beginPath();
    ctx.arc(it.x + 5, it.y - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = '10px Arial';
    ctx.fillText(it.txt, it.x + 14, it.y);
  });
  ctx.restore();

  // Desenha Rosa dos Ventos / Norte no canto inferior direito
  desenharNorte(ctx, W - 40, H - 70);

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

/**
 * Mapa de Nevoeiro Térmico (Base Satélite) - Estilo Prefeitura de Amparo:
 * Névoa contínua de calor sobre fotos de satélite (ESRI World Imagery),
 * transição suave Vermelho Carmesim -> Laranja -> Amarelo Dourado -> Transparente,
 * com pílulas escuras de bairros e pins destacados com contagem de ovos.
 */
export async function gerarCanvasMapaNevoeiro(armadilhas = [], { width = 1500, height = 950, tituloTerritorio = '', distritoKey = null, somenteVerificadas = true } = {}) {
  const todasComCoords = (armadilhas || []).filter((a) => a.latitude != null && a.longitude != null);
  const verificadas = todasComCoords.filter((a) => a.status === 'analisada' || (a.ultimosOvos != null && a.ultimosOvos !== undefined));
  
  const armadilhasEnquadramento = (somenteVerificadas && verificadas.length > 0) ? verificadas : todasComCoords;

  const { canvas, ctx, W, H, project, pontos, raio175px } = await montarBaseTerritorial(armadilhasEnquadramento, width, height, {
    tituloTerritorio,
    distritoKey,
    provider: 'satellite'
  });

  // 1. Circunferências de 175m discretas e elegantes para satélite
  pontos.forEach((arm) => {
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, raio175px, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.restore();
  });

  // 2. Névoa Contínua de Calor (Camada Térmica)
  const heat = document.createElement('canvas');
  heat.width = W;
  heat.height = H;
  const hctx = heat.getContext('2d');
  const raioBase = Math.max(26, Math.min(W, H) * 0.042);

  // Ordena por ovos ascendente para que os focos maiores fiquem em destaque por cima
  const pontosCalor = pontos
    .filter((arm) => arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined))
    .sort((a, b) => Number(a.ultimosOvos ?? a.ultimos_ovos ?? 0) - Number(b.ultimosOvos ?? b.ultimos_ovos ?? 0));

  // A névoa térmica cobre armadilhas com ovos > 0
  pontosCalor.forEach((arm) => {
    const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
    if (ovos <= 0) return;
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));
    
    // Raio estritamente proporcional à gravidade de ovos:
    const multRaio = ovos >= 100 ? 2.2 : ovos > 50 ? 1.7 : ovos > 20 ? 1.2 : 0.75;
    const raio = raioBase * multRaio;

    const grad = hctx.createRadialGradient(x, y, 0, x, y, raio);
    if (ovos >= 100) {
      // Foco Crítico Máximo (>100 ovos): Carmesim profundo -> Vermelho vivo -> Laranja -> Dourado -> Transparente
      grad.addColorStop(0.00, 'rgba(153, 27, 27, 0.95)');
      grad.addColorStop(0.25, 'rgba(220, 38, 38, 0.85)');
      grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.65)');
      grad.addColorStop(0.80, 'rgba(234, 179, 8, 0.35)');
      grad.addColorStop(1.00, 'rgba(253, 224, 71, 0.00)');
    } else if (ovos > 50) {
      // Alto Risco (51 a 100 ovos)
      grad.addColorStop(0.00, 'rgba(220, 38, 38, 0.90)');
      grad.addColorStop(0.35, 'rgba(234, 88, 12, 0.78)');
      grad.addColorStop(0.65, 'rgba(249, 115, 22, 0.55)');
      grad.addColorStop(0.85, 'rgba(234, 179, 8, 0.28)');
      grad.addColorStop(1.00, 'rgba(253, 224, 71, 0.00)');
    } else if (ovos > 20) {
      // Médio Risco (21 a 50 ovos)
      grad.addColorStop(0.00, 'rgba(234, 88, 12, 0.85)');
      grad.addColorStop(0.40, 'rgba(245, 158, 11, 0.65)');
      grad.addColorStop(0.75, 'rgba(234, 179, 8, 0.32)');
      grad.addColorStop(1.00, 'rgba(254, 240, 138, 0.00)');
    } else {
      // Baixo Risco (1 a 20 ovos) - Névoa suave e proporcional (NUNCA VERMELHO)
      grad.addColorStop(0.00, 'rgba(234, 179, 8, 0.55)');
      grad.addColorStop(0.50, 'rgba(250, 204, 21, 0.25)');
      grad.addColorStop(1.00, 'rgba(254, 240, 138, 0.00)');
    }

    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.arc(x, y, raio, 0, Math.PI * 2);
    hctx.fill();
  });

  // Aplica o nevoeiro térmico sobre a imagem de satélite
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(heat, 0, 0);
  ctx.restore();

  // 3. Pílulas de Bairros / Distritos (Estilo Prefeitura de Amparo)
  const centrosBairros = [
    { nome: 'CENTRO', lat: -21.9312, lng: -42.6080 },
    { nome: 'PROGRESSO', lat: -21.9246, lng: -42.6138 },
    { nome: 'JARDIM CENTENÁRIO', lat: -21.9270, lng: -42.6090 },
    { nome: 'BOA IDEIA', lat: -21.9392, lng: -42.6000 },
    { nome: 'CAIXA D\'ÁGUA', lat: -21.9360, lng: -42.6055 },
    { nome: 'VAL PARAÍSO', lat: -21.9420, lng: -42.6110 },
    { nome: 'MORRO DO ESTADO', lat: -21.9345, lng: -42.6150 },
    { nome: 'INFLUÊNCIA', lat: -21.9160, lng: -42.5450 },
    { nome: 'CÓRREGO DA PRATA', lat: -21.8480, lng: -42.5450 },
    { nome: 'PORTO VELHO DO CUNHA', lat: -21.8050, lng: -42.6350 },
    { nome: 'ILHA DOS POMBOS', lat: -21.8450, lng: -42.5850 },
    { nome: 'BARRA DE SÃO FRANCISCO', lat: -21.8750, lng: -42.5700 }
  ];

  centrosBairros.forEach((b) => {
    const [x, y] = project(b.lat, b.lng);
    if (x >= 40 && x <= W - 40 && y >= 40 && y <= H - 40) {
      ctx.font = 'bold 11px Arial';
      const tw = ctx.measureText(b.nome).width;
      const bw = tw + 18;
      const bh = 22;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 11) : ctx.rect(x - bw / 2, y - bh / 2, bw, bh);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(b.nome, x, y + 4);
      ctx.textAlign = 'start';
    }
  });

  // 4. Marcadores e Pins de Armadilhas
  pontos.forEach((arm) => {
    const isAnalisada = arm.status === 'analisada' || (arm.ultimosOvos != null && arm.ultimosOvos !== undefined);
    const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
    const [x, y] = project(Number(arm.latitude), Number(arm.longitude));

    let pinCor = '#64748b';
    if (isAnalisada) {
      if (ovos >= 100) pinCor = '#dc2626';
      else if (ovos > 50) pinCor = '#ea580c';
      else if (ovos > 20) pinCor = '#f59e0b';
      else if (ovos > 0) pinCor = '#eab308';
      else pinCor = '#0284c7';
    }

    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = pinCor;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    const label = isAnalisada
      ? `OV-${arm.numero}: ${ovos} ovos`
      : `OV-${arm.numero} (Pendente)`;

    ctx.font = 'bold 12px Arial';
    const textW = ctx.measureText(label).width;
    const badgeW = textW + 14;
    const badgeH = 22;
    const badgeX = x + 10;
    const badgeY = y - 11;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();
    ctx.strokeStyle = isAnalisada && ovos > 0 ? (ovos > 50 ? '#ef4444' : '#f59e0b') : '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, badgeX + badgeW / 2, badgeY + 15);
    ctx.textAlign = 'start';
  });

  // Rosa dos Ventos escura
  desenharNorte(ctx, W - 30, 30, true);

  // Legenda Satélite
  desenharLegenda(ctx, W, H, [
    { cor: 'rgba(255, 255, 255, 0.85)', label: 'Raio de atração (175m)', isRing: true },
    { cor: 'rgb(220, 38, 38)', label: 'Crítico (> 100 ovos)' },
    { cor: 'rgb(234, 88, 12)', label: 'Alto (51 a 100 ovos)' },
    { cor: 'rgb(245, 158, 11)', label: 'Médio (21 a 50 ovos)' },
    { cor: 'rgb(234, 179, 8)', label: 'Baixo (1 a 20 ovos)' },
    { cor: 'rgb(2, 132, 199)', label: 'Negativa (0 ovos)' }
  ], 'NEVOEIRO TÉRMICO (SATÉLITE)', true);

  return { canvas, width: W, height: H };
}


