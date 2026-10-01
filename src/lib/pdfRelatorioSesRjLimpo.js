/**
 * Relatorio tecnico SES-RJ (versao enxuta) - A4 retrato, preto no branco.
 * Cor SO nos graficos, mapas e faixas de risco (azul, verde, amarelo, laranja, vermelho).
 * Anonimo: codigos P-NN, bairro e quarteirao. Sem nome de morador nem rua.
 * Um grafico por pagina: Ciclo A, Ciclo B (parcial) e Ambas (A x B lado a lado, NUNCA somados).
 */
import { adaptarArmadilhasParaCiclo, calcularMetricasCiclo, CICLO_SEMANA_1, CICLO_SEMANA_2 } from './ciclosOvitrampas';
import { FAIXAS_RISCO, faixaDeOvos, temLeitura, agruparPorPoligono } from './mapaPoligonos';
import { desenharMapaELegenda, fundoSateliteDoMapa, gerarNevoeiroDoMapa, limparCacheFundos } from './pdfMapaCalor';
import { classificarTerritorio } from './pdfRelatorioEntomologico';
import {
  carregarTimbresOficiais,
  PROPORCAO_BRASAO_CARMO,
  PROPORCAO_LOGO_PREFEITURA
} from './timbresOficiais';

const W = 210;
const M = 15;
const LARG = W - 2 * M;
const PRETO = [17, 17, 17];
const CINZA = [90, 90, 90];
const LINHA = [200, 200, 200];

const MACRO = {
  sede: 'Sede urbana',
  influencia: 'Influência',
  corrego_da_prata: 'Córrego da Prata',
  porto_velho: 'Porto Velho do Cunha',
  ilha_dos_pombos: 'Ilha dos Pombos',
  barra_sao_francisco: 'Barra de São Francisco'
};
const ORDEM_MACRO = ['Sede urbana', 'Influência', 'Córrego da Prata', 'Porto Velho do Cunha', 'Ilha dos Pombos', 'Barra de São Francisco'];

const n1 = (n) => Number(n).toFixed(1).replace('.', ',');
const nInt = (n) => Number(n).toLocaleString('pt-BR');
let PREFIXO_CODIGO = 'P'; // 'P' no relatorio SES-RJ (anonimo); 'OV' no relatorio de resultados (interno)
const codigoP = (a) => `${PREFIXO_CODIGO}-${String(a.numero).padStart(2, '0')}`;
const bairroDe = (a) => (a.bairro || a.microarea || 'Sem bairro').trim();
const macroDe = (a) => MACRO[classificarTerritorio(a).id] || 'Sede urbana';

function indicadores(lista) {
  const lidas = lista.filter(temLeitura);
  const pos = lidas.filter((a) => Number(a.ultimosOvos) > 0);
  const ovos = lidas.reduce((s, a) => s + Number(a.ultimosOvos), 0);
  return {
    total: lista.length,
    lidas: lidas.length,
    pos: pos.length,
    ovos,
    ipo: lidas.length ? (pos.length / lidas.length) * 100 : 0,
    ido: pos.length ? ovos / pos.length : 0
  };
}

function agrupar(lista, chaveFn) {
  const m = new Map();
  lista.forEach((a) => {
    const k = chaveFn(a);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(a);
  });
  return m;
}

// Ambas: A e B lado a lado; a cor do mapa e a da maior contagem entre os dois (nada e somado).
function mesclarAmbas(listaA, listaB) {
  const porNumero = new Map(listaB.map((b) => [String(b.numero), b]));
  return listaA.map((x) => {
    const y = porNumero.get(String(x.numero));
    const oA = temLeitura(x) ? Number(x.ultimosOvos) : null;
    const oB = y && temLeitura(y) ? Number(y.ultimosOvos) : null;
    const maior = oA === null && oB === null ? null : Math.max(oA ?? -1, oB ?? -1);
    return { ...x, ultimosOvos: maior, ovosA: oA, ovosB: oB };
  });
}

function texto(doc, t, x, y, { size = 9, bold = false, cor = PRETO, align = 'left', max } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...cor);
  if (max) {
    const linhas = doc.splitTextToSize(t, max);
    doc.text(linhas, x, y, { align });
    return linhas.length;
  }
  doc.text(t, x, y, { align });
  return 1;
}

