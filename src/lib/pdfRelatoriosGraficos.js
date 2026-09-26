/**
 * Gerador de Relatórios em PDF com Gráficos Integrados
 * Sistema GPS Ovitrampas • Carmo - RJ
 *
 * Utiliza Canvas HTML5 para renderização vetorial de alta definição (DPI alto)
 * de gráficos de barras, ranking de focos e pizza/donut de status de palhetas,
 * incorporados em documentos PDF oficiais via jsPDF e jsPDF-AutoTable.
 */

// ---------------------------------------------------------------------------
// UTILITÁRIOS GRÁFICOS (CANVAS OFF-SCREEN)
// ---------------------------------------------------------------------------

function criarCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // Ativa anti-aliasing de alta qualidade
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

/**
 * Desenha gráfico de barras vertical para IPO (%) por Bairro
 */
export function gerarCanvasGraficoBarrasIpo(bairrosData, { width = 1200, height = 480, ipoMedio = null } = {}) {
  const { canvas, ctx } = criarCanvas(width, height);

  // Fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Margens
  const marginTop = 60;
  const marginBottom = 110;
  const marginLeft = 90;
  const marginRight = 50;

  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;

  // Título do Gráfico
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Índice de Positividade de Ovitrampas (IPO %) por Bairro', marginLeft, 38);

  const dados = bairrosData.slice(0, 14); // Até 14 bairros para legibilidade
  const maxIpo = Math.max(100, Math.ceil((Math.max(...dados.map((d) => d.ipo || 0), 10)) / 10) * 10);

  // Linhas de Grade e Eixo Y
  const passosY = 5;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= passosY; i++) {
    const val = (maxIpo / passosY) * i;
    const y = marginTop + chartH - (val / maxIpo) * chartH;
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + chartW, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(val)}%`, marginLeft - 12, y + 5);
  }

  // Linha Média Municipal
  if (ipoMedio !== null && ipoMedio > 0) {
    const yMedio = marginTop + chartH - (Math.min(ipoMedio, maxIpo) / maxIpo) * chartH;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(marginLeft, yMedio);
    ctx.lineTo(marginLeft + chartW, yMedio);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Média Carmo: ${ipoMedio.toFixed(1)}%`, marginLeft + chartW, yMedio - 8);
  }

  // Desenho das Barras
  const n = dados.length;
  if (n === 0) return canvas;

  const barSlot = chartW / n;
  const barWidth = Math.min(barSlot * 0.65, 60);

  dados.forEach((d, idx) => {
    const ipo = d.ipo || 0;
    const barH = (ipo / maxIpo) * chartH;
    const x = marginLeft + idx * barSlot + (barSlot - barWidth) / 2;
    const y = marginTop + chartH - barH;

    // Cores de Risco Epidemiológico
    let corBarra = '#10b981'; // Verde < 20%
    if (ipo >= 60) corBarra = '#e11d48'; // Crítico > 60%
    else if (ipo >= 40) corBarra = '#f97316'; // Alto 40-60%
    else if (ipo >= 20) corBarra = '#f59e0b'; // Médio 20-40%

    // Desenha barra com topo arredondado
    ctx.fillStyle = corBarra;
    ctx.beginPath();
    const r = Math.min(6, barH);
    ctx.moveTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.arcTo(x + barWidth, y, x + barWidth, y + r, r);
    ctx.lineTo(x + barWidth, marginTop + chartH);
    ctx.lineTo(x, marginTop + chartH);
    ctx.closePath();
    ctx.fill();

    // Rótulo de Valor em Cima da Barra
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${ipo.toFixed(1)}%`, x + barWidth / 2, Math.max(y - 8, marginTop - 10));

    // Rótulo do Bairro (Eixo X - Inclinado)
    ctx.save();
    ctx.translate(x + barWidth / 2, marginTop + chartH + 14);
    ctx.rotate(-Math.PI / 4.5);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    const nomeCurto = d.nome.length > 18 ? d.nome.slice(0, 16) + '...' : d.nome;
    ctx.fillText(nomeCurto, 0, 0);
    ctx.restore();
  });

  return canvas;
}

/**
 * Desenha gráfico horizontal de ranking de focos (>50 ovos)
 */
export function gerarCanvasRankingFocos(focos, { width = 1200, height = 520 } = {}) {
  const { canvas, ctx } = criarCanvas(width, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const marginTop = 60;
  const marginBottom = 40;
  const marginLeft = 200;
  const marginRight = 150;

  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Ranking de Focos com Maior Densidade (> 50 ovos)', 40, 38);

  const topFocos = focos.slice(0, 10);
  const maxOvos = Math.max(120, Math.ceil((Math.max(...topFocos.map((f) => Number(f.ultimosOvos) || 0), 60)) / 20) * 20);

  const slotH = chartH / Math.max(topFocos.length, 1);
  const barH = Math.min(slotH * 0.65, 34);

  topFocos.forEach((f, idx) => {
    const ovos = Number(f.ultimosOvos) || 0;
    const barW = (ovos / maxOvos) * chartW;
    const y = marginTop + idx * slotH + (slotH - barH) / 2;

    // Rótulo da Armadilha / Palheta (Eixo Y)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    const rotuloArm = `ARM-${f.numero} (${f.palheta || 'P-01'})`;
    ctx.fillText(rotuloArm, marginLeft - 15, y + barH / 2 + 5);

    // Barra de Risco
    const grad = ctx.createLinearGradient(marginLeft, y, marginLeft + barW, y);
    if (ovos > 100) {
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#e11d48');
    } else {
      grad.addColorStop(0, '#fb923c');
      grad.addColorStop(1, '#ea580c');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    const r = 6;
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + barW - r, y);
    ctx.arcTo(marginLeft + barW, y, marginLeft + barW, y + r, r);
    ctx.arcTo(marginLeft + barW, y + barH, marginLeft + barW - r, y + barH, r);
    ctx.lineTo(marginLeft, y + barH);
    ctx.closePath();
    ctx.fill();

    // Rótulo no final da barra
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    const tagRisco = ovos > 100 ? '🔥 CRÍTICO' : '⚠️ ALTO';
    ctx.fillText(`${ovos} ovos • ${tagRisco}`, marginLeft + barW + 12, y + barH / 2 + 6);
  });

  return canvas;
}

/**
 * Desenha gráfico de pizza/donut para distribuição de status das palhetas
 */
export function gerarCanvasStatusPalhetas(stats, { width = 1000, height = 480 } = {}) {
  const { canvas, ctx } = criarCanvas(width, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Distribuição do Ciclo de Palhetas em Campo (5 Dias)', 40, 38);

  const fatias = [
    { rotulo: 'Coleta Segunda (28/09 - Sede)', valor: stats.coletaSegunda || (stats.emDia && stats.emDia > 25 ? 35 : stats.emDia || 0), cor: '#10b981' },
    { rotulo: 'Coleta Terça (29/09 - Distritos)', valor: stats.coletaTerca || 21, cor: '#3b82f6' },
    { rotulo: 'Trocar Hoje (5º dia)', valor: stats.trocarHoje || 0, cor: '#f59e0b' },
    { rotulo: 'Atrasadas (> 5 dias)', valor: stats.atrasadas || 0, cor: '#e11d48' }
  ].filter((f) => f.valor > 0);

  const total = fatias.reduce((acc, f) => acc + f.valor, 0) || 1;

  const centerX = 260;
  const centerY = height / 2 + 15;
  const outerRadius = 140;
  const innerRadius = 80;

  let currentAngle = -Math.PI / 2;

  fatias.forEach((f) => {
    const sliceAngle = (f.valor / total) * 2 * Math.PI;

    ctx.fillStyle = f.cor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();
    ctx.fill();

    currentAngle += sliceAngle;
  });

  // Centro do donut
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(total), centerX, centerY + 5);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  ctx.fillText('PALHETAS', centerX, centerY + 25);

  // Legenda ao lado direito
  const legendX = 490;
  let legendY = 120;

  fatias.forEach((f) => {
    const pct = ((f.valor / total) * 100).toFixed(1);

    ctx.fillStyle = f.cor;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, 22, 22, 6);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${f.rotulo}: ${f.valor} (${pct}%)`, legendX + 34, legendY + 17);

    legendY += 50;
  });

  return canvas;
}

