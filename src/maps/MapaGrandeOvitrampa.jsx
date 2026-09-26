import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../lib/geoDetection';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, youDotIcon, otherAgentDotIcon, ovitrampaIcon } from './leafletIcons';
import { calcDistanceMeters } from '../lib/geoDistance';
import { makeAutoFit } from './mapFit';
import { MapControlButtons } from './MapControlButtons';
import { buildTrapDistanceNetwork, findNearbyTraps } from '../lib/geoDistance';
import { ensureLeafletHeat } from '../lib/leafletHeatHelper';
import carmoBoundaryData from './data/carmoBoundary.json';
import carmoGrid300mData from './data/carmoGrid300m.json';

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
  onSelectAgente,
  showLabels,
  onToggleLabels,
  showPanel,
  onTogglePanel,
  showDistances: propShowDistances,
  onToggleDistances: propOnToggleDistances,
  showHeatmap: propShowHeatmap,
  onToggleHeatmap: propOnToggleHeatmap,
  showGrid300m: propShowGrid300m,
  onToggleGrid300m: propOnToggleGrid300m,
  showAgentGuideLine = true
}) {
  const [internalShowLabels, setInternalShowLabels] = useState(true);
  const effectiveShowLabels = showLabels !== undefined ? showLabels : internalShowLabels;
  const handleToggleLabels = onToggleLabels || (() => setInternalShowLabels((prev) => !prev));

  const [internalShowDistances, setInternalShowDistances] = useState(true);
  const effectiveShowDistances = propShowDistances !== undefined ? propShowDistances : internalShowDistances;
  const handleToggleDistances = propOnToggleDistances || (() => setInternalShowDistances((prev) => !prev));

  const [internalShowHeatmap, setInternalShowHeatmap] = useState(false);
  const effectiveShowHeatmap = propShowHeatmap !== undefined ? propShowHeatmap : internalShowHeatmap;
  const handleToggleHeatmap = propOnToggleHeatmap || (() => setInternalShowHeatmap((prev) => !prev));

  const [internalShowGrid300m, setInternalShowGrid300m] = useState(false);
  const effectiveShowGrid300m = propShowGrid300m !== undefined ? propShowGrid300m : internalShowGrid300m;
  const handleToggleGrid300m = propOnToggleGrid300m || (() => setInternalShowGrid300m((prev) => !prev));

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const autoFitRef = useRef(null);
  const layersRef = useRef({
    polygons: null,
    userMarker: null,
    userAccuracyCircle: null,
    distanceLinesLayer: null,
    circlesLayer: null,
    trapsLayer: null,
    otherAgentsLayer: null,
    heatLayer: null,
    boundaryLayer: null,
    grid300mLayer: null
  });

  const [satellite, setSatellite] = useState(false);
  const [showCircles, setShowCircles] = useState(false);

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
    layersRef.current.boundaryLayer = L.layerGroup().addTo(map);
    layersRef.current.grid300mLayer = L.layerGroup().addTo(map);
    layersRef.current.distanceLinesLayer = L.layerGroup().addTo(map);
    layersRef.current.circlesLayer = L.layerGroup().addTo(map);
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
        if (layersRef.current.circlesLayer) {
          map.removeLayer(layersRef.current.circlesLayer);
        }
        if (layersRef.current.otherAgentsLayer) {
          map.removeLayer(layersRef.current.otherAgentsLayer);
        }
        if (layersRef.current.boundaryLayer) {
          map.removeLayer(layersRef.current.boundaryLayer);
        }
        if (layersRef.current.grid300mLayer) {
          map.removeLayer(layersRef.current.grid300mLayer);
        }
        if (layersRef.current.heatLayer) {
          map.removeLayer(layersRef.current.heatLayer);
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
        icon: ovitrampaIcon(arm, !effectiveShowLabels),
        zIndexOffset: isSelected ? 1500 : 1000
      });

      if (!effectiveShowLabels) {
        marker.bindTooltip(`ARM-${arm.numero} (${arm.bairro || 'Carmo'})`, {
          direction: 'top',
          offset: [0, -8]
        });
      }

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
  }, [armadilhas, armadilhaSelecionada, mostrarTodosPontos, userPos, onSelectArmadilha, effectiveShowLabels]);


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

    // 6.1. Linhas retas entre as armadilhas cadastradas (conforme desenho do usuário)
    if (effectiveShowDistances && armadilhas && armadilhas.length >= 2) {
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

    // 6.2. Linha guia em tempo real: Agente (Você) ➔ Armadilha mais próxima (ou selecionada)
    if (showAgentGuideLine && userPos?.latitude && userPos?.longitude && armadilhas && armadilhas.length > 0) {
      const targetTrap = (armadilhaSelecionada && armadilhaSelecionada.latitude && armadilhaSelecionada.longitude)
        ? armadilhaSelecionada
        : findNearbyTraps(userPos, armadilhas, 1)[0]?.armadilha;

      if (targetTrap && targetTrap.latitude && targetTrap.longitude) {
        const dist = calcDistanceMeters(
          userPos.latitude,
          userPos.longitude,
          targetTrap.latitude,
          targetTrap.longitude
        );

        const agentLine = L.polyline(
          [
            [userPos.latitude, userPos.longitude],
            [targetTrap.latitude, targetTrap.longitude]
          ],
          {
            color: '#059669',
            weight: 4.5,
            dashArray: '7, 6',
            opacity: 0.95
          }
        );
        agentLine.addTo(distanceLayer);

        const agentMidpoint = [
          (Number(userPos.latitude) + Number(targetTrap.latitude)) / 2,
          (Number(userPos.longitude) + Number(targetTrap.longitude)) / 2
        ];

        const agentBadgeIcon = L.divIcon({
          className: '',
          html: `<div class="distance-pill distance-pill-ideal" style="box-shadow:0 3px 10px rgba(0,0,0,0.25);">Você ➔ ARM-${targetTrap.numero}: ${dist}m</div>`,
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
  }, [armadilhas, effectiveShowDistances, showAgentGuideLine, userPos, armadilhaSelecionada, agenteSelecionado]);

  // 6.5. Renderização dos Círculos de Raio de Cobertura (175m)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const circlesLayer = layersRef.current.circlesLayer;
    if (!map || !circlesLayer) return;

    circlesLayer.clearLayers();
    if (!showCircles || !armadilhas || armadilhas.length === 0) return;

    armadilhas.forEach((t) => {
      if (!t.latitude || !t.longitude) return;
      const circle = L.circle([Number(t.latitude), Number(t.longitude)], {
        radius: 175,
        color: '#7c3aed',
        weight: 1.5,
        opacity: 0.65,
        fillColor: '#8b5cf6',
        fillOpacity: 0.12,
        dashArray: '4, 6'
      });
      circle.addTo(circlesLayer);
    });
  }, [armadilhas, showCircles]);

  // 6.6. Renderização do Mapa de Calor (SOMENTE Armadilhas Já Verificadas / Analisadas)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!effectiveShowHeatmap) {
      if (layersRef.current.heatLayer) {
        try {
          map.removeLayer(layersRef.current.heatLayer);
        } catch (e) {}
        layersRef.current.heatLayer = null;
      }
      return;
    }

    let cancelado = false;
    ensureLeafletHeat()
      .then((LeafletLib) => {
        if (cancelado || !mapInstanceRef.current) return;

        if (layersRef.current.heatLayer) {
          try {
            map.removeLayer(layersRef.current.heatLayer);
          } catch (e) {}
          layersRef.current.heatLayer = null;
        }

        // Filtra ESTRITAMENTE as armadilhas já verificadas
        const armadilhasVerificadas = armadilhas.filter(
          (a) =>
            (a.status === 'analisada' || (a.ultimosOvos !== undefined && a.ultimosOvos !== null)) &&
            a.latitude &&
            a.longitude
        );

        if (armadilhasVerificadas.length === 0) return;

        const heatPoints = armadilhasVerificadas.map((a) => {
          const ovos = Number(a.ultimosOvos || 0);
          let intensidade = 0.10; // 0 ovos (negativa) = azul frio
          if (ovos > 100) intensidade = 1.0; // >100 ovos = vermelho intenso
          else if (ovos > 50) intensidade = 0.78; // 51-100 ovos = laranja forte
          else if (ovos > 20) intensidade = 0.55; // 21-50 ovos = amarelo
          else if (ovos > 0) intensidade = 0.32;  // 1-20 ovos = verde

          return [Number(a.latitude), Number(a.longitude), intensidade];
        });

        if (LeafletLib.heatLayer) {
          const heat = LeafletLib.heatLayer(heatPoints, {
            radius: 22,
            blur: 14,
            maxZoom: 18,
            max: 1.0,
            minOpacity: 0.40,
            gradient: {
              0.08: '#2563eb', // Azul vivo (Zero ovos - Negativa / Frio)
              0.22: '#0284c7', // Azul cerúleo
              0.38: '#16a34a', // Verde (1 a 20 ovos - Baixo)
              0.58: '#eab308', // Amarelo (21 a 50 ovos - Moderado)
              0.76: '#ea580c', // Laranja (51 a 99 ovos - Alto)
              0.92: '#dc2626', // Vermelho vivo (>100 ovos - Foco Crítico Máximo)
              1.00: '#991b1b'  // Vermelho escuro
            }
          });

          heat.addTo(map);
          layersRef.current.heatLayer = heat;
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar leaflet.heat:', err);
      });

    return () => {
      cancelado = true;
      if (layersRef.current.heatLayer && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(layersRef.current.heatLayer);
        } catch (e) {}
        layersRef.current.heatLayer = null;
      }
    };
  }, [armadilhas, effectiveShowHeatmap]);

  // 6.7. Renderização da Grade Técnica de 300m (MS/Fiocruz) e Limite Municipal de Carmo (IBGE)
  useEffect(() => {
    const boundaryLayer = layersRef.current.boundaryLayer;
    const gridLayer = layersRef.current.grid300mLayer;
    if (!boundaryLayer || !gridLayer) return;

    boundaryLayer.clearLayers();
    gridLayer.clearLayers();

    if (!effectiveShowGrid300m) return;

    // 1. Limite Territorial Oficial IBGE (Carmo)
    if (carmoBoundaryData && carmoBoundaryData.features) {
      L.geoJSON(carmoBoundaryData, {
        style: {
          color: '#d97706',
          weight: 2.5,
          dashArray: '6, 6',
          fillColor: '#f59e0b',
          fillOpacity: 0.03,
          lineCap: 'round',
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(
            `<b>Município de Carmo (RJ)</b><br/><span style="font-size: 10px; color: #64748b;">Perímetro Territorial IBGE 2025</span>`,
            {
              direction: 'center',
              sticky: true,
              opacity: 0.95
            }
          );
        }
      }).addTo(boundaryLayer);
    }

    // 2. Grade Urbana Técnica 300m x 300m (104 células urbanas)
    if (carmoGrid300mData && carmoGrid300mData.features) {
      L.geoJSON(carmoGrid300mData, {
        style: {
          color: '#0284c7',
          weight: 1.5,
          dashArray: '3, 4',
          fillColor: '#38bdf8',
          fillOpacity: 0.08,
          lineCap: 'round',
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const cellCode = props.urban_code || props.code || 'CGR-300m';

          layer.bindTooltip(
            `<b>Célula ${cellCode}</b><br/><span style="font-size: 10px; color: #0369a1;">Grade Técnica 300m × 300m (MS/Fiocruz)</span>`,
            {
              sticky: true,
              opacity: 0.95
            }
          );

          layer.on('mouseover', function () {
            this.setStyle({
              weight: 2.5,
              color: '#0369a1',
              fillColor: '#0284c7',
              fillOpacity: 0.22
            });
          });

          layer.on('mouseout', function () {
            this.setStyle({
              weight: 1.5,
              color: '#0284c7',
              fillColor: '#38bdf8',
              fillOpacity: 0.08
            });
          });
        }
      }).addTo(gridLayer);
    }
  }, [effectiveShowGrid300m]);

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
        showDistances={effectiveShowDistances}
        onToggleDistances={handleToggleDistances}
        showCircles={showCircles}
        onToggleCircles={() => setShowCircles(!showCircles)}
        showHeatmap={effectiveShowHeatmap}
        onToggleHeatmap={handleToggleHeatmap}
        showGrid300m={effectiveShowGrid300m}
        onToggleGrid300m={handleToggleGrid300m}
        showLabels={effectiveShowLabels}
        onToggleLabels={handleToggleLabels}
        showPanel={showPanel}
        onTogglePanel={onTogglePanel}
        top={controlTop}
        right={12}
      />

      {/* Contêiner de Legendas Flutuantes Inferiores */}
      <div className="absolute bottom-4 left-4 z-[900] flex flex-col gap-2.5 max-w-[300px] pointer-events-none">
        {/* Legenda Flutuante da Grade Técnica 300m */}
        {effectiveShowGrid300m && (
          <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-2xl p-3 shadow-xl pointer-events-auto transition-all">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
              <span className="text-xs font-black text-slate-900 leading-tight">
                📐 Grade Técnica 300m & Perímetro
              </span>
            </div>
            <div className="text-[10px] text-slate-600 mb-2 font-medium leading-relaxed">
              104 células técnicas (300m × 300m) em conformidade com o manual de armadilhas do Ministério da Saúde / Fiocruz + limite municipal oficial do IBGE.
            </div>
            <div className="flex flex-col gap-1 text-[10px] font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-dashed border-sky-600 bg-sky-100/60 inline-block shrink-0" />
                <span className="text-sky-800">Célula Técnica 300m × 300m</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-amber-600 inline-block shrink-0" />
                <span className="text-amber-800">Limite Territorial Carmo (IBGE)</span>
              </div>
            </div>
          </div>
        )}

        {/* Legenda Flutuante do Mapa de Calor */}
        {effectiveShowHeatmap && (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-xl pointer-events-auto transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="text-xs font-black text-slate-900 leading-tight">
                🔥 Mapa de Calor Epidemiológico
              </span>
            </div>
            <div className="text-[10px] text-slate-600 mb-2 font-medium leading-relaxed">
              Calculado <b>apenas com as 26 armadilhas lidas</b>. Foco crítico: Progresso (P-23: 147 ovos, P-21: 100 ovos).
            </div>
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#16a34a] via-[#eab308] via-[#ea580c] to-[#dc2626] shadow-inner mb-1.5" />
            <div className="flex justify-between text-[9px] font-black text-slate-500">
              <span className="text-blue-600 font-extrabold">0 (Azul)</span>
              <span className="text-emerald-700">1-20</span>
              <span className="text-amber-600">21-50</span>
              <span className="text-orange-600">51-99</span>
              <span className="text-rose-600 font-extrabold">&gt;100 (Vermelho)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