function cabecalhoPagina(doc, timbres, titulo, subtitulo) {
  let x = M;
  if (timbres.TIMBRE_BRASAO_CARMO) {
    try {
      doc.addImage(timbres.TIMBRE_BRASAO_CARMO, 'PNG', M, 9, 10 * PROPORCAO_BRASAO_CARMO, 10);
      x = M + 10 * PROPORCAO_BRASAO_CARMO + 3;
    } catch (_) {
      x = M;
    }
  }
  texto(doc, 'Prefeitura Municipal de Carmo/RJ', x, 13, { size: 9, bold: true });
  texto(doc, 'Vigilância Entomológica · Relatório técnico de ovitrampas', x, 17.5, { size: 8, cor: CINZA });
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.4);
  doc.line(M, 22, W - M, 22);
  texto(doc, titulo, M, 32, { size: 14, bold: true });
  if (subtitulo) texto(doc, subtitulo, M, 38, { size: 9, cor: CINZA, max: LARG });
}

function legendaFaixas(doc, y) {
  let x = M;
  FAIXAS_RISCO.forEach((f) => {
    doc.setFillColor(f.cor);
    doc.setDrawColor(...PRETO);
    doc.setLineWidth(0.2);
    doc.rect(x, y - 3, 4, 3.5, 'FD');
    texto(doc, f.label, x + 5.5, y, { size: 7.5 });
    x += 5.5 + doc.getTextWidth(f.label) + 5;
  });
}

// ---------- graficos de barras (1 por pagina) ----------
function graficoEstratos(doc, bairros, lista) {
  const porBairro = agrupar(lista, bairroDe);
  const x0 = M + 52;
  const larguraMax = 85;
  const maxN = Math.max(1, ...bairros.map((b) => (porBairro.get(b) || []).length));
  const passo = Math.min(15, 175 / Math.max(bairros.length, 1));
  let y = 52;
  bairros.forEach((b) => {
    const trs = porBairro.get(b) || [];
    texto(doc, b, M, y + 5.3, { size: 8.5, bold: true, max: 50 });
    let x = x0;
    const un = larguraMax / maxN;
    FAIXAS_RISCO.forEach((f) => {
      const qtd = trs.filter((a) => faixaDeOvos(a.ultimosOvos).id === f.id).length;
      if (!qtd) return;
      doc.setFillColor(f.cor);
      doc.rect(x, y, qtd * un, 8, 'F');
      if (qtd * un > 5) texto(doc, String(qtd), x + (qtd * un) / 2, y + 5.4, { size: 8, bold: true, cor: [255, 255, 255], align: 'center' });
      x += qtd * un;
    });
    const ind = indicadores(trs);
    texto(
      doc,
      ind.lidas ? `${nInt(ind.ovos)} ovos · IPO ${n1(ind.ipo)}%` : 'aguardando leitura',
      x0 + larguraMax + 4,
      y + 5.3,
      { size: 8, cor: CINZA }
    );
    y += passo;
  });
  doc.setDrawColor(...LINHA);
  doc.setLineWidth(0.2);
  doc.line(x0, 50, x0, y - passo + 10);
  texto(doc, 'Cada quadrado de cor representa armadilhas do bairro na respectiva faixa de risco (número dentro da barra).', M, y + 6, {
    size: 8,
    cor: CINZA,
    max: LARG
  });
  legendaFaixas(doc, y + 16);
}

