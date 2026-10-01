/**
 * PDF do mapa de calor por quarteirao (A4 paisagem). Preto no branco; cor so no mapa e nas faixas de risco.
 * Mapa desenhado em vetor (sem imagem de satelite): nitido na impressora, sem depender de internet.
 * Um ciclo por vez; nunca soma A + B.
 */
import { faixaDeOvos, FAIXAS_RISCO, temLeitura, agruparPorPoligono } from './mapaPoligonos';
import { getAllPolygons } from './geoDetection';
import { classificarTerritorio } from './pdfRelatorioEntomologico';
import { mercN, invMercN, gerarFundoSatelite } from './fundoSatelite';
import { carregarTimbresOficiais, PROPORCAO_BRASAO_CARMO } from './timbresOficiais';

const W = 297;
const H = 210;
const M = 12;
const PRETO = [17, 17, 17];
const CINZA = [90, 90, 90];
const LINHA = [200, 200, 200];

function fmt(n, casas = 1) {
  return Number(n).toFixed(casas).replace('.', ',');
}

/** Caixa lat/lng dos pontos, com folga, ampliada para ter a mesma proporcao da moldura (em Mercator). */
export function caixaDoMapa(subset, mw, mh, padFrac = 0.12) {
  const pts = subset
    .map((a) => [Number(a.latitude), Number(a.longitude)])
    .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));
  if (pts.length === 0) return null;
  let latMin = Math.min(...pts.map((p) => p[0]));
  let latMax = Math.max(...pts.map((p) => p[0]));
  let lngMin = Math.min(...pts.map((p) => p[1]));
  let lngMax = Math.max(...pts.map((p) => p[1]));
  const padLat = Math.max((latMax - latMin) * padFrac, 0.002);
  const padLng = Math.max((lngMax - lngMin) * padFrac, 0.002);
  latMin -= padLat;
  latMax += padLat;
  lngMin -= padLng;
  lngMax += padLng;

  let spanX = (lngMax - lngMin) / 360;
  let spanY = mercN(latMin) - mercN(latMax);
  const alvo = mw / mh;
  if (spanX / spanY < alvo) {
    const novoX = spanY * alvo;
    const extra = ((novoX - spanX) / 2) * 360;
    lngMin -= extra;
    lngMax += extra;
    spanX = novoX;
  } else {
    const novoY = spanX / alvo;
    const meio = (mercN(latMin) + mercN(latMax)) / 2;
    latMax = invMercN(meio - novoY / 2);
    latMin = invMercN(meio + novoY / 2);
    spanY = novoY;
  }
  return { latMin, latMax, lngMin, lngMax, spanX, spanY };
}

/** Prepara o fundo de satelite de um mapa (assincrono). Retorna data URL ou null. */
export async function fundoSateliteDoMapa(subset, mw, mh) {
  const caixa = caixaDoMapa(subset, mw, mh);
  if (!caixa) return null;
  return gerarFundoSatelite(caixa, Math.min(1400, Math.round(mw * 7))); // ~180 dpi na impressao
}


// ---------- mapa de calor em "nevoeiro" (superficie suave interpolada) ----------
const PARADAS_COR = [
  [0, [37, 99, 235]],
  [1, [22, 163, 74]],
  [10, [22, 163, 74]],
  [21, [234, 179, 8]],
  [35, [234, 179, 8]],
  [51, [249, 115, 22]],
  [75, [249, 115, 22]],
  [101, [220, 38, 38]],
  [140, [220, 38, 38]]
];

