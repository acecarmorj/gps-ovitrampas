import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE, youDotIcon } from '../../maps/leafletIcons';
import { Layers, Crosshair, MapPin, Globe, ShieldAlert } from 'lucide-react';
import trapsOficiaisJson from '../../lib/trapsOficiaisCarmo.json';

export function MapaVistoriaAcao({ alvo, todasArmadilhas, userPos, onSelecionarAlvo }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const circleLayerRef = useRef(null);
  const targetMarkerLayerRef = useRef(null);
  const allTrapsLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [isSatellite, setIsSatellite] = useState(true);

  // Lista consolidada de todas as 56 armadilhas oficiais
  const listaArmadilhas = (todasArmadilhas && todasArmadilhas.length > 0)
    ? todasArmadilhas
    : trapsOficiaisJson;

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

    // Layer de Tiles (Padrão ou Satélite ESRI)
    tileLayerRef.current = L.tileLayer(MAP_TILE_SATELLITE.url, {
      maxZoom: MAP_TILE_SATELLITE.maxZoom,
      attribution: MAP_TILE_SATELLITE.attribution
    }).addTo(map);

    // Grupos de camadas
    circleLayerRef.current = L.layerGroup().addTo(map);
    allTrapsLayerRef.current = L.layerGroup().addTo(map);
    targetMarkerLayerRef.current = L.layerGroup().addTo(map);

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

  // 3. RENDERIZA TODAS AS 56 ARMADILHAS DE CARMO NO MAPA
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !allTrapsLayerRef.current) return;

    allTrapsLayerRef.current.clearLayers();

    listaArmadilhas.forEach((arm) => {
      const lat = arm.latitude || arm.lat;
      const lng = arm.longitude || arm.lng;
      if (!lat || !lng) return;

      const numStr = String(arm.numero || '').replace(/^OV[-_ ]*/i, '').padStart(2, '0');
      const codOv = `OV-${numStr}`;
      const isAlvoAtivo = alvo && (alvo.id === codOv || alvo.id === arm.id || alvo.id === arm.numero);

      // O alvo ativo é renderizado separadamente na camada de destaque
      if (isAlvoAtivo) return;

      const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? arm.ovos ?? 0);
      let corFundo = '#10B981'; // Verde (0 ovos)
      let corTexto = '#FFFFFF';

      if (ovos >= 200) {
        corFundo = '#DC2626'; // Vermelho crítico
      } else if (ovos >= 100) {
        corFundo = '#D97706'; // Âmbar alerta
      } else if (ovos > 0) {
        corFundo = '#F59E0B'; // Amarelo moderado
      }

      const iconPin = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="background:${corFundo};color:${corTexto};font-weight:900;font-size:10px;padding:2px 5px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.5);border:1.5px solid white;display:flex;align-items:center;gap:2px;white-space:nowrap;">
              <span>${codOv}</span>
              ${ovos > 0 ? `<span style="font-size:9px;opacity:0.9;">(${ovos})</span>` : ''}
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid ${corFundo};"></div>
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 26]
      });

      const morador = arm.moradorNome || arm.morador_nome || arm.morador || 'Monitorado';
      const rua = arm.rua || arm.logradouro || arm.endereco || '';
      const bairro = arm.bairro || arm.microarea || 'Carmo';
      const quart = arm.quarteirao || '';

      const marker = L.marker([lat, lng], { icon: iconPin });
      marker.bindPopup(`
        <div style="font-family:sans-serif;font-size:11.5px;line-height:1.35;min-width:180px;">
          <div style="font-weight:900;font-size:12.5px;color:#0F172A;display:flex;align-items:center;justify-content:space-between;">
            <span>🪤 ${codOv}</span>
            <span style="background:${corFundo};color:white;padding:1px 6px;border-radius:6px;font-size:10px;">${ovos} ovos</span>
          </div>
          <div style="font-weight:bold;color:#1E293B;margin-top:2px;">${morador}</div>
          <div style="color:#64748B;font-size:10.5px;">${rua}</div>
          <div style="color:#64748B;font-size:10px;margin-top:2px;">${bairro} • Quarteirão <b>${quart}</b></div>
        </div>
      `);

      marker.addTo(allTrapsLayerRef.current);
    });
  }, [listaArmadilhas, alvo]);

  // 4. ATUALIZA O ALVO ATIVO (COM O RAIO DE 100M E 200M)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !circleLayerRef.current || !targetMarkerLayerRef.current || !alvo) return;

    circleLayerRef.current.clearLayers();
    targetMarkerLayerRef.current.clearLayers();

    // -------------------------------------------------------------
    // CÍRCULO EXTERNO: RAIO DE 200 METROS (DIRETRIZ MINISTÉRIO DA SAÚDE)
    // Perímetro Ampliado de Bloqueio Perifocal (9 Quarteirões)
    // -------------------------------------------------------------
    const circle200m = L.circle([alvo.lat, alvo.lng], {
      radius: 200,
      color: '#D97706',
      fillColor: '#F59E0B',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '8, 8'
    });

    circle200m.bindTooltip(
      `<b>Perímetro Oficial MS (Raio 200m):</b><br/>Bloqueio perifocal de até 9 quarteirões`,
      { permanent: false, direction: 'top' }
    );
    circle200m.addTo(circleLayerRef.current);

    // -------------------------------------------------------------
    // CÍRCULO INTERNO: RAIO DE 100 METROS (NÚCLEO FOCAL PRIORITÁRIO)
    // Área de dispersão biológica direta e eliminação de criadouros
    // -------------------------------------------------------------
    const corFoco = alvo.ovos >= 200 ? '#DC2626' : '#E11D48';
    const fillFoco = alvo.ovos >= 200 ? '#EF4444' : '#F43F5E';

    const circle100m = L.circle([alvo.lat, alvo.lng], {
      radius: 100,
      color: corFoco,
      fillColor: fillFoco,
      fillOpacity: 0.26,
      weight: 3,
      dashArray: '5, 5'
    });

    circle100m.bindTooltip(
      `<b>Núcleo Focal (Raio 100m):</b><br/>Eliminação de 100% dos depósitos lindeiros`,
      { permanent: false, direction: 'top' }
    );
    circle100m.addTo(circleLayerRef.current);

    // -------------------------------------------------------------
    // MARCADOR DO ALVO ATIVO COM DESTAQUE E BADGE GRANDE
    // -------------------------------------------------------------
    const trapIcon = L.divIcon({
      className: '',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;animation:bounce 1.5s infinite;">
          <div style="background:${corFoco};color:white;font-weight:900;font-size:12px;padding:4px 10px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,0.6);border:2.5px solid white;display:flex;align-items:center;gap:5px;white-space:nowrap;">
            <span>🪤 ${alvo.id}</span>
            ${alvo.ovos > 0 ? `<span style="background:white;color:${corFoco};padding:1px 6px;border-radius:8px;font-size:11px;font-weight:900;">${alvo.ovos} ovos</span>` : ''}
          </div>
          <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ${corFoco};"></div>
        </div>
      `,
      iconSize: [130, 42],
      iconAnchor: [65, 42]
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
      .addTo(targetMarkerLayerRef.current);

    // Centraliza no alvo atual
    map.flyTo([alvo.lat, alvo.lng], 16.5, {
      duration: 0.8
    });
  }, [alvo]);

  // 5. POSIÇÃO GPS DO AGENTE EM CAMPO (LIVE TRACKING)
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

  // Centralizar no Alvo Ativo
  const handleCentralizarAlvo = () => {
    mapInstanceRef.current?.flyTo([alvo.lat, alvo.lng], 17);
  };

  // Ver Todas as 56 Armadilhas no Município
  const handleVerTodasArmadilhas = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(
      listaArmadilhas
        .filter((a) => (a.latitude || a.lat) && (a.longitude || a.lng))
        .map((a) => [a.latitude || a.lat, a.longitude || a.lng])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
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
        <div className="flex items-center gap-1.5 text-slate-600 pt-0.5 border-t border-slate-100 text-[10px]">
          <span>📍 56 Armadilhas Mapeadas em Carmo</span>
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
          title="Centralizar no Ponto da Vistoria Atual"
        >
          <MapPin className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleVerTodasArmadilhas}
          className="p-2.5 rounded-2xl shadow-lg border bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
          title="Ver Todas as 56 Armadilhas no Município"
        >
          <Globe className="w-4 h-4" />
        </button>

        {userPos && (
          <button
            type="button"
            onClick={handleCentralizarGps}
            className="p-2.5 rounded-2xl shadow-lg border bg-white/95 text-blue-600 border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
            title="Minha Posição GPS em Tempo Real"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
