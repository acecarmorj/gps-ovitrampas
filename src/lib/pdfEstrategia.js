/**
 * Paginas de PLANO DE ACAO e MANUAL ESTRATEGICO (final dos relatorios).
 * Tudo calculado com os dados do ciclo; as acoes seguem a Nota Tecnica MS n. 3/2025 (itens 4.25, 4.29 e 4.30):
 *  - alta infestacao / indicadores em elevacao: inspecao e intensificacao das acoes num raio de 200 m das ovitrampas;
 *  - medidas: controle mecanico (residuos, reservatorios), larvicida em depositos de agua A1/A2, residual em PE/IE,
 *    nebulizacao UBV somente mediante notificacao de casos;
 *  - periodicidade: semanal ou quinzenal nas areas prioritarias, mensal nas demais; palheta trocada em 5 dias.
 * Os PRAZOS (48 h, 7 dias, proximo ciclo) sao sugestao tecnica para validacao da coordenacao.
 */
import { faixaDeOvos, temLeitura, corTextoDaFaixa, FAIXAS_RISCO } from './mapaPoligonos';

const PRETO = [17, 17, 17];
const CINZA = [90, 90, 90];
const LINHA = [200, 200, 200];

const PRIORIDADE = {
  critica: { nome: 'Imediata', prazo: 'até 48 horas', acao: 'Inspeção e controle vetorial em raio de 200 m: eliminar depósitos, tratar reservatórios (A1/A2), educação em saúde e mobilização.' },
  alta: { nome: 'Alta', prazo: 'até 7 dias', acao: 'Mesma ação em raio de 200 m, com vistoria dos reservatórios e dos pontos estratégicos próximos.' },
  media: { nome: 'Média', prazo: 'no próximo ciclo', acao: 'Vistoria de quintais e reservatórios do entorno e reforço da educação em saúde.' },
  baixa: { nome: 'Baixa', prazo: 'rotina', acao: 'Manter o monitoramento e a orientação à população.' },
  negativa: { nome: 'Baixa', prazo: 'rotina', acao: 'Manter o monitoramento e a orientação à população.' },
  sem_leitura: { nome: 'Pendente', prazo: 'ao lançar a leitura', acao: 'Concluir a leitura da palheta no laboratório e reavaliar.' }
};

const ordemFaixa = { critica: 5, alta: 4, media: 3, baixa: 2, negativa: 1, sem_leitura: 0 };

function bairroDe(a) {
  return (a.bairro || a.microarea || 'Sem bairro').trim();
}

/** Junta A e B por armadilha e resume por bairro. */
export function montarEstrategia(A = [], B = [], prefixo = 'P') {
  const porB = new Map(B.map((b) => [String(b.numero), b]));
  const cod = (a) => `${prefixo}-${String(a.numero).padStart(2, '0')}`;

  const armadilhas = A.map((a) => {
    const b = porB.get(String(a.numero));
    const oA = temLeitura(a) ? Number(a.ultimosOvos) : null;
    const oB = b && temLeitura(b) ? Number(b.ultimosOvos) : null;
    const max = oA === null && oB === null ? null : Math.max(oA ?? -1, oB ?? -1);
    return {
      codigo: cod(a),
      bairro: bairroDe(a),
      quarteirao: a.quarteirao && !/distrito/i.test(a.quarteirao) ? a.quarteirao : '-',
      oA,
      oB,
      max,
      faixa: faixaDeOvos(max)
    };
  });

  const porBairro = new Map();
  armadilhas.forEach((t) => {
    if (!porBairro.has(t.bairro)) porBairro.set(t.bairro, []);
    porBairro.get(t.bairro).push(t);
  });

  const bairros = Array.from(porBairro.entries()).map(([nome, lista]) => {
    const lidas = lista.filter((t) => t.max !== null);
    const pior = lidas.length ? lidas.reduce((m, t) => (t.max > m.max ? t : m), lidas[0]) : null;
    // tendencia: so armadilhas lidas nos DOIS ciclos (comparacao justa)
    const pares = lista.filter((t) => t.oA !== null && t.oB !== null);
    const somaA = pares.reduce((s, t) => s + t.oA, 0);
    const somaB = pares.reduce((s, t) => s + t.oB, 0);
    let tendencia = 'Aguardando B';
    if (pares.length) tendencia = somaB > somaA ? `Elevação (+${somaB - somaA} ovos)` : somaB < somaA ? `Queda (${somaB - somaA} ovos)` : 'Estável';
    const faixa = faixaDeOvos(pior ? pior.max : null);
    return { nome, total: lista.length, pior, faixa, tendencia, elevacao: pares.length > 0 && somaB > somaA, pendentesB: lista.filter((t) => t.oB === null).length };
  });
  bairros.sort((x, y) => (ordemFaixa[y.faixa.id] - ordemFaixa[x.faixa.id]) || ((y.pior?.max ?? -1) - (x.pior?.max ?? -1)));

  const focos = armadilhas
    .filter((t) => t.max !== null && t.max > 50)
    .sort((x, y) => y.max - x.max);
  const pendentesB = armadilhas.filter((t) => t.oB === null).length;

  return { armadilhas, bairros, focos, pendentesB, totalArmadilhas: armadilhas.length };
}