function corDaIntensidade(v) {
  if (v <= PARADAS_COR[0][0]) return PARADAS_COR[0][1];
  for (let i = 1; i < PARADAS_COR.length; i++) {
    const [v1, c1] = PARADAS_COR[i];
    if (v <= v1) {
      const [v0, c0] = PARADAS_COR[i - 1];
      const t = (v - v0) / (v1 - v0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return PARADAS_COR[PARADAS_COR.length - 1][1];
}

/**
 * Gera a imagem (PNG com transparencia) do mapa de calor em nevoeiro.
 * Cada pixel recebe a media ponderada dos ovos das armadilhas proximas (nucleo gaussiano, ~175 m),
 * pintada na escala oficial de 5 cores; fora do alcance das armadilhas a imagem some (halo suave).
 */
export function gerarNevoeiroDoMapa(subset, mw, mh, padFrac = 0.12, retornarCaixa = false) {
  const cx = caixaDoMapa(subset, mw, mh, padFrac);
  if (!cx) return null;
  const trs = subset
    .filter(temLeitura)
    .map((a) => ({ lat: Number(a.latitude), lng: Number(a.longitude), v: Number(a.ultimosOvos) }))
    .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng) && Number.isFinite(t.v));
  if (trs.length === 0) return null;

  const wpx = Math.max(300, Math.round(mw * 2.6));
  const hpx = Math.max(1, Math.round((wpx * mh) / mw));
  const canvas = document.createElement('canvas');
  canvas.width = wpx;
  canvas.height = hpx;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(wpx, hpx);
  // Alcance do calor: ~140 m em escala de bairro; cresce com a area para o municipio inteiro continuar visivel.
  const larguraM = (cx.lngMax - cx.lngMin) * 111320 * Math.cos(((cx.latMin + cx.latMax) / 2) * (Math.PI / 180));
  const sigma = Math.max(140, larguraM / 45);
  const inv2s2 = 1 / (2 * sigma * sigma);
  const topo = mercN(cx.latMax);

  for (let y = 0; y < hpx; y++) {
    const lat = invMercN(topo + ((y + 0.5) / hpx) * cx.spanY);
    const mLat = 110540;
    const mLng = 111320 * Math.cos((lat * Math.PI) / 180);
    for (let x = 0; x < wpx; x++) {
      const lng = cx.lngMin + ((x + 0.5) / wpx) * (cx.lngMax - cx.lngMin);
      let somaK = 0;
      let somaKV = 0;
      for (let i = 0; i < trs.length; i++) {
        const dx = (lng - trs[i].lng) * mLng;
        const dy = (lat - trs[i].lat) * mLat;
        const k = Math.exp(-(dx * dx + dy * dy) * inv2s2);
        somaK += k;
        somaKV += k * trs[i].v;
      }
      if (somaK < 0.004) continue;
      const [r, g, b] = corDaIntensidade(somaKV / somaK);
      const o = (y * wpx + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = Math.round(Math.min(1, somaK * 1.4) * 0.8 * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  return retornarCaixa ? { url, caixa: cx } : url;
}

export function desenharMapaELegenda(doc, subset, gruposSub, my, mh, opts = {}) {
  // ---------- mapa vetorial ----------
  const mx = opts.x ?? M;
  const mw = opts.w ?? 200;

  const pts = subset
    .map((a) => [Number(a.latitude), Number(a.longitude)])
    .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));

  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.3);
  doc.rect(mx, my, mw, mh);

  if (pts.length > 0) {
    const cx = caixaDoMapa(subset, mw, mh);
    const esc = mw / cx.spanX; // mm por unidade Mercator
    const px = (lng) => mx + ((lng - cx.lngMin) / 360) * esc;
    const py = (lat) => my + (mercN(lat) - mercN(cx.latMax)) * esc;
    const latMeio = ((cx.latMin + cx.latMax) / 2) * (Math.PI / 180);
    const raioCalorMm = (175 / (40075016 * Math.cos(latMeio))) * esc; // 175 m em mm

    doc.saveGraphicsState();
    doc.rect(mx, my, mw, mh, null);
    doc.clip();
    doc.discardPath();

    const comFundo = Boolean(opts.fundo);
    if (comFundo) {
      try {
        doc.addImage(opts.fundo, 'JPEG', mx, my, mw, mh);
      } catch (_) {
        /* segue sem fundo */
      }
    }

    const modoNevoeiro = opts.modo === 'nevoeiro';
    if (modoNevoeiro && opts.nevoeiroImg) {
      try {
        doc.addImage(opts.nevoeiroImg, 'PNG', mx, my, mw, mh);
      } catch (_) {
        /* segue sem nevoeiro */
      }
    }

    const desenhaPoligono = (coords, preenchimento, borda, opacidade, espessura) => {
      if (!coords || coords.length < 3) return;
      const p0 = [px(coords[0][1]), py(coords[0][0])];
      const segs = [];
      let ant = p0;
      for (let i = 1; i < coords.length; i++) {
        const cur = [px(coords[i][1]), py(coords[i][0])];
        segs.push([cur[0] - ant[0], cur[1] - ant[1]]);
        ant = cur;
      }
      doc.setGState(new doc.GState({ opacity: opacidade, 'stroke-opacity': 1 }));
      doc.setLineWidth(espessura);
      if (preenchimento) doc.setFillColor(preenchimento);
      doc.setDrawColor(borda);
      doc.lines(segs, p0[0], p0[1], [1, 1], preenchimento ? 'FD' : 'S', true);
    };

    const comArmadilha = new Set(gruposSub.map((g) => g.poly.id));
    getAllPolygons().forEach((p) => {
      if (p.territoryType === 'distrito' || comArmadilha.has(p.id)) return;
      desenhaPoligono(p.coordinates, null, comFundo || modoNevoeiro ? '#ffffff' : '#9ca3af', comFundo ? 0.7 : 0.6, 0.15);
    });
    [...gruposSub]
      .sort((a, b) => (b.poly.territoryType === 'distrito') - (a.poly.territoryType === 'distrito'))
      .forEach((g) => {
        const f = faixaDeOvos(g.maxOvos);
        const dist = g.poly.territoryType === 'distrito';
        if (modoNevoeiro) {
          if (!dist) desenhaPoligono(g.poly.coordinates, null, comFundo ? '#ffffff' : '#374151', 0.9, 0.2);
          return;
        }
        desenhaPoligono(g.poly.coordinates, f.cor, comFundo ? '#ffffff' : f.cor, dist ? (comFundo ? 0.18 : 0.22) : comFundo ? 0.5 : 0.6, 0.3);
      });

    subset.forEach((a) => {
      const la = Number(a.latitude);
      const lo = Number(a.longitude);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
      if (!modoNevoeiro && temLeitura(a) && Number(a.ultimosOvos) > 0) {
        doc.setGState(new doc.GState({ opacity: 0.28 }));
        doc.setFillColor(faixaDeOvos(a.ultimosOvos).cor);
        doc.circle(px(lo), py(la), raioCalorMm, 'F');
      }
    });
    doc.setGState(new doc.GState({ opacity: 1 }));
    subset.forEach((a) => {
      const la = Number(a.latitude);
      const lo = Number(a.longitude);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
      doc.setFillColor(faixaDeOvos(a.ultimosOvos).cor);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.circle(px(lo), py(la), 1.3, 'FD');
    });
    doc.restoreGraphicsState();
    doc.setDrawColor(...PRETO);
    doc.setLineWidth(0.3);
    doc.rect(mx, my, mw, mh);
  }

  if (opts.legenda === false) return;

  // ---------- legenda e leitura (coluna direita) ----------
  const lx = mx + mw + 8;
  let ly = my + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PRETO);
  doc.text('Escala oficial (ovos por palheta)', lx, ly);
  ly += 5;
  FAIXAS_RISCO.forEach((f) => {
    doc.setFillColor(f.cor);
    doc.setDrawColor(...PRETO);
    doc.setLineWidth(0.2);
    doc.rect(lx, ly - 3, 5, 3.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PRETO);
    doc.text(f.label, lx + 8, ly);
    ly += 6;
  });
  ly += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Como ler', lx, ly);
  ly += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CINZA);
  const texto = doc.splitTextToSize(
    'Cada quarteirão é pintado pela cor do pior foco (maior contagem) das palhetas dentro dele. ' +
      'As manchas suaves mostram a área de influência de 175 m em torno de cada armadilha positiva. ' +
      'Pontos são as armadilhas. IPO = armadilhas positivas ÷ lidas. IDO = ovos ÷ armadilhas positivas. ' +
      'Cada ciclo é calculado separadamente.',
    W - M - lx
  );
  doc.text(texto, lx, ly);
}

