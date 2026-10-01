import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import {
  ShieldCheck, AlertTriangle, MapPin, Search, ChevronRight,
  Info, CheckCircle2, ArrowLeft, RefreshCw, Layers, PhoneCall, Sparkles, Droplets, HeartPulse
} from 'lucide-react';
import { MAP_TILE_STANDARD, MAP_TILE_SATELLITE } from '../../maps/leafletIcons';
import { classificarTerritorio } from '../../lib/pdfRelatorioEntomologico';
import carmoBoundaryData from '../../maps/data/carmoBoundary.json';

// Coordenadas centrais oficiais dos bairros e distritos de Carmo
const CENTROIDES_BAIRROS = {
  'Progresso': [-21.9360, -42.6075],
  'Centro': [-21.9335, -42.6090],
  'Caixa d\'Água': [-21.9310, -42.6045],
  'Valparaíso': [-21.9395, -42.6050],
  'Botafogo': [-21.9370, -42.6140],
  'N. S. Fátima': [-21.9280, -42.6095],
  'Passo Fundo': [-21.9420, -42.6030],
  'Influência': [-21.9860, -42.5480],
  'Córrego da Prata': [-21.9950, -42.6680],
  'Porto Velho': [-21.8750, -42.5850],
  'Ilha dos Pombos': [-21.8450, -42.5950],
  'Barra de S. Francisco': [-21.9150, -42.5450]
};

const CORES_RISCO = {
  'Crítico': {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    hex: '#dc2626',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200'
  },
  'Alto': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    hex: '#ea580c',
    badge: 'bg-orange-50 text-orange-700 border border-orange-200'
  },
  'Médio': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hex: '#eab308',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200'
  },
  'Baixo': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    hex: '#16a34a',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  },
  'Sem Ovos': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    hex: '#2563eb',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200'
  }
};

