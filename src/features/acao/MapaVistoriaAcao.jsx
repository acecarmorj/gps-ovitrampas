import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, youDotIcon } from '../../maps/leafletIcons';
import { Layers, Crosshair, MapPin, ShieldAlert, Info } from 'lucide-react';

export function MapaVistoriaAcao({ alvo, userPos }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const circleLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [isSatellite, setIsSatellite] = useState(false);

  // 1. Inicializa o Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [alvo.lat, alvo.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Layer de Tiles (Padrão ou Satélite)
    tileLayerRef.current = L.tileLayer(MAP_TILE_STANDARD.url, {
      maxZoom: MAP_TILE_STANDARD.maxZoom,
      attribution: MAP_TILE_STANDARD.attribution
    }).addTo(map);

    // Grupos de camadas
    circleLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Alterna entre Satélite e Mapa de Rua
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileConfig = isSatellite ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
    tileLayerRef.current.setUrl(tileConfig.url);
  }, [isSatellite]);

  // 3. Atualiza os Raios Oficiais (100m e 200m) e o Marcador do Foco
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !circleLayerRef.current || !markerLayerRef.current) return;

    circleLayerRef.current.clearLayers();
    markerLayerRef.current.clearLayers();

    // -------------------------------------------------------------
    // CÍRCULO EXTERNO: RAIO DE 200 METROS (DIRETRIZ MINISTÉRIO DA SAÚDE)
    // Perímetro Ampliado de Bloqueio Perifocal (9 Quarteirões)
    // -------------------------------------------------------------
    const circle200m = L.circle([alvo.lat, alvo.lng], {
      radius: 200,
      color: '#D97706', // Âmbar / Laranja técnico
      fillColor: '#F59E0B',
      fillOpacity: 0.10,
      weight: 2,
      dashArray: '8, 8'
    });

    circle200m.bindTooltip(
      `<b>Perímetro Oficial MS (Raio 200m):</b><br/>Bloqueio perifocal ampliado e contenção vetorial`,
      { permanent: false, direction: 'top' }
    );
    circle200m.addTo(circleLayerRef.current);

    // -------------------------------------------------------------
    // CÍRCULO INTERNO: RAIO DE 100 METROS (NÚCLEO FOCAL PRIORITÁRIO)
    // Área de dispersão direta e eliminação de 100% dos criadouros
    // -------------------------------------------------------------
    const corFoco = alvo.ovos >= 200 ? '#DC2626' : '#E11D48';
    const fillFoco = alvo.ovos >= 200 ? '#EF4444' : '#F43F5E';

    const circle100m = L.circle([alvo.lat, alvo.lng], {
      radius: 100,
      color: corFoco,
      fillColor: fillFoco,
      fillOpacity: 0.24,
      weight: 3,
      dashArray: '5, 5'
    });

    circle100m.bindTooltip(
      `<b>Núcleo Focal (Raio 100m):</b><br/>Eliminação mecânica imediata obrigatória`,
      { permanent: false, direction: 'top' }
    );
    circle100m.addTo(circleLayerRef.current);

    // -------------------------------------------------------------
    // MARCADOR OFICIAL DA OVITRAMPA COM BADGE DE CARGA
    // -------------------------------------------------------------
    const trapIcon = L.divIcon({
      className: '',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="background:${corFoco};color:white;font-weight:900;font-size:11px;padding:4px 9px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.45);border:2px solid white;display:flex;align-items:center;gap:5px;">
            <span>🪤 ${alvo.id}</span>
            ${alvo.ovos > 0 ? `<span style="background:white;color:${corFoco};padding:1px 6px;border-radius:8px;font-size:11px;font-weight:900;">${alvo.ovos} ovos</span>` : ''}
          </div>
          <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${corFoco};"></div>
        </div>
      `,
      iconSize: [120, 38],
      iconAnchor: [60, 38]
    });

    L.marker([alvo.lat, alvo.lng], { icon: trapIcon })
      .bindPopup(`
        <div style="font-family:sans-serif;font-size:12px;line-height:1.4;">
          <div style="font-weight:900;font-size:13px;color:#0F172A;">${alvo.id} • ${alvo.morador}</div>
          <div style="color:#475569;margin-top:2px;">${alvo.endereco}</div>
          <div style="color:#DC2626;font-weight:bold;margin-top:4px;">🚨 Carga: ${alvo.ovos} ovos (${alvo.nivel})</div>
          <hr style="margin:6px 0;border:0;border-top:1px solid #E2E8F0;" />
          <div style="font-size:11px;color:#334155;">
            <b>🔴 Raio 100m:</b> Núcleo Focal de Varredura Imediata<br/>
            <b>🟠 Raio 200m:</b> Perímetro Oficial de Bloqueio (MS/SES-RJ)
          </div>
        </div>
      `)
      .addTo(markerLayerRef.current);

    // Animação suave para o alvo
    map.flyTo([alvo.lat, alvo.lng], 16.5, {
      duration: 0.9
    });
  }, [alvo]);

  // 4. Posição GPS do Agente de Campo (Live Tracking)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPos?.latitude || !userPos?.longitude) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userPos.latitude, userPos.longitude], {
        icon: youDotIcon('Você (ACE)')
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([userPos.latitude, userPos.longitude]);
    }
  }, [userPos]);

  // Centralizar no Alvo
  const handleCentralizarAlvo = () => {
    mapInstanceRef.current?.flyTo([alvo.lat, alvo.lng], 17);
  };

  // Centralizar no GPS do Agente
  const handleCentralizarGps = () => {
    if (userPos?.latitude && userPos?.longitude) {
      mapInstanceRef.current?.flyTo([userPos.latitude, userPos.longitude], 18);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* LEGENDA TÉCNICA OFICIAL DOS RAIOS (TOPO ESQUERDA) */}
      <div className="absolute top-16 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/90 shadow-md text-[11px] font-bold text-slate-800 space-y-1 pointer-events-none">
        <div className="flex items-center gap-1.5 text-slate-900 font-black text-[10px] uppercase tracking-wide">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          <span>Diretrizes Ministério da Saúde / SES-RJ</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0"></span>
          <span><b>Raio 100m:</b> Núcleo Focal Prioritário</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-700">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-amber-600 shrink-0"></span>
          <span><b>Raio 200m:</b> Bloqueio Perifocal Oficial</span>
        </div>
      </div>

      {/* BOTÕES FLUTUANTES DE CONTROLE DO MAPA (TOPO DIREITA) */}
      <div className="absolute top-16 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsSatellite(!isSatellite)}
          className={`p-2.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all active:scale-95 ${
            isSatellite
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-100'
          }`}
          title="Alternar Imagem de Satélite / Ruas"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleCentralizarAlvo}
          className="p-2.5 rounded-2xl shadow-lg border bg-white/95 text-red-600 border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
          title="Centralizar no Foco da Armadilha"
        >
          <MapPin className="w-4 h-4" />
        </button>

        {userPos && (
          <button
            type="button"
            onClick={handleCentralizarGps}
            className="p-2.5 rounded-2xl shadow-lg border bg-white/95 text-blue-600 border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
            title="Minha Posição GPS"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