export async function gerarPdfMapaCalor({ armadilhas = [], grupos = [], metricas, ciclo, territorioLabel, fundo = 'vetorial' }) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;
  const timbres = await carregarTimbresOficiais().catch(() => ({}));

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  // ---------- cabecalho ----------
  let xTexto = M;
  if (timbres.TIMBRE_BRASAO_CARMO) {
    try {
      doc.addImage(timbres.TIMBRE_BRASAO_CARMO, 'PNG', M, 8, 14 * PROPORCAO_BRASAO_CARMO, 14);
      xTexto = M + 14 * PROPORCAO_BRASAO_CARMO + 4;
    } catch (_) {
      xTexto = M;
    }
  }
  doc.setTextColor(...PRETO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Mapa de Calor por Quarteirão', xTexto, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text(
    `Prefeitura Municipal de Carmo/RJ · Vigilância Entomológica · Ovitrampas · Ciclo ${ciclo} · ${territorioLabel}`,
    xTexto,
    18.5
  );
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, W - M, 13, { align: 'right' });
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.4);
  doc.line(M, 24, W - M, 24);

  // ---------- indicadores ----------
  const kpis = [
    ['Palhetas lidas', `${metricas.totalLidas} de ${metricas.total}`],
    ['Total de ovos', String(metricas.totalOvos)],
    ['IPO (positividade)', `${fmt(metricas.ipo)}%`],
    ['IDO (densidade)', fmt(metricas.ido)],
    ['Focos acima de 100 ovos', String(metricas.criticos)]
  ];
  const larg = (W - 2 * M - 4 * 3) / 5;
  kpis.forEach(([t, v], i) => {
    const x = M + i * (larg + 3);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.3);
    doc.rect(x, 28, larg, 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CINZA);
    doc.text(t.toUpperCase(), x + 3, 32.5);
    doc.setFontSize(13);
    doc.setTextColor(...PRETO);
    doc.text(v, x + 3, 39.5);
  });

  if (metricas.totalLidas < metricas.total) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRETO);
    doc.text(
      `PARCIAL: ${metricas.totalLidas} de ${metricas.total} palhetas do Ciclo ${ciclo} já foram lidas. Os valores mudam conforme o laboratório lança as demais.`,
      M,
      47
    );
  }

  // ---------- mapa (pagina 1: territorio selecionado) ----------
  const usarSat = fundo === 'satelite';
  const fundoPrincipal = usarSat ? await fundoSateliteDoMapa(armadilhas, 200, 148) : null;
  desenharMapaELegenda(doc, armadilhas, grupos, 50, 148, { fundo: fundoPrincipal });

  // ---------- pagina de ampliacao da sede urbana (so na visao do municipio) ----------
  if (territorioLabel === 'Todo o município') {
    const sede = armadilhas.filter((a) => classificarTerritorio(a).id === 'sede');
    if (sede.length > 0) {
      doc.addPage('a4', 'landscape');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...PRETO);
      doc.text(`Sede urbana ampliada — Ciclo ${ciclo}`, M, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...CINZA);
      doc.text(`${sede.length} armadilhas na sede. Mesma escala de cores da página anterior.`, M, 19);
      const ids = new Set(sede.map((a) => a.id ?? a.numero));
      const gSede = grupos.filter((g) => g.armadilhas.some((a) => ids.has(a.id ?? a.numero)));
      const fundoSede = usarSat ? await fundoSateliteDoMapa(sede, 200, 175) : null;
      desenharMapaELegenda(doc, sede, gSede, 24, 175, { fundo: fundoSede });
    }
  }

  // ---------- pagina de calor em nevoeiro ----------
  doc.addPage('a4', 'landscape');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRETO);
  doc.text(`Mapa de calor em nevoeiro — Ciclo ${ciclo} — ${territorioLabel}`, M, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text('Superfície suave interpolada a partir das contagens de cada armadilha (alcance de cerca de 175 m).', M, 19);
  const fundoNev = usarSat ? await fundoSateliteDoMapa(armadilhas, 200, 168) : null;
  const gTodosNev = agruparPorPoligono(armadilhas);
  desenharMapaELegenda(doc, armadilhas, gTodosNev, 24, 168, {
    fundo: fundoNev,
    modo: 'nevoeiro',
    nevoeiroImg: gerarNevoeiroDoMapa(armadilhas, 200, 168)
  });

  // ---------- pagina 2: tabela ----------
  doc.addPage('a4', 'landscape');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRETO);
  doc.text(`Ovitrampas — Ciclo ${ciclo} — ${territorioLabel}`, M, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text('Uso interno. Ordenado da maior para a menor contagem.', M, 19);

  const ordenadas = [...armadilhas].sort((a, b) => Number(b.ultimosOvos ?? -1) - Number(a.ultimosOvos ?? -1));
  autoTable(doc, {
    startY: 23,
    margin: { left: M, right: M },
    head: [['OV', 'Bairro / localidade', 'Quarteirão', 'Palheta', 'Ovos', 'Faixa']],
    body: ordenadas.map((a) => [
      `OV-${a.numero}`,
      a.bairro || a.microarea || '-',
      a.quarteirao && !/distrito/i.test(a.quarteirao) ? a.quarteirao : '-',
      a.palheta || '-',
      temLeitura(a) ? String(a.ultimosOvos) : '-',
      faixaDeOvos(a.ultimosOvos).label
    ]),
    styles: { fontSize: 8, cellPadding: 1.6, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: { bottom: 0.4 } },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' }, 5: { cellPadding: { left: 6, top: 1.6, bottom: 1.6, right: 1.6 } } },
    didDrawCell: (d) => {
      if (d.section === 'body' && d.column.index === 5) {
        const f = faixaDeOvos(ordenadas[d.row.index].ultimosOvos);
        d.doc.setFillColor(f.cor);
        d.doc.circle(d.cell.x + 3, d.cell.y + d.cell.height / 2, 1.3, 'F');
      }
    }
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    doc.text(`Página ${i} de ${total}`, W - M, H - 6, { align: 'right' });
  }

  doc.save(`mapa-calor-ciclo-${ciclo}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
