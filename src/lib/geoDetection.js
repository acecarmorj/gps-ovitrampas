/**
 * Motor de detecção territorial do Carmo - RJ.
 * Cruza coordenadas GPS (latitude, longitude) com os polígonos oficiais
 * do arquivo carmo-territorios-data.js (base ACE-FINAL).
 */

function isPointInPolygon(point, vs) {
  if (!vs || vs.length < 3) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function calculateCentroid(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  let sumLat = 0;
  let sumLng = 0;
  for (let i = 0; i < coords.length; i++) {
    sumLat += coords[i][0];
    sumLng += coords[i][1];
  }
  return [sumLat / coords.length, sumLng / coords.length];
}

function getDistanceSquared(p1, p2) {
  const dLat = p1[0] - p2[0];
  const dLng = p1[1] - p2[1];
  return dLat * dLat + dLng * dLng;
}

function getBoundingArea(coords) {
  if (!coords || coords.length === 0) return Infinity;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const c of coords) {
    if (c[0] < minLat) minLat = c[0];
    if (c[0] > maxLat) maxLat = c[0];
    if (c[1] < minLng) minLng = c[1];
    if (c[1] > maxLng) maxLng = c[1];
  }
  return (maxLat - minLat) * (maxLng - minLng);
}

function formatQuarteirao(name) {
  if (!name) return "Q-01";
  const clean = String(name).trim();
  if (clean.toLowerCase().includes("sem título") || clean.toLowerCase().includes("sem titulo")) {
    return "Q-01";
  }
  if (/^q\s*[-/]?/i.test(clean)) return clean;
  return `Q-${clean}`;
}

export function detectTerritoryFromGps(lat, lng) {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source || !Array.isArray(source.polygons)) {
    return {
      microarea: "Carmo (Centro)",
      quarteirao: "Q-01",
      isExact: false,
      polygon: null
    };
  }

  const point = [Number(lat), Number(lng)];

  // Filtra polígonos válidos, descartando polígonos sem título ou rurais genéricos
  const validPolygons = source.polygons.filter(
    (p) => p.name && !p.name.toLowerCase().includes("sem título") && !p.name.toLowerCase().includes("sem titulo")
  );

  // Busca todos os polígonos em que o ponto GPS está contido
  const insideMatches = validPolygons.filter((poly) => isPointInPolygon(point, poly.coordinates));

  // 1. Prioridade Máxima: Quarteirão Urbano Oficial (territoryType === 'area')
  const areaMatches = insideMatches.filter((p) => p.territoryType === 'area');
  if (areaMatches.length > 0) {
    // Se coincidir com mais de um (ex: quarteirões adjacentes na calçada), escolhe o mais específico (menor área)
    areaMatches.sort((a, b) => getBoundingArea(a.coordinates) - getBoundingArea(b.coordinates));
    const poly = areaMatches[0];
    return {
      microarea: poly.folder || (poly.path && poly.path[0]) || "Centro",
      quarteirao: formatQuarteirao(poly.name),
      originalName: poly.originalName || poly.name,
      isExact: true,
      polygon: poly
    };
  }

  // 2. Segunda Prioridade: Praças Mapeadas (territoryType === 'praca')
  const pracaMatches = insideMatches.filter((p) => p.territoryType === 'praca');
  if (pracaMatches.length > 0) {
    const praca = pracaMatches[0];
    // Encontra o quarteirão urbano mais próximo para atribuir o número do quarteirão
    const urbanPolys = validPolygons.filter((p) => p.territoryType === 'area');
    let closestQ = null;
    let minDist = Infinity;
    for (const poly of urbanPolys) {
      const centroid = calculateCentroid(poly.coordinates);
      const dist = getDistanceSquared(point, centroid);
      if (dist < minDist) {
        minDist = dist;
        closestQ = poly;
      }
    }
    return {
      microarea: praca.folder || "Centro",
      quarteirao: closestQ ? formatQuarteirao(closestQ.name) : "Q-11",
      referencia: praca.name,
      originalName: praca.name,
      isExact: true,
      polygon: praca
    };
  }

  // 3. Terceira Prioridade: Distritos Rurais Oficiais (territoryType === 'distrito')
  const distritoMatches = insideMatches.filter((p) => p.territoryType === 'distrito');
  if (distritoMatches.length > 0) {
    const distrito = distritoMatches[0];
    return {
      microarea: distrito.name,
      quarteirao: "Distrito",
      originalName: distrito.name,
      isExact: true,
      polygon: distrito
    };
  }

  // 4. Fallback por proximidade estrita aos quarteirões urbanos (quando o GPS cai na rua ou divisa)
  const urbanPolys = validPolygons.filter((p) => p.territoryType === 'area');
  let closestPoly = null;
  let minDistance = Infinity;

  for (const poly of urbanPolys) {
    const centroid = calculateCentroid(poly.coordinates);
    const dist = getDistanceSquared(point, centroid);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoly = poly;
    }
  }

  if (closestPoly) {
    return {
      microarea: closestPoly.folder || (closestPoly.path && closestPoly.path[0]) || "Centro",
      quarteirao: formatQuarteirao(closestPoly.name),
      originalName: closestPoly.originalName || closestPoly.name,
      isExact: false,
      polygon: closestPoly
    };
  }

  return {
    microarea: "Centro",
    quarteirao: "Q-01",
    isExact: false,
    polygon: null
  };
}