function graficoAmbas(doc, bairros, listaA, listaB) {
  const pA = agrupar(listaA, bairroDe);
  const pB = agrupar(listaB, bairroDe);
  const x0 = M + 52;
  const larguraMax = 90;
  const passo = Math.min(16, 175 / Math.max(bairros.length, 1));
  let y = 52;
  bairros.forEach((b) => {
    const iA = indicadores(pA.get(b) || []);
    const iB = indicadores(pB.get(b) || []);
    texto(doc, b, M, y + 6, { size: 8.5, bold: true, max: 50 });
    doc.setFillColor(...PRETO);
    doc.rect(x0, y, Math.max((iA.ipo / 100) * larguraMax, 0.4), 4.6, 'F');
    texto(doc, iA.lidas ? `${n1(iA.ipo)}%` : '-', x0 + (iA.ipo / 100) * larguraMax + 2, y + 3.6, { size: 7.5 });
    doc.setFillColor(150, 150, 150);
    doc.rect(x0, y + 5.4, Math.max((iB.ipo / 100) * larguraMax, 0.4), 4.6, 'F');
    texto(doc, iB.lidas ? `${n1(iB.ipo)}%` : 'aguardando', x0 + (iB.ipo / 100) * larguraMax + 2, y + 9, { size: 7.5, cor: CINZA });
    y += passo;
  });
  doc.setDrawColor(...LINHA);
  doc.setLineWidth(0.2);
  doc.line(x0, 50, x0, y - passo + 12);
  doc.setFillColor(...PRETO);
  doc.rect(M, y + 4, 4, 3.5, 'F');
  texto(doc, 'Ciclo A (completo)', M + 6, y + 7, { size: 8 });
  doc.setFillColor(150, 150, 150);
  doc.rect(M + 45, y + 4, 4, 3.5, 'F');
  texto(doc, 'Ciclo B (parcial)', M + 51, y + 7, { size: 8 });
  texto(
    doc,
    'IPO = armadilhas positivas ÷ armadilhas lidas, por bairro. O Ciclo B só inclui palhetas já lidas; os ciclos são comparados lado a lado e nunca somados.',
    M,
    y + 14,
    { size: 8, cor: CINZA, max: LARG }
  );
}

// ---------- mapas de calor em nevoeiro: municipio, sede e cada distrito ----------
async function celulaMapa(doc, subset, x, y, w, h, usarSat, rotulo) {
  texto(doc, rotulo, x, y - 2, { size: 8.5, bold: true });
  const lidas = subset.filter(temLeitura).length;
  const fundo = usarSat ? await fundoSateliteDoMapa(subset, w, h) : null;
  desenharMapaELegenda(doc, subset, agruparPorPoligono(subset), y, h, {
    x,
    w,
    legenda: false,
    fundo,
    modo: 'nevoeiro',
    nevoeiroImg: lidas ? gerarNevoeiroDoMapa(subset, w, h) : null
  });
  if (!lidas) {
    doc.setFillColor(255, 255, 255);
    doc.rect(x + w / 2 - 28, y + h / 2 - 5, 56, 10, 'F');
    texto(doc, 'Aguardando leitura das palhetas', x + w / 2, y + h / 2 + 1.2, { size: 8, cor: CINZA, align: 'center' });
  }
}

function notaNevoeiro(doc) {
  legendaFaixas(doc, 262);
  texto(doc, 'Superfície suave interpolada a partir das contagens de cada armadilha (alcance de cerca de 175 m). Onde não há leitura, não há cor.', M, 268, {
    size: 7.5,
    cor: CINZA,
    max: LARG
  });
}

const GRUPOS_DISTRITO = ['Influência', 'Córrego da Prata', 'Porto Velho do Cunha', 'Ilha dos Pombos', 'Barra de São Francisco'];

// 3 paginas por ciclo: municipio, sede urbana e os 4 distritos em grade 2x2
async function paginasMapasCiclo(doc, timbres, lista, rotuloCiclo, subt, usarSat) {
  const doGrupo = (nome) => lista.filter((a) => macroDe(a) === nome);

  doc.addPage();
  cabecalhoPagina(doc, timbres, `Mapa de calor — Município — ${rotuloCiclo}`, subt);
  await celulaMapa(doc, lista, M, 49, LARG, 205, usarSat, `Município de Carmo — ${lista.length} armadilhas`);
  notaNevoeiro(doc);

  doc.addPage();
  const sede = doGrupo('Sede urbana');
  cabecalhoPagina(doc, timbres, `Mapa de calor — Sede urbana — ${rotuloCiclo}`, subt);
  await celulaMapa(doc, sede, M, 49, LARG, 205, usarSat, `Sede urbana — ${sede.length} armadilhas`);
  notaNevoeiro(doc);

  doc.addPage();
  cabecalhoPagina(doc, timbres, `Mapa de calor — Distritos — ${rotuloCiclo}`, subt);
  const wC = (LARG - 6) / 2;
  const hC = 58;
  for (let i = 0; i < GRUPOS_DISTRITO.length; i++) {
    const nome = GRUPOS_DISTRITO[i];
    const sub = doGrupo(nome);
    const cx = M + (i % 2) * (wC + 6);
    const cy = 50 + Math.floor(i / 2) * (hC + 12);
    if (i === GRUPOS_DISTRITO.length - 1 && GRUPOS_DISTRITO.length % 2 === 1) {
      // ultimo distrito sozinho na linha: ocupa a largura toda
      await celulaMapa(doc, sub, M, cy, LARG, hC, usarSat, `${nome} — ${sub.length} armadilhas`);
      continue;
    }
    await celulaMapa(doc, sub, cx, cy, wC, hC, usarSat, `${nome} — ${sub.length} armadilhas`);
  }
  notaNevoeiro(doc);
}

