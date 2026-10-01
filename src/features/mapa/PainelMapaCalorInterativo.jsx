import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { ArrowLeft, Search, Flame, Layers, MapPin } from 'lucide-react';
import { classificarTerritorio } from '../../lib/pdfRelatorioEntomologico';
import {
  adaptarArmadilhasParaCiclo,
  calcularMetricasCiclo,
  CICLO_SEMANA_1,
  CICLO_SEMANA_2
} from '../../lib/ciclosOvitrampas';
import {
  FAIXAS_RISCO,
  faixaDeOvos,
  temLeitura,
  agruparPorPoligono,
  nomePoligono
} from '../../lib/mapaPoligonos';
import { getAllPolygons } from '../../lib/geoDetection';

const TILE_CLARO = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri'
};

const TERRITORIOS = [
  { id: 'todos', label: 'Todo o município' },
  { id: 'sede', label: 'Sede urbana' },
  { id: 'influencia', label: 'Influência' },
  { id: 'corrego_da_prata', label: 'Córrego da Prata' },
  { id: 'porto_velho', label: 'Porto Velho do Cunha' },
  { id: 'ilhadospombos_barra', label: 'Ilha dos Pombos e Barra' }
];

const RAIO_CALOR_METROS = 175;

function noTerritorio(arm, territorio) {
  if (territorio === 'todos') return true;
  const t = classificarTerritorio(arm).id;
  if (territorio === 'ilhadospombos_barra') return t === 'ilha_dos_pombos' || t === 'barra_sao_francisco';
  return t === territorio;
}

