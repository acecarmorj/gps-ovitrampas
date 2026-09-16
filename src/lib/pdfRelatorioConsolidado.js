import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { findNearbyTraps } from './geoDistance';

/**
 * Gera e baixa o Relatório Consolidado Oficial em PDF (Documento Único)
 * @param {Array} armadilhas - Lista de armadilhas registradas
 * @param {Object} opcoes - Filtros e metadados opcionais
 */
export function gerarRelatorioPdfConsolidado(armadilhas = [], opcoes = {}) {
  if (!armadilhas || armadilhas.length === 0) {
    alert('Nenhuma armadilha registrada para gerar o relatório consolidado.');
    return;
  }

  // 1. Inicializa o documento em orientação Paisagem (Landscape A4 - 297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
  const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 2. Cálculos Epidemiológicos Oficiais
  const totalArmadilhas = armadilhas.length;
  const armadilhasLidas = armadilhas.filter((a) => a.status === 'analisada');
  const totalLidas = armadilhasLidas.length;
  const armadilhasPositivas = armadilhas.filter((a) => a.ultimosOvos && a.ultimosOvos > 0);
  const totalPositivas = armadilhasPositivas.length;
  const totalNegativas = armadilhasLidas.filter((a) => !a.ultimosOvos || a.ultimosOvos === 0).length;
  const pendentes = totalArmadilhas - totalLidas;
  const totalOvos = armadilhas.reduce((acc, curr) => acc + (curr.ultimosOvos || 0), 0);

  // IPO e IDO
  const ipo = totalLidas > 0 ? ((totalPositivas / totalLidas) * 100).toFixed(1) : '0.0';
  const ido = totalPositivas > 0 ? (totalOvos / totalPositivas).toFixed(1) : '0.0';

  // 3. Agrupamento por Microárea
  const microareasMap = {};
  armadilhas.forEach((arm) => {
    const ma = arm.microarea || 'Não Definida';
    if (!microareasMap[ma]) {
      microareasMap[ma] = {
        nome: ma,
        total: 0,
        lidas: 0,
        positivas: 0,
        ovos: 0,
        quarteiroes: new Set()
      };
    }
    microareasMap[ma].total += 1;
    if (arm.quarteirao) microareasMap[ma].quarteiroes.add(arm.quarteirao);
    if (arm.status === 'analisada') {
      microareasMap[ma].lidas += 1;
      if (arm.ultimosOvos && arm.ultimosOvos > 0) {
        microareasMap[ma].positivas += 1;
        microareasMap[ma].ovos += arm.ultimosOvos;
      }
    }
  });

  const microareasResumo = Object.values(microareasMap).map((m) => {
    const ipoMa = m.lidas > 0 ? ((m.positivas / m.lidas) * 100).toFixed(1) : '0.0';
    let risco = 'Baixo';
    if (Number(ipoMa) > 40) risco = 'Muito Alto';
    else if (Number(ipoMa) > 20) risco = 'Alto';
    else if (Number(ipoMa) > 10) risco = 'Médio';

    return [
      m.nome,
      Array.from(m.quarteiroes).join(', ') || 'N/A',
      m.total.toString(),
      m.lidas.toString(),
      m.positivas.toString(),
      `${ipoMa}%`,
      m.ovos.toString(),
      risco
    ];
  });

  // 4. Cabeçalho Institucional Oficial
  const desenharCabecalho = () => {
    // Barra superior verde institucional (Carmo - RJ)
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(10, 8, 277, 24, 'F');

    // Texto do Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('PREFEITURA MUNICIPAL DE CARMO - RJ', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('SECRETARIA MUNICIPAL DE SAÚDE  •  COORDENADORIA DE VIGILÂNCIA AMBIENTAL EM SAÚDE', 14, 20);
    doc.text('PROGRAMA MUNICIPAL DE MONITORAMENTO VETORIAL POR OVITRAMPAS (Aedes aegypti)', 14, 25);

    // Box data / hora no canto direito
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`EMISSÃO: ${dataFormatada} às ${horaFormatada}`, 235, 16);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEMA OFICIAL GPS OVITRAMPAS', 222, 21);
    doc.text(`FILTRO: ${opcoes.filtroDescricao || 'Todos os Registros'}`, 235, 26);
  };

  desenharCabecalho();

  // 5. Título da Seção
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('RELATÓRIO TÉCNICO CONSOLIDADO DE VIGILÂNCIA ENTOMOLÓGICA', 10, 38);

  // 6. Bloco de Indicadores Epidemiológicos Oficiais
  const indicadores = [
    ['Total de Ovitrampas', `${totalArmadilhas}`],
    ['OVs Lidas em Lab', `${totalLidas} (${totalArmadilhas > 0 ? ((totalLidas / totalArmadilhas) * 100).toFixed(0) : 0}%)`],
    ['Armadilhas Positivas', `${totalPositivas}`],
    ['Armadilhas Negativas', `${totalNegativas}`],
    ['Pendentes (Em Campo)', `${pendentes}`],
    ['IPO (Positividade)', `${ipo}%`],
    ['Total de Ovos', `${totalOvos}`],
    ['IDO (Densidade de Ovos)', `${ido} ovos/OV+`]
  ];

  autoTable(doc, {
    startY: 42,
    margin: { left: 10, right: 10 },
    head: [['INDICADOR', 'VALOR CONSOLIDADO', 'INDICADOR', 'VALOR CONSOLIDADO', 'INDICADOR', 'VALOR CONSOLIDADO', 'INDICADOR', 'VALOR CONSOLIDADO']],
    body: [
      [
        indicadores[0][0], indicadores[0][1],
        indicadores[1][0], indicadores[1][1],
        indicadores[2][0], indicadores[2][1],
        indicadores[3][0], indicadores[3][1]
      ],
      [
        indicadores[4][0], indicadores[4][1],
        indicadores[5][0], indicadores[5][1],
        indicadores[6][0], indicadores[6][1],
        indicadores[7][0], indicadores[7][1]
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center',
      cellPadding: 2
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { fontStyle: 'bold', textColor: [5, 150, 105] },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
      3: { fontStyle: 'bold', textColor: [37, 99, 235] },
      4: { fontStyle: 'bold', fillColor: [248, 250, 252] },
      5: { fontStyle: 'bold', textColor: [225, 29, 72] },
      6: { fontStyle: 'bold', fillColor: [248, 250, 252] },
      7: { fontStyle: 'bold', textColor: [217, 119, 6] }
    }
  });

  // 7. Tabela 1: Consolidação por Microárea e Quarteirões
  const yPosMicroareas = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSOLIDAÇÃO TERRITORIAL POR MICROÁREA E QUARTEIRÃO', 10, yPosMicroareas);

  autoTable(doc, {
    startY: yPosMicroareas + 3,
    margin: { left: 10, right: 10 },
    head: [[
      'MICROÁREA',
      'QUARTEIRÕES ABRANGIDOS',
      'TOTAL OVS',
      'LIDAS',
      'POSITIVAS',
      'IPO (%)',
      'TOTAL OVOS',
      'NÍVEL DE RISCO'
    ]],
    body: microareasResumo,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129], // emerald-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'left' },
      5: { fontStyle: 'bold' },
      6: { fontStyle: 'bold' },
      7: { fontStyle: 'bold' }
    }
  });

  // 8. Tabela 2: Tabela Completa de Ovitrampas Cadastradas
  const yPosTabelaOvs = doc.lastAutoTable.finalY + 6;

  let startYTable2 = yPosTabelaOvs + 3;
  if (yPosTabelaOvs > 155) {
    doc.addPage();
    desenharCabecalho();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. REGISTRO INDIVIDUALIZADO DE OVITRAMPAS E ESPAÇAMENTO GEODÉSICO', 10, 38);
    startYTable2 = 42;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. REGISTRO INDIVIDUALIZADO DE OVITRAMPAS E ESPAÇAMENTO GEODÉSICO', 10, yPosTabelaOvs);
  }

  // Prepara as linhas de armadilhas com o cálculo das vizinhas mais próximas
  const linhasArmadilhas = armadilhas.map((arm) => {
    const dataInst = new Date(arm.instaladaEm);
    const dataStr = `${dataInst.toLocaleDateString('pt-BR')} ${dataInst.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    
    // Resultado Lab
    let resultadoStr = 'Em campo (Pendente)';
    if (arm.status === 'analisada') {
      resultadoStr = arm.ultimosOvos > 0 ? `Positiva (${arm.ultimosOvos} ovos)` : 'Negativa (0 ovos)';
    }

    // Calcula vizinhas mais próximas
    const vizinhas = findNearbyTraps(arm, armadilhas, 1, arm.id);
    let vizinhaStr = 'N/A';
    if (vizinhas.length > 0) {
      const v = vizinhas[0];
      vizinhaStr = `ARM-${v.armadilha.numero} a ${v.distancia}m (${v.status === 'ideal' ? 'Ideal' : v.status === 'proxima' ? '<300m' : '>400m'})`;
    }

    const gpsCoords = arm.latitude && arm.longitude
      ? `${Number(arm.latitude).toFixed(5)}, ${Number(arm.longitude).toFixed(5)} (±${arm.precisaoGps || 5}m)`
      : 'Não capturado';

    return [
      `ARM-${arm.numero}`,
      arm.moradorNome || 'Não informado',
      arm.palheta || 'P-01',
      `${arm.rua || 'S/N'}${arm.numeroImovel ? ' Nº ' + arm.numeroImovel : ''}`,
      arm.microarea || 'N/D',
      arm.quarteirao || 'N/D',
      gpsCoords,
      dataStr,
      resultadoStr,
      vizinhaStr
    ];
  });

  autoTable(doc, {
    startY: startYTable2,
    margin: { left: 10, right: 10 },
    head: [[
      'OV',
      'MORADOR',
      'PALHETA',
      'LOGRADOURO / ENDEREÇO',
      'MICROÁREA',
      'QUART.',
      'COORDENADAS GPS',
      'DATA/HORA INSTALAÇÃO',
      'SITUAÇÃO / RESULTADO',
      'OV MAIS PRÓXIMA (300m-400m)'
    ]],
    body: linhasArmadilhas,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.8
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', textColor: [5, 150, 105], width: 16 },
      1: { fontStyle: 'bold', width: 34 },
      2: { halign: 'center', width: 14 },
      3: { width: 44 },
      4: { width: 22 },
      5: { halign: 'center', fontStyle: 'bold', width: 15 },
      6: { fontSize: 6.2, width: 42 },
      7: { fontSize: 6.2, halign: 'center', width: 30 },
      8: { fontStyle: 'bold', halign: 'center', width: 28 },
      9: { fontSize: 6.2, width: 32 }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        desenharCabecalho();
      }
    }
  });

  // 9. Seção Final: Observações Técnicas & Assinaturas Oficiais
  const finalY = doc.lastAutoTable.finalY || 150;
  let yAssinaturas = finalY + 10;
  
  if (finalY > 165) {
    doc.addPage();
    desenharCabecalho();
    yAssinaturas = 50;
  }

  // Bloco de Notas Técnicas Oficiais
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, yAssinaturas, 277, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DIRETRIZES TÉCNICAS ENTOMOLÓGICAS (MINISTÉRIO DA SAÚDE / FIOCRUZ):', 13, yAssinaturas + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Espaçamento recomendado entre armadilhas: 300 a 400 metros para cobertura territorial eficiente sem sobreposição de raio atrativo.', 13, yAssinaturas + 9);
  doc.text('• IPO > 20%: Alerta de alta transmissão vetorial de arboviroses (Dengue, Zika e Chikungunya). Ação imediata de eliminação mecânica de criadouros.', 13, yAssinaturas + 12.5);

  // Bloco de Assinaturas
  const yLinhaAssinatura = yAssinaturas + 26;

  // Assinatura 1
  doc.setDrawColor(100, 116, 139);
  doc.line(30, yLinhaAssinatura, 110, yLinhaAssinatura);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL', 70, yLinhaAssinatura + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Secretaria Municipal de Saúde • PM Carmo/RJ', 70, yLinhaAssinatura + 7, { align: 'center' });

  // Assinatura 2
  doc.line(170, yLinhaAssinatura, 250, yLinhaAssinatura);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RESPONSÁVEL TÉCNICO DE LABORATÓRIO / CAMPO', 210, yLinhaAssinatura + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Vigilância Entomológica de Ovitrampas', 210, yLinhaAssinatura + 7, { align: 'center' });

  // 10. Numeração de Páginas em Todas as Folhas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Página ${i} de ${pageCount}  •  Sistema de Monitoramento Territorial por Ovitrampas  •  Prefeitura Municipal de Carmo - RJ`,
      148.5,
      204,
      { align: 'center' }
    );
  }

  // 11. Salva o PDF consolidado num único documento
  const nomeArquivo = `relatorio_consolidado_ovitrampas_carmo_${dataAtual.toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