function texto(doc, t, x, y, { size = 9, bold = false, cor = PRETO, max, align = 'left' } = {}) {
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

/**
 * Adiciona as paginas ao final do documento.
 * ctx: { autoTable, A, B, prefixo, orientacao ('portrait'|'landscape'), cabecalho(doc, titulo, subtitulo), yInicio, M }
 */
export function adicionarPaginasEstrategia(doc, ctx) {
  const { autoTable, A, B, prefixo = 'P', orientacao = 'portrait', cabecalho, yInicio = 46, M = 15 } = ctx;
  const e = montarEstrategia(A, B, prefixo);
  const novaPagina = () => doc.addPage('a4', orientacao);
  const W = () => doc.internal.pageSize.getWidth();
  const H = () => doc.internal.pageSize.getHeight();
  const LARG = () => W() - 2 * M;

  // ================= PLANO DE ACAO =================
  novaPagina();
  cabecalho(doc, 'Plano de ação — o que fazer, por prioridade', 'Prioridade por bairro (cor do nome = faixa do pior foco). Comparação do Ciclo B com o Ciclo A nas armadilhas lidas nos dois.');
  let chamadasPlano = 0;

  autoTable(doc, {
    startY: yInicio,
    margin: { left: M, right: M, top: yInicio, bottom: 16 },
    head: [['Bairro / local', 'Armad.', 'Pior foco', 'Tendência (A para B)', 'Prioridade', 'Prazo sugerido']],
    body: e.bairros.map((b) => [
      b.nome,
      String(b.total),
      b.pior ? `${b.pior.codigo} · ${b.pior.max} ovos` : 'sem leitura',
      b.tendencia,
      PRIORIDADE[b.faixa.id].nome,
      PRIORIDADE[b.faixa.id].prazo
    ]),
    styles: { fontSize: 8, cellPadding: 1.7, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: { bottom: 0.4 } },
    columnStyles: { 0: { fontStyle: 'bold' }, 4: { cellPadding: { left: 6, top: 1.7, bottom: 1.7, right: 1.7 } } },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const b = e.bairros[d.row.index];
      if (d.column.index === 0) d.cell.styles.textColor = corTextoDaFaixa(b.faixa.id);
      if (d.column.index === 3 && b.elevacao) d.cell.styles.fontStyle = 'bold';
    },
    didDrawCell: (d) => {
      if (d.section === 'body' && d.column.index === 4) {
        d.doc.setFillColor(e.bairros[d.row.index].faixa.cor);
        d.doc.circle(d.cell.x + 3, d.cell.y + d.cell.height / 2, 1.3, 'F');
      }
    },
    didDrawPage: () => {
      if (chamadasPlano++ > 0) cabecalho(doc, 'Plano de ação — continuação', '');
    }
  });

  let y = doc.lastAutoTable.finalY + 8;
  if (y > H() - 60) {
    novaPagina();
    cabecalho(doc, 'Plano de ação — focos que exigem ação', '');
    y = yInicio;
  }
  texto(doc, 'Focos que exigem ação (acima de 50 ovos em A ou em B)', M, y, { size: 10, bold: true });
  y += 3;
  if (e.focos.length === 0) {
    texto(doc, 'Nenhuma armadilha acima de 50 ovos nos ciclos lidos.', M, y + 5, { size: 9, cor: CINZA });
    y += 10;
  } else {
    let chamadasFocos = 0;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: yInicio, bottom: 16 },
      head: [['Armadilha', 'Bairro · quarteirão', 'Ovos A', 'Ovos B', 'Prioridade', 'Prazo sugerido']],
      body: e.focos.map((t) => [
        t.codigo,
        `${t.bairro}${t.quarteirao !== '-' ? ` · ${t.quarteirao}` : ''}`,
        t.oA === null ? '-' : String(t.oA),
        t.oB === null ? 'Aguardando' : String(t.oB),
        PRIORIDADE[t.faixa.id].nome,
        PRIORIDADE[t.faixa.id].prazo
      ]),
      styles: { fontSize: 8, cellPadding: 1.6, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: { bottom: 0.4 } },
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { cellPadding: { left: 6, top: 1.6, bottom: 1.6, right: 1.6 } } },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 1) d.cell.styles.textColor = corTextoDaFaixa(e.focos[d.row.index].faixa.id);
      },
      didDrawCell: (d) => {
        if (d.section === 'body' && d.column.index === 4) {
          d.doc.setFillColor(e.focos[d.row.index].faixa.cor);
          d.doc.circle(d.cell.x + 3, d.cell.y + d.cell.height / 2, 1.3, 'F');
        }
      },
      didDrawPage: () => {
        if (chamadasFocos++ > 0) cabecalho(doc, 'Plano de ação — continuação', '');
      }
    });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (y > H() - 30) {
    novaPagina();
    cabecalho(doc, 'Plano de ação — observações', '');
    y = yInicio;
  }
  texto(
    doc,
    'Referência: Nota Técnica MS nº 3/2025 (itens 4.29 e 4.30): com indicadores em elevação em relação ao último monitoramento, as áreas devem ser inspecionadas e as ações de controle, educação em saúde e mobilização intensificadas em raio de 200 m ao redor das ovitrampas. A escala de faixas é por palheta; o "pior foco" usa a maior contagem entre A e B. Prazos são sugestão técnica, para validação da coordenação.',
    M,
    y,
    { size: 7.5, cor: CINZA, max: LARG() }
  );

  // ================= MANUAL ESTRATEGICO =================
  novaPagina();
  cabecalho(doc, 'Manual estratégico — próxima semana, próximo ciclo e próximo mês', 'Roteiro para conduzir a situação atual. Ajustar conforme a avaliação da coordenação.');
  let ym = yInicio;
  const pontos = e.focos.length;
  const elevados = e.bairros.filter((b) => b.elevacao).map((b) => b.nome);
  const blocos = [
    {
      titulo: 'PRÓXIMA SEMANA (até 7 dias)',
      itens: [
        pontos
          ? `Inspecionar e intensificar o controle vetorial, a educação em saúde e a mobilização em raio de 200 m ao redor das ${pontos} armadilhas acima de 50 ovos (lista no plano de ação), começando pelas acima de 100 ovos (até 48 horas).`
          : 'Manter a vistoria de rotina; não há armadilha acima de 50 ovos nos ciclos lidos.',
        elevados.length
          ? `Priorizar os bairros com elevação do Ciclo A para o Ciclo B: ${elevados.join(', ')}.`
          : 'Acompanhar a tendência dos bairros assim que as palhetas do Ciclo B forem concluídas.',
        e.pendentesB
          ? `Concluir no laboratório a leitura das ${e.pendentesB} palhetas do Ciclo B ainda pendentes e atualizar os relatórios.`
          : 'Ciclo B completo: atualizar os relatórios e comparar com o Ciclo A.',
        'Medidas de controle (NT MS 3/2025, item 4.30): controle mecânico de depósitos (gestão de resíduos sólidos e manutenção de reservatórios), vistoria e larvicida em depósitos de água A1/A2 quando aplicável, e inseticida residual em pontos estratégicos e imóveis especiais.',
        'Nebulização com Ultra Baixo Volume somente mediante notificação de casos, para bloqueio de transmissão.'
      ]
    },
    {
      titulo: 'PRÓXIMO CICLO (nova exposição de 5 dias)',
      itens: [
        'Trocar as palhetas das mesmas ovitrampas, respeitando os 5 dias de exposição (NT MS 3/2025, item 4.19), sem ultrapassar o prazo de recolhimento.',
        'Registrar avarias, palhetas perdidas e armadilhas sem água no Boletim de Ovitrampas.',
        'Após a leitura, calcular IPO, IDO e IDV (ovos ÷ armadilhas examinadas) e comparar com este ciclo.',
        'Critério: se os indicadores subirem em relação a este ciclo, intensificar as ações em raio de 200 m; se caírem, manter e reavaliar a prioridade do local.'
      ]
    },
    {
      titulo: 'PRÓXIMO MÊS',
      itens: [
        'Consolidar a série de ciclos (A, B e os seguintes) por bairro e quarteirão e revisar a lista de prioridades.',
        'Definir a periodicidade conforme a capacidade: semanal ou quinzenal nas áreas prioritárias e mensal nas demais (NT MS 3/2025, item 4.25).',
        'Planejar o levantamento de índice amostral (LIRAa ou LIA) antes do período sazonal de transmissão (item 4.26).',
        'Avaliar, nos bairros que seguem em risco, o tratamento residual em pontos estratégicos e imóveis especiais e a necessidade de novas ovitrampas nos quarteirões sem armadilha.'
      ]
    }
  ];

  const largTexto = LARG() - 8;
  blocos.forEach((bl) => {
    // altura estimada do bloco
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    const linhasPorItem = bl.itens.map((it) => doc.splitTextToSize(it, largTexto - 4));
    const alt = 9 + linhasPorItem.reduce((s, l) => s + l.length * 4 + 1.6, 0) + 3;
    if (ym + alt > H() - 16) {
      novaPagina();
      cabecalho(doc, 'Manual estratégico — continuação', '');
      ym = yInicio;
    }
    doc.setDrawColor(...PRETO);
    doc.setLineWidth(0.4);
    doc.rect(M, ym, LARG(), alt);
    texto(doc, bl.titulo, M + 4, ym + 6, { size: 9.5, bold: true });
    let yy = ym + 11.5;
    linhasPorItem.forEach((linhas) => {
      doc.setFillColor(...PRETO);
      doc.circle(M + 5, yy - 1, 0.6, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(...PRETO);
      doc.text(linhas, M + 8, yy);
      yy += linhas.length * 4 + 1.6;
    });
    ym += alt + 5;
  });

  // quadro: como agir por faixa
  if (ym + 52 > H() - 16) {
    novaPagina();
    cabecalho(doc, 'Manual estratégico — como agir por faixa', '');
    ym = yInicio;
  }
  texto(doc, 'Como agir por faixa de risco', M, ym + 2, { size: 10, bold: true });
  autoTable(doc, {
    startY: ym + 5,
    margin: { left: M, right: M, bottom: 16 },
    head: [['Faixa (ovos por palheta)', 'Prioridade', 'Prazo sugerido', 'Ação']],
    body: [...FAIXAS_RISCO].reverse().map((f) => [f.label, PRIORIDADE[f.id].nome, PRIORIDADE[f.id].prazo, PRIORIDADE[f.id].acao]),
    styles: { fontSize: 8, cellPadding: 1.7, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: { bottom: 0.4 } },
    columnStyles: { 0: { fontStyle: 'bold', cellPadding: { left: 6, top: 1.7, bottom: 1.7, right: 1.7 }, cellWidth: 38 }, 1: { cellWidth: 22 }, 2: { cellWidth: 28 } },
    didDrawCell: (d) => {
      if (d.section === 'body' && d.column.index === 0) {
        d.doc.setFillColor([...FAIXAS_RISCO].reverse()[d.row.index].cor);
        d.doc.circle(d.cell.x + 3, d.cell.y + d.cell.height / 2, 1.3, 'F');
      }
    }
  });
}
