import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getAllPolygons } from '../../lib/geoDetection';
import {
  MAP_TILE_STANDARD,
  MAP_TILE_SATELLITE,
  youDotIcon,
  ovitrampaIcon,
  pontoIdealIcon
} from '../../maps/leafletIcons';
import { calcDistanceMeters, buildTrapDistanceNetwork } from '../../lib/geoDistance';
import { RAIO_COBERTURA_IDEAL_METROS } from '../../lib/geoIdealGrid';
import { MapControlButtons } from '../../maps/MapControlButtons';
import { Maximize2, MapPin, Target, Car } from 'lucide-react';

export function MapaCenarioIdeal({
  pontosIdeais = [],
  armadilhasReais = [],
  pontoSelecionado = null,
  onSelectPonto,
  armadilhaSelecionada = null,
  onSelectArmadilha,
  userPos = null,
  showLabels = true,
  onToggleLabels,
  modoCenario = 'atual', // 'atual' | 'ideal' | 'rota'
  onChangeModoCenario,
  dadosRota = null, // Resultado de calcularRotaColetaOtimizada
  numVeiculos = 1,
  onChangeNumVeiculos
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Camadas Leaflet
  const layersRef = useRef({
    polygons: null,
    coberturaCircles: null,
    distanceLines: null,
    pontosLayer: null,
    rotasLayer: null,
    userMarker: null,
    userAccuracyCircle: null
  });

  // Toggles de visualização
  const [satellite, setSatellite] = useState(false);
  const [showDistances, setShowDistances] = useState(true);
  const [showCircles, setShowCircles] = useState(false);

  // 1. Inicializar Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = userPos?.latitude || -21.9339;
    const initialLng = userPos?.longitude || -42.6089;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    const tileConfig = satellite ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      attribution: tileConfig.attribution
    }).addTo(map);

    layersRef.current.polygons = L.layerGroup().addTo(map);
    layersRef.current.coberturaCircles = L.layerGroup().addTo(map);
    layersRef.current.distanceLines = L.layerGroup().addTo(map);
    layersRef.current.pontosLayer = L.layerGroup().addTo(map);
    layersRef.current.rotasLayer = L.layerGroup().addTo(map);

    // Enquadramento inicial
    const baseList = armadilhasReais.length > 0 ? armadilhasReais : pontosIdeais;
    if (baseList.length > 0) {
      const validPoints = baseList
        .filter(p => p.latitude != null && p.longitude != null)
        .map(p => [Number(p.latitude), Number(p.longitude)]);
      if (validPoints.length > 0) {
        map.fitBounds(L.latLngBounds(validPoints), { padding: [50, 50], maxZoom: 16 });
      }
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Atualizar Tile Layer (Satélite / Mapa Padrão)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = satellite ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      attribution: tileConfig.attribution
    }).addTo(map);
  }, [satellite]);

  // 3. Renderizar Polígonos Territoriais de Carmo-RJ
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyGroup = layersRef.current.polygons;
    if (!map || !polyGroup) return;

    polyGroup.clearLayers();
    const polygons = getAllPolygons();
    const urbanPolys = polygons.filter((p) => p.folder !== 'DISTRITOS' && p.territoryType === 'area');

    urbanPolys.forEach((p) => {
      if (!p.coordinates || p.coordinates.length < 3) return;
      const polygon = L.polygon(p.coordinates, {
        color: '#6366f1',
        weight: 1.2,
        dashArray: '3, 4',
        opacity: 0.35,
        fillColor: '#818cf8',
        fillOpacity: 0.04
      });
      polygon.bindTooltip(`${p.folder} - ${p.name}`, {
        sticky: true,
        direction: 'top',
        className: 'bg-slate-900 text-white font-bold text-[10px] px-2 py-1 rounded shadow-lg border border-indigo-500'
      });
      polyGroup.addLayer(polygon);
    });
  }, []);

  // 4. Linhas de Distância com Metragem entre Pontos (buildTrapDistanceNetwork)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const distLayer = layersRef.current.distanceLines;
    if (!map || !distLayer) return;

    distLayer.clearLayers();
    if (!showDistances || modoCenario === 'rota') return; // No modo rota, desenha o circuito de coleta

    const listaAtiva = modoCenario === 'atual' ? armadilhasReais : pontosIdeais;
    if (!listaAtiva || listaAtiva.length < 2) return;

    const pontosNorm = listaAtiva
      .filter(p => p.latitude != null && p.longitude != null)
      .map((p, idx) => ({
        ...p,
        id: p.id || p.codigo || `P-${idx + 1}`,
        numero: p.numero || p.codigo || `${idx + 1}`,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude)
      }));

    const edges = buildTrapDistanceNetwork(pontosNorm, 3, 900);

    edges.forEach((edge) => {
      const isIdealMode = modoCenario === 'ideal';
      const polyline = L.polyline(
        [
          [edge.trapA.latitude, edge.trapA.longitude],
          [edge.trapB.latitude, edge.trapB.longitude]
        ],
        {
          color: isIdealMode ? '#7c3aed' : edge.cor,
          weight: 3.5,
          opacity: 0.85,
          dashArray: edge.status === 'ideal' ? '9, 7' : '4, 6'
        }
      );
      polyline.addTo(distLayer);

      const badgeIcon = L.divIcon({
        className: '',
        html: `<div class="distance-pill ${edge.badgeClass}" style="${isIdealMode ? 'background:#581c87;color:#fff;border-color:#a855f7;' : ''}">${edge.distancia} m</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });

      const badge = L.marker(edge.midpoint, {
        icon: badgeIcon,
        interactive: false,
        zIndexOffset: 600
      });
      badge.addTo(distLayer);
    });
  }, [modoCenario, armadilhasReais, pontosIdeais, showDistances]);

  // 5. Círculos de Raio de Cobertura (175m)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const circlesLayer = layersRef.current.coberturaCircles;
    if (!map || !circlesLayer) return;

    circlesLayer.clearLayers();
    if (!showCircles || modoCenario === 'rota') return;

    const listaAtiva = modoCenario === 'atual' ? armadilhasReais : pontosIdeais;
    const isIdealMode = modoCenario === 'ideal';

    listaAtiva.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const circle = L.circle([Number(p.latitude), Number(p.longitude)], {
        radius: RAIO_COBERTURA_IDEAL_METROS,
        color: isIdealMode ? '#7c3aed' : '#059669',
        weight: 1.5,
        opacity: 0.6,
        fillColor: isIdealMode ? '#8b5cf6' : '#10b981',
        fillOpacity: 0.12,
        dashArray: '4, 6'
      });
      circle.addTo(circlesLayer);
    });
  }, [modoCenario, armadilhasReais, pontosIdeais, showCircles]);

  // 6. ROTA DE COLETA DE PALHETAS (MODO 'rota')
  useEffect(() => {
    const map = mapInstanceRef.current;
    const rotasLayer = layersRef.current.rotasLayer;
    if (!map || !rotasLayer) return;

    rotasLayer.clearLayers();
    if (modoCenario !== 'rota' || !dadosRota || !dadosRota.rotas) return;

    dadosRota.rotas.forEach((veiculoRota) => {
      const paradas = veiculoRota.paradas;
      if (!paradas || paradas.length < 2) return;

      const coords = paradas.map(p => [Number(p.latitude), Number(p.longitude)]);

      // 6.1. Linha contínua do trajeto com a cor do veículo
      const linhaRota = L.polyline(coords, {
        color: veiculoRota.cor,
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round'
      });
      linhaRota.addTo(rotasLayer);

      // 6.2. Marcadores das paradas sequenciais com número da ordem
      paradas.forEach((p) => {
        const paradaBadge = L.divIcon({
          className: '',
          html: `
            <div style="background:${veiculoRota.cor};color:#ffffff;font-size:11px;font-weight:900;width:26px;height:26px;border-radius:999px;display:flex;align-items:center;justify-content:center;border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);">
              ${p.ordem}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([Number(p.latitude), Number(p.longitude)], {
          icon: paradaBadge,
          zIndexOffset: 1200 + p.ordem
        });

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:3px 4px;min-width:180px;">
            <div style="background:${veiculoRota.cor};color:#fff;font-size:10px;font-weight:900;padding:2px 6px;border-radius:6px;display:inline-block;margin-bottom:4px;">
              ${veiculoRota.nome} • Parada #${p.ordem}
            </div>
            <div style="font-weight:900;font-size:13px;color:#0f172a;">ARM-${p.numero || p.codigo}</div>
            <div style="font-size:11px;color:#475569;margin-top:2px;">📍 ${p.rua || 'Logradouro'}</div>
            <div style="font-size:10px;color:#64748b;">${p.bairro || 'Carmo'} ${p.moradorNome ? `• ${p.moradorNome}` : ''}</div>
            ${p.distanciaDoAnteriorMetros > 0 ? `<div style="font-size:10px;font-weight:800;color:#059669;margin-top:4px;">➔ +${p.distanciaDoAnteriorMetros}m do ponto anterior</div>` : '<div style="font-size:10px;font-weight:800;color:#2563eb;margin-top:4px;">🏁 Início da Coleta</div>'}
          </div>
        `);

        marker.addTo(rotasLayer);
      });
    });
  }, [modoCenario, dadosRota]);

  // 7. Marcadores dos Pontos Normais (quando NÃO está no modo rota)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const pontosLayer = layersRef.current.pontosLayer;
    if (!map || !pontosLayer) return;

    pontosLayer.clearLayers();
    if (modoCenario === 'rota') return; // Marcadores do modo rota são tratados acima

    if (modoCenario === 'atual') {
      armadilhasReais.forEach((t) => {
        if (t.latitude == null || t.longitude == null) return;
        const isSelected = armadilhaSelecionada && armadilhaSelecionada.id === t.id;
        const icon = ovitrampaIcon(t, !showLabels);

        const marker = L.marker([Number(t.latitude), Number(t.longitude)], {
          icon,
          zIndexOffset: isSelected ? 1200 : 800
        });

        marker.on('click', () => {
          if (onSelectArmadilha) onSelectArmadilha(t);
        });

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;min-width:190px;">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
              <span style="background:#059669;color:#fff;font-weight:900;font-size:11px;padding:2px 8px;border-radius:999px;">ARM-${t.numero}</span>
              <span style="font-weight:700;font-size:11px;color:#475569;">${t.bairro || 'Carmo'}</span>
            </div>
            <div style="font-size:11px;color:#1e293b;font-weight:700;margin-bottom:2px;">${t.rua || 'Logradouro não informado'}</div>
            ${t.moradorNome ? `<div style="font-size:10px;color:#64748b;margin-bottom:4px;">👤 Morador: ${t.moradorNome}</div>` : ''}
            <div style="font-size:9px;color:#64748b;font-family:monospace;">${Number(t.latitude).toFixed(6)}, ${Number(t.longitude).toFixed(6)}</div>
            <div style="margin-top:6px;background:#ecfdf5;border:1px solid #a7f3d0;padding:4px 6px;border-radius:4px;font-size:10px;color:#065f46;font-weight:700;">
              📦 Armadilha Instalada no Campo
            </div>
          </div>
        `);

        marker.addTo(pontosLayer);
      });
    } else {
      pontosIdeais.forEach((p) => {
        if (p.latitude == null || p.longitude == null) return;
        const isSelected = pontoSelecionado && pontoSelecionado.codigo === p.codigo;
        const icon = pontoIdealIcon(p, !showLabels, isSelected);

        const marker = L.marker([Number(p.latitude), Number(p.longitude)], {
          icon,
          zIndexOffset: isSelected ? 1200 : 800
        });

        marker.on('click', () => {
          if (onSelectPonto) onSelectPonto(p);
        });

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;min-width:200px;">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
              <span style="background:#7c3aed;color:#fff;font-weight:900;font-size:11px;padding:2px 8px;border-radius:999px;">${p.codigo}</span>
              <span style="font-weight:700;font-size:11px;color:#475569;">${p.bairro}</span>
            </div>
            <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:2px;">${p.quarteirao}</div>
            <div style="font-size:11px;color:#475569;margin-bottom:6px;">📍 ${p.rua}</div>
            <div style="font-size:9px;color:#64748b;font-family:monospace;">${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}</div>
            <div style="margin-top:6px;background:#f5f3ff;border:1px solid #ddd6fe;padding:4px 6px;border-radius:4px;font-size:10px;color:#5b21b6;font-weight:700;">
              🎯 Posição Ideal (~300m regular)
            </div>
          </div>
        `);

        marker.addTo(pontosLayer);
      });
    }
  }, [modoCenario, armadilhasReais, pontosIdeais, armadilhaSelecionada, pontoSelecionado, showLabels]);

  // 8. Marcador do Agente (Você)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPos || !userPos.latitude || !userPos.longitude) return;

    if (layersRef.current.userMarker) {
      layersRef.current.userMarker.setLatLng([userPos.latitude, userPos.longitude]);
    } else {
      layersRef.current.userMarker = L.marker([userPos.latitude, userPos.longitude], {
        icon: youDotIcon('Você (ACE)'),
        zIndexOffset: 2000
      }).addTo(map);
    }

    if (userPos.accuracy && userPos.accuracy > 0) {
      if (layersRef.current.userAccuracyCircle) {
        layersRef.current.userAccuracyCircle.setLatLng([userPos.latitude, userPos.longitude]);
        layersRef.current.userAccuracyCircle.setRadius(userPos.accuracy);
      } else {
        layersRef.current.userAccuracyCircle = L.circle([userPos.latitude, userPos.longitude], {
          radius: userPos.accuracy,
          color: '#10b981',
          weight: 1,
          opacity: 0.5,
          fillColor: '#10b981',
          fillOpacity: 0.1
        }).addTo(map);
      }
    }
  }, [userPos]);

  // Centralizar em Ponto Selecionado
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pontoSelecionado) return;
    map.flyTo([Number(pontoSelecionado.latitude), Number(pontoSelecionado.longitude)], 17, { duration: 1 });
  }, [pontoSelecionado]);

  // Centralizar em Armadilha Selecionada
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !armadilhaSelecionada || !armadilhaSelecionada.latitude) return;
    map.flyTo([Number(armadilhaSelecionada.latitude), Number(armadilhaSelecionada.longitude)], 17, { duration: 1 });
  }, [armadilhaSelecionada]);

  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const baseList = armadilhasReais.length > 0 ? armadilhasReais : pontosIdeais;
    const validPoints = baseList
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => [Number(p.latitude), Number(p.longitude)]);

    if (validPoints.length > 0) {
      map.fitBounds(L.latLngBounds(validPoints), { padding: [50, 50], maxZoom: 16 });
    }
  };

  const handleCentrarGps = () => {
    const map = mapInstanceRef.current;
    if (!map || !userPos?.latitude) return;
    map.flyTo([userPos.latitude, userPos.longitude], 17, { duration: 1 });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-slate-100" />

      {/* SELETOR RÁPIDO NO TOPO-ESQUERDA DO MAPA */}
      <div className="absolute top-3 left-3 z-20 flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-300 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={() => onChangeModoCenario && onChangeModoCenario('atual')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            modoCenario === 'atual'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Ver o Cenário Atual (a realidade das armadilhas instaladas)"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Realidade ({armadilhasReais.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeModoCenario && onChangeModoCenario('ideal')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            modoCenario === 'ideal'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Ver o Cenário Ideal (~300m regular)"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Grade Ideal ({pontosIdeais.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeModoCenario && onChangeModoCenario('rota')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            modoCenario === 'rota'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Rota de Coleta Otimizada para 1 ou 2 veículos"
        >
          <Car className="w-3.5 h-3.5" />
          <span>Rota de Coleta</span>
        </button>
      </div>

      {/* SELETOR DE VEÍCULOS QUANDO NO MODO ROTA */}
      {modoCenario === 'rota' && (
        <div className="absolute top-14 left-3 z-20 flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-blue-200 shadow-xl pointer-events-auto text-xs font-black">
          <span className="text-[10px] text-slate-500 uppercase px-2">Veículos:</span>
          <button
            type="button"
            onClick={() => onChangeNumVeiculos && onChangeNumVeiculos(1)}
            className={`px-3 py-1 rounded-xl transition-all ${
              numVeiculos === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            🚗 1 Carro (Circuito Único)
          </button>
          <button
            type="button"
            onClick={() => onChangeNumVeiculos && onChangeNumVeiculos(2)}
            className={`px-3 py-1 rounded-xl transition-all ${
              numVeiculos === 2 ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            🚗🚙 2 Carros (Divisão Norte/Sul)
          </button>
        </div>
      )}

      {/* BOTÕES FLUTUANTES PADRONIZADOS */}
      <MapControlButtons
        onRecenter={handleCentrarGps}
        satellite={satellite}
        onToggleSatellite={() => setSatellite(!satellite)}
        showDistances={showDistances}
        onToggleDistances={() => setShowDistances(!showDistances)}
        showCircles={showCircles}
        onToggleCircles={() => setShowCircles(!showCircles)}
        showLabels={showLabels}
        onToggleLabels={onToggleLabels}
        top={14}
        right={12}
      />

      {/* BOTÃO ENQUADRAR CIDADE */}
      <div className="absolute top-[280px] right-3 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={handleResetBounds}
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: '1.5px solid rgba(255, 255, 255, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)'
          }}
          className="active:scale-90"
          title="Enquadrar toda a cidade de Carmo"
        >
          <Maximize2 size={19} color="#7c3aed" />
        </button>
      </div>

      {/* LEGENDA NO CANTO INFERIOR ESQUERDO */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 text-white backdrop-blur-md px-3 py-2 rounded-xl text-[11px] font-bold border border-slate-700/80 shadow-2xl flex items-center gap-3">
        {modoCenario === 'rota' ? (
          numVeiculos === 1 ? (
            <div className="flex items-center gap-1.5 text-blue-300">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white inline-block"></span>
              <span>Circuito Único (~{dadosRota?.kmTotalGlobal || 0} km • ~{dadosRota?.tempoEstimadoGlobal || ''})</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-blue-300">
                <span className="w-3 h-3 rounded-full bg-blue-600 border border-white inline-block"></span>
                <span>Carro 1 (Sul/Centro)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="w-3 h-3 rounded-full bg-amber-600 border border-white inline-block"></span>
                <span>Carro 2 (Norte)</span>
              </div>
            </div>
          )
        ) : modoCenario === 'atual' ? (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block"></span>
            <span>Realidade ({armadilhasReais.length} OVs)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 border border-white inline-block"></span>
            <span>Grade Ideal ({pontosIdeais.length} Pontos)</span>
          </div>
        )}
      </div>
    </div>
  );
}
