import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { ArrowLeft, Search, Flame, Layers, MapPin, Download } from 'lucide-react';
import { gerarPdfMapaCalor, gerarNevoeiroDaVisao } from '../../lib/pdfMapaCalor';
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
  nomePoligono,
  estimarOvosNoPonto,
  centroDoPoligono,
  mesclarCiclos
} from '../../lib/mapaPoligonos';
import { getAllPolygons } from '../../lib/geoDetection';

const TILE_CLARO = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri'
};

const TILE_SATELITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri'
};

const TERRITORIOS = [
  { id: 'todos', label: 'Todo o município' },
  { id: 'sede', label: 'Cidade (sede urbana)' },
  { id: 'influencia', label: 'Distrito de Influência' },
  { id: 'corrego_da_prata', label: 'Distrito de Córrego da Prata' },
  { id: 'porto_velho', label: 'Distrito de Porto Velho do Cunha' },
  { id: 'ilha_dos_pombos', label: 'Ilha dos Pombos' },
  { id: 'barra_sao_francisco', label: 'Barra de São Francisco' }
];

const RAIO_CALOR_METROS = 175;

function noTerritorio(arm, territorio) {
  if (territorio === 'todos') return true;
  const t = classificarTerritorio(arm).id;
  return t === territorio;
}

