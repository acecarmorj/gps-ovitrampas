/**
 * PDF do mapa de calor por quarteirao (A4 paisagem). Preto no branco; cor so no mapa e nas faixas de risco.
 * Mapa desenhado em vetor (sem imagem de satelite): nitido na impressora, sem depender de internet.
 * Um ciclo por vez; nunca soma A + B.
 */
import { faixaDeOvos, FAIXAS_RISCO, temLeitura } from './mapaPoligonos';
import { getAllPolygons } from './geoDetection';
import { classificarTerritorio } from './pdfRelatorioEntomologico';
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

function desenharMapaELegenda(doc, subset, gruposSub, my, mh) {
  // ---------- mapa vetorial ----------
  const mx = M;
  const mw = 200;

  const pts = subset
    .map((a) => [Number(a.latitude), Number(a.longitude)])
    .filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));

  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.3);
  doc.rect(mx, my, mw, mh);

  if (pts.length > 0) {
    let latMin = Math.min(...pts.map((p) => p[0]));
    let latMax = Math.max(...pts.map((p) => p[0]));
    let lngMin = Math.min(...pts.map((p) => p[1]));
    let lngMax = Math.max(...pts.map((p) => p[1]));
    const padLat = Math.max((latMax - latMin) * 0.12, 0.002);
    const padLng = Math.max((lngMax - lngMin) * 0.12, 0.002);
    latMin -= padLat;
    latMax += padLat;
    lngMin -= padLng;
    lngMax += padLng;

    const kx = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180);
    const spanX = (lngMax - lngMin) * kx;
    const spanY = latMax - latMin;
    const esc = Math.min(mw / spanX, mh / spanY); // mm por grau de latitude
    const offX = mx + (mw - spanX * esc) / 2;
    const offY = my + (mh - spanY * esc) / 2;
    const px = (lng) => offX + (lng - lngMin) * kx * esc;
    const py = (lat) => offY + (latMax - lat) * esc;
    const raioCalorMm = 175 / (111320 / esc); // 175 m em mm

    doc.saveGraphicsState();
    doc.rect(mx, my, mw, mh, null);
    doc.clip();
    doc.discardPath();

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
      desenhaPoligono(p.coordinates, null, '#9ca3af', 0.6, 0.15);
    });
    [...gruposSub]
      .sort((a, b) => (b.poly.territoryType === 'distrito') - (a.poly.territoryType === 'distrito'))
      .forEach((g) => {
        const f = faixaDeOvos(g.maxOvos);
        const dist = g.poly.territoryType === 'distrito';
        desenhaPoligono(g.poly.coordinates, f.cor, f.cor, dist ? 0.22 : 0.6, 0.3);
      });

    subset.forEach((a) => {
      const la = Number(a.latitude);
      const lo = Number(a.longitude);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
      if (temLeitura(a) && Number(a.ultimosOvos) > 0) {
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

export async function gerarPdfMapaCalor({ armadilhas = [], grupos = [], metricas, ciclo, territorioLabel }) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;
  const timbres = await carregarTimbresOficiais().catch(() => ({}));

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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
  desenharMapaELegenda(doc, armadilhas, grupos, 50, 148);

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
      desenharMapaELegenda(doc, sede, gSede, 24, 175);
    }
  }

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
