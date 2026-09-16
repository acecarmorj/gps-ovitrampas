import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, youDotIcon, otherAgentDotIcon, ovitrampaIcon } from './leafletIcons';
import { calcDistanceMeters } from '../lib/geoDistance';
import { makeAutoFit } from './mapFit';
import { MapControlButtons } from './MapControlButtons';
import { buildTrapDistanceNetwork, findNearbyTraps } from '../lib/geoDistance';

export function MapaGrandeOvitrampa({
  userPos,
  microarea,
  quarteirao,
  armadilhas = [],
  armadilhaSelecionada = null,
  onSelectArmadilha,
  mostrarTodosPontos = false,
  controlTop = 60,
  outrosAgentes = [],
  agenteSelecionado = null,
  onSelectAgente
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const autoFitRef = useRef(null);
  const layersRef = useRef({
    polygons: null,
    userMarker: null,
    userAccuracyCircle: null,
    distanceLinesLayer: null,
    trapsLayer: null,
    otherAgentsLayer: null
  });

  const [satellite, setSatellite] = useState(false);
  const [showDistances, setShowDistances] = useState(true);

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
    layersRef.current.distanceLinesLayer = L.layerGroup().addTo(map);
    layersRef.current.trapsLayer = L.layerGroup().addTo(map);
    layersRef.current.otherAgentsLayer = L.layerGroup().addTo(map);

    const onResize = () => {
      try {
        if (mapInstanceRef.current && map._leaflet_id && map.getContainer()) {
          map.invalidateSize();
        }
      } catch (e) {}
    };

    window.addEventListener('resize', onResize);
    requestAnimationFrame(onResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        onResize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      try {
        if (layersRef.current.userAccuracyCircle) {
          map.removeLayer(layersRef.current.userAccuracyCircle);
        }
        if (layersRef.current.distanceLinesLayer) {
          map.removeLayer(layersRef.current.distanceLinesLayer);
        }
        if (layersRef.current.otherAgentsLayer) {
          map.removeLayer(layersRef.current.otherAgentsLayer);
        }
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
        className: 'quarteirao-poly',
        color: isCurrent ? '#10b981' : '#475569',
        weight: isCurrent ? 2.5 : 1,
        fillColor: isCurrent ? '#059669' : '#334155',
        fillOpacity: isCurrent ? 0.3 : 0.08,
        dashArray: isCurrent ? null : '2, 3'
      });

      leafPoly.on('click', (e) => {
        // Remove foco nativo do navegador para eliminar qualquer moldura preta de seleção
        if (e?.originalEvent?.target?.blur) {
          e.originalEvent.target.blur();
        }
      });

      leafPoly.on('mouseover', function () {
        if (!isCurrent) {
          this.setStyle({
            weight: 2,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.2
          });
        }
      });

      leafPoly.on('mouseout', function () {
        if (!isCurrent) {
          this.setStyle({
            weight: 1,
            color: '#475569',
            fillColor: '#334155',
            fillOpacity: 0.08
          });
        }
      });

      leafPoly.bindTooltip(`<b>${poly.folder || 'Carmo'}</b><br/>Quarteirão: ${poly.name}`, {
        direction: 'center',
        permanent: false
      });

      leafPoly.addTo(polyGroup);
    });
  }, [microarea, quarteirao]);

  // 4. Marcador do Agente (Você) e Círculo de Precisão do Satélite
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

      // Círculo visual de precisão de satélite (raio em metros real)
      const acc = Number(userPos.accuracy) || 0;
      if (acc > 0) {
        // <= 10m: Verde esmeralda (Alta precisão / satélites travados)
        // <= 25m: Azul (Boa precisão)
        // > 25m: Âmbar com linha pontilhada (calibrando satélites)
        const cor = acc <= 10 ? '#059669' : acc <= 25 ? '#2563eb' : '#d97706';
        if (!layers.userAccuracyCircle) {
          layers.userAccuracyCircle = L.circle([userPos.latitude, userPos.longitude], {
            radius: acc,
            color: cor,
            weight: 1.5,
            fillColor: cor,
            fillOpacity: 0.12,
            dashArray: acc > 20 ? '4, 4' : null
          }).addTo(map);
        } else {
          layers.userAccuracyCircle.setLatLng([userPos.latitude, userPos.longitude]);
          layers.userAccuracyCircle.setRadius(acc);
          layers.userAccuracyCircle.setStyle({
            color: cor,
            fillColor: cor,
            dashArray: acc > 20 ? '4, 4' : null
          });
        }
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

      // Dados da armadilha só aparecem ao TOCAR/CLICAR nela (card externo via
      // onSelectArmadilha) - sem tooltip de hover, que exige 2 toques em telas
      // sensíveis ao toque (1º toque "revela" o hover, 2º toque de fato clica).
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


  // 5.1. Renderização de Outros Agentes em Campo (Colegas em Tempo Real)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const otherAgentsLayer = layersRef.current.otherAgentsLayer;
    if (!map || !otherAgentsLayer) return;

    otherAgentsLayer.clearLayers();

    if (!outrosAgentes || outrosAgentes.length === 0) return;

    outrosAgentes.forEach((agente) => {
      if (!agente.latitude || !agente.longitude) return;

      const isRecente = (agente.segundosAtras == null || agente.segundosAtras < 120);
      const isSelected = agenteSelecionado && agenteSelecionado.agentId === agente.agentId;

      const marker = L.marker([agente.latitude, agente.longitude], {
        icon: otherAgentDotIcon(agente.label, isRecente),
        zIndexOffset: isSelected ? 1600 : 1100
      });

      const distTexto = agente.distanciaMetros != null
        ? `<div style="font-weight:900;color:#0284c7;font-size:12px;margin-top:2px;">📏 ${agente.distanciaMetros}m de você</div>`
        : '';

      const tempoTexto = isRecente
        ? 'Online agora'
        : `há ${Math.round((agente.segundosAtras || 0) / 60)} min`;

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;padding:3px 4px;min-width:140px;">
          <div style="font-weight:900;font-size:13px;color:#0f172a;display:flex;align-items:center;gap:4px;">
            <span>👤</span> <span>${agente.label}</span>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Bairro: <b>${agente.bairro || 'Carmo-RJ'}</b></div>
          ${distTexto}
          <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Sinal: ${tempoTexto}</div>
        </div>
      `, { closeButton: true });

      marker.on('click', () => {
        if (onSelectAgente) {
          onSelectAgente(agente);
        }
      });

      marker.addTo(otherAgentsLayer);
    });
  }, [outrosAgentes, agenteSelecionado, onSelectAgente]);

  // 6. Renderização da Malha de Distâncias entre Ovitrampas (Regra 300m - 400m)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const distanceLayer = layersRef.current.distanceLinesLayer;
    if (!map || !distanceLayer) return;

    distanceLayer.clearLayers();

    if (!showDistances) return;

    // 6.1. Linhas retas entre as armadilhas cadastradas (conforme desenho do usuário)
    if (armadilhas && armadilhas.length >= 2) {
      const edges = buildTrapDistanceNetwork(armadilhas, 3, 900);

      edges.forEach((edge) => {
        const polyline = L.polyline(
          [
            [edge.trapA.latitude, edge.trapA.longitude],
            [edge.trapB.latitude, edge.trapB.longitude]
          ],
          {
            color: edge.cor,
            weight: 4,
            opacity: 0.92,
            dashArray: edge.status === 'ideal' ? '9, 7' : '4, 6'
          }
        );
        polyline.addTo(distanceLayer);

        // Pílula com a metragem exata no ponto médio da reta
        const badgeIcon = L.divIcon({
          className: '',
          html: `<div class="distance-pill ${edge.badgeClass}">${edge.distancia} m</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });

        const badge = L.marker(edge.midpoint, {
          icon: badgeIcon,
          interactive: false,
          zIndexOffset: 600
        });
        badge.addTo(distanceLayer);
      });
    }

    // 6.2. Linha guia em tempo real: Agente (Você) ➔ Armadilha mais próxima
    if (userPos?.latitude && userPos?.longitude && armadilhas && armadilhas.length > 0) {
      const nearby = findNearbyTraps(userPos, armadilhas, 1);
      if (nearby && nearby.length > 0) {
        const closest = nearby[0];
        const agentLine = L.polyline(
          [
            [userPos.latitude, userPos.longitude],
            [closest.armadilha.latitude, closest.armadilha.longitude]
          ],
          {
            color: closest.cor,
            weight: 4.5,
            dashArray: '7, 6',
            opacity: 0.95
          }
        );
        agentLine.addTo(distanceLayer);

        const agentMidpoint = [
          (Number(userPos.latitude) + Number(closest.armadilha.latitude)) / 2,
          (Number(userPos.longitude) + Number(closest.armadilha.longitude)) / 2
        ];

        const agentBadgeIcon = L.divIcon({
          className: '',
          html: `<div class="distance-pill ${closest.badgeClass}" style="box-shadow:0 3px 10px rgba(0,0,0,0.25);">Você ➔ OV-${closest.armadilha.numero}: ${closest.distancia}m</div>`,
          iconSize: [140, 22],
          iconAnchor: [70, 11]
        });

        const agentBadge = L.marker(agentMidpoint, {
          icon: agentBadgeIcon,
          interactive: false,
          zIndexOffset: 1400
        });
        agentBadge.addTo(distanceLayer);
      }
    }

    // 6.3. Linha direta até o colega de campo selecionado
    if (agenteSelecionado?.latitude && agenteSelecionado?.longitude && userPos?.latitude && userPos?.longitude) {
      const colegaLine = L.polyline(
        [
          [userPos.latitude, userPos.longitude],
          [agenteSelecionado.latitude, agenteSelecionado.longitude]
        ],
        {
          color: '#0284c7',
          weight: 4,
          dashArray: '5, 6',
          opacity: 0.95
        }
      );
      colegaLine.addTo(distanceLayer);

      const midLat = (Number(userPos.latitude) + Number(agenteSelecionado.latitude)) / 2;
      const midLng = (Number(userPos.longitude) + Number(agenteSelecionado.longitude)) / 2;
      const dist = calcDistanceMeters(
        userPos.latitude,
        userPos.longitude,
        agenteSelecionado.latitude,
        agenteSelecionado.longitude
      );

      const colegaBadgeIcon = L.divIcon({
        className: '',
        html: `<div style="background:#0284c7;color:#ffffff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px;border:1.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.3);white-space:nowrap;">Você ➔ ${agenteSelecionado.label}: ${dist}m</div>`,
        iconSize: [140, 22],
        iconAnchor: [70, 11]
      });

      const colegaBadge = L.marker([midLat, midLng], {
        icon: colegaBadgeIcon,
        interactive: false,
        zIndexOffset: 1500
      });
      colegaBadge.addTo(distanceLayer);
    }
  }, [armadilhas, showDistances, userPos, agenteSelecionado]);

  // Centraliza suavemente na armadilha quando for selecionada
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !armadilhaSelecionada?.latitude || !armadilhaSelecionada?.longitude) return;
    map.flyTo([armadilhaSelecionada.latitude, armadilhaSelecionada.longitude], 17, {
      duration: 0.8
    });
  }, [armadilhaSelecionada]);

  // Função para centralizar novamente no agente com zoom de alta precisão
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const lat = userPos?.latitude || -21.9339;
    const lng = userPos?.longitude || -42.6089;
    map.flyTo([lat, lng], 18, { duration: 0.8 });
    if (autoFitRef.current) autoFitRef.current.resume();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      <MapControlButtons
        onRecenter={handleRecenter}
        satellite={satellite}
        onToggleSatellite={() => setSatellite(!satellite)}
        showDistances={showDistances}
        onToggleDistances={() => setShowDistances(!showDistances)}
        top={controlTop}
        right={12}
      />
    </div>
  );
}
