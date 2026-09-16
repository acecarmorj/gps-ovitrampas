/**
 * Motor Geodésico de Distâncias e Malha Territorial de Ovitrampas (Carmo - RJ)
 * Regra Entomológica Oficial: Espaçamento ideal entre 300 e 400 metros.
 */

/**
 * Calcula a distância geodésica em metros entre dois pontos (Fórmula de Haversine)
 */
export function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (Number(lat1) * Math.PI) / 180;
  const φ2 = (Number(lat2) * Math.PI) / 180;
  const Δφ = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const Δλ = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Avalia o espaçamento em relação à diretriz de 300 a 400 metros
 */
export function evaluateDistanceCategory(meters) {
  if (meters >= 300 && meters <= 400) {
    return {
      status: 'ideal',
      label: 'Ideal (300m - 400m)',
      cor: '#059669', // Verde esmeralda institucional
      corFundo: '#ecfdf5',
      corBorda: '#a7f3d0',
      badgeClass: 'distance-pill-ideal',
      descricao: 'Espaçamento ideal para amostragem'
    };
  } else if (meters < 300) {
    return {
      status: 'proxima',
      label: 'Abaixo do ideal (< 300m)',
      cor: '#d97706', // Âmbar
      corFundo: '#fffbeb',
      corBorda: '#fde68a',
      badgeClass: 'distance-pill-close',
      descricao: 'Muito próxima de outra armadilha'
    };
  } else {
    return {
      status: 'ampla',
      label: 'Acima do ideal (> 400m)',
      cor: '#2563eb', // Azul
      corFundo: '#eff6ff',
      corBorda: '#bfdbfe',
      badgeClass: 'distance-pill-far',
      descricao: 'Espaçamento amplo'
    };
  }
}

/**
 * Encontra as armadilhas mais próximas de um ponto de referência (agente ou outra armadilha)
 */
export function findNearbyTraps(targetPoint, allTraps = [], limit = 3, excludeId = null) {
  if (!targetPoint || targetPoint.latitude == null || targetPoint.longitude == null) {
    return [];
  }

  const validTraps = allTraps.filter(
    (t) => t.latitude != null && t.longitude != null && t.id !== excludeId
  );

  const mapped = validTraps.map((trap) => {
    const dist = calcDistanceMeters(
      targetPoint.latitude,
      targetPoint.longitude,
      trap.latitude,
      trap.longitude
    );
    const cat = evaluateDistanceCategory(dist);
    return {
      armadilha: trap,
      distancia: dist,
      ...cat
    };
  });

  mapped.sort((a, b) => a.distancia - b.distancia);
  return mapped.slice(0, limit);
}

/**
 * Constrói a malha de arestas de distância entre as armadilhas cadastradas.
 * Conecta cada armadilha aos seus vizinhos mais próximos (sem arestas duplicadas A-B e B-A).
 */
export function buildTrapDistanceNetwork(armadilhas = [], maxNeighbors = 3, maxDistance = 900) {
  const validTraps = armadilhas.filter((a) => a.latitude != null && a.longitude != null);
  if (validTraps.length < 2) return [];

  const edges = [];
  const edgeSet = new Set();

  for (let i = 0; i < validTraps.length; i++) {
    const a = validTraps[i];
    const neighbors = [];

    for (let j = 0; j < validTraps.length; j++) {
      if (i === j) continue;
      const b = validTraps[j];
      const dist = calcDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);

      if (dist <= maxDistance) {
        neighbors.push({ trap: b, dist });
      }
    }

    neighbors.sort((x, y) => x.dist - y.dist);
    const selected = neighbors.slice(0, maxNeighbors);

    selected.forEach((n) => {
      const idA = String(a.id || a.numero);
      const idB = String(n.trap.id || n.trap.numero);
      const key = idA < idB ? `${idA}__${idB}` : `${idB}__${idA}`;

      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const cat = evaluateDistanceCategory(n.dist);
        edges.push({
          key,
          trapA: a,
          trapB: n.trap,
          distancia: n.dist,
          midpoint: [
            (Number(a.latitude) + Number(n.trap.latitude)) / 2,
            (Number(a.longitude) + Number(n.trap.longitude)) / 2
          ],
          ...cat
        });
      }
    });
  }

  return edges;
}
