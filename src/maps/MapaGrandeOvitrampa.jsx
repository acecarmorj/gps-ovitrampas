import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, youDotIcon, ovitrampaIcon } from './leafletIcons';
import { makeAutoFit } from './mapFit';
import { MapControlButtons } from './MapControlButtons';

export function MapaGrandeOvitrampa({
  userPos,
  microarea,
  quarteirao,
  armadilhas = [],
  armadilhaSelecionada = null,
  onSelectArmadilha,
  mostrarTodosPontos = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const autoFitRef = useRef(null);
  const layersRef = useRef({
    polygons: null,
    userMarker: null,
    trapsLayer: null
  });

  const [satellite, setSatellite] = useState(false);

  // 1. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = userPos?.latitude || -21.9339;
    const initialLng = userPos?.longitude || -42.6089;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;
    autoFitRef.current = makeAutoFit(map);

    tileLayerRef.current = L.tileLayer(MAP_TILE_STANDARD.url, {
      maxZoom: MAP_TILE_STANDARD.maxZoom,
      attribution: MAP_TILE_STANDARD.attribution
    }).addTo(map);

    layersRef.current.polygons = L.layerGroup().addTo(map);
    layersRef.current.trapsLayer = L.layerGroup().addTo(map);

    const onResize = () => {
      try {
        if (mapInstanceRef.current && map._leaflet_id && map.getContainer()) {
          map.invalidateSize();
        }
      } catch (e) {}
    };

    window.addEventListener('resize', onResize);
    requestAnimationFrame(onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      try {
        map.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
      autoFitRef.current = null;
    };
  }, []);

  // 2. Alternância Satélite / Mapa Normal
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = satellite ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
    tileLayerRef.current = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution
    }).addTo(map);
  }, [satellite]);

  // 3. Renderização dos Polígonos de Carmo
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyGroup = layersRef.current.polygons;
    if (!map || !polyGroup) return;

    polyGroup.clearLayers();
    const allPolys = getAllPolygons();
    const currentNumOnly = String(quarteirao || '').replace(/^Q\s*[-/]?\s*/i, '').trim();

    allPolys.forEach((poly) => {
      if (!poly.coordinates || poly.coordinates.length < 3) return;

      const polyMicro = (poly.folder || '').toLowerCase();
      const polyName = String(poly.name || '').toLowerCase();

      const isCurrent =
        polyMicro.includes(String(microarea || '').toLowerCase()) &&
        (polyName === currentNumOnly.toLowerCase() || polyName === `q-${currentNumOnly.toLowerCase()}`);

      const leafPoly = L.polygon(poly.coordinates, {
        color: isCurrent ? '#10b981' : '#475569',
        weight: isCurrent ? 2.5 : 1,
        fillColor: isCurrent ? '#059669' : '#334155',
        fillOpacity: isCurrent ? 0.3 : 0.08,
        dashArray: isCurrent ? null : '2, 3'
      });

      leafPoly.bindTooltip(`<b>${poly.folder || 'Carmo'}</b><br/>Quarteirão: ${poly.name}`, {
        direction: 'center',
        permanent: false
      });

      leafPoly.addTo(polyGroup);
    });
  }, [microarea, quarteirao]);

  // 4. Marcador do Agente (Você)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersRef.current;
    if (!map) return;

    if (userPos?.latitude && userPos?.longitude) {
      if (!layers.userMarker) {
        layers.userMarker = L.marker([userPos.latitude, userPos.longitude], {
          icon: youDotIcon('Você (ACE)'),
          zIndexOffset: 1200
        }).addTo(map);
      } else {
        layers.userMarker.setLatLng([userPos.latitude, userPos.longitude]);
      }
    }
  }, [userPos]);

  // 5. Marcadores das Armadilhas Ovitrampas
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trapsLayer = layersRef.current.trapsLayer;
    if (!map || !trapsLayer) return;

    trapsLayer.clearLayers();

    armadilhas.forEach((arm) => {
      if (!arm.latitude || !arm.longitude) return;

      const isSelected = armadilhaSelecionada && armadilhaSelecionada.id === arm.id;
      const marker = L.marker([arm.latitude, arm.longitude], {
        icon: ovitrampaIcon(arm),
        zIndexOffset: isSelected ? 1500 : 1000
      });

      marker.on('click', () => {
        if (onSelectArmadilha) {
          onSelectArmadilha(arm);
        }
      });

      marker.addTo(trapsLayer);
    });

    // Se solicitado auto-fit para todos os pontos
    if (mostrarTodosPontos && armadilhas.length > 0) {
      const bounds = armadilhas
        .filter((a) => a.latitude && a.longitude)
        .map((a) => [a.latitude, a.longitude]);
      if (userPos?.latitude && userPos?.longitude) {
        bounds.push([userPos.latitude, userPos.longitude]);
      }
      if (bounds.length > 0 && autoFitRef.current) {
        autoFitRef.current.fit(bounds, { maxZoom: 16 });
      }
    }
  }, [armadilhas, armadilhaSelecionada, mostrarTodosPontos, userPos, onSelectArmadilha]);

  // Função para centralizar novamente no agente
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const lat = userPos?.latitude || -21.9339;
    const lng = userPos?.longitude || -42.6089;
    map.flyTo([lat, lng], 17, { duration: 0.8 });
    if (autoFitRef.current) autoFitRef.current.resume();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <MapControlButtons
        onRecenter={handleRecenter}
        satellite={satellite}
        onToggleSatellite={() => setSatellite(!satellite)}
        top={16}
        right={12}
      />
    </div>
  );
}