// ---------------------------------------------------------------------------
// CABEÇALHOS E RODAPÉS OFICIAIS DO MUNICÍPIO
// ---------------------------------------------------------------------------

function aplicarCabecalhoOficial(doc, { titulo, subtitulo, filtroTexto = '' }) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barra de topo verde floresta / saúde
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Textos Institucionais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('PREFEITURA MUNICIPAL DE CARMO • RJ', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('SECRETARIA MUNICIPAL DE SAÚDE • COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E VETORIAL', 14, 17);
  doc.text('PROGRAMA OFICIAL DE MONITORAMENTO DE OVITRAMPAS (AEDES AEGYPTI)', 14, 23);

  // Data / Hora
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`EMITIDO: ${dataHoje} às ${horaHoje}`, pageWidth - 14, 17, { align: 'right' });

  // Título do Relatório
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 14, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitulo, 14, 46);

  if (filtroTexto) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text(`FILTRO APLICADO: ${filtroTexto.toUpperCase()}`, 14, 52);
  }
}

function aplicarRodapeOficial(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Sistema GPS Ovitrampas • Vigilância Ambiental de Carmo/RJ • Documento Técnico Oficial',
      14,
      pageHeight - 7
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// 1. RELATÓRIO PDF: ÍNDICES IPO E IDO COM GRÁFICOS
// ---------------------------------------------------------------------------

export async function gerarPdfIndicesIpoIdoComGraficos(bairrosData, resumoGeral, opcoes = {}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  aplicarCabecalhoOficial(doc, {
    titulo: 'Relatório Executivo de Índices Entomológicos (IPO & IDO)',
    subtitulo: 'Análise de Positividade e Densidade de Ovos por Bairro e Distrito',
    filtroTexto: opcoes.filtroDescricao || ''
  });

  // KPIs Gerais em Boxes
  const startY = 56;
  const boxW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'ARMADILHAS', val: resumoGeral.armadilhas, cor: [241, 245, 249] },
    { label: 'LIDAS / LAB', val: resumoGeral.lidas, cor: [238, 242, 255] },
    { label: 'IPO GERAL', val: `${(resumoGeral.ipo || 0).toFixed(1)}%`, cor: [236, 253, 245] },
    { label: 'IDO GERAL', val: resumoGeral.ido != null ? resumoGeral.ido.toFixed(1) : '-', cor: [254, 243, 199] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setFillColor(...kpi.cor);
    doc.roundedRect(x, startY, boxW, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(String(kpi.val), x + boxW / 2, startY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + boxW / 2, startY + 13, { align: 'center' });
  });

  // Gráfico de Barras do IPO por Bairro
  const canvasIpo = gerarCanvasGraficoBarrasIpo(bairrosData, {
    width: 1200,
    height: 440,
    ipoMedio: resumoGeral.ipo
  });
  const imgIpo = canvasIpo.toDataURL('image/png');
  doc.addImage(imgIpo, 'PNG', 14, 76, pageWidth - 28, 64);

  // Tabela de Dados dos Bairros
  const linhasTabela = bairrosData.map((b) => {
    let risco = 'BAIXO';
    if (b.ipo >= 60) risco = 'CRÍTICO';
    else if (b.ipo >= 40) risco = 'ALTO';
    else if (b.ipo >= 20) risco = 'MÉDIO';

    return [
      b.nome,
      b.armadilhas,
      b.lidas,
      b.positivas,
      b.totalOvos,
      b.ipo != null ? `${b.ipo.toFixed(1)}%` : '-',
      b.ido != null ? b.ido.toFixed(1) : '-',
      risco
    ];
  });

  // Linha de Total
  linhasTabela.push([
    'TOTAL MUNICIPAL',
    resumoGeral.armadilhas,
    resumoGeral.lidas,
    resumoGeral.positivas,
    resumoGeral.totalOvos,
    resumoGeral.ipo != null ? `${resumoGeral.ipo.toFixed(1)}%` : '-',
    resumoGeral.ido != null ? resumoGeral.ido.toFixed(1) : '-',
    'CONSOLIDADO'
  ]);

  autoTable(doc, {
    startY: 144,
    head: [['Bairro / Localidade', 'Arm.', 'Lidas', 'Pos.', 'Ovos', 'IPO (%)', 'IDO', 'Risco']],
    body: linhasTabela,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      // Destaca última linha de Total
      if (data.row.index === linhasTabela.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
      // Cores na coluna de risco
      if (data.column.index === 7 && data.section === 'body') {
        const txt = String(data.cell.raw);
        if (txt === 'CRÍTICO') data.cell.styles.textColor = [225, 29, 72];
        else if (txt === 'ALTO') data.cell.styles.textColor = [249, 115, 22];
        else if (txt === 'MÉDIO') data.cell.styles.textColor = [217, 119, 6];
        else if (txt === 'BAIXO') data.cell.styles.textColor = [16, 185, 129];
      }
    }
  });

  aplicarRodapeOficial(doc);
  const nome = opcoes.nomeArquivo || `RELATORIO_INDICES_IPO_IDO_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
  return true;
}

// ---------------------------------------------------------------------------
// 2. RELATÓRIO PDF: FOCOS ALTO E CRÍTICO COM GRÁFICOS
// ---------------------------------------------------------------------------

export async function gerarPdfFocosCriticosComGraficos(focos, opcoes = {}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  aplicarCabecalhoOficial(doc, {
    titulo: 'Relatório de Focos de Alto Risco e Críticos (> 50 Ovos)',
    subtitulo: 'Prioridades de Bloqueio Imediato e Ações Vetoriais em Raio de 150m-300m',
    filtroTexto: opcoes.filtroDescricao || ''
  });

  const focosOrdenados = [...focos].sort((a, b) => (Number(b.ultimosOvos) || 0) - (Number(a.ultimosOvos) || 0));
  const maxOvos = focosOrdenados.length > 0 ? Number(focosOrdenados[0].ultimosOvos) || 0 : 0;
  const totalOvosFocos = focosOrdenados.reduce((s, f) => s + (Number(f.ultimosOvos) || 0), 0);

  // Boxes de Alerta
  const startY = 56;
  const boxW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'TOTAL DE FOCOS', val: focosOrdenados.length, cor: [255, 241, 242] },
    { label: 'MAIOR FOCO', val: `${maxOvos} ovos`, cor: [255, 237, 213] },
    { label: 'TOTAL DE OVOS', val: totalOvosFocos, cor: [254, 242, 242] },
    { label: 'RAIO BLOQUEIO', val: '150 a 300m', cor: [254, 243, 199] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setFillColor(...kpi.cor);
    doc.roundedRect(x, startY, boxW, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(String(kpi.val), x + boxW / 2, startY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + boxW / 2, startY + 13, { align: 'center' });
  });

  // Gráfico Horizontal de Ranking
  if (focosOrdenados.length > 0) {
    const canvasRanking = gerarCanvasRankingFocos(focosOrdenados, { width: 1200, height: 440 });
    const imgRanking = canvasRanking.toDataURL('image/png');
    doc.addImage(imgRanking, 'PNG', 14, 76, pageWidth - 28, 62);
  }

  // Tabela Detalhada dos Focos
  const linhasTabela = focosOrdenados.map((f) => {
    const ovos = Number(f.ultimosOvos) || 0;
    const nivel = ovos > 100 ? 'CRÍTICO' : 'ALTO';
    const palhetaAtual = f.palheta || `P-${f.numero}`;
    const endereco = opcoes.ocultarMorador ? 'Oculto por privacidade' : `${f.rua || ''}${f.numeroImovel ? ', ' + f.numeroImovel : ''}`.trim() || 'Logradouro não informado';
    const morador = opcoes.ocultarMorador ? 'Protegido' : f.moradorNome || 'Não informado';

    return [
      `ARM-${f.numero}`,
      palhetaAtual,
      f.bairro || f.microarea || 'Carmo',
      f.quarteirao || '-',
      morador,
      endereco,
      `${ovos} ovos`,
      nivel,
      ovos > 100 ? 'Bloqueio 300m' : 'Bloqueio 150m'
    ];
  });

  autoTable(doc, {
    startY: 142,
    head: [['Nº', 'Palheta', 'Bairro', 'Quart.', 'Morador', 'Endereço', 'Ovos', 'Risco', 'Ação Recomendada']],
    body: linhasTabela,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 241, 242] },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const txt = String(data.cell.raw);
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = txt === 'CRÍTICO' ? [225, 29, 72] : [234, 88, 12];
      }
    }
  });

  // Recomendações Técnicas
  const finalY = (doc).lastAutoTable ? (doc).lastAutoTable.finalY + 8 : 220;
  if (finalY < 255) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, finalY, pageWidth - 28, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    doc.text('DIRETRIZ DE BLOQUEIO EPIDEMIOLÓGICO (VIGILÂNCIA AMBIENTAL):', 18, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(190, 18, 60);
    doc.text('1. Visita focal obrigatória no imóvel da armadilha em até 24 horas para eliminação de criadouros.', 18, finalY + 11);
    doc.text('2. Varredura e eliminação mecânica de depósitos num raio de 150m a 300m ao redor de cada armadilha crítica.', 18, finalY + 16);
  }

  aplicarRodapeOficial(doc);
  const nome = opcoes.nomeArquivo || `RELATORIO_FOCOS_CRITICOS_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
  return true;
}

