import { findNearbyTraps } from './geoDistance';
import { formatarDataETrocaPalheta, calcularSituacaoArmadilha, DIAS_CICLO_PADRAO } from './situacaoOvitrampa';

const SEDE_BAIRROS = new Set([
  'centro', 'progresso', 'jardim centenário', 'jardim centenario',
  'morro do estado', 'val paraíso', 'val paraiso', 'caixa d\'água',
  'caixa d\'agua', 'boa ideia', 'botafogo'
]);

export function classificarTerritorio(arm) {
  const b = `${arm.bairro || ''} ${arm.microarea || ''} ${arm.rua || ''}`.trim().toLowerCase();
  if (b.includes('influência') || b.includes('influencia')) {
    return {
      id: 'influencia',
      nome: 'DISTRITO DE INFLUÊNCIA (2º DISTRITO)',
      distritoKey: 'influência',
      ordem: 2
    };
  }
  if (b.includes('prata')) {
    return {
      id: 'corrego_da_prata',
      nome: 'DISTRITO DE CÓRREGO DA PRATA (3º DISTRITO)',
      distritoKey: 'córrego da prata',
      ordem: 3
    };
  }
  if (b.includes('porto velho')) {
    return {
      id: 'porto_velho',
      nome: 'DISTRITO DE PORTO VELHO DO CUNHA (4º DISTRITO)',
      distritoKey: 'porto velho do cunha',
      ordem: 4
    };
  }
  if (b.includes('pombo')) {
    return {
      id: 'ilha_dos_pombos',
      nome: 'LOCALIDADE DE ILHA DOS POMBOS',
      distritoKey: 'ilha dos pombos',
      ordem: 5
    };
  }
  if (b.includes('barra')) {
    return {
      id: 'barra_sao_francisco',
      nome: 'LOCALIDADE DE BARRA DE SÃO FRANCISCO',
      distritoKey: 'barra de são francisco',
      ordem: 6
    };
  }
  if (SEDE_BAIRROS.has(b)) {
    return {
      id: 'sede',
      nome: 'CARMO (SEDE URBANA)',
      distritoKey: null,
      ordem: 1
    };
  }

  const lat = Number(arm.latitude);
  const lng = Number(arm.longitude);
  if (lat < -21.90 && lat > -21.96 && lng < -42.59 && lng > -42.63) {
    return {
      id: 'sede',
      nome: 'CARMO (SEDE URBANA)',
      distritoKey: null,
      ordem: 1
    };
  }

  return {
    id: 'outro_' + b,
    nome: (arm.bairro || arm.microarea || 'Outro Território').toUpperCase(),
    distritoKey: null,
    ordem: 99
  };
}

export function agruparArmadilhasPorTerritorio(armadilhas) {
  const grupos = {};
  armadilhas.forEach((arm) => {
    const t = classificarTerritorio(arm);
    if (!grupos[t.id]) {
      grupos[t.id] = {
        ...t,
        armadilhas: []
      };
    }
    grupos[t.id].armadilhas.push(arm);
  });

  return Object.values(grupos).sort((a, b) => a.ordem - b.ordem);
}

// Insere uma imagem (canvas) centralizada, respeitando a proporção original,
// dentro de uma área máxima em mm do PDF.
function desenharImagemAjustada(doc, canvas, areaX, areaY, areaMaxW, areaMaxH) {
  const dataUrl = canvas.toDataURL('image/png');
  const escala = Math.min(areaMaxW / canvas.width, areaMaxH / canvas.height);
  const w = canvas.width * escala;
  const h = canvas.height * escala;
  const x = areaX + (areaMaxW - w) / 2;
  const y = areaY + (areaMaxH - h) / 2;
  doc.addImage(dataUrl, 'PNG', x, y, w, h);
  return { x, y, w, h };
}

/**
 * Gera e baixa o Relatório Consolidado Oficial em PDF (Documento Único)
 * @param {Array} armadilhas - Lista de armadilhas registradas
 * @param {Object} opcoes - Filtros e metadados opcionais
 */
