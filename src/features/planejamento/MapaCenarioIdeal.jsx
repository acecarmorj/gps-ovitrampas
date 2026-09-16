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
import { calcDistanceMeters } from '../../lib/geoDistance';
import { calcBearing, bearingToCardinal } from '../../lib/geoBearing';
import { RAIO_COBERTURA_IDEAL_METROS } from '../../lib/geoIdealGrid';
import {
  Layers, MapPin, Radio, Compass,
  Maximize2, Navigation, Target, Activity, Tag,
  Eye, CheckCircle2, AlertTriangle
} from 'lucide-react';

export function MapaCenarioIdeal({
  pontosIdeais = [],
  todosPontosIdeais = [],
  armadilhasReais = [],
  pontoSelecionado = null,
  onSelectPonto,
  armadilhaSelecionada = null,
  onSelectArmadilha,
  userPos = null,
  showLabels = true,
  onToggleLabels,
  modoCenario = 'ideal', // 'atual' | 'ideal' | 'comparar'
  onChangeModoCenario
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Camadas Leaflet
  const layersRef = useRef({
    polygons: null,
    coberturaCircles: null,
    distanciasReais: null,
    pontosIdeaisLayer: null,
    armadilhasReaisLayer: null,
    vetoresLayer: null,
    userMarker: null,
    userAccuracyCircle: null
  });

  // Toggles de visualização
  const [satellite, setSatellite] = useState(false);
  const [mostrarCirculos, setMostrarCirculos] = useState(false); // Círculos de 175m

  // Referência completa de pontos ideais para cálculo correto de distâncias
  const gradeCompleta = todosPontosIdeais.length > 0 ? todosPontosIdeais : pontosIdeais;

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

    // Enquadramento inicial
    const basePoints = modoCenario === 'atual' && armadilhasReais.length > 0
      ? armadilhasReais.map(t => [Number(t.latitude), Number(t.longitude)])
      : pontosIdeais.map(p => [p.latitude, p.longitude]);

    if (basePoints.length > 0) {
      const bounds = L.latLngBounds(basePoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
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
    if (!map) return;

    if (layersRef.current.polygons) {
      map.removeLayer(layersRef.current.polygons);
      layersRef.current.polygons = null;
    }

    const polygons = getAllPolygons();
    const urbanPolys = polygons.filter((p) => p.folder !== 'DISTRITOS' && p.territoryType === 'area');

    const polyLayerGroup = L.layerGroup();
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
      polyLayerGroup.addLayer(polygon);
    });

    polyLayerGroup.addTo(map);
    layersRef.current.polygons = polyLayerGroup;
  }, []);

  // 4. Renderizar Círculos de Cobertura (175m de raio)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.coberturaCircles) {
      map.removeLayer(layersRef.current.coberturaCircles);
      layersRef.current.coberturaCircles = null;
    }

    if (!mostrarCirculos) return;

    const circlesGroup = L.layerGroup();

    if (modoCenario === 'atual') {
      // Círculos verdes de 175m ao redor das armadilhas reais do campo
      armadilhasReais.forEach((t) => {
        if (!t.latitude || !t.longitude) return;
        const circle = L.circle([Number(t.latitude), Number(t.longitude)], {
          radius: RAIO_COBERTURA_IDEAL_METROS,
          color: '#059669',
          weight: 1.2,
          opacity: 0.5,
          fillColor: '#10b981',
          fillOpacity: 0.08,
          dashArray: '4, 6'
        });
        circlesGroup.addLayer(circle);
      });
    } else {
      // Círculos roxos de 175m ao redor dos pontos ideais
      pontosIdeais.forEach((p) => {
        const circle = L.circle([p.latitude, p.longitude], {
          radius: RAIO_COBERTURA_IDEAL_METROS,
          color: '#7c3aed',
          weight: 1.2,
          opacity: 0.5,
          fillColor: '#8b5cf6',
          fillOpacity: 0.09,
          dashArray: '4, 6'
        });
        circlesGroup.addLayer(circle);
      });
    }

    circlesGroup.addTo(map);
    layersRef.current.coberturaCircles = circlesGroup;
  }, [pontosIdeais, armadilhasReais, mostrarCirculos, modoCenario]);

  // 5. Renderizar Linhas de Distância Real entre Armadilhas (No Modo 'atual')
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.distanciasReais) {
      map.removeLayer(layersRef.current.distanciasReais);
      layersRef.current.distanciasReais = null;
    }

    if (modoCenario !== 'atual') return;

    const distGroup = L.layerGroup();
    const trapsValidas = armadilhasReais.filter(t => t.latitude && t.longitude);

    // Conectar vizinhas para evidenciar a malha real e sobreposições (<160m)
    for (let i = 0; i < trapsValidas.length; i++) {
      const a = trapsValidas[i];
      let menorDist = Infinity;
      let vizinha = null;

      for (let j = 0; j < trapsValidas.length; j++) {
        if (i === j) continue;
        const b = trapsValidas[j];
        const d = calcDistanceMeters(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude));
        if (d < menorDist) {
          menorDist = d;
          vizinha = b;
        }
      }

      if (vizinha && menorDist < 350) {
        const isCluster = menorDist < 160;
        const line = L.polyline(
          [[Number(a.latitude), Number(a.longitude)], [Number(vizinha.latitude), Number(vizinha.longitude)]],
          {
            color: isCluster ? '#f43f5e' : '#059669',
            weight: isCluster ? 2.5 : 1.5,
            dashArray: isCluster ? '3, 4' : '4, 6',
            opacity: 0.7
          }
        );

        line.bindTooltip(
          `${menorDist}m ${isCluster ? '⚠️ Sobreposição!' : '✓'}`,
          {
            sticky: true,
            direction: 'center',
            className: 'bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow'
          }
        );

        distGroup.addLayer(line);
      }
    }

    distGroup.addTo(map);
    layersRef.current.distanciasReais = distGroup;
  }, [armadilhasReais, modoCenario]);

  // 6. Renderizar Vetores de Deslocamento (Apenas no Modo 'comparar')
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.vetoresLayer) {
      map.removeLayer(layersRef.current.vetoresLayer);
      layersRef.current.vetoresLayer = null;
    }

    if (modoCenario !== 'comparar') return;

    const vetoresGroup = L.layerGroup();
    const idsPontosVisiveis = new Set(pontosIdeais.map((p) => p.codigo));

    armadilhasReais.forEach((t) => {
      if (!t.latitude || !t.longitude) return;
      const latReal = Number(t.latitude);
      const lngReal = Number(t.longitude);

      // Achar ponto ideal mais próximo na grade COMPLETA
      let closest = null;
      let minDist = Infinity;
      for (const p of gradeCompleta) {
        const d = calcDistanceMeters(latReal, lngReal, p.latitude, p.longitude);
        if (d < minDist) {
          minDist = d;
          closest = p;
        }
      }

      if (!closest) return;
      if (!idsPontosVisiveis.has(closest.codigo)) return;

      const strokeColor = minDist <= 60 ? '#059669' : minDist <= 120 ? '#d97706' : '#e11d48';
      const rumoGraus = calcBearing(latReal, lngReal, closest.latitude, closest.longitude);
      const card = bearingToCardinal(rumoGraus);

      const polyline = L.polyline([[latReal, lngReal], [closest.latitude, closest.longitude]], {
        color: strokeColor,
        weight: 2,
        dashArray: '5, 6',
        opacity: 0.85
      });

      polyline.bindTooltip(
        `OV-${t.numero} ➔ ${closest.codigo}: ${minDist}m (${card.sigla})`,
        {
          sticky: true,
          direction: 'center',
          className: 'bg-slate-900/95 text-white font-black text-[9px] px-2 py-0.5 rounded shadow border border-slate-700'
        }
      );

      vetoresGroup.addLayer(polyline);
    });

    vetoresGroup.addTo(map);
    layersRef.current.vetoresLayer = vetoresGroup;
  }, [pontosIdeais, gradeCompleta, armadilhasReais, modoCenario]);

  // 7. Renderizar Pontos Ideais (Roxos) - Visível em 'ideal' e 'comparar'
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.pontosIdeaisLayer) {
      map.removeLayer(layersRef.current.pontosIdeaisLayer);
      layersRef.current.pontosIdeaisLayer = null;
    }

    if (modoCenario === 'atual') return; // No modo atual, oculta pontos ideais

    const pontosGroup = L.layerGroup();

    pontosIdeais.forEach((p) => {
      const isSelected = pontoSelecionado && pontoSelecionado.codigo === p.codigo;
      const icon = pontoIdealIcon(p, !showLabels, isSelected);

      const marker = L.marker([p.latitude, p.longitude], {
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
          <div style="font-size:9px;color:#64748b;font-family:monospace;">${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}</div>
          <div style="margin-top:6px;background:#f5f3ff;border:1px solid #ddd6fe;padding:4px 6px;border-radius:4px;font-size:10px;color:#5b21b6;font-weight:700;">
            🎯 Posição Ideal (~300m regular)
          </div>
        </div>
      `);

      pontosGroup.addLayer(marker);
    });

    pontosGroup.addTo(map);
    layersRef.current.pontosIdeaisLayer = pontosGroup;
  }, [pontosIdeais, pontoSelecionado, showLabels, modoCenario]);

  // 8. Renderizar Armadilhas Reais do Campo (Verdes) - Visível em 'atual' e 'comparar'
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.armadilhasReaisLayer) {
      map.removeLayer(layersRef.current.armadilhasReaisLayer);
      layersRef.current.armadilhasReaisLayer = null;
    }

    if (modoCenario === 'ideal') return; // No modo ideal, oculta armadilhas reais

    const reaisGroup = L.layerGroup();
    const idsPontosVisiveis = new Set(pontosIdeais.map((p) => p.codigo));

    armadilhasReais.forEach((t) => {
      if (!t.latitude || !t.longitude) return;

      // No modo comparar com filtro ativo, só mostra se pertence ao ponto filtrado
      if (modoCenario === 'comparar' && pontosIdeais.length < gradeCompleta.length) {
        let closest = null;
        let minDist = Infinity;
        for (const p of gradeCompleta) {
          const d = calcDistanceMeters(Number(t.latitude), Number(t.longitude), p.latitude, p.longitude);
          if (d < minDist) {
            minDist = d;
            closest = p;
          }
        }
        if (closest && !idsPontosVisiveis.has(closest.codigo)) {
          return;
        }
      }

      const isSelected = armadilhaSelecionada && armadilhaSelecionada.id === t.id;
      const icon = ovitrampaIcon(t, !showLabels);

      const marker = L.marker([Number(t.latitude), Number(t.longitude)], {
        icon,
        zIndexOffset: isSelected ? 1100 : 700
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
          <div style="font-size:10px;color:#64748b;margin-bottom:4px;">${t.moradorNome ? `👤 Morador: ${t.moradorNome}` : ''}</div>
          <div style="font-size:9px;color:#64748b;font-family:monospace;">${Number(t.latitude).toFixed(6)}, ${Number(t.longitude).toFixed(6)}</div>
          <div style="margin-top:6px;background:#ecfdf5;border:1px solid #a7f3d0;padding:4px 6px;border-radius:4px;font-size:10px;color:#065f46;font-weight:700;">
            📦 Armadilha Instalada no Campo (Realidade)
          </div>
        </div>
      `);

      reaisGroup.addLayer(marker);
    });

    reaisGroup.addTo(map);
    layersRef.current.armadilhasReaisLayer = reaisGroup;
  }, [armadilhasReais, armadilhaSelecionada, showLabels, modoCenario, pontosIdeais, gradeCompleta]);

  // 9. Marcador do Agente (Você)
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
    map.flyTo([pontoSelecionado.latitude, pontoSelecionado.longitude], 17, { duration: 1 });
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
    const basePoints = modoCenario === 'atual' && armadilhasReais.length > 0
      ? armadilhasReais.map(t => [Number(t.latitude), Number(t.longitude)])
      : pontosIdeais.map(p => [p.latitude, p.longitude]);

    if (basePoints.length > 0) {
      const bounds = L.latLngBounds(basePoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  const handleCentrarGps = () => {
    const map = mapInstanceRef.current;
    if (!map || !userPos?.latitude) return;
    map.flyTo([userPos.latitude, userPos.longitude], 17, { duration: 1 });
  };

  return (
    <div className="relative w-full h-full">
      {/* MAPA LEAFLET */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-slate-100" />

      {/* SELETOR RÁPIDO FLUTUANTE DE CENÁRIO (CENTRO-TOPO DO MAPA) */}
      <div className="absolute top-3 left-3 z-20 flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-300 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={() => onChangeModoCenario && onChangeModoCenario('atual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            modoCenario === 'atual'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Ver o Cenário Atual (a realidade das armadilhas que estão hoje no campo)"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Realidade Atual ({armadilhasReais.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeModoCenario && onChangeModoCenario('ideal')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            modoCenario === 'ideal'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Ver o Cenário Ideal Puro (grade regular calculada do zero)"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Cenário Ideal ({pontosIdeais.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeModoCenario && onChangeModoCenario('comparar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            modoCenario === 'comparar'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Comparar o Cenário Atual com o Cenário Ideal (mostra as linhas de deslocamento)"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Comparar</span>
        </button>
      </div>

      {/* CONTROLES FLUTUANTES NO TOPO DIREITO */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* BOTÃO REMOVER / MOSTRAR RÓTULO (PROEMINENTE COM TEXTO CLARO) */}
        <button
          type="button"
          onClick={onToggleLabels}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-lg backdrop-blur-md border transition-all active:scale-95 ${
            showLabels
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
          }`}
          title={showLabels ? "Remover rótulos para ver apenas pontos limpos no mapa" : "Mostrar rótulos das armadilhas"}
        >
          <Tag className="w-4 h-4 shrink-0" />
          <span>{showLabels ? 'Remover Rótulo' : 'Mostrar Rótulo'}</span>
        </button>

        {/* SATÉLITE / MAPA */}
        <button
          type="button"
          onClick={() => setSatellite((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-lg backdrop-blur-md border transition-all ${
            satellite
              ? 'bg-slate-900/90 text-amber-400 border-amber-400/50'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Alternar entre Satélite e Mapa Padrão"
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>{satellite ? 'Satélite' : 'Mapa'}</span>
        </button>

        {/* CÍRCULOS DE 175M (RAIO) */}
        <button
          type="button"
          onClick={() => setMostrarCirculos((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-lg backdrop-blur-md border transition-all active:scale-95 ${
            mostrarCirculos
              ? modoCenario === 'atual' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-purple-600 text-white border-purple-500'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Alternar círculos de 175m de cobertura por ovitrampa"
        >
          <Radio className="w-4 h-4 shrink-0" />
          <span>Raio 175m</span>
        </button>

        {/* ENQUADRAR CIDADE */}
        <button
          type="button"
          onClick={handleResetBounds}
          className="p-2.5 bg-white/95 hover:bg-slate-100 text-slate-700 rounded-xl shadow-lg border border-slate-200 backdrop-blur-md transition-all active:scale-95"
          title="Enquadrar toda a cidade de Carmo"
        >
          <Maximize2 className="w-4 h-4 text-purple-600" />
        </button>

        {userPos?.latitude && (
          <button
            type="button"
            onClick={handleCentrarGps}
            className="p-2.5 bg-white/95 hover:bg-emerald-50 text-emerald-700 rounded-xl shadow-lg border border-emerald-300 backdrop-blur-md transition-all active:scale-95"
            title="Centralizar na Minha Posição GPS"
          >
            <Navigation className="w-4 h-4 text-emerald-600" />
          </button>
        )}
      </div>

      {/* LEGENDA INFORMATIVA NO CANTO INFERIOR ESQUERDO */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 text-white backdrop-blur-md px-3 py-2 rounded-xl text-[11px] font-bold border border-slate-700/80 shadow-2xl flex items-center gap-3">
        {modoCenario !== 'ideal' && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block"></span>
            <span>Realidade ({armadilhasReais.length} OVs)</span>
          </div>
        )}
        {modoCenario !== 'atual' && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 border border-white inline-block"></span>
            <span>Cenário Ideal ({pontosIdeais.length} Pontos)</span>
          </div>
        )}
        {modoCenario === 'comparar' && (
          <div className="flex items-center gap-1 text-amber-400">
            <span>⤏ Vetores de Deslocamento</span>
          </div>
        )}
        {mostrarCirculos && (
          <div className="flex items-center gap-1 text-slate-300">
            <span className="w-3 h-3 rounded-full border border-dashed border-slate-300 inline-block"></span>
            <span>Raio 175m</span>
          </div>
        )}
      </div>
    </div>
  );
}
