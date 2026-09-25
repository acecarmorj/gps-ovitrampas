import L from 'leaflet';

export async function ensureLeafletHeat() {
  if (typeof window !== 'undefined' && !L.heatLayer) {
    window.L = L;
    await import('leaflet.heat');
  }
  return L;
}

export default L;