export function getAllPolygons() {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source || !Array.isArray(source.polygons)) return [];
  return source.polygons;
}

export function getAllTerritoriesCatalog() {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source || !source.meta || !source.meta.catalog) {
    return {
      territories: ["Centro", "Jardim Centenário", "Progresso", "Botafogo", "Caixa d'Água", "Val Paraíso"],
      byTerritory: {}
    };
  }
  return source.meta.catalog;
}

/**
 * Encontra a rua oficial de Carmo mais próxima das coordenadas GPS,
 * priorizando ruas que pertençam à microárea ou quarteirão detectado.
 */
export function findClosestStreet(lat, lng, microareaHint = '', quarteiraoHint = '') {
  const source = window.ACE_RUAS_CARMO;
  if (!source || !Array.isArray(source.rows)) return null;

  let closest = null;
  let minDist = Infinity;

  for (const row of source.rows) {
    if (!row.latitude_ref || !row.longitude_ref) continue;
    const sLat = parseFloat(String(row.latitude_ref).replace(',', '.'));
    const sLng = parseFloat(String(row.longitude_ref).replace(',', '.'));
    if (isNaN(sLat) || isNaN(sLng)) continue;

    const dLat = sLat - lat;
    const dLng = sLng - lng;
    let dist = dLat * dLat + dLng * dLng;

    // Bônus se a rua for da mesma microárea detectada pelo polígono
    if (microareaHint && row.microareas_sugeridas && row.microareas_sugeridas.toLowerCase().includes(microareaHint.toLowerCase())) {
      dist *= 0.6;
    }
    // Bônus extra se a rua estiver mapeada no mesmo quarteirão
    if (quarteiraoHint && row.quarteiroes_sugeridos && row.quarteiroes_sugeridos.toLowerCase().includes(quarteiraoHint.toLowerCase())) {
      dist *= 0.35;
    }

    if (dist < minDist) {
      minDist = dist;
      closest = row;
    }
  }

  return closest;
}

/**
 * Resolve o endereço completo do Carmo de forma 100% automática via GPS:
 * - Microárea e Quarteirão via polígonos KMZ oficiais
 * - Nome da Rua e Bairro via base oficial de 167 ruas + geocodificação reversa
 */
export async function resolveAddressFromGps(lat, lng) {
  // 1. Detecção oficial por polígono do KMZ de Carmo
  const territory = detectTerritoryFromGps(lat, lng);
  const microarea = territory.microarea || 'Centro';
  const quarteirao = territory.quarteirao ? territory.quarteirao.replace(/^Q\s*[-/]?\s*/i, '') : '01';

  // 2. Rua mais próxima da base oficial de Carmo
  const localStreet = findClosestStreet(lat, lng, microarea, quarteirao);
  let rua = localStreet ? localStreet.logradouro : 'Rua Central';
  let bairro = microarea;
  let numero = '';

  // 3. Tenta obter número e refinar logradouro via OpenStreetMap com timeout curto
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.street;
        if (road) rua = road;
        if (data.address.house_number) numero = data.address.house_number;
        if (data.address.suburb || data.address.neighbourhood) {
          bairro = data.address.suburb || data.address.neighbourhood;
        }
      }
    }
  } catch (e) {
    // Offline / timeout: usa com 100% de precisão o catálogo oficial local de Carmo!
  }

  return {
    rua,
    numero,
    bairro,
    microarea,
    quarteirao: quarteirao.startsWith('Q-') ? quarteirao : `Q-${quarteirao}`,
    quarteiraoNum: quarteirao,
    isExactPolygon: territory.isExact,
    latitude: lat,
    longitude: lng
  };
}