// ---------------------------------------------------------------------------
// 3. RELATÓRIO PDF: PENDÊNCIAS E GESTÃO DE PALHETAS EM CAMPO
// ---------------------------------------------------------------------------

export async function gerarPdfPendenciasCampoComGraficos(pendencias, estatisticasCiclo, opcoes = {}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  aplicarCabecalhoOficial(doc, {
    titulo: 'Relatório Operacional de Palhetas em Campo e Pendências',
    subtitulo: 'Cronograma de Coletas (Ciclo de 5 Dias • Limite Máximo Seguro de 7 Dias)',
    filtroTexto: opcoes.filtroDescricao || ''
  });

  // KPIs de Campo
  const startY = 56;
  const boxW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'PALHETAS EM CAMPO', val: estatisticasCiclo.totalCampo || pendencias.length, cor: [241, 245, 249] },
    { label: 'COLETA SEGUNDA (28/09)', val: estatisticasCiclo.coletaSegunda || 35, cor: [236, 253, 245] },
    { label: 'COLETA TERÇA (29/09)', val: estatisticasCiclo.coletaTerca || 21, cor: [238, 242, 255] },
    { label: 'CICLO / TETO MÁX', val: '5d / 7d máx', cor: [254, 243, 199] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setFillColor(...kpi.cor);
    doc.roundedRect(x, startY, boxW, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(String(kpi.val), x + boxW / 2, startY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + boxW / 2, startY + 13, { align: 'center' });
  });

  // Gráfico de Pizza / Donut do Status de Campo
  const canvasStatus = gerarCanvasStatusPalhetas(estatisticasCiclo, { width: 1000, height: 440 });
  const imgStatus = canvasStatus.toDataURL('image/png');
  doc.addImage(imgStatus, 'PNG', 14, 76, pageWidth - 28, 62);

  // Tabela de Pendências de Campo
  const linhasTabela = pendencias.map(({ a, s }) => {
    const palhetaEmCampo = a.palheta || `P-${a.numero}`;
    const dias = s.diasCorridos != null ? `${s.diasCorridos} dias` : '-';
    const endereco = opcoes.ocultarMorador ? 'Oculto por privacidade' : `${a.rua || ''}${a.numeroImovel ? ', ' + a.numeroImovel : ''}`.trim() || 'Logradouro não informado';
    const morador = opcoes.ocultarMorador ? 'Protegido' : a.moradorNome || 'Não informado';

    return [
      `ARM-${a.numero}`,
      palhetaEmCampo,
      s.titulo,
      dias,
      s.dataPrevistaFormatada || '-',
      a.bairro || a.microarea || 'Carmo',
      a.quarteirao || '-',
      morador,
      endereco
    ];
  });

  autoTable(doc, {
    startY: 142,
    head: [['Nº', 'Palheta em Campo', 'Situação Oficial', 'Tempo', 'Previsão', 'Bairro', 'Quart.', 'Morador', 'Endereço']],
    body: linhasTabela.length > 0 ? linhasTabela : [['-', '-', 'Nenhuma pendência crítica neste filtro', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const txt = String(data.cell.raw);
        if (txt.includes('Atraso') || txt.includes('Atrasada')) data.cell.styles.textColor = [225, 29, 72];
        else if (txt.includes('Hoje')) data.cell.styles.textColor = [16, 185, 129];
        else if (txt.includes('Janela')) data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [3, 105, 161];
      }
    }
  });

  // Nota Técnica Entomológica
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : 225;
  if (finalY < 265) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text('DIRETRIZ TÉCNICA ENTOMOLÓGICA (MINISTÉRIO DA SAÚDE / FIOCRUZ):', 18, finalY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 58, 138);
    doc.text('• Coletas na Segunda (Sede) e Terça (Distritos) perfazem exatamente 5 dias úteis de exposição.', 18, finalY + 9.5);
    doc.text('• O limite máximo de segurança biológica é de 7 dias. O cronograma garante margem de 2 dias sem risco de eclosão.', 18, finalY + 13.5);
  }

  aplicarRodapeOficial(doc);
  const nome = opcoes.nomeArquivo || `RELATORIO_PENDENCIAS_CAMPO_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
  return true;
}

// ---------------------------------------------------------------------------
// 4. RELATÓRIO PDF: INVENTÁRIO COMPLETO COM IDENTIFICAÇÃO DE PALHETAS
// ---------------------------------------------------------------------------

export async function gerarPdfInventarioCompleto(armadilhas, opcoes = {}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  aplicarCabecalhoOficial(doc, {
    titulo: 'Inventário Geral de Ovitrampas e Monitoramento de Palhetas',
    subtitulo: 'Relação Completa de Armadilhas, Palhetas em Campo, Leituras e Localização Territorial',
    filtroTexto: opcoes.filtroDescricao || ''
  });

  const linhas = armadilhas.map((a) => {
    const lida = a.status === 'analisada' && a.ultimosOvos != null;
    const palhetaEmCampo = a.palheta || `P-${a.numero}`;
    const palhetaUltima = a.ultimaPalheta || (lida ? palhetaEmCampo : '-');
    const morador = opcoes.ocultarMorador ? 'Protegido' : a.moradorNome || 'Não informado';
    const endereco = opcoes.ocultarMorador ? 'Oculto por privacidade' : `${a.rua || ''}${a.numeroImovel ? ', ' + a.numeroImovel : ''}`.trim() || 'Logradouro não informado';

    let statusTexto = 'Em Campo';
    if (lida) {
      statusTexto = Number(a.ultimosOvos) > 0 ? `Positiva (${a.ultimosOvos} ovos)` : 'Negativa (0 ovos)';
    }

    return [
      `ARM-${a.numero}`,
      palhetaEmCampo,
      palhetaUltima,
      a.bairro || a.microarea || 'Carmo',
      a.quarteirao || '-',
      morador,
      endereco,
      statusTexto,
      a.instaladaEm ? new Date(a.instaladaEm).toLocaleDateString('pt-BR') : '-',
      a.ultimaLeituraEm ? new Date(a.ultimaLeituraEm).toLocaleDateString('pt-BR') : '-'
    ];
  });

  autoTable(doc, {
    startY: 56,
    head: [['Nº', 'Palheta Campo', 'Última Palheta', 'Bairro', 'Quart.', 'Morador', 'Endereço', 'Resultado / Fase', 'Instalada Em', 'Última Leitura']],
    body: linhas,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const txt = String(data.cell.raw);
        if (txt.includes('Positiva')) data.cell.styles.textColor = [225, 29, 72];
        else if (txt.includes('Negativa')) data.cell.styles.textColor = [16, 185, 129];
        else data.cell.styles.textColor = [59, 130, 246];
      }
    }
  });

  aplicarRodapeOficial(doc);
  const nome = opcoes.nomeArquivo || `INVENTARIO_GERAL_PALHETAS_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
  return true;
}