export async function gerarRelatorioSesRjLimpo(armadilhas = [], todasLeituras = [], opcoes = {}) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;
  const timbres = await carregarTimbresOficiais().catch(() => ({}));

  const A = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_SEMANA_1);
  const B = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_SEMANA_2);
  const AB = mesclarAmbas(A, B);
  const mA = calcularMetricasCiclo(A);
  const mB = calcularMetricasCiclo(B);
  const iA = indicadores(A);
  const iB = indicadores(B);

  const usarSat = opcoes.fundo === 'satelite';
  const interno = opcoes.variante === 'resultados';
  PREFIXO_CODIGO = interno ? 'OV' : 'P';
  const hoje = new Date().toLocaleDateString('pt-BR');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  // ---------- 1. CAPA E RESUMO ----------
  if (timbres.TIMBRE_BRASAO_CARMO) {
    try {
      doc.addImage(timbres.TIMBRE_BRASAO_CARMO, 'PNG', M, 12, 20 * PROPORCAO_BRASAO_CARMO, 20);
    } catch (_) {
      /* segue sem brasao */
    }
  }
  if (timbres.TIMBRE_LOGO_PREFEITURA) {
    try {
      doc.addImage(timbres.TIMBRE_LOGO_PREFEITURA, 'PNG', W - M - 16 * PROPORCAO_LOGO_PREFEITURA, 14, 16 * PROPORCAO_LOGO_PREFEITURA, 16);
    } catch (_) {
      /* segue sem logo */
    }
  }
  texto(doc, 'PREFEITURA MUNICIPAL DE CARMO', W / 2, 17, { size: 10, bold: true, align: 'center' });
  texto(doc, 'Secretaria Municipal de Saúde', W / 2, 22, { size: 9, align: 'center' });
  texto(doc, 'Vigilância em Saúde · Vigilância Entomológica', W / 2, 26.5, { size: 9, align: 'center', cor: CINZA });
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.5);
  doc.line(M, 36, W - M, 36);

  texto(doc, interno ? 'Relatório de Resultados do Monitoramento' : 'Relatório Técnico de Monitoramento Vetorial', M, 52, { size: 20, bold: true });
  texto(doc, 'Ovitrampas — Aedes aegypti — Ciclo A × Ciclo B', M, 60, { size: 12 });
  texto(doc, interno ? `Uso interno · Coordenação de Vigilância em Saúde · Emitido em ${hoje}` : `Destinatário: Secretaria de Estado de Saúde do Rio de Janeiro (SES-RJ) · Emitido em ${hoje}`, M, 67, {
    size: 9,
    cor: CINZA
  });

  // quadros A e B
  const colW = (LARG - 6) / 2;
  const quadro = (x, titulo, nota, ind, m) => {
    doc.setDrawColor(...PRETO);
    doc.setLineWidth(0.4);
    doc.rect(x, 76, colW, 46);
    texto(doc, titulo, x + 4, 83, { size: 10, bold: true });
    texto(doc, nota, x + 4, 88, { size: 8, cor: CINZA });
    const itens = [
      ['Palhetas lidas', `${ind.lidas} de ${ind.total}`],
      ['Total de ovos', nInt(ind.ovos)],
      ['IPO', `${n1(ind.ipo)}%`],
      ['IDO', n1(ind.ido)],
      ['Focos > 100 ovos', String(m.criticos)]
    ];
    itens.forEach(([r, v], i) => {
      const yy = 96 + i * 5.2;
      texto(doc, r, x + 4, yy, { size: 8.5, cor: CINZA });
      texto(doc, v, x + colW - 4, yy, { size: 9.5, bold: true, align: 'right' });
    });
  };
  quadro(M, 'CICLO A', 'Completo', iA, mA);
  quadro(M + colW + 6, 'CICLO B', `Parcial: ${iB.lidas} de ${iB.total} palhetas lidas`, iB, mB);

  // achados
  const topA = [...A].filter(temLeitura).sort((a, b) => b.ultimosOvos - a.ultimosOvos).slice(0, 3);
  const bairrosA = [...agrupar(A, bairroDe).entries()]
    .map(([b, l]) => ({ b, ...indicadores(l) }))
    .sort((x, y) => y.ovos - x.ovos)
    .slice(0, 3);
  const achados = [
    `Ciclo A concluído: ${iA.lidas} de ${iA.total} palhetas lidas, ${nInt(iA.ovos)} ovos, ${iA.pos} armadilhas positivas (IPO ${n1(iA.ipo)}%) e IDO ${n1(iA.ido)}.`,
    topA.length ? `Maiores contagens no Ciclo A: ${topA.map((a) => `${codigoP(a)} (${a.ultimosOvos} ovos)`).join(', ')}.` : null,
    bairrosA.length
      ? `Bairros com mais ovos no Ciclo A: ${bairrosA.map((x) => `${x.b} (${nInt(x.ovos)})`).join(', ')}.`
      : null,
    `Ciclo B parcial: ${iB.lidas} de ${iB.total} palhetas lidas, ${nInt(iB.ovos)} ovos, IPO ${n1(iB.ipo)}% e IDO ${n1(iB.ido)}. As demais aguardam leitura laboratorial e os valores serão atualizados.`,
    'Os ciclos são apresentados lado a lado e nunca somados. A comparação considera apenas palhetas já lidas.'
  ].filter(Boolean);
  texto(doc, 'Principais achados', M, 134, { size: 11, bold: true });
  let ya = 141;
  achados.forEach((t) => {
    doc.setFillColor(...PRETO);
    doc.circle(M + 1.2, ya - 1, 0.7, 'F');
    const linhas = texto(doc, t, M + 5, ya, { size: 9.5, max: LARG - 5 });
    ya += linhas * 4.6 + 2.6;
  });

  texto(doc, interno ? 'Documento de uso interno: armadilhas identificadas por OV-01 a OV-56. Sem nomes de moradores e sem endereços.' : 'Documento técnico com dados anonimizados: armadilhas identificadas por códigos (P-01 a P-56) e resultados agregados por bairro e quarteirão.', M, 266, {
    size: 8,
    cor: CINZA,
    max: LARG
  });

  // ---------- 2. INDICADORES ----------
  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Indicadores por território', 'Ciclo A (completo) e Ciclo B (parcial) lado a lado. IPO = positivas ÷ lidas. IDO = ovos ÷ positivas.');

  const linhaInd = (nome, la, lb) => {
    const a = indicadores(la);
    const b = indicadores(lb);
    return [
      nome,
      String(a.total),
      String(a.lidas),
      String(a.pos),
      nInt(a.ovos),
      `${n1(a.ipo)}%`,
      n1(a.ido),
      String(b.lidas),
      String(b.pos),
      nInt(b.ovos),
      b.lidas ? `${n1(b.ipo)}%` : '-',
      b.lidas ? n1(b.ido) : '-'
    ];
  };
  const cab = [
    [
      { content: '', rowSpan: 2 },
      { content: 'Armad.', rowSpan: 2 },
      { content: 'CICLO A', colSpan: 5, styles: { halign: 'center' } },
      { content: 'CICLO B (parcial)', colSpan: 5, styles: { halign: 'center' } }
    ],
    ['Lidas', 'Pos.', 'Ovos', 'IPO', 'IDO', 'Lidas', 'Pos.', 'Ovos', 'IPO', 'IDO']
  ];
  const estiloTab = {
    styles: { fontSize: 8, cellPadding: 1.8, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1, halign: 'right' },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: 0.3, halign: 'center' },
    columnStyles: { 0: { halign: 'left', cellWidth: 44, fontStyle: 'bold' } },
    margin: { left: M, right: M }
  };

  texto(doc, 'Por região do município', M, 47, { size: 10, bold: true });
  const mA2 = agrupar(A, macroDe);
  const mB2 = agrupar(B, macroDe);
  autoTable(doc, {
    ...estiloTab,
    startY: 50,
    head: cab,
    body: [
      ...ORDEM_MACRO.filter((k) => mA2.has(k)).map((k) => linhaInd(k, mA2.get(k) || [], mB2.get(k) || [])),
      linhaInd('MUNICÍPIO', A, B)
    ],
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === ORDEM_MACRO.filter((k) => mA2.has(k)).length) d.cell.styles.fontStyle = 'bold';
    }
  });

  const yBairros = doc.lastAutoTable.finalY + 10;
  texto(doc, 'Por bairro / localidade', M, yBairros, { size: 10, bold: true });
  const bA = agrupar(A, bairroDe);
  const bB = agrupar(B, bairroDe);
  const ordemB = [...bA.keys()].sort((x, y) => indicadores(bA.get(y)).ovos - indicadores(bA.get(x)).ovos);
  autoTable(doc, {
    ...estiloTab,
    startY: yBairros + 3,
    head: cab,
    body: ordemB.map((k) => linhaInd(k, bA.get(k) || [], bB.get(k) || []))
  });

  // ---------- 3-5. GRAFICOS (1 por pagina) ----------
  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Gráfico 1 — Ciclo A', 'Armadilhas por faixa de risco em cada bairro. Ciclo A completo: 56 de 56 palhetas lidas.');
  graficoEstratos(doc, ordemB, A);

  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Gráfico 2 — Ciclo B (parcial)', `Armadilhas por faixa de risco em cada bairro. Ciclo B parcial: ${iB.lidas} de ${iB.total} palhetas lidas. Armadilhas sem leitura não entram.`);
  graficoEstratos(doc, ordemB, B);

  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Gráfico 3 — Ambas: Ciclo A × Ciclo B', 'Positividade (IPO) por bairro, os dois ciclos lado a lado.');
  graficoAmbas(doc, ordemB, A, B);

  // ---------- MAPAS DE CALOR: cidade e distritos, por ciclo ----------
  await paginasMapasCiclo(doc, timbres, A, 'Ciclo A', 'Escala oficial de 5 cores: azul (0), verde, amarelo, laranja e vermelho (mais de 100 ovos).', usarSat);
  await paginasMapasCiclo(doc, timbres, B, 'Ciclo B (parcial)', `Somente palhetas já lidas (${iB.lidas} de ${iB.total}).`, usarSat);
  await paginasMapasCiclo(doc, timbres, AB, 'Ambas', 'Em cada ponto vale a maior contagem observada entre o Ciclo A e o Ciclo B. Nada é somado.', usarSat);

  // ---------- 9-10. INVENTARIO ANONIMO ----------
  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Inventário das 56 ovitrampas', 'Identificação anônima por código técnico, bairro e quarteirão. Sem nomes de moradores e sem endereços.');
  const ordenadas = [...A].sort((a, b) => Number(a.numero) - Number(b.numero));
  const porNum = new Map(B.map((b) => [String(b.numero), b]));
  const valor = (a) => (temLeitura(a) ? String(a.ultimosOvos) : 'Aguardando');
  autoTable(doc, {
    startY: 44,
    margin: { left: M, right: M, bottom: 16 },
    head: [['Código', 'Bairro', 'Quarteirão', 'Ovos A', 'Faixa A', 'Ovos B', 'Faixa B']],
    body: ordenadas.map((a) => {
      const b = porNum.get(String(a.numero));
      return [
        codigoP(a),
        bairroDe(a),
        a.quarteirao && !/distrito/i.test(a.quarteirao) ? a.quarteirao : '-',
        valor(a),
        faixaDeOvos(a.ultimosOvos).label,
        b ? valor(b) : 'Aguardando',
        b ? faixaDeOvos(b.ultimosOvos).label : 'Sem leitura'
      ];
    }),
    styles: { fontSize: 7.8, cellPadding: 1.5, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: { bottom: 0.4 } },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 17 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      4: { cellPadding: { left: 6, top: 1.5, bottom: 1.5, right: 1 }, cellWidth: 30 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      6: { cellPadding: { left: 6, top: 1.5, bottom: 1.5, right: 1 }, cellWidth: 30 }
    },
    didDrawCell: (d) => {
      if (d.section !== 'body' || (d.column.index !== 4 && d.column.index !== 6)) return;
      const a = ordenadas[d.row.index];
      const b = porNum.get(String(a.numero));
      const f = d.column.index === 4 ? faixaDeOvos(a.ultimosOvos) : faixaDeOvos(b ? b.ultimosOvos : null);
      d.doc.setFillColor(f.cor);
      d.doc.circle(d.cell.x + 3, d.cell.y + d.cell.height / 2, 1.3, 'F');
    }
  });

  // ---------- ULTIMA: METODOLOGIA E ASSINATURAS ----------
  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Metodologia e responsabilidade técnica');
  const blocos = [
    ['Objetivo', 'Monitorar a densidade de ovos de Aedes aegypti por meio de ovitrampas distribuídas no município, para orientar ações de controle vetorial.'],
    ['Método', 'Cada ovitrampa recebe uma palheta que fica exposta por 5 dias. Após o recolhimento, os ovos de cada palheta são contados em laboratório. Foram realizados dois ciclos: A (palhetas com final A) e B (palhetas com final B).'],
    ['Indicadores', 'IPO (índice de positividade) = armadilhas com ovos ÷ armadilhas lidas × 100. IDO (índice de densidade) = total de ovos ÷ armadilhas positivas.'],
    ['Escala de risco', '0 ovos: negativa · 1 a 20: baixa · 21 a 50: média · 51 a 100: alta · mais de 100: crítica.'],
    ['Anonimização', 'As armadilhas são identificadas por códigos técnicos (P-01 a P-56). Os resultados são apresentados por bairro, microárea e quarteirão, sem nomes de moradores nem endereços.'],
    ['Limitações', `O Ciclo B está parcial (${iB.lidas} de ${iB.total} palhetas lidas) e será atualizado. Os ciclos nunca são somados; a comparação usa apenas palhetas já lidas.`]
  ];
  let ym = 48;
  blocos.forEach(([t, c]) => {
    texto(doc, t, M, ym, { size: 10, bold: true });
    const l = texto(doc, c, M, ym + 5.2, { size: 9.5, max: LARG });
    ym += 5.2 + l * 4.6 + 6;
    if (t === 'Escala de risco') {
      FAIXAS_RISCO.slice(1).forEach((f, i) => {
        doc.setFillColor(f.cor);
        doc.rect(M + i * 34, ym - 5, 4, 3.5, 'F');
        texto(doc, f.label, M + i * 34 + 5.5, ym - 2, { size: 8 });
      });
      ym += 4;
    }
  });
  const ys = Math.max(ym + 24, 215);
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.3);
  doc.line(M, ys, M + 75, ys);
  doc.line(W - M - 75, ys, W - M, ys);
  texto(doc, 'Almir Lemgruber', M + 37.5, ys + 5, { size: 9.5, bold: true, align: 'center' });
  texto(doc, 'Responsável Técnico · Vigilância Entomológica', M + 37.5, ys + 9.5, { size: 8, cor: CINZA, align: 'center' });
  texto(doc, 'Secretaria Municipal de Saúde', W - M - 37.5, ys + 5, { size: 9.5, bold: true, align: 'center' });
  texto(doc, 'Prefeitura Municipal de Carmo/RJ', W - M - 37.5, ys + 9.5, { size: 8, cor: CINZA, align: 'center' });

  // ---------- rodape com numeracao real ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.2);
    doc.line(M, 285, W - M, 285);
    texto(doc, `Prefeitura Municipal de Carmo/RJ · Vigilância Entomológica · ${interno ? 'uso interno' : 'dados anonimizados'}`, M, 290, { size: 7.5, cor: CINZA });
    texto(doc, `Página ${i} de ${total}`, W - M, 290, { size: 7.5, cor: CINZA, align: 'right' });
  }

  limparCacheFundos();
  doc.save(`${interno ? 'relatorio-resultados-carmo' : 'relatorio-ses-rj-carmo'}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
