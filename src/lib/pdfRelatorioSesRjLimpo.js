/**
 * Relatorio tecnico SES-RJ (versao enxuta) - A4 retrato, preto no branco.
 * Cor SO nos graficos, mapas e faixas de risco (azul, verde, amarelo, laranja, vermelho).
 * Anonimo: codigos P-NN, bairro e quarteirao. Sem nome de morador nem rua.
 * Um grafico por pagina: Ciclo A, Ciclo B e Ambas (A e B juntos: ovos somados por armadilha).
 */
import { adaptarArmadilhasParaCiclo, calcularMetricasCiclo, CICLO_SEMANA_1, CICLO_SEMANA_2 } from './ciclosOvitrampas';
import { FAIXAS_RISCO, faixaDeOvos, temLeitura, agruparPorPoligono, mesclarCiclos, coresDosBairros, corTextoDaFaixa, metricasAmbas } from './mapaPoligonos';
import { adicionarPaginasEstrategia } from './pdfEstrategia';
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

// Indicadores (Nota Tecnica MS 3/2025, item 4.27): IPO, IDO e IDV.
// Em listas de "Ambas" (mesclarCiclos) os ovos sao a SOMA de A e B e IDO/IDV usam as palhetas lidas.
function indicadores(lista) {
  const ehAmbas = lista.length > 0 && lista[0].palhetasLidas !== undefined;
  const valor = (a) => (ehAmbas ? a.ovosAmbas : Number(a.ultimosOvos));
  const lidas = lista.filter((a) => (ehAmbas ? a.palhetasLidas > 0 : temLeitura(a)));
  const pos = lidas.filter((a) => valor(a) > 0);
  const ovos = lidas.reduce((s, a) => s + valor(a), 0);
  const palhetas = lidas.reduce((s, a) => s + (ehAmbas ? a.palhetasLidas : 1), 0);
  const palPos = lidas.reduce((s, a) => s + (ehAmbas ? (a.ovosA > 0 ? 1 : 0) + (a.ovosB > 0 ? 1 : 0) : valor(a) > 0 ? 1 : 0), 0);
  return {
    total: lista.length,
    lidas: lidas.length,
    pos: pos.length,
    ovos,
    ipo: lidas.length ? (pos.length / lidas.length) * 100 : 0,
    ido: palPos ? ovos / palPos : 0,
    idv: palhetas ? ovos / palhetas : 0
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

// Ambas = Ciclo A e Ciclo B juntos: ovos das duas palhetas somados em cada armadilha.
const mesclarAmbas = mesclarCiclos;

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
  const cores = coresDosBairros(lista, bairroDe);
  const porBairro = agrupar(lista, bairroDe);
  const x0 = M + 52;
  const larguraMax = 85;
  const maxN = Math.max(1, ...bairros.map((b) => (porBairro.get(b) || []).length));
  const passo = Math.min(15, 175 / Math.max(bairros.length, 1));
  let y = 52;
  bairros.forEach((b) => {
    const trs = porBairro.get(b) || [];
    texto(doc, b, M, y + 5.3, { size: 8.5, bold: true, max: 50, cor: cores.get(b) || PRETO });
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
  const cores = coresDosBairros(mesclarCiclos(listaA, listaB), bairroDe);
  const pA = agrupar(listaA, bairroDe);
  const pB = agrupar(listaB, bairroDe);
  const x0 = M + 56;
  const larguraMax = 88;
  const passo = Math.min(16, 175 / Math.max(bairros.length, 1));
  const piorFoco = (lista) => {
    const lidas = lista.filter(temLeitura);
    return lidas.length ? Math.max(...lidas.map((a) => Number(a.ultimosOvos))) : null;
  };
  // Cor da barra = faixa de risco do PIOR FOCO do bairro no ciclo; comprimento = IPO.
  const barra = (y, ipo, ind, pior, cheia) => {
    const larg = Math.max((ipo / 100) * larguraMax, 0.4);
    const cor = faixaDeOvos(pior).cor;
    if (ind.lidas) {
      doc.setGState(new doc.GState({ opacity: cheia ? 1 : 0.5 }));
      doc.setFillColor(cor);
      doc.rect(x0, y, larg, 4.6, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
    } else {
      doc.setDrawColor(...LINHA);
      doc.setLineWidth(0.2);
      doc.line(x0, y, x0, y + 4.6);
    }
    texto(doc, cheia ? 'A' : 'B', x0 - 2.5, y + 3.7, { size: 7, bold: true, align: 'right' });
    texto(doc, ind.lidas ? `${n1(ipo)}%` : 'aguardando', x0 + (ind.lidas ? larg : 0) + 2, y + 3.7, {
      size: 7.5,
      cor: ind.lidas ? PRETO : CINZA
    });
  };
  let y = 52;
  bairros.forEach((b) => {
    const lA = pA.get(b) || [];
    const lB = pB.get(b) || [];
    const iA = indicadores(lA);
    const iB = indicadores(lB);
    texto(doc, b, M, y + 6, { size: 8.5, bold: true, max: 50, cor: cores.get(b) || PRETO });
    barra(y, iA.ipo, iA, piorFoco(lA), true);
    barra(y + 5.4, iB.ipo, iB, piorFoco(lB), false);
    y += passo;
  });
  doc.setDrawColor(...LINHA);
  doc.setLineWidth(0.2);
  doc.line(x0, 50, x0, y - passo + 12);
  legendaFaixas(doc, y + 6);
  const parcB = listaB.filter(temLeitura).length < listaB.length;
  const parcA = listaA.filter(temLeitura).length < listaA.length;
  texto(doc, `Barra cheia = Ciclo A (${parcA ? 'parcial' : 'completo'}) · barra clara = Ciclo B (${parcB ? 'parcial' : 'completo'}).`, M, y + 13, { size: 8, bold: true });
  texto(
    doc,
    'O comprimento é o IPO do bairro (armadilhas positivas ÷ lidas). A cor é a faixa do pior foco do bairro no ciclo (maior contagem de ovos). O Ciclo B só inclui palhetas já lidas; este gráfico compara A e B lado a lado.',
    M,
    y + 19,
    { size: 8, cor: CINZA, max: LARG }
  );
}

// ---------- mapas de calor em nevoeiro: municipio, sede e cada distrito ----------
async function celulaMapa(doc, subset, x, y, w, h, usarSat, rotulo, soPontos = false) {
  texto(doc, rotulo, x, y - 2, { size: 8.5, bold: true });
  const lidas = subset.filter(temLeitura).length;
  const fundo = usarSat ? await fundoSateliteDoMapa(subset, w, h) : null;
  desenharMapaELegenda(doc, subset, agruparPorPoligono(subset), y, h, {
    x,
    w,
    legenda: false,
    fundo,
    modo: soPontos ? 'pontos' : 'nevoeiro',
    nevoeiroImg: !soPontos && lidas ? gerarNevoeiroDoMapa(subset, w, h) : null
  });
  if (!lidas) {
    doc.setFillColor(255, 255, 255);
    doc.rect(x + w / 2 - 28, y + h / 2 - 5, 56, 10, 'F');
    texto(doc, 'Aguardando leitura das palhetas', x + w / 2, y + h / 2 + 1.2, { size: 8, cor: CINZA, align: 'center' });
  }
}

function notaNevoeiro(doc, soPontos = false) {
  legendaFaixas(doc, 262);
  texto(doc, soPontos ? 'Cada ponto é uma armadilha, colorida pela faixa de risco da sua contagem. O calor em nevoeiro está nas páginas da cidade e de cada distrito.' : 'Superfície suave interpolada a partir das contagens de cada armadilha (alcance de cerca de 175 m). Onde não há leitura, não há cor.', M, 268, {
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
  cabecalhoPagina(doc, timbres, `Anexo B · Mapa — Município — ${rotuloCiclo}`, 'Pontos coloridos pela faixa de risco de cada armadilha.');
  await celulaMapa(doc, lista, M, 49, LARG, 205, usarSat, `Município de Carmo — ${lista.length} armadilhas`, true);
  notaNevoeiro(doc, true);

  doc.addPage();
  const sede = doGrupo('Sede urbana');
  cabecalhoPagina(doc, timbres, `Anexo B · Mapa de calor — Sede urbana — ${rotuloCiclo}`, subt);
  await celulaMapa(doc, sede, M, 49, LARG, 205, usarSat, `Sede urbana — ${sede.length} armadilhas`);
  notaNevoeiro(doc);

  doc.addPage();
  cabecalhoPagina(doc, timbres, `Anexo B · Mapa de calor — Distritos — ${rotuloCiclo}`, subt);
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
  const parcialB = iB.lidas < iB.total;
  const rotB = parcialB ? 'Ciclo B (parcial)' : 'Ciclo B';
  const mAB = metricasAmbas(AB);
  const iAB = indicadores(AB);

  const usarSat = opcoes.fundo === 'satelite';
  const interno = opcoes.variante === 'resultados';
  PREFIXO_CODIGO = interno ? 'OV' : 'P';
  const hoje = new Date().toLocaleDateString('pt-BR');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  // ---------- 1. CAPA E RESUMO ----------
  // Capa: so um timbre. O logo da Prefeitura ja traz o brasao; o brasao avulso duplicava.
  if (timbres.TIMBRE_LOGO_PREFEITURA) {
    try {
      doc.addImage(timbres.TIMBRE_LOGO_PREFEITURA, 'PNG', M, 12, 20 * PROPORCAO_LOGO_PREFEITURA, 20);
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

  texto(doc, interno ? 'Relatório de Resultados do Monitoramento' : 'Relatório Técnico de Monitoramento Vetorial', M, 105, { size: 22, bold: true, max: LARG });
  texto(doc, 'Ovitrampas — Aedes aegypti — Ciclo A × Ciclo B', M, 124, { size: 13 });
  texto(doc, interno ? `Uso interno · Coordenação de Vigilância em Saúde · Emitido em ${hoje}` : `Destinatário: Secretaria de Estado de Saúde do Rio de Janeiro (SES-RJ) · Emitido em ${hoje}`, M, 133, {
    size: 9.5,
    cor: CINZA,
    max: LARG
  });
  texto(doc, 'Vigilância entomológica com ovitrampas conforme a Nota Técnica MS nº 3/2025 · 56 ovitrampas · exposição de 5 dias · Setembro de 2026', M, 141, { size: 9, cor: CINZA, max: LARG });
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.5);
  doc.line(M, 98, W - M, 98);
  texto(doc, interno ? 'Documento de uso interno: armadilhas identificadas por OV-01 a OV-56. Sem nomes de moradores e sem endereços.' : 'Documento técnico com dados anonimizados: armadilhas identificadas por códigos (P-01 a P-56) e resultados agregados por bairro e quarteirão.', M, 266, {
    size: 8,
    cor: CINZA,
    max: LARG
  });

  // pagina 2: sumario (preenchido no fim, com os numeros reais de pagina)
  doc.addPage();
  const paginaSumario = doc.getNumberOfPages();
  const secoesPag = {};

  // pagina 3: resumo executivo
  doc.addPage();
  secoesPag.resumo = doc.getNumberOfPages();
  cabecalhoPagina(doc, timbres, 'Resumo executivo', 'Ciclo A, Ciclo B e Ambas lado a lado, com os indicadores da Nota Técnica MS nº 3/2025 (IPO, IDO e IDV).');

  // quadros A e B
  const colW = (LARG - 12) / 3;
  const quadro = (x, titulo, nota, ind, m, rotuloLidas = 'Palhetas lidas') => {
    doc.setDrawColor(...PRETO);
    doc.setLineWidth(0.4);
    doc.rect(x, 50, colW, 53);
    texto(doc, titulo, x + 4, 57, { size: 10, bold: true });
    texto(doc, nota, x + 4, 62, { size: 8, cor: CINZA });
    const itens = [
      [rotuloLidas, `${ind.lidas} de ${ind.total}`],
      ['Total de ovos', nInt(ind.ovos)],
      ['IPO', `${n1(ind.ipo)}%`],
      ['IDO', n1(ind.ido)],
      ['IDV', n1(ind.idv)],
      ['Focos > 100 ovos', String(m.criticos)]
    ];
    itens.forEach(([r, v], i) => {
      const yy = 70 + i * 5.2;
      texto(doc, r, x + 4, yy, { size: 8.5, cor: CINZA });
      texto(doc, v, x + colW - 4, yy, { size: 9.5, bold: true, align: 'right' });
    });
  };
  quadro(M, 'CICLO A', iA.lidas < iA.total ? `Parcial: ${iA.lidas} de ${iA.total} lidas` : 'Completo', iA, mA);
  quadro(M + colW + 6, 'CICLO B', parcialB ? `Parcial: ${iB.lidas} de ${iB.total} lidas` : 'Completo', iB, mB);
  quadro(M + 2 * (colW + 6), 'AMBAS (A + B)', 'Soma; cor pela média por palheta', iAB, mAB, 'Armadilhas lidas (A ou B)');

  // achados
  const topA = [...A].filter(temLeitura).sort((a, b) => b.ultimosOvos - a.ultimosOvos).slice(0, 3);
  const bairrosA = [...agrupar(A, bairroDe).entries()]
    .map(([b, l]) => ({ b, ...indicadores(l) }))
    .sort((x, y) => y.ovos - x.ovos)
    .slice(0, 3);
  // Como ler A x B: o IPO conta armadilhas com ovo (nao quantos ovos); o IDO mostra a densidade.
  const nosDois = AB.filter((a) => a.ovosA > 0 && a.ovosB > 0).length;
  const soA = AB.filter((a) => a.ovosA > 0 && !(a.ovosB > 0)).length;
  const soB = AB.filter((a) => a.ovosB > 0 && !(a.ovosA > 0)).length;
  const comparacaoCiclos = !parcialB && iA.lidas === iA.total
    ? `Como comparar A e B: o IPO conta quantas armadilhas tiveram ovos, não quantos ovos. ${iA.pos === iB.pos ? `Os dois ciclos têm ${iA.pos} armadilhas positivas e, por isso, o mesmo IPO (${n1(iA.ipo)}%); ` : `IPO de ${n1(iA.ipo)}% no A e ${n1(iB.ipo)}% no B; `}o IDO (ovos por armadilha positiva) mostra a diferença de intensidade: ${n1(iA.ido)} no A e ${n1(iB.ido)} no B. As positivas não são as mesmas armadilhas: ${nosDois} foram positivas nos dois ciclos, ${soA} só no A e ${soB} só no B (${iAB.pos} em A ou B).`
    : null;
  const achados = [
    `Ciclo A concluído: ${iA.lidas} de ${iA.total} palhetas lidas, ${nInt(iA.ovos)} ovos, ${iA.pos} armadilhas positivas (IPO ${n1(iA.ipo)}%) e IDO ${n1(iA.ido)}.`,
    topA.length ? `Maiores contagens no Ciclo A: ${topA.map((a) => `${codigoP(a)} (${a.ultimosOvos} ovos)`).join(', ')}.` : null,
    bairrosA.length
      ? `Bairros com mais ovos no Ciclo A: ${bairrosA.map((x) => `${x.b} (${nInt(x.ovos)})`).join(', ')}.`
      : null,
    parcialB
      ? `Ciclo B parcial: ${iB.lidas} de ${iB.total} palhetas lidas, ${nInt(iB.ovos)} ovos, IPO ${n1(iB.ipo)}% e IDO ${n1(iB.ido)}. As demais aguardam leitura laboratorial e os valores serão atualizados.`
      : `Ciclo B concluído: ${iB.lidas} de ${iB.total} palhetas lidas, ${nInt(iB.ovos)} ovos, ${iB.pos} armadilhas positivas (IPO ${n1(iB.ipo)}%) e IDO ${n1(iB.ido)}.`,
    `Ambas (A e B juntos): ${nInt(iAB.ovos)} ovos somados, ${iAB.pos} armadilhas positivas em A ou em B (IPO ${n1(iAB.ipo)}%) e IDO ${n1(iAB.ido)}.${parcialB ? ' Como o Ciclo B é parcial, Ambas será atualizado.' : ''}`,
    comparacaoCiclos
  ].filter(Boolean);
  texto(doc, 'Principais achados', M, 115, { size: 11, bold: true });
  let ya = 122;
  achados.forEach((t) => {
    doc.setFillColor(...PRETO);
    doc.circle(M + 1.2, ya - 1, 0.7, 'F');
    const linhas = texto(doc, t, M + 5, ya, { size: 9.5, max: LARG - 5 });
    ya += linhas * 4.6 + 2.6;
  });

  // ---------- PLANO DE ACAO E MANUAL ESTRATEGICO ----------
  const pgEstr = adicionarPaginasEstrategia(doc, {
    autoTable,
    A,
    B,
    prefixo: PREFIXO_CODIGO,
    orientacao: 'portrait',
    cabecalho: (d, t, st) => cabecalhoPagina(d, timbres, t, st),
    yInicio: 46,
    M
  });

  // ---------- 2. INDICADORES ----------
  doc.addPage();
  secoesPag.indicadores = doc.getNumberOfPages();
  cabecalhoPagina(doc, timbres, 'Indicadores por território', 'Indicadores da Nota Técnica MS 3/2025 por ciclo: IPO = positivas ÷ examinadas; IDO = ovos ÷ positivas; IDV = ovos ÷ examinadas. O nome do bairro tem a cor da faixa do seu pior foco.');

  const linhaInd = (nome, la, lb) => {
    const a = indicadores(la);
    const b = indicadores(lb);
    const linha = [
      nome,
      String(a.total),
      String(a.lidas),
      String(a.pos),
      nInt(a.ovos),
      `${n1(a.ipo)}%`,
      n1(a.ido),
      a.lidas ? n1(a.idv) : '-',
      String(b.lidas),
      String(b.pos),
      nInt(b.ovos),
      b.lidas ? `${n1(b.ipo)}%` : '-',
      b.lidas ? n1(b.ido) : '-',
      b.lidas ? n1(b.idv) : '-'
    ];
    linha.idos = { 6: a.lidas ? a.ido : null, 12: b.lidas ? b.ido : null }; // para a bolinha de cor
    return linha;
  };
  const cab = [
    [
      { content: '', rowSpan: 2 },
      { content: 'Armad.', rowSpan: 2 },
      { content: 'CICLO A', colSpan: 6, styles: { halign: 'center' } },
      { content: parcialB ? 'CICLO B (parcial)' : 'CICLO B', colSpan: 6, styles: { halign: 'center' } }
    ],
    ['Lidas', 'Pos.', 'Ovos', 'IPO', 'IDO', 'IDV', 'Lidas', 'Pos.', 'Ovos', 'IPO', 'IDO', 'IDV']
  ];
  const piorGeral = AB.filter(temLeitura).reduce((m, a) => Math.max(m, Number(a.ultimosOvos)), 0);
  const coresNomes = new Map([
    ...coresDosBairros(AB, bairroDe),
    ...coresDosBairros(AB, macroDe),
    ['MUNICÍPIO', corTextoDaFaixa(faixaDeOvos(piorGeral).id)]
  ]);
  const estiloTab = {
    styles: { fontSize: 7.4, cellPadding: 1.5, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1, halign: 'right' },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: 0.3, halign: 'center' },
    columnStyles: { 0: { halign: 'left', cellWidth: 36, fontStyle: 'bold' } },
    margin: { left: M, right: M },
    // Nome do bairro/regiao na cor da faixa do pior foco (Ambas)
    didParseCell: (d) => {
      if (d.section !== 'body' || d.column.index !== 0) return;
      const c = coresNomes.get(String(d.row.raw && d.row.raw[0]));
      if (c) d.cell.styles.textColor = c;
    },
    // Bolinha na cor do padrao (5 cores) ao lado do IDO: media de ovos por armadilha positiva
    didDrawCell: (d) => {
      if (d.section !== 'body') return;
      const v = d.row.raw && d.row.raw.idos ? d.row.raw.idos[d.column.index] : undefined;
      if (v === undefined || v === null) return;
      d.doc.setFillColor(faixaDeOvos(v).cor);
      d.doc.circle(d.cell.x + 2.4, d.cell.y + d.cell.height / 2, 1.15, 'F');
    }
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

  // ---------- INDICADORES DE AMBAS (A ou B): sempre os tres: A, B e Ambas ----------
  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Indicadores por território — Ambas', 'Ciclo A e Ciclo B juntos: ovos somados; armadilha positiva se foi positiva em A ou em B. IDO e IDV usam as palhetas lidas. A cor usa a média por palheta.');
  const linhaAmbas = (nome, lista) => {
    const ind = indicadores(lista);
    const linha = [
      nome,
      String(lista.length),
      String(ind.lidas),
      String(ind.pos),
      nInt(ind.ovos),
      ind.lidas ? `${n1(ind.ipo)}%` : '-',
      ind.pos ? n1(ind.ido) : '-',
      ind.lidas ? n1(ind.idv) : '-'
    ];
    linha.idos = { 6: ind.pos ? ind.ido : null };
    return linha;
  };
  const cabAmbas = [['Local', 'Armad.', 'Lidas (A ou B)', 'Pos.', 'Ovos (A + B)', 'IPO', 'IDO', 'IDV']];
  const estiloAmbas = {
    ...estiloTab,
    columnStyles: { 0: { halign: 'left', cellWidth: 52, fontStyle: 'bold' }, }
  };
  texto(doc, 'Por região do município', M, 47, { size: 10, bold: true });
  const abMacro = agrupar(AB, macroDe);
  autoTable(doc, {
    ...estiloAmbas,
    startY: 50,
    head: cabAmbas,
    body: [...ORDEM_MACRO.filter((k) => abMacro.has(k)).map((k) => linhaAmbas(k, abMacro.get(k))), linhaAmbas('MUNICÍPIO', AB)]
  });
  const yAmb = doc.lastAutoTable.finalY + 10;
  texto(doc, 'Por bairro / localidade', M, yAmb, { size: 10, bold: true });
  const abBairro = agrupar(AB, bairroDe);
  autoTable(doc, {
    ...estiloAmbas,
    startY: yAmb + 3,
    head: cabAmbas,
    body: ordemB.map((k) => linhaAmbas(k, abBairro.get(k) || []))
  });

  // ---------- 3-5. GRAFICOS (1 por pagina) ----------
  doc.addPage();
  secoesPag.anexoA = doc.getNumberOfPages();
  cabecalhoPagina(doc, timbres, 'Anexo A · Gráfico 1 — Ciclo A', 'Armadilhas por faixa de risco em cada bairro. Ciclo A completo: 56 de 56 palhetas lidas.');
  graficoEstratos(doc, ordemB, A);

  doc.addPage();
  cabecalhoPagina(doc, timbres, `Anexo A · Gráfico 2 — ${rotB}`, parcialB ? `Armadilhas por faixa de risco em cada bairro. Ciclo B parcial: ${iB.lidas} de ${iB.total} palhetas lidas. Armadilhas sem leitura não entram.` : `Armadilhas por faixa de risco em cada bairro. Ciclo B completo: ${iB.lidas} de ${iB.total} palhetas lidas.`);
  graficoEstratos(doc, ordemB, B);

  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Anexo A · Gráfico 3 — Ambas: Ciclo A e Ciclo B', 'Armadilhas por faixa de risco em cada bairro. Ovos de A e B somados (total ao lado); a faixa usa a média por palheta (soma ÷ palhetas lidas).');
  graficoEstratos(doc, ordemB, AB);

  doc.addPage();
  cabecalhoPagina(doc, timbres, 'Anexo A · Gráfico 4 — Ambas: positividade A × B', 'Positividade (IPO) por bairro, os dois ciclos lado a lado. A cor é a faixa do pior foco do bairro.');
  graficoAmbas(doc, ordemB, A, B);

  // ---------- MAPAS DE CALOR: cidade e distritos, por ciclo ----------
  secoesPag.anexoB = doc.getNumberOfPages() + 1;
  await paginasMapasCiclo(doc, timbres, A, 'Ciclo A', 'Escala oficial de 5 cores: azul (0), verde, amarelo, laranja e vermelho (mais de 100 ovos).', usarSat);
  await paginasMapasCiclo(doc, timbres, B, rotB, parcialB ? `Somente palhetas já lidas (${iB.lidas} de ${iB.total}).` : `Ciclo B completo: ${iB.lidas} de ${iB.total} palhetas lidas.`, usarSat);
  await paginasMapasCiclo(doc, timbres, AB, 'Ambas', 'Ciclo A e Ciclo B juntos: o calor usa a média por palheta (soma dos ovos de A e B ÷ palhetas lidas).', usarSat);

  // ---------- 9-10. INVENTARIO ANONIMO ----------
  doc.addPage();
  secoesPag.anexoC = doc.getNumberOfPages();
  cabecalhoPagina(doc, timbres, 'Anexo C · Inventário das 56 ovitrampas', 'Identificação anônima por código técnico, bairro e quarteirão. Sem nomes de moradores e sem endereços.');
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
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 1) {
        const c = coresNomes.get(bairroDe(ordenadas[d.row.index]));
        if (c) {
          d.cell.styles.textColor = c;
          d.cell.styles.fontStyle = 'bold';
        }
      }
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
  secoesPag.metodologia = doc.getNumberOfPages();
  cabecalhoPagina(doc, timbres, 'Metodologia, referências e responsabilidade técnica');
  const blocos = [
    ['Objetivo', 'Monitorar a densidade de ovos de Aedes aegypti por meio de ovitrampas distribuídas no município, para orientar ações de controle vetorial.'],
    ['Método', 'Cada ovitrampa recebe uma palheta que fica exposta por 5 dias. Após o recolhimento, os ovos de cada palheta são contados em laboratório. Foram realizados dois ciclos: A (palhetas com final A) e B (palhetas com final B).'],
    ['Indicadores', 'Conforme a Nota Técnica MS nº 3/2025 (item 4.27): IPO (índice de positividade) = armadilhas positivas × 100 ÷ armadilhas examinadas; IDO (índice de densidade de ovos) = ovos ÷ armadilhas positivas; IDV (índice de densidade vetorial) = ovos ÷ armadilhas examinadas, positivas ou não. No "Ambas", os ovos de A e B são somados; a armadilha é positiva se foi positiva em A ou em B; IDO e IDV usam as palhetas lidas.'],
    ['Escala de risco', '0 ovos: negativa · 1 a 20: baixa · 21 a 50: média · 51 a 100: alta · mais de 100: crítica. É a escala por palheta adotada pelo programa municipal nos mapas e gráficos (a nota técnica define IPO, IDO e IDV, sem faixas por quantidade de ovos). No "Ambas" a faixa usa a média por palheta.'],
    ['Anonimização', 'As armadilhas são identificadas por códigos técnicos (P-01 a P-56). Os resultados são apresentados por bairro, microárea e quarteirão, sem nomes de moradores nem endereços.'],
    ['Referências', 'BRASIL. Ministério da Saúde. Secretaria de Vigilância em Saúde e Ambiente. Nota Técnica nº 3/2025-CGARB/DEDT/SVSA/MS: vigilância entomológica de Aedes aegypti e Aedes albopictus com armadilhas ovitrampas (SEI 25000.004576/2025-33). BRASIL. Ministério da Saúde. Nota Técnica nº 33/2022-CGARB/DEIDT/SVS/MS: recomendações para a implementação da vigilância entomológica com armadilhas de oviposição.'],
    ['Limitações', parcialB ? `O Ciclo B está parcial (${iB.lidas} de ${iB.total} palhetas lidas) e será atualizado. O Ambas soma os ovos de A e de B das palhetas já lidas e será atualizado.` : `Os Ciclos A e B estão completos (${iA.lidas} e ${iB.lidas} de ${iA.total} palhetas lidas). Quando a mesma palheta foi lida mais de uma vez (recontagem), vale a leitura mais recente. O Ambas soma os ovos de A e de B; a faixa de risco usa a média por palheta.`]
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
  const assinaturas = [
    ['Almir Lemgruber', 'Responsável Técnico'],
    ['Larissa Araujo', 'Responsável Técnico'],
    ['Joice Gama Lopes', 'Coordenação'],
    ['Paula Adriana de Miranda', 'Coordenação']
  ];
  const colA = (W - 2 * M - 3 * 4) / 4;
  assinaturas.forEach(([nome, cargo], i) => {
    const x0 = M + i * (colA + 4);
    doc.line(x0, ys, x0 + colA, ys);
    texto(doc, nome, x0 + colA / 2, ys + 5, { size: 8.5, bold: true, align: 'center' });
    texto(doc, cargo, x0 + colA / 2, ys + 9, { size: 7.5, cor: CINZA, align: 'center' });
    texto(doc, 'Vigilância Entomológica · Carmo/RJ', x0 + colA / 2, ys + 12.5, { size: 6.5, cor: CINZA, align: 'center' });
  });

  // ---------- sumario (pagina 2) com os numeros reais ----------
  doc.setPage(paginaSumario);
  cabecalhoPagina(doc, timbres, 'Sumário', 'Conteúdo deste relatório. Mapas, gráficos e inventário estão nos anexos.');
  const itensSumario = [
    ['Resumo executivo', secoesPag.resumo],
    ['Plano de ação — o que fazer, por prioridade', pgEstr.paginaPlano],
    ['Manual estratégico — próxima semana, próximo ciclo e próximo mês', pgEstr.paginaManual],
    ['Indicadores por território (Ciclo A, Ciclo B e Ambas)', secoesPag.indicadores],
    ['Anexo A — Gráficos (Ciclo A, Ciclo B e Ambas)', secoesPag.anexoA],
    ['Anexo B — Mapas de calor: município, cidade e distritos', secoesPag.anexoB],
    ['Anexo C — Inventário das 56 ovitrampas', secoesPag.anexoC],
    ['Metodologia, referências e assinaturas', secoesPag.metodologia]
  ];
  let ySum = 56;
  itensSumario.forEach(([t, pg]) => {
    texto(doc, t, M, ySum, { size: 10.5 });
    const larg = doc.getTextWidth(t);
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([0.6, 1.2], 0);
    doc.line(M + larg + 3, ySum - 0.8, W - M - 9, ySum - 0.8);
    doc.setLineDashPattern([], 0);
    texto(doc, String(pg), W - M, ySum, { size: 10.5, bold: true, align: 'right' });
    ySum += 11;
  });

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
  doc.save(`${interno ? 'RELATORIO_RESULTADOS_INTERNO_CARMO' : 'RELATORIO_TECNICO_SES-RJ_CARMO'}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