export function PortalPublicoScreen({
  armadilhas = [],
  todasLeituras = [],
  onVoltar
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const heatLayerRef = useRef(null);

  const [provider, setProvider] = useState('satellite'); // 'satellite' ou 'streets'
  const [busca, setBusca] = useState('');
  const [bairroSelecionado, setBairroSelecionado] = useState(null);
  const [mostrarCalor, setMostrarCalor] = useState(true);

  // Agrega dados territoriais de forma 100% anonimizada (zero dados de moradores ou casas)
  const dadosBairros = useMemo(() => {
    const mapa = {};

    armadilhas.forEach((arm) => {
      const bNome = (arm.bairro || 'Centro').trim();
      if (!mapa[bNome]) {
        mapa[bNome] = {
          bairro: bNome,
          totalArmadilhas: 0,
          totalOvos: 0,
          positivas: 0,
          lidas: 0,
          centroide: CENTROIDES_BAIRROS[bNome] || [-21.9339, -42.6089],
          territorio: classificarTerritorio(arm).nome
        };
      }
      const b = mapa[bNome];
      b.totalArmadilhas += 1;

      // Leituras
      const ovos = arm.ultimosOvos ?? arm.ultimos_ovos;
      if (ovos !== null && ovos !== undefined) {
        b.lidas += 1;
        const nOvos = Number(ovos) || 0;
        b.totalOvos += nOvos;
        if (nOvos > 0) b.positivas += 1;
      }
    });

    return Object.values(mapa).map((item) => {
      const ipo = item.lidas > 0 ? (item.positivas / item.lidas) * 100 : 0;
      const ido = item.positivas > 0 ? item.totalOvos / item.positivas : 0;
      let risco = 'Baixo';
      if (item.totalOvos === 0 && item.lidas > 0) risco = 'Sem Ovos';
      else if (item.totalOvos > 100 || ipo > 60) risco = 'Crítico';
      else if (item.totalOvos > 50 || ipo > 40) risco = 'Alto';
      else if (item.totalOvos > 20 || ipo > 20) risco = 'Médio';

      let orientacao = 'Mantenha quintais limpos e sem água parada.';
      if (risco === 'Crítico') {
        orientacao = 'Atenção máxima! Elimine qualquer água parada acumulada e receba a equipe de saúde ambiental para ações focais.';
      } else if (risco === 'Alto') {
        orientacao = 'Risco elevado. Vistoria semanal rigorosa em calhas, pratinhos de plantas e vedação de caixas d\'água.';
      } else if (risco === 'Médio') {
        orientacao = 'Atenção preventiva. Vistoriar calhas, recipientes e ralos externos.';
      } else if (risco === 'Sem Ovos') {
        orientacao = 'Área com índice sob controle. Mantenha os cuidados preventivos contínuos.';
      }

      return {
        ...item,
        ipo: Number(ipo.toFixed(1)),
        ido: Number(ido.toFixed(1)),
        risco,
        orientacao
      };
    }).sort((a, b) => b.totalOvos - a.totalOvos);
  }, [armadilhas]);

  // Totais Municipais
  const totalOvosMunicipal = dadosBairros.reduce((acc, b) => acc + b.totalOvos, 0);
  const totalBairrosCriticos = dadosBairros.filter((b) => b.risco === 'Crítico').length;

  // Filtragem de bairros pela busca
  const bairrosFiltrados = useMemo(() => {
    if (!busca.trim()) return dadosBairros;
    const termo = busca.toLowerCase();
    return dadosBairros.filter((b) =>
      b.bairro.toLowerCase().includes(termo) ||
      b.territorio.toLowerCase().includes(termo) ||
      b.risco.toLowerCase().includes(termo)
    );
  }, [dadosBairros, busca]);

  // Pontos de calor reais e anonimizados
  const pontosCalorReais = useMemo(() => {
    const pontos = [];
    armadilhas.forEach((arm) => {
      const lat = Number(arm.latitude);
      const lng = Number(arm.longitude);
      const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? 0);
      if (!isNaN(lat) && !isNaN(lng)) {
        // Normalização de intensidade suave para o Leaflet Heat
        let intensidade = 0.2;
        if (ovos > 100) intensidade = 1.0;
        else if (ovos > 50) intensidade = 0.75;
        else if (ovos > 20) intensidade = 0.55;
        else if (ovos > 0) intensidade = 0.35;

        pontos.push([lat, lng, intensidade]);
      }
    });
    return pontos;
  }, [armadilhas]);

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-21.9339, -42.6089],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Camada base
      const tileConfig = provider === 'satellite' ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
      const baseTile = L.tileLayer(tileConfig.url, { maxZoom: 19 }).addTo(map);
      map.__baseTile = baseTile;

      // Limite Municipal de Carmo
      if (carmoBoundaryData) {
        L.geoJSON(carmoBoundaryData, {
          style: {
            color: '#10b981',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#10b981',
            fillOpacity: 0.03
          }
        }).addTo(map);
      }

      // Camada de Calor Leaflet Real (suave e elegante, sem sobreposição pesada)
      if (L.heatLayer && pontosCalorReais.length > 0) {
        const heat = L.heatLayer(pontosCalorReais, {
          radius: 35,
          blur: 25,
          maxZoom: 16,
          max: 1.0,
          gradient: {
            0.15: '#2563eb', // Azul
            0.35: '#10b981', // Verde
            0.55: '#f59e0b', // Amarelo
            0.75: '#ea580c', // Laranja
            1.00: '#dc2626'  // Vermelho
          }
        }).addTo(map);
        heatLayerRef.current = heat;
      }

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    } else {
      // Atualiza camada base
      const map = mapInstanceRef.current;
      if (map.__baseTile) {
        map.removeLayer(map.__baseTile);
      }
      const tileConfig = provider === 'satellite' ? MAP_TILE_SATELLITE : MAP_TILE_STANDARD;
      map.__baseTile = L.tileLayer(tileConfig.url, { maxZoom: 19 }).addTo(map);
    }
  }, [provider, pontosCalorReais]);

  // Alternador da camada de calor
  useEffect(() => {
    if (!mapInstanceRef.current || !heatLayerRef.current) return;
    if (mostrarCalor) {
      if (!mapInstanceRef.current.hasLayer(heatLayerRef.current)) {
        mapInstanceRef.current.addLayer(heatLayerRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(heatLayerRef.current)) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
      }
    }
  }, [mostrarCalor]);

  // Marcadores limpos e elegantes por bairro (pequenas pílulas brancas sem poluição)
  useEffect(() => {
    if (!layerGroupRef.current || !mapInstanceRef.current) return;
    const group = layerGroupRef.current;
    group.clearLayers();

    dadosBairros.forEach((b) => {
      const coords = b.centroide;
      const estilo = CORES_RISCO[b.risco] || CORES_RISCO['Baixo'];
      const isSelected = bairroSelecionado?.bairro === b.bairro;

      // Marcador minimalista (Pílula branca limpa com ponto colorido)
      const labelIcon = L.divIcon({
        className: '',
        html: `
          <div style="transform:translate(-50%, -50%); cursor:pointer;">
            <div style="
              background: #ffffff;
              border: 1.5px solid ${isSelected ? estilo.hex : '#cbd5e1'};
              color: #0f172a;
              font-family: system-ui, sans-serif;
              font-weight: 700;
              font-size: 11px;
              padding: 3px 9px;
              border-radius: 999px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.18);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 6px;
              transition: all 0.2s ease;
              ${isSelected ? `box-shadow: 0 0 0 3px ${estilo.hex}40;` : ''}
            ">
              <span style="width: 8px; height: 8px; border-radius: 999px; background: ${estilo.hex}; display: inline-block;"></span>
              <span>${b.bairro}</span>
              <span style="color: #64748b; font-size: 9.5px; font-weight: 600;">${b.totalOvos} ovos</span>
            </div>
          </div>
        `,
        iconSize: [0, 0]
      });

      const marker = L.marker(coords, { icon: labelIcon });

      const handleClick = () => {
        setBairroSelecionado(b);
        mapInstanceRef.current?.setView(coords, 14, { animate: true });
      };

      marker.on('click', handleClick);
      group.addLayer(marker);
    });
  }, [dadosBairros, bairroSelecionado]);

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] text-slate-800 overflow-hidden font-sans select-none">
      
      {/* 1. CABEÇALHO CLEAN, CLARO E INSTITUCIONAL */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          {onVoltar && (
            <button
              onClick={onVoltar}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="Voltar ao início"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  Vigilância Ambiental • Município de Carmo/RJ
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Transparência Pública
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Monitoramento Entomológico de Ovitrampas • Proteção Integral à Privacidade (LGPD)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Calor */}
          <button
            type="button"
            onClick={() => setMostrarCalor((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              mostrarCalor
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {mostrarCalor ? '🔥 Calor Ativo' : 'Ocultar Calor'}
          </button>

          {/* Alternador Satélite / Mapa */}
          <button
            type="button"
            onClick={() => setProvider((p) => (p === 'satellite' ? 'streets' : 'satellite'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>{provider === 'satellite' ? 'Satélite' : 'Mapa'}</span>
          </button>
        </div>
      </header>

      {/* 2. BARRA DE AVISO LEGAL LGPD (CLARA E SUTIL) */}
      <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-800 shrink-0">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Informações epidemiológicas agregadas por bairro para proteção integral da privacidade domiciliar dos moradores.</span>
        </div>
        <span className="hidden md:inline text-[10px] font-semibold text-emerald-700">Lei Federal nº 13.709/2018</span>
      </div>

      {/* 3. ÁREA PRINCIPAL: MAPA INTERATIVO + PAINEL LATERAL BRANCO */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        
        {/* MAPA INTERATIVO */}
        <div className="flex-1 relative h-1/2 md:h-full w-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* LEGENDA FLUTUANTE CLEAN */}
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 border border-slate-200 rounded-2xl p-2.5 shadow-md backdrop-blur-md max-w-xs text-[11px]">
            <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Escala Oficial de Risco (MS):
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span>Sem Ovos (0)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Baixo (1 a 20)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Médio (21 a 50)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>Alto (51 a 100)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700 col-span-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                <span>Crítico (&gt;100 ovos)</span>
              </div>
            </div>
          </div>
        </div>

        {/* PAINEL LATERAL CLEAN & CLARO */}
        <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-1/2 md:h-full z-10 shadow-xs">
          
          {/* BUSCA RÁPIDA DE BAIRRO */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/60 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Consulte a situação do seu bairro..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* DETALHE DO BAIRRO OU LISTA */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {bairroSelecionado ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{bairroSelecionado.bairro}</h2>
                    <p className="text-xs text-slate-500">{bairroSelecionado.territorio}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${CORES_RISCO[bairroSelecionado.risco]?.badge || 'bg-slate-100 text-slate-700'}`}>
                    {bairroSelecionado.risco}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Total de Ovos</p>
                    <p className="text-lg font-bold text-slate-900">{bairroSelecionado.totalOvos}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Positividade</p>
                    <p className="text-lg font-bold text-emerald-600">{bairroSelecionado.ipo}%</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Orientação Sanitária aos Moradores:
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{bairroSelecionado.orientacao}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setBairroSelecionado(null)}
                  className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
                >
                  Voltar para a lista completa
                </button>
              </div>
            ) : (
              bairrosFiltrados.map((b) => {
                const estilo = CORES_RISCO[b.risco] || CORES_RISCO['Baixo'];
                return (
                  <div
                    key={b.bairro}
                    onClick={() => {
                      setBairroSelecionado(b);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView(b.centroide, 15, { animate: true });
                      }
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-3 cursor-pointer transition-all flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: estilo.hex }} />
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{b.bairro}</h3>
                        <p className="text-[10px] text-slate-500">{b.totalArmadilhas} armadilhas • {b.totalOvos} ovos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${estilo.badge}`}>
                        {b.risco}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}

            {/* CHECKLIST DE PREVENÇÃO POPULAR */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2 mt-4">
              <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                10 Minutos Semanais Contra o Mosquito
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-1.5">
                <li>• Mantenha calhas limpas e sem folhas acumuladas.</li>
                <li>• Coloque areia até a borda nos pratinhos de plantas.</li>
                <li>• Verifique se a caixa d'água está devidamente vedada.</li>
                <li>• Guarde garrafas e recipientes sempre de cabeça para baixo.</li>
              </ul>
            </div>

            {/* RODAPÉ DO PAINEL */}
            <div className="p-3 text-center text-[10px] text-slate-400">
              <p>Prefeitura Municipal de Carmo — Secretaria Municipal de Saúde</p>
              <p>Vigilância Ambiental em Saúde • Protegendo nossa cidade</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