export function PainelMapaCalorInterativo({
  armadilhas = [],
  armadilhasBrutas = [],
  todasLeituras = [],
  onVoltar
}) {
  const [ciclo, setCiclo] = useState(CICLO_SEMANA_1);
  const [territorio, setTerritorio] = useState('todos');
  const [busca, setBusca] = useState('');
  const [verPoligonos, setVerPoligonos] = useState(true);
  const [verCalor, setVerCalor] = useState(true);
  const [verPontos, setVerPontos] = useState(true);
  const [selecionada, setSelecionada] = useState(null);

  const mapaDivRef = useRef(null);
  const mapaRef = useRef(null);
  const camadasRef = useRef({ poligonos: null, calor: null, pontos: null });

  // Cada ciclo e calculado sozinho. Nunca somamos A + B.
  const adaptadas = useMemo(() => {
    const base = armadilhasBrutas && armadilhasBrutas.length > 0 ? armadilhasBrutas : armadilhas;
    return adaptarArmadilhasParaCiclo(base, todasLeituras, ciclo);
  }, [armadilhas, armadilhasBrutas, todasLeituras, ciclo]);

  const doTerritorio = useMemo(
    () => adaptadas.filter((a) => noTerritorio(a, territorio)),
    [adaptadas, territorio]
  );

  const metricas = useMemo(() => calcularMetricasCiclo(doTerritorio), [doTerritorio]);
  const parcial = metricas.totalLidas < metricas.total;

  const grupos = useMemo(() => agruparPorPoligono(doTerritorio), [doTerritorio]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return doTerritorio
      .filter((a) => {
        if (!termo) return true;
        return `ov-${a.numero} ${a.bairro || ''} ${a.microarea || ''} ${a.quarteirao || ''}`.toLowerCase().includes(termo);
      })
      .sort((a, b) => Number(b.ultimosOvos ?? -1) - Number(a.ultimosOvos ?? -1));
  }, [doTerritorio, busca]);

  // Mapa (criado uma vez)
  useEffect(() => {
    if (!mapaDivRef.current || mapaRef.current) return;
    const map = L.map(mapaDivRef.current, { center: [-21.9339, -42.6089], zoom: 13, zoomControl: true });
    L.tileLayer(TILE_CLARO.url, { maxZoom: 19, attribution: TILE_CLARO.attribution }).addTo(map);
    camadasRef.current = {
      poligonos: L.layerGroup().addTo(map),
      calor: L.layerGroup().addTo(map),
      pontos: L.layerGroup().addTo(map)
    };
    mapaRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
    return () => {
      map.remove();
      mapaRef.current = null;
    };
  }, []);

  // Desenha as camadas quando dados ou chaves mudam
  useEffect(() => {
    const map = mapaRef.current;
    const { poligonos, calor, pontos } = camadasRef.current;
    if (!map || !poligonos) return;
    poligonos.clearLayers();
    calor.clearLayers();
    pontos.clearLayers();

    const comArmadilha = new Set(grupos.map((g) => g.poly.id));

    if (verPoligonos) {
      // contexto: quarteiroes sem armadilha, so contorno cinza
      getAllPolygons().forEach((p) => {
        if (p.territoryType === 'distrito' || comArmadilha.has(p.id)) return;
        L.polygon(p.coordinates, { color: '#94a3b8', weight: 0.6, fillOpacity: 0.03, interactive: false }).addTo(poligonos);
      });
      // distritos primeiro (por baixo), depois quarteiroes
      const ordenados = [...grupos].sort(
        (a, b) => (b.poly.territoryType === 'distrito') - (a.poly.territoryType === 'distrito')
      );
      ordenados.forEach((g) => {
        const faixa = faixaDeOvos(g.maxOvos);
        const distrito = g.poly.territoryType === 'distrito';
        const poly = L.polygon(g.poly.coordinates, {
          color: faixa.cor,
          weight: distrito ? 1.5 : 1.2,
          fillColor: faixa.cor,
          fillOpacity: distrito ? 0.22 : 0.55
        }).addTo(poligonos);
        poly.bindTooltip(
          `${nomePoligono(g.poly)}<br/>${g.lidas} de ${g.armadilhas.length} lida(s) · ${g.ovos} ovos`,
          { sticky: true }
        );
      });
    }

    doTerritorio.forEach((a) => {
      const lat = Number(a.latitude);
      const lng = Number(a.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const faixa = faixaDeOvos(a.ultimosOvos);
      if (verCalor && temLeitura(a) && Number(a.ultimosOvos) > 0) {
        L.circle([lat, lng], {
          radius: RAIO_CALOR_METROS,
          stroke: false,
          fillColor: faixa.cor,
          fillOpacity: 0.28,
          interactive: false
        }).addTo(calor);
      }
      if (verPontos) {
        const marcador = L.circleMarker([lat, lng], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: faixa.cor,
          fillOpacity: 1
        }).addTo(pontos);
        marcador.bindTooltip(
          `OV-${a.numero} · ${temLeitura(a) ? a.ultimosOvos + ' ovos' : 'sem leitura'}`,
          { direction: 'top' }
        );
        marcador.on('click', () => setSelecionada(a.id ?? a.numero));
      }
    });

    const pts = doTerritorio
      .map((a) => [Number(a.latitude), Number(a.longitude)])
      .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 16 });
  }, [grupos, doTerritorio, verPoligonos, verCalor, verPontos]);

  const irPara = (a) => {
    setSelecionada(a.id ?? a.numero);
    const lat = Number(a.latitude);
    const lng = Number(a.longitude);
    if (mapaRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
      mapaRef.current.flyTo([lat, lng], 17, { duration: 0.6 });
    }
  };

  const chave = (cond) =>
    `px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
      cond ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
    }`;

  const kpi = [
    { t: 'Lidas', v: `${metricas.totalLidas} de ${metricas.total}` },
    { t: 'Ovos', v: metricas.totalOvos },
    { t: 'IPO', v: `${metricas.ipo.toFixed(1).replace('.', ',')}%` },
    { t: 'IDO', v: metricas.ido.toFixed(1).replace('.', ',') },
    { t: 'Críticos (>100)', v: metricas.criticos }
  ];
  const c = metricas.comparativo;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-wrap items-center gap-2">
        {onVoltar && (
          <button onClick={onVoltar} className="p-2 rounded-lg border border-slate-200 bg-white" aria-label="Voltar">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="mr-auto">
          <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Mapa de calor por quarteirão</h1>
          <p className="text-[11px] text-slate-500">Uso interno · um ciclo por vez, nunca somados</p>
        </div>
        <div className="flex gap-1">
          <button className={chave(ciclo === CICLO_SEMANA_1)} onClick={() => setCiclo(CICLO_SEMANA_1)}>Ciclo A</button>
          <button className={chave(ciclo === CICLO_SEMANA_2)} onClick={() => setCiclo(CICLO_SEMANA_2)}>Ciclo B</button>
        </div>
        <select
          value={territorio}
          onChange={(e) => setTerritorio(e.target.value)}
          className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
        >
          {TERRITORIOS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {parcial && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold px-3 py-2">
          Parcial: {metricas.totalLidas} de {metricas.total} palhetas do Ciclo {ciclo} já foram lidas. Os números mudam
          conforme o laboratório lança as demais.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {kpi.map((k) => (
          <div key={k.t} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{k.t}</div>
            <div className="text-xl font-black text-slate-900 leading-tight">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-slate-600 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
        Comparação (sem somar): <b>Ciclo A</b> {c.ovosA} ovos, {c.lidasA} lidas, IPO {c.ipoA.toFixed(1).replace('.', ',')}%
        &nbsp;·&nbsp; <b>Ciclo B</b> {c.ovosB} ovos, {c.lidasB} lidas, IPO {c.ipoB.toFixed(1).replace('.', ',')}% (parcial se menos de {metricas.total}).
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500 flex items-center gap-1"><Layers size={13} /> Camadas</span>
        <button className={chave(verPoligonos)} onClick={() => setVerPoligonos((v) => !v)}>Quarteirões</button>
        <button className={chave(verCalor)} onClick={() => setVerCalor((v) => !v)}><Flame size={12} className="inline -mt-0.5" /> Calor</button>
        <button className={chave(verPontos)} onClick={() => setVerPontos((v) => !v)}><MapPin size={12} className="inline -mt-0.5" /> Pontos</button>
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          {FAIXAS_RISCO.map((f) => (
            <span key={f.id} className="flex items-center gap-1 text-[11px] text-slate-600">
              <i className="inline-block w-3 h-3 rounded-sm" style={{ background: f.cor }} />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 rounded-xl overflow-hidden border border-slate-200 bg-white">
          <div ref={mapaDivRef} className="w-full" style={{ height: "clamp(380px, 70vh, 640px)" }} />
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white flex flex-col max-h-[420px] lg:max-h-[620px]">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar OV, bairro ou quarteirão"
              className="flex-1 text-xs outline-none"
            />
            <span className="text-[11px] text-slate-400">{linhas.length}</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500 text-[10px] uppercase">
                <tr>
                  <th className="text-left px-2 py-1.5">OV</th>
                  <th className="text-left px-2 py-1.5">Local</th>
                  <th className="text-right px-2 py-1.5">Ovos</th>
                  <th className="text-left px-2 py-1.5">Faixa</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((a) => {
                  const f = faixaDeOvos(a.ultimosOvos);
                  const ativa = selecionada === (a.id ?? a.numero);
                  return (
                    <tr
                      key={a.id ?? a.numero}
                      onClick={() => irPara(a)}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${ativa ? 'bg-sky-50' : ''}`}
                    >
                      <td className="px-2 py-1.5 font-bold">OV-{a.numero}</td>
                      <td className="px-2 py-1.5 text-slate-600">
                        {a.bairro || a.microarea || '-'}
                        {a.quarteirao && !/distrito/i.test(a.quarteirao) ? ` · ${a.quarteirao}` : ''}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold">{temLeitura(a) ? a.ultimosOvos : '-'}</td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: f.cor }} />
                          {f.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