export function PainelMapaCalorInterativo({
  armadilhas = [],
  armadilhasBrutas = [],
  todasLeituras = [],
  onVoltar,
  fundoMapa: fundoProp,
  onMudarFundoMapa
}) {
  const [fundoInterno, setFundoInterno] = useState('satelite');
  const fundo = fundoProp ?? fundoInterno; // 'vetorial' (mapa claro) | 'satelite'
  const mudarFundo = onMudarFundoMapa || setFundoInterno;
  const tileRef = useRef(null);
  const [ciclo, setCiclo] = useState(CICLO_SEMANA_1);
  const [territorio, setTerritorio] = useState('sede');
  const [busca, setBusca] = useState('');
  const [verPoligonos, setVerPoligonos] = useState(false);
  const [verCalor, setVerCalor] = useState(false);
  const [verPontos, setVerPontos] = useState(true);
  const [verNevoeiro, setVerNevoeiro] = useState(true);
  const [verNumeros, setVerNumeros] = useState(true);
  const [zoomNevoeiro, setZoomNevoeiro] = useState(false); // nevoeiro liberado com zoom de cidade, mesmo no municipio
  const [zoomPerto, setZoomPerto] = useState(false); // rotulos so aparecem com zoom (evita poluir o mapa)
  const [selecionada, setSelecionada] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const mapaDivRef = useRef(null);
  const mapaRef = useRef(null);
  const camadasRef = useRef({ poligonos: null, calor: null, pontos: null });

  // Cada ciclo e calculado sozinho. Nunca somamos A + B.
  const porCiclo = useMemo(() => {
    const base = armadilhasBrutas && armadilhasBrutas.length > 0 ? armadilhasBrutas : armadilhas;
    return {
      A: adaptarArmadilhasParaCiclo(base, todasLeituras, CICLO_SEMANA_1),
      B: adaptarArmadilhasParaCiclo(base, todasLeituras, CICLO_SEMANA_2)
    };
  }, [armadilhas, armadilhasBrutas, todasLeituras]);

  const doTerrA = useMemo(() => porCiclo.A.filter((a) => noTerritorio(a, territorio)), [porCiclo, territorio]);
  const doTerrB = useMemo(() => porCiclo.B.filter((a) => noTerritorio(a, territorio)), [porCiclo, territorio]);
  const mA = useMemo(() => calcularMetricasCiclo(doTerrA), [doTerrA]);
  const mB = useMemo(() => calcularMetricasCiclo(doTerrB), [doTerrB]);

  // "Ambas" = Ciclo A e Ciclo B juntos: ovos das duas palhetas somados em cada armadilha.
  const doTerrAB = useMemo(() => mesclarCiclos(doTerrA, doTerrB), [doTerrA, doTerrB]);
  // O nevoeiro usa TODAS as armadilhas do ciclo (cidade e distritos), nao so as do local escolhido.
  const todasDoCiclo = useMemo(() => {
    if (ciclo === CICLO_SEMANA_1) return porCiclo.A;
    if (ciclo === CICLO_SEMANA_2) return porCiclo.B;
    return mesclarCiclos(porCiclo.A, porCiclo.B);
  }, [ciclo, porCiclo]);
  const mAB = useMemo(() => calcularMetricasCiclo(doTerrAB), [doTerrAB]);
  const doTerritorio = useMemo(() => {
    if (ciclo === CICLO_SEMANA_1) return doTerrA;
    if (ciclo === CICLO_SEMANA_2) return doTerrB;
    return doTerrAB;
  }, [ciclo, doTerrA, doTerrB, doTerrAB]);

  const ehAmbas = ciclo === 'ambas';

  // Ovos de A e de B de cada armadilha (rotulo do mapa).
  const rotuloOvos = useMemo(() => {
    const m = new Map();
    doTerrA.forEach((x) => m.set(String(x.numero), { a: temLeitura(x) ? Number(x.ultimosOvos) : null, b: null }));
    doTerrB.forEach((x) => {
      const atual = m.get(String(x.numero)) || { a: null, b: null };
      m.set(String(x.numero), { ...atual, b: temLeitura(x) ? Number(x.ultimosOvos) : null });
    });
    return m;
  }, [doTerrA, doTerrB]);
  const metricas = ciclo === CICLO_SEMANA_2 ? mB : mA;
  const parcialB = mB.totalLidas < mB.total;

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
    camadasRef.current = {
      poligonos: L.layerGroup().addTo(map),
      calor: L.layerGroup().addTo(map),
      pontos: L.layerGroup().addTo(map)
    };
    map.createPane('nevoeiro').style.zIndex = 350; // acima do fundo, abaixo de quarteiroes e pontos
    mapaRef.current = map;
    const tempo = setTimeout(() => {
      if (mapaRef.current === map) map.invalidateSize();
    }, 150);
    return () => {
      clearTimeout(tempo);
      map.remove();
      mapaRef.current = null;
    };
  }, []);

  // Fundo do mapa: claro ou satelite (tambem vale para os PDFs)
  useEffect(() => {
    const map = mapaRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const t = fundo === 'satelite' ? TILE_SATELITE : TILE_CLARO;
    tileRef.current = L.tileLayer(t.url, { maxZoom: 19, attribution: t.attribution }).addTo(map);
    tileRef.current.bringToBack();
  }, [fundo]);

  // Camada de nevoeiro: recalculada para o que esta na tela (zoom/arraste) e quando os numeros mudam.
  useEffect(() => {
    const map = mapaRef.current;
    if (!map) return undefined;
    const atualizar = () => {
      setZoomPerto(map.getZoom() >= 16);
      setZoomNevoeiro(map.getZoom() >= 9);
    };
    atualizar();
    map.on('zoomend', atualizar);
    return () => map.off('zoomend', atualizar);
  }, []);
  const nevoeiroLayerRef = useRef(null);
  const [visaoTick, setVisaoTick] = useState(0);
  const assinaturaDados = useMemo(
    () => `${ciclo}|` + todasDoCiclo.map((a) => `${a.numero}:${a.ultimosOvos ?? '-'}`).join(','),
    [ciclo, todasDoCiclo]
  );
  useEffect(() => {
    const map = mapaRef.current;
    if (!map) return undefined;
    let t;
    const aoMover = () => {
      clearTimeout(t);
      t = setTimeout(() => setVisaoTick((v) => v + 1), 250);
    };
    map.on('moveend', aoMover);
    return () => {
      clearTimeout(t);
      map.off('moveend', aoMover);
    };
  }, []);
  useEffect(() => {
    const map = mapaRef.current;
    if (!map) return;
    const anterior = nevoeiroLayerRef.current;
    if (!verNevoeiro || !zoomNevoeiro) {
      // mapa muito aberto: so os pontinhos; o nevoeiro aparece a partir do zoom de distrito/cidade
      if (anterior) map.removeLayer(anterior);
      nevoeiroLayerRef.current = null;
      return;
    }
    const b = map.getBounds().pad(0.15);
    const tam = map.getSize();
    if (!tam.x || !tam.y) return;
    const wpx = 480;
    const hpx = Math.max(1, Math.round((wpx * tam.y) / tam.x));
    const limites = { latMin: b.getSouth(), latMax: b.getNorth(), lngMin: b.getWest(), lngMax: b.getEast() };
    const url = gerarNevoeiroDaVisao(todasDoCiclo, limites, wpx, hpx);
    if (anterior) map.removeLayer(anterior);
    nevoeiroLayerRef.current = url
      ? L.imageOverlay(url, [[limites.latMin, limites.lngMin], [limites.latMax, limites.lngMax]], {
          opacity: 0.88,
          interactive: false,
          pane: 'nevoeiro'
        }).addTo(map)
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verNevoeiro, assinaturaDados, visaoTick, zoomNevoeiro]);

  // Desenha as camadas quando dados ou chaves mudam
  useEffect(() => {
    const map = mapaRef.current;
    const { poligonos, calor, pontos } = camadasRef.current;
    if (!map || !poligonos) return;
    poligonos.clearLayers();
    calor.clearLayers();
    pontos.clearLayers();

    const comArmadilha = new Set(grupos.map((g) => g.poly.id));

    if (verNevoeiro && !verPoligonos) {
      // contorno dos quarteiroes por cima do nevoeiro (como nos PDFs)
      getAllPolygons().forEach((p) => {
        if (p.territoryType === 'distrito') return;
        L.polygon(p.coordinates, {
          color: fundo === 'satelite' ? '#ffffff' : '#374151',
          weight: 0.9,
          opacity: 0.85,
          fillOpacity: 0,
          interactive: false
        }).addTo(poligonos);
      });
    }

    if (verPoligonos) {
      // contexto: quarteiroes sem armadilha, so contorno cinza
      // Quarteiroes SEM armadilha: cor estimada pela mescla das armadilhas proximas (mais clarinho = estimado)
      const lidasParaEstimar = doTerritorio.filter(temLeitura);
      getAllPolygons().forEach((p) => {
        if (p.territoryType === 'distrito' || comArmadilha.has(p.id)) return;
        const c = centroDoPoligono(p.coordinates);
        const est = c ? estimarOvosNoPonto(c[0], c[1], lidasParaEstimar) : null;
        if (!est) {
          L.polygon(p.coordinates, { color: '#94a3b8', weight: 0.6, fillOpacity: 0.03, interactive: false }).addTo(poligonos);
          return;
        }
        const f = faixaDeOvos(est.valor);
        L.polygon(p.coordinates, {
          color: f.cor,
          weight: 0.8,
          dashArray: '3 3',
          fillColor: f.cor,
          fillOpacity: 0.32
        })
          .bindTooltip(`${nomePoligono(p)}<br/>sem armadilha · estimado pelas armadilhas próximas ≈ ${Math.round(est.valor)} ovos`, { sticky: true })
          .addTo(poligonos);
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
          fillOpacity: 0.5,
          interactive: false
        }).addTo(calor);
      }
      if (verPontos || (verNevoeiro && !zoomNevoeiro)) {
        const marcador = L.circleMarker([lat, lng], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: faixa.cor,
          fillOpacity: 1
        }).addTo(pontos);
        const vA = rotuloOvos.get(String(a.numero));
        const txt = (v) => (v === null || v === undefined ? '-' : v);
        marcador.bindTooltip(
          `<b>${a.numero}</b> A ${txt(vA?.a)} · B ${txt(vA?.b)}`,
          verNumeros && zoomPerto
            ? { permanent: true, direction: 'bottom', offset: [0, 5], className: 'rotulo-ovo' }
            : { direction: 'top', className: 'rotulo-ovo' }
        );
        marcador.on('click', () => setSelecionada(a.id ?? a.numero));
      }
    });

  }, [grupos, doTerritorio, verPoligonos, verCalor, verPontos, verNumeros, zoomPerto, rotuloOvos, verNevoeiro, territorio, zoomNevoeiro, fundo]);

  // Enquadra o mapa so quando o territorio muda (ou na primeira vez que ha pontos).
  // Os dados recarregam sozinhos de tempos em tempos e isso NAO pode mexer no zoom do usuario.
  const ultimoEnquadramentoRef = useRef(null);
  useEffect(() => {
    const map = mapaRef.current;
    if (!map) return;
    const pts = doTerritorio
      .map((a) => [Number(a.latitude), Number(a.longitude)])
      .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));
    if (pts.length === 0) return;
    if (ultimoEnquadramentoRef.current === territorio) return;
    ultimoEnquadramentoRef.current = territorio;
    map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 16 });
  }, [territorio, doTerritorio]);

  const baixarPdf = async () => {
    try {
      setGerandoPdf(true);
      const territorioLabel = TERRITORIOS.find((t) => t.id === territorio)?.label || 'Todo o município';
      // Sempre os tres no mesmo arquivo: Ciclo A, Ciclo B e Ambas
      const AB = doTerrAB;
      await gerarPdfMapaCalor({
        secoes: [
          { armadilhas: doTerrA, grupos: agruparPorPoligono(doTerrA), metricas: mA, ciclo: 'A' },
          { armadilhas: doTerrB, grupos: agruparPorPoligono(doTerrB), metricas: mB, ciclo: 'B' },
          { armadilhas: AB, grupos: agruparPorPoligono(AB), metricas: mAB, ciclo: 'Ambas' }
        ],
        territorioLabel,
        fundo,
        estilo: 'nevoeiro', // todos os mapas dos PDFs em calor de nevoeiro (cidade e cada distrito)
        rotulos: rotuloOvos
      });
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar o PDF do mapa.');
    } finally {
      setGerandoPdf(false);
    }
  };

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
      cond ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-300'
    }`;

  const kpisDe = (m) => [
    { t: 'Lidas', v: `${m.totalLidas} de ${m.total}` },
    { t: 'Ovos', v: m.totalOvos },
    { t: 'IPO', v: `${m.ipo.toFixed(1).replace('.', ',')}%` },
    { t: 'IDO', v: m.ido.toFixed(1).replace('.', ',') },
    { t: 'Focos > 100', v: m.criticos }
  ];
  const linhasKpi = ehAmbas
    ? [{ rotulo: 'Ciclo A', k: kpisDe(mA) }, { rotulo: 'Ciclo B', k: kpisDe(mB) }, { rotulo: 'Ambas (A + B)', k: kpisDe(mAB) }]
    : [{ rotulo: null, k: kpisDe(metricas) }];
  const mostrarParcialB = (ciclo === CICLO_SEMANA_2 || ehAmbas) && parcialB;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 max-w-[1400px] mx-auto w-full">
      <style>{`.rotulo-ovo{background:rgba(255,255,255,.93);border:1px solid #111;border-radius:5px;padding:0 4px;font:600 10px/1.35 system-ui,sans-serif;color:#111;box-shadow:none}.rotulo-ovo:before{display:none}`}</style>
      <div className="flex flex-wrap items-center gap-2">
        {onVoltar && (
          <button onClick={onVoltar} className="p-2 rounded-lg border border-slate-200 bg-white" aria-label="Voltar">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="mr-auto">
          <h1 className="text-base sm:text-lg font-black text-black leading-tight">Mapa de calor por quarteirão</h1>
          <p className="text-[11px] text-slate-500">Uso interno · Ciclo A, Ciclo B e Ambas (A + B)</p>
        </div>
        <div className="flex gap-1">
          <button className={chave(ciclo === CICLO_SEMANA_1)} onClick={() => setCiclo(CICLO_SEMANA_1)}>Ciclo A</button>
          <button className={chave(ciclo === CICLO_SEMANA_2)} onClick={() => setCiclo(CICLO_SEMANA_2)}>Ciclo B</button>
          <button className={chave(ehAmbas)} onClick={() => setCiclo('ambas')}>Ambas</button>
        </div>
        <button
          onClick={baixarPdf}
          disabled={gerandoPdf}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-black bg-white text-black disabled:opacity-50 flex items-center gap-1"
        >
          <Download size={13} /> {gerandoPdf ? 'Gerando...' : 'Baixar PDF (A, B e Ambas)'}
        </button>
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

      {mostrarParcialB && (
        <div className="rounded-lg border border-black bg-white text-black text-xs font-semibold px-3 py-2">
          Ciclo B parcial: {mB.totalLidas} de {mB.total} palhetas já foram lidas. Os números do B mudam conforme o
          laboratório lança as demais.
        </div>
      )}

      {linhasKpi.map((linha) => (
        <div key={linha.rotulo || 'unico'} className="flex flex-col gap-1">
          {linha.rotulo && <div className="text-xs font-black text-black">{linha.rotulo}</div>}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {linha.k.map((k) => (
              <div key={k.t} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{k.t}</div>
                <div className="text-xl font-black text-black leading-tight">{k.v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {ehAmbas && (
        <div className="text-[11px] text-slate-600">
          Ambas soma os ovos de A e de B de cada armadilha; é positiva se foi positiva em A ou em B. O Ciclo B ainda é parcial, então Ambas muda conforme o laboratório lança as demais palhetas.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500 flex items-center gap-1"><Layers size={13} /> Camadas</span>
        <button className={chave(verPoligonos)} onClick={() => setVerPoligonos((v) => !v)}>Quarteirões</button>
        <button className={chave(verCalor)} onClick={() => setVerCalor((v) => !v)}><Flame size={12} className="inline -mt-0.5" /> Calor</button>
        <button className={chave(verPontos)} onClick={() => setVerPontos((v) => !v)}><MapPin size={12} className="inline -mt-0.5" /> Pontos</button>
        <button className={chave(verNevoeiro)} onClick={() => setVerNevoeiro((v) => !v)}>Nevoeiro</button>
        <button className={chave(verNumeros)} onClick={() => setVerNumeros((v) => !v)}>Números</button>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <button className={chave(fundo === 'vetorial')} onClick={() => mudarFundo('vetorial')}>Mapa</button>
        <button className={chave(fundo === 'satelite')} onClick={() => mudarFundo('satelite')}>Satélite</button>
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
        <div className="lg:col-span-3 rounded-xl overflow-hidden border border-slate-200 bg-white relative">
          {verNevoeiro && !zoomNevoeiro && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none bg-white/95 border border-black rounded-lg px-3 py-1 text-[11px] font-bold text-black text-center">
              Aproxime o zoom para ver o nevoeiro
            </div>
          )}
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
                  {ehAmbas ? (
                    <>
                      <th className="text-right px-2 py-1.5">Ovos A</th>
                      <th className="text-right px-2 py-1.5">Ovos B</th>
                      <th className="text-right px-2 py-1.5">A + B</th>
                    </>
                  ) : (
                    <th className="text-right px-2 py-1.5">Ovos</th>
                  )}
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
                      {ehAmbas ? (
                        <>
                          <td className="px-2 py-1.5 text-right font-bold">{a.ovosA ?? '-'}</td>
                          <td className="px-2 py-1.5 text-right font-bold">{a.ovosB ?? '-'}</td>
                          <td className="px-2 py-1.5 text-right font-black">{a.ovosAmbas ?? '-'}</td>
                        </>
                      ) : (
                        <td className="px-2 py-1.5 text-right font-bold">{temLeitura(a) ? a.ultimosOvos : '-'}</td>
                      )}
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