export async function gerarRelatorioPdfConsolidado(armadilhas = [], opcoes = {}) {
  if (!armadilhas || armadilhas.length === 0) {
    alert('Nenhuma armadilha registrada para gerar o relatório consolidado.');
    return;
  }

  // jsPDF/jspdf-autotable e o gerador de mapas são carregados sob demanda (só
  // quando o botão é clicado). Import estático dessas libs no topo do módulo
  // causava "Cannot access 'X' before initialization" em produção - jsPDF tem
  // um import circular interno entre seu core e módulos opcionais (html2canvas/
  // dompurify, que nem usamos) que quebra a ordem de inicialização do bundle
  // inteiro quando importado estaticamente junto com o resto do app.
  const [{ default: jsPDF }, { default: autoTable }, { gerarCanvasMapaCalor, gerarCanvasMapaDistancias }] =
    await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      import('./heatmapCanvas')
    ]);

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

  // Linha de totalização geral de Carmo no rodapé da tabela de microáreas
  const todosQuarteiroes = new Set();
  armadilhas.forEach((a) => { if (a.quarteirao) todosQuarteiroes.add(a.quarteirao); });
  const riscoGeral = Number(ipo) > 40 ? 'Muito Alto' : Number(ipo) > 20 ? 'Alto' : Number(ipo) > 10 ? 'Médio' : 'Baixo';
  const linhasMicroareas = [
    ...microareasResumo,
    [
      'TOTAL DO MUNICÍPIO',
      `${todosQuarteiroes.size} Quarteirão(ões) monitorados`,
      totalArmadilhas.toString(),
      totalLidas.toString(),
      totalPositivas.toString(),
      `${ipo}%`,
      totalOvos.toString(),
      riscoGeral
    ]
  ];

  // 4. Cabeçalho Institucional Oficial (largura/layout se adapta a paisagem/retrato)
  const desenharCabecalho = () => {
    const pageW = doc.internal.pageSize.getWidth();
    const barW = pageW - 20;
    const isRetrato = pageW < 250;
    const barH = isRetrato ? 32 : 25;

    // Barra superior verde institucional (Prefeitura de Carmo - RJ)
    doc.setFillColor(5, 122, 85); // verde institucional encorpado
    doc.rect(10, 8, barW, barH, 'F');

    // Faixa dourada/esmeralda decorativa na base da barra superior
    doc.setFillColor(52, 211, 153); // emerald-400
    doc.rect(10, 8 + barH - 1.2, barW, 1.2, 'F');

    // Texto do Cabeçalho (esquerda)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('PREFEITURA MUNICIPAL DE CARMO - RJ', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isRetrato ? 6.8 : 8.5);
    doc.text('SECRETARIA MUNICIPAL DE SAÚDE  •  COORDENADORIA DE VIGILÂNCIA AMBIENTAL EM SAÚDE', 14, 20);
    doc.text('PROGRAMA MUNICIPAL DE MONITORAMENTO VETORIAL POR OVITRAMPAS (Aedes aegypti)', 14, isRetrato ? 24.5 : 25);

    if (isRetrato) {
      // Retrato: info de emissão/filtro numa linha própria embaixo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(
        `EMISSÃO: ${dataFormatada} às ${horaFormatada}   •   FILTRO: ${opcoes.filtroDescricao || 'Todos os Registros'}`,
        14,
        30
      );
    } else {
      // Paisagem: box no canto direito, ao lado do texto institucional
      const direitaX = pageW - 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`EMISSÃO: ${dataFormatada} às ${horaFormatada}`, direitaX, 15.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('SISTEMA OFICIAL GPS OVITRAMPAS', direitaX, 20.5, { align: 'right' });
      doc.text(`FILTRO: ${opcoes.filtroDescricao || 'Todos os Registros'}`, direitaX, 25, { align: 'right' });
    }
  };

  desenharCabecalho();

  // 5. Título da Seção
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('RELATÓRIO TÉCNICO CONSOLIDADO DE VIGILÂNCIA ENTOMOLÓGICA', 10, 39);

  // 6. Bloco de Indicadores Epidemiológicos Oficiais
  const statusIpoTexto = Number(ipo) > 20 ? 'ALERTA EPIDEMIOLÓGICO' : 'TRANSMISSÃO CONTROLADA';
  const indicadores = [
    ['Total de Ovitrampas', `${totalArmadilhas}`],
    ['OVs Lidas em Lab', `${totalLidas} (${totalArmadilhas > 0 ? ((totalLidas / totalArmadilhas) * 100).toFixed(0) : 0}%)`],
    ['Armadilhas Positivas', `${totalPositivas}`],
    ['Armadilhas Negativas', `${totalNegativas}`],
    ['Pendentes (Em Campo)', `${pendentes}`],
    ['IPO (% Positividade)', `${ipo}% (${statusIpoTexto})`],
    ['Total de Ovos Contados', `${totalOvos}`],
    ['IDO (Densidade de Ovos)', `${ido} ovos/OV+`]
  ];

  autoTable(doc, {
    startY: 43,
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
      halign: 'center',
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 7.2 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42], fontSize: 9 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 7.2 },
      3: { fontStyle: 'bold', textColor: [37, 99, 235], fontSize: 9 },
      4: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 7.2 },
      5: { fontStyle: 'bold', textColor: [225, 29, 72], fontSize: 9 },
      6: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 7.2 },
      7: { fontStyle: 'bold', textColor: Number(ipo) > 20 ? [225, 29, 72] : [5, 150, 105], fontSize: 9 }
    }
  });

  // 7. Tabela 1: Consolidação por Microárea e Quarteirões
  const yPosMicroareas = doc.lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSOLIDAÇÃO TERRITORIAL POR MICROÁREA E QUARTEIRÃO', 10, yPosMicroareas);

  autoTable(doc, {
    startY: yPosMicroareas + 3.5,
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
    body: linhasMicroareas,
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600 institucional
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2.2
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'left' },
      5: { fontStyle: 'bold' },
      6: { fontStyle: 'bold' },
      7: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Destaque para a linha de Total Geral
      if (data.row.index === linhasMicroareas.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // 8. Tabela 2: Tabela Completa de Ovitrampas Cadastradas
  doc.addPage();
  desenharCabecalho();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. REGISTRO INDIVIDUALIZADO DE OVITRAMPAS E ESPAÇAMENTO GEODÉSICO', 10, 39);
  const startYTable2 = 42;

  // Prepara as linhas de armadilhas com o cálculo das vizinhas mais próximas
  const linhasArmadilhas = armadilhas.map((arm) => {
    const dataInst = new Date(arm.instaladaEm);
    const dataInstStr = `${dataInst.toLocaleDateString('pt-BR')}`;
    const trocaPalhetaStr = formatarDataETrocaPalheta(arm.instaladaEm, 6);
    const sit = calcularSituacaoArmadilha(arm);

    // Situação / Tempo Restante
    let situacaoStr = '';
    if (arm.status === 'analisada') {
      situacaoStr = arm.ultimosOvos > 0 ? `Positiva (${arm.ultimosOvos} ovos)` : 'Negativa (0 ovos)';
    } else if (sit.fase === 'hoje') {
      situacaoStr = 'Trocar Hoje! (6d)';
    } else if (sit.fase === 'vespera') {
      situacaoStr = 'Trocar Amanhã (Falta 1d)';
    } else if (sit.fase === 'atrasada') {
      situacaoStr = `Atrasada (${Math.abs(sit.diasRestantes)}d)`;
    } else {
      situacaoStr = `Em campo (Faltam ${sit.diasRestantes}d)`;
    }

    // Calcula vizinhas mais próximas
    const vizinhas = findNearbyTraps(arm, armadilhas, 1, arm.id);
    let vizinhaStr = 'N/A';
    if (vizinhas.length > 0) {
      const v = vizinhas[0];
      vizinhaStr = `ARM-${v.armadilha.numero} a ${v.distancia}m (${v.status === 'ideal' ? 'Ideal' : v.status === 'proxima' ? '<300m' : '>400m'})`;
    }

    const gpsCoords = arm.latitude && arm.longitude
      ? `${Number(arm.latitude).toFixed(5)}, ${Number(arm.longitude).toFixed(5)}`
      : 'Sem GPS';

    const enderecoComGps = `${arm.rua || 'S/N'}${arm.numeroImovel ? ' Nº ' + arm.numeroImovel : ''}\nGPS: ${gpsCoords}`;
    const territorioNome = arm.bairro || arm.microarea || 'Carmo';

    return [
      `ARM-${arm.numero}`,
      arm.moradorNome || 'Não informado',
      arm.palheta || 'P-01',
      enderecoComGps,
      territorioNome,
      arm.quarteirao || 'N/D',
      dataInstStr,
      trocaPalhetaStr,
      situacaoStr,
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
      'ENDEREÇO E COORDENADAS GPS',
      'BAIRRO / DISTRITO',
      'QUART.',
      'INSTALADA',
      `TROCA PALHETA (${DIAS_CICLO_PADRAO} DIAS)`,
      'SITUAÇÃO / TEMPO RESTANTE',
      'OV MAIS PRÓXIMA (300-400m)'
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
      0: { fontStyle: 'bold', halign: 'center', textColor: [5, 150, 105], width: 14 },
      1: { fontStyle: 'bold', width: 30 },
      2: { halign: 'center', width: 13 },
      3: { fontSize: 6.2, width: 48 },
      4: { width: 26 },
      5: { halign: 'center', fontStyle: 'bold', width: 14 },
      6: { fontSize: 6.5, halign: 'center', width: 22 },
      7: { fontStyle: 'bold', fontSize: 6.5, halign: 'center', width: 26 },
      8: { fontStyle: 'bold', fontSize: 6.5, halign: 'center', width: 38 },
      9: { fontSize: 6.2, width: 46 }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 7) { // Coluna de Troca de Palheta
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
        }
        if (data.column.index === 8) { // Coluna de Situação / Tempo Restante
          const txt = String(data.cell.raw || '');
          if (txt.includes('Positiva')) {
            data.cell.styles.textColor = [225, 29, 72]; // vermelho/coral
            data.cell.styles.fontStyle = 'bold';
          } else if (txt.includes('Negativa')) {
            data.cell.styles.textColor = [5, 150, 105]; // verde esmeralda
          } else if (txt.includes('Atrasada')) {
            data.cell.styles.textColor = [225, 29, 72]; // vermelho
            data.cell.styles.fontStyle = 'bold';
          } else if (txt.includes('Hoje')) {
            data.cell.styles.textColor = [217, 119, 6]; // âmbar
            data.cell.styles.fontStyle = 'bold';
          } else if (txt.includes('Faltam')) {
            data.cell.styles.textColor = [5, 150, 105]; // verde
          }
        }
        if (data.column.index === 9) { // Coluna de OV Mais Próxima
          const txt = String(data.cell.raw || '');
          if (txt.includes('Ideal')) {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (txt.includes('>400m')) {
            data.cell.styles.textColor = [225, 29, 72];
          } else if (txt.includes('<300m')) {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        desenharCabecalho();
      }
    }
  });

  // 9. Páginas de Mapas Territoriais: Calor e Distâncias para a Cidade e para cada Distrito.
  // EM RETRATO (A4 210x297mm) com enquadramento proporcional e respiro no rodapé.
  const areaMapaX = 10, areaMapaY = 48, areaMapaMaxW = 190, areaMapaMaxH = 195;
  const gruposTerritoriais = agruparArmadilhasPorTerritorio(armadilhas);

  let secaoMapaNum = 3;
  for (const grupo of gruposTerritoriais) {
    const armsGrupo = grupo.armadilhas;
    if (!armsGrupo || armsGrupo.length === 0) continue;

    // 9.A - Mapa de Calor do Território
    doc.addPage('a4', 'portrait');
    desenharCabecalho();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${secaoMapaNum}. MAPA DE CALOR — ${grupo.nome}`, 10, 43);

    const { canvas: canvasCalor } = gerarCanvasMapaCalor(armsGrupo, {
      width: 1250,
      height: 1550,
      tituloTerritorio: grupo.nome,
      distritoKey: grupo.distritoKey
    });
    const posCalor = desenharImagemAjustada(doc, canvasCalor, areaMapaX, areaMapaY + 3, areaMapaMaxW, areaMapaMaxH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`• Intensidade de calor proporcional à contagem de ovos da última leitura de laboratório (${armsGrupo.length} armadilha(s) monitorada(s)).`, 10, posCalor.y + posCalor.h + 5);
    doc.text('• Armadilhas recém-instaladas sem leitura aparecem com ponto neutro de referência territorial.', 10, posCalor.y + posCalor.h + 9);

    secaoMapaNum += 1;

    // 9.B - Mapa de Distâncias do Território
    doc.addPage('a4', 'portrait');
    desenharCabecalho();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${secaoMapaNum}. MAPA DE DISTÂNCIAS — ${grupo.nome} (DIRETRIZ 300m - 400m)`, 10, 43);

    const { canvas: canvasDistancias, totalLigacoes } = gerarCanvasMapaDistancias(armsGrupo, {
      width: 1250,
      height: 1550,
      tituloTerritorio: grupo.nome,
      distritoKey: grupo.distritoKey,
      maxDistance: armsGrupo.length <= 8 ? 2000 : 900
    });
    const posDist = desenharImagemAjustada(doc, canvasDistancias, areaMapaX, areaMapaY + 3, areaMapaMaxW, areaMapaMaxH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`• Total de ${totalLigacoes} ligação(ões) geodésicas calculadas entre as vizinhas mais próximas do território.`, 10, posDist.y + posDist.h + 5);
    doc.text('• Metragem indicada no centro de cada trecho (Verde = 300-400m ideal; Vermelho = >400m; Âmbar = <300m).', 10, posDist.y + posDist.h + 9);

    secaoMapaNum += 1;
  }

  // 10. Seção Final: Observações Técnicas & Assinaturas Oficiais (Paisagem A4)
  doc.addPage('a4', 'landscape');
  desenharCabecalho();
  const yAssinaturas = 46;

  // Bloco de Notas Técnicas Oficiais
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, yAssinaturas, 277, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DIRETRIZES TÉCNICAS ENTOMOLÓGICAS (MINISTÉRIO DA SAÚDE / FIOCRUZ):', 13, yAssinaturas + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Espaçamento recomendado entre armadilhas: 300 a 400 metros para cobertura territorial eficiente sem sobreposição de raio atrativo.', 13, yAssinaturas + 9.5);
  doc.text('• IPO > 20%: Alerta de alta transmissão vetorial de arboviroses (Dengue, Zika e Chikungunya). Ação imediata de eliminação mecânica de criadouros.', 13, yAssinaturas + 13.5);

  // Bloco de 3 Assinaturas Oficiais Equilibradas
  const yLinhaAssinatura = yAssinaturas + 32;

  // Assinatura 1 - Coordenação
  doc.setDrawColor(100, 116, 139);
  doc.line(18, yLinhaAssinatura, 95, yLinhaAssinatura);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL', 56.5, yLinhaAssinatura + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Secretaria Municipal de Saúde • PM Carmo/RJ', 56.5, yLinhaAssinatura + 7.5, { align: 'center' });

  // Assinatura 2 - Laboratório
  doc.line(105, yLinhaAssinatura, 185, yLinhaAssinatura);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RESPONSÁVEL TÉCNICO DE LABORATÓRIO / CAMPO', 145, yLinhaAssinatura + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Vigilância Entomológica de Ovitrampas', 145, yLinhaAssinatura + 7.5, { align: 'center' });

  // Assinatura 3 - Secretaria Municipal de Saúde
  doc.line(195, yLinhaAssinatura, 277, yLinhaAssinatura);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SECRETARIA MUNICIPAL DE SAÚDE', 236, yLinhaAssinatura + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Homologação do Relatório Oficial', 236, yLinhaAssinatura + 7.5, { align: 'center' });

  // 11. Numeração de Páginas em Todas as Folhas (centralizado conforme a
  // largura real de cada página - paisagem ou retrato nas páginas de mapa)
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Página ${i} de ${pageCount}  •  Sistema de Monitoramento Territorial por Ovitrampas  •  Prefeitura Municipal de Carmo - RJ`,
      pW / 2,
      pH - 6,
      { align: 'center' }
    );
  }

  // 12. Salva o PDF consolidado num único documento
  const nomeArquivo = `relatorio_consolidado_ovitrampas_carmo_${dataAtual.toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
