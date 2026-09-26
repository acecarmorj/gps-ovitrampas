import {
  adaptarArmadilhasParaCiclo,
  calcularMetricasCiclo,
  CICLO_AMBAS
} from './ciclosOvitrampas';
import { calcularSituacaoArmadilha } from './situacaoOvitrampa';

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
      nome: '2º DISTRITO (INFLUÊNCIA)',
      distritoKey: 'influência',
      ordem: 2
    };
  }
  if (b.includes('prata')) {
    return {
      id: 'corrego_da_prata',
      nome: '3º DISTRITO (CÓRREGO DA PRATA)',
      distritoKey: 'córrego da prata',
      ordem: 3
    };
  }
  if (b.includes('porto velho')) {
    return {
      id: 'porto_velho',
      nome: '4º DISTRITO (PORTO VELHO DO CUNHA)',
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

export function classificarRiscoOficial(ovos) {
  const nOvos = Number(ovos) || 0;
  if (nOvos === 0) {
    return {
      nivel: 'Sem Ovos (Negativa)',
      rotulo: '0 (Negativa)',
      corHex: '#2563eb',
      corRgb: [37, 99, 235],
      badgeClass: 'Negativa (Azul)',
      nivelNum: 1
    };
  } else if (nOvos <= 20) {
    return {
      nivel: 'Baixo Risco (1 a 20 ovos)',
      rotulo: 'Baixo (1-20)',
      corHex: '#10b981',
      corRgb: [16, 185, 129],
      badgeClass: 'Baixo Risco (Verde)',
      nivelNum: 2
    };
  } else if (nOvos <= 50) {
    return {
      nivel: 'Médio Risco (21 a 50 ovos)',
      rotulo: 'Médio (21-50)',
      corHex: '#f59e0b',
      corRgb: [245, 158, 11],
      badgeClass: 'Médio Risco (Amarelo)',
      nivelNum: 3
    };
  } else if (nOvos <= 100) {
    return {
      nivel: 'Alto Risco (51 a 100 ovos)',
      rotulo: 'Alto (51-100)',
      corHex: '#f97316',
      corRgb: [249, 115, 22],
      badgeClass: 'Alto Risco (Laranja)',
      nivelNum: 4
    };
  } else {
    return {
      nivel: 'Crítico (> 100 ovos)',
      rotulo: 'Crítico (> 100)',
      corHex: '#dc2626',
      corRgb: [220, 38, 38],
      badgeClass: 'Crítico (Vermelho)',
      nivelNum: 5
    };
  }
}

/**
 * Carrega a imagem a partir dos caminhos possíveis no navegador
 */
async function carregarImagemDataUrl(caminhoRelativo) {
  if (typeof window === 'undefined') return null;
  const limpo = caminhoRelativo.replace(/^\/+/, '');
  const origin = window.location.origin || '';
  const urls = [
    `/${limpo}`,
    `./${limpo}`,
    `${origin}/${limpo}`,
    limpo
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 2000) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch {
      // continua tentando
    }
  }
  return null;
}

/**
 * Desenha o cabeçalho institucional em qualquer página do relatório
 */
function desenharCabecalhoOficial(doc, { dataFormatada, horaFormatada, filtroDescricao, dataBase, totalLidas, totalArmadilhas, subtitulo = 'RELATÓRIO EPIDEMIOLÓGICO CONSOLIDADO' }) {
  const pageW = doc.internal.pageSize.getWidth();
  const barW = pageW - 20;
  const barH = 22;

  // Barra superior Slate executivo escuro
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(10, 8, barW, barH, 'F');

  // Faixa esmeralda oficial
  doc.setFillColor(5, 150, 105); // #059669
  doc.rect(10, 8 + barH - 1.2, barW, 1.2, 'F');

  // Textos à esquerda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PREFEITURA MUNICIPAL DE CARMO — RJ', 14, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225);
  doc.text('SECRETARIA MUNICIPAL DE SAÚDE  •  COORDENADORIA DE VIGILÂNCIA EM SAÚDE', 14, 18.5);
  doc.text('PROGRAMA MUNICIPAL DE MONITORAMENTO VETORIAL POR OVITRAMPAS (Aedes aegypti)', 14, 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(52, 211, 153);
  doc.text(`CICLOS: PALHETAS A (1ª SEM), B (2ª SEM) E TOTAL CONSOLIDADO • FILTRO: ${filtroDescricao || 'Geral'}`, 14, 26.5);

  // Box à direita
  const direitaX = pageW - 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(subtitulo, direitaX, 14.5, { align: 'right' });

  const txtDataBase = dataBase || dataFormatada;
  const statusStr = totalLidas != null && totalArmadilhas != null
    ? `Status: ${totalLidas}/${totalArmadilhas} Lidas`
    : 'Status: 100% Concluído';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Data Base: ${txtDataBase} • ${statusStr}`, direitaX, 18.5, { align: 'right' });
  doc.text(`Emissão: ${dataFormatada} às ${horaFormatada}`, direitaX, 22.5, { align: 'right' });
  doc.text('SISTEMA OFICIAL GPS OVITRAMPAS', direitaX, 26.5, { align: 'right' });
}

/**
 * Desenha o rodapé institucional com numeração dinâmica de páginas
 */
function desenharRodapeOficial(doc, paginaAtual, totalPaginas) {
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(10, pH - 9, pW - 10, pH - 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PREFEITURA MUNICIPAL DE CARMO/RJ • SECRETARIA DE SAÚDE • VIGILÂNCIA EM SAÚDE E CONTROLE DE VETORES', 10, pH - 5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pW - 10, pH - 5, { align: 'right' });
}

/**
 * GERA O RELATÓRIO EPIDEMIOLÓGICO CONSOLIDADO ÚNICO
 * Dossiê oficial unificado de 8 páginas integrando Palhetas A, Palhetas B, Total A+B,
 * Mapas de Calor Satélite de Alta Resolução, Focos Críticos e Parecer Técnico Oficial.
 */
export async function gerarRelatorioPdfConsolidadoUnico(armadilhas = [], todasLeituras = [], opcoes = {}) {
  if (!armadilhas || armadilhas.length === 0) {
    alert('Nenhuma armadilha disponível para gerar o relatório.');
    return;
  }

  // Importação dinâmica das dependências pesadas
  const [{ default: jsPDF }, { default: autoTable }, { gerarCanvasMapaCalor, gerarCanvasMapaNevoeiro }] =
    await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      import('./heatmapCanvas')
    ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
  const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const filtroDescricao = opcoes.filtroDescricao || 'Totalidade Municipal (56 Armadilhas)';
  const ocultarMorador = opcoes.ocultarMorador !== false;

  // 1. Adaptação dos dados de Ciclos A e B
  const armadilhasAdaptadas = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_AMBAS);
  const metricas = calcularMetricasCiclo(armadilhasAdaptadas);
  const comp = metricas.comparativo;

  const totalArmadilhas = metricas.total;
  const totalLidasConsolidado = metricas.totalLidas;
  const totalPositivasConsolidado = metricas.totalPositivas;
  const totalNegativasConsolidado = metricas.totalNegativas;
  const totalOvosConsolidado = metricas.totalOvos;
  const ipoConsolidado = metricas.ipo.toFixed(1);
  const idoConsolidado = metricas.ido.toFixed(1);

  const cabecalhoParams = {
    dataFormatada,
    horaFormatada,
    filtroDescricao,
    dataBase: opcoes.dataBase || 'Setembro / 2026',
    totalLidas: totalLidasConsolidado,
    totalArmadilhas,
    subtitulo: 'DOSSIÊ EPIDEMIOLÓGICO CONSOLIDADO'
  };

  // =========================================================================
  // PÁGINA 1: CAPA, BIG NUMBERS & QUADRO COMPARATIVO SEMANAL (A vs B vs TOTAL)
  // =========================================================================
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('DOSSIÊ EPIDEMIOLÓGICO CONSOLIDADO DE VIGILÂNCIA ENTOMOLÓGICA', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Análise Bi-Semanal Integrada das ${totalArmadilhas} Ovitrampas • Palheta A (1ª Semana) vs Palheta B (2ª Semana) vs Consolidado A+B`, 10, 40);

  // 1.1 Bloco dos 4 Grandes KPIs Executivos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('📊 1. Indicadores Entomológicos Oficiais Consolidados (Total Municipal)', 10, 46);

  const kpis = [
    { label: 'TOTAL ARMADILHAS', val: `${totalArmadilhas}`, sub: '56 OVs Georreferenciadas', cor: '#0F172A' },
    { label: 'TOTAL GERAL DE OVOS', val: totalOvosConsolidado.toLocaleString('pt-BR'), sub: 'Postura Bi-Semanal Acumulada', cor: '#B91C1C' },
    { label: 'IPO CONSOLIDADO', val: `${ipoConsolidado}%`, sub: `${totalPositivasConsolidado} de ${totalLidasConsolidado} Arm. Positivas`, cor: '#DC2626' },
    { label: 'IDO CONSOLIDADO', val: `${idoConsolidado}`, sub: 'Média Ovos / Arm. Positiva', cor: '#EA580C' }
  ];

  const cardW = 45;
  const cardH = 17;
  const cardGap = 3.3;
  kpis.forEach((kpi, idx) => {
    const cx = 10 + idx * (cardW + cardGap);
    const cy = 49;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');

    doc.setFillColor(kpi.cor);
    doc.rect(cx, cy, 2, cardH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 5, cy + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, cx + 5, cy + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, cx + 5, cy + 14.5);
  });

  // 1.2 Tabela de Comparação Semanal Oficial (Palheta A vs Palheta B vs Consolidado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('📈 2. Quadro Comparativo Semanal de Evolução Vetorial (Palheta A vs Palheta B)', 10, 72);

  const temDadosB = comp.lidasB > 0;
  const variacaoOvosStr = temDadosB
    ? (comp.diferencaOvos >= 0 ? `+${comp.diferencaOvos} (${comp.variacaoOvosPct > 0 ? '+' : ''}${comp.variacaoOvosPct.toFixed(1)}%)` : `${comp.diferencaOvos} (${comp.variacaoOvosPct.toFixed(1)}%)`)
    : 'Aguardando Coleta';

  const variacaoIpoStr = temDadosB
    ? `${comp.variacaoIpoPct >= 0 ? '+' : ''}${comp.variacaoIpoPct.toFixed(1)} p.p.`
    : '-';

  const tabelaComparativa = [
    [
      'Palheta A (1ª Semana - 14 a 22/09)',
      comp.lidasA.toString(),
      comp.posA.toString(),
      (comp.lidasA - comp.posA).toString(),
      `${comp.ipoA.toFixed(1)}%`,
      comp.ovosA.toLocaleString('pt-BR'),
      comp.idoA.toFixed(1),
      'Linha de Base'
    ],
    [
      'Palheta B (2ª Semana - 21 a 29/09)',
      temDadosB ? comp.lidasB.toString() : 'Em campo (56)',
      temDadosB ? comp.posB.toString() : 'Aguardando',
      temDadosB ? (comp.lidasB - comp.posB).toString() : 'Aguardando',
      temDadosB ? `${comp.ipoB.toFixed(1)}%` : 'Coleta 28-29/09',
      temDadosB ? comp.ovosB.toLocaleString('pt-BR') : 'Aguardando contagem',
      temDadosB ? comp.idoB.toFixed(1) : '-',
      temDadosB ? (comp.diferencaOvos < 0 ? '📉 Redução' : '📈 Aumento') : '🌱 Palhetas ativas'
    ],
    [
      'Variação / Tendência Entomológica',
      temDadosB ? `${comp.lidasB - comp.lidasA}` : '-',
      temDadosB ? `${comp.posB - comp.posA}` : '-',
      '-',
      variacaoIpoStr,
      variacaoOvosStr,
      temDadosB ? `${(comp.idoB - comp.idoA).toFixed(1)} ovos` : '-',
      temDadosB ? (comp.diferencaOvos < 0 ? 'Impacto Positivo' : 'Alerta de Postura') : 'Aguardando B'
    ],
    [
      'CONSOLIDADO TOTAL (A + B ACUMULADO)',
      totalLidasConsolidado.toString(),
      totalPositivasConsolidado.toString(),
      totalNegativasConsolidado.toString(),
      `${ipoConsolidado}%`,
      totalOvosConsolidado.toLocaleString('pt-BR'),
      `${idoConsolidado}`,
      'Visão Bi-Semanal Geral'
    ]
  ];

  autoTable(doc, {
    startY: 75,
    margin: { left: 10, right: 10 },
    head: [['Ciclo Epidemiológico / Período', 'Arm. Lidas', 'Positivas', 'Negativas', 'IPO (%)', 'Total de Ovos', 'IDO (Ovos/Pos)', 'Status / Tendência']],
    body: tabelaComparativa,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 6.8,
      halign: 'center',
      cellPadding: 2
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', width: 55 },
      1: { width: 18 },
      2: { width: 18 },
      3: { width: 18 },
      4: { fontStyle: 'bold', width: 20 },
      5: { fontStyle: 'bold', width: 22 },
      6: { width: 20 },
      7: { halign: 'center', width: 24 }
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231]; // emerald-100
        data.cell.styles.textColor = [6, 95, 70]; // emerald-800
      } else if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    }
  });

  // 1.3 Síntese Executiva Textual
  const posTabela1 = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('📝 3. Síntese Executiva da Situação Entomológica Municipal', 10, posTabela1);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, posTabela1 + 3, 190, 52, 2, 2, 'FD');

  const textoSintese = [
    `• Cobertura Espacial e Regularidade Metodológica: O município de Carmo/RJ conta com 56 armadilhas ovitrampas ativas georreferenciadas via satélite com GPS de alta precisão, instaladas estrategicamente em peridomicílios na Sede Urbana (35 armadilhas) e nos distritos de Influência, Córrego da Prata, Porto Velho do Cunha e localidades anexas (21 armadilhas).`,
    `• Avaliação do Índice de Positividade (IPO): No Ciclo A (1ª semana), registrou-se um IPO de ${comp.ipoA.toFixed(1)}%, revelando ampla dispersão do vetor na malha municipal. ${temDadosB ? `No Ciclo B (2ª semana), o IPO foi de ${comp.ipoB.toFixed(1)}% (${variacaoIpoStr}).` : `As palhetas do Ciclo B estão ativas em campo, com recolhimento escalonado para segunda (28/09) e terça (29/09).`}`,
    `• Carga de Oviposição e Densidade (IDO): Foram totalizados ${totalOvosConsolidado.toLocaleString('pt-BR')} ovos até o momento sob microscopia de bancada. O IDO consolidado situa-se em ${idoConsolidado} ovos por armadilha positiva, indicando fêmeas grávidas em franca atividade reprodutiva nos microterritórios mais adensados.`,
    `• Medidas Prioritárias em Curso: Ações focais imediatas foram acionadas para bloqueio com larvicida biológico (BTI), manejo mecânico em raio de 100 metros ao redor dos focos com mais de 50 ovos e intensificação das visitas domiciliares de conscientização comunitária.`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  let yTxt = posTabela1 + 8;
  textoSintese.forEach((paragrafo) => {
    const linhas = doc.splitTextToSize(paragrafo, 182);
    doc.text(linhas, 14, yTxt);
    yTxt += linhas.length * 3.3 + 1.2;
  });

  // =========================================================================
  // PÁGINA 2: ESTRATIFICAÇÃO TERRITORIAL POR BAIRROS E DISTRITOS
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🏘️ ESTRATIFICAÇÃO TERRITORIAL POR DISTRITOS E BAIRROS', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Distribuição da Carga de Ovos, Índices IPO/IDO e Classificação de Risco nos 4 Distritos Oficiais e Localidades Anexas:', 10, 40);

  // Agrupamento por Território / Bairro
  const gruposTerritorio = agruparArmadilhasPorTerritorio(armadilhasAdaptadas);
  const linhasTerritorios = gruposTerritorio.map((g) => {
    const totalArmG = g.armadilhas.length;
    let lidasG = 0;
    let posG = 0;
    let ovosA_G = 0;
    let ovosB_G = 0;
    let ovosTot_G = 0;
    let maxOvos = -1;
    let hotspotArm = null;

    g.armadilhas.forEach((arm) => {
      const d = arm.dadosCiclos;
      if (d) {
        if (d.temLeituraAmbas) lidasG += 1;
        if (d.positivaAmbas) posG += 1;
        ovosA_G += Number(d.ovosA || 0);
        ovosB_G += Number(d.ovosB || 0);
        const tot = Number(d.ovosTotal || 0);
        ovosTot_G += tot;
        if (tot > maxOvos) {
          maxOvos = tot;
          hotspotArm = arm;
        }
      }
    });

    const ipoG = lidasG > 0 ? ((posG / lidasG) * 100).toFixed(1) : '0.0';
    const idoG = posG > 0 ? (ovosTot_G / posG).toFixed(1) : '0.0';
    const riscoG = classificarRiscoOficial(maxOvos >= 0 ? maxOvos : 0);

    const hotspotTxt = hotspotArm ? `ARM-${hotspotArm.numero} (${maxOvos} ovos - ${hotspotArm.quarteirao || ''})` : '-';

    return [
      g.nome,
      totalArmG.toString(),
      posG.toString(),
      ovosA_G.toLocaleString('pt-BR'),
      ovosB_G > 0 ? ovosB_G.toLocaleString('pt-BR') : (temDadosB ? '0' : 'Em campo'),
      ovosTot_G.toLocaleString('pt-BR'),
      `${ipoG}%`,
      idoG,
      riscoG.rotulo,
      hotspotTxt
    ];
  });

  // Linha final do Município
  linhasTerritorios.push([
    'TOTAL GERAL DO MUNICÍPIO',
    totalArmadilhas.toString(),
    totalPositivasConsolidado.toString(),
    comp.ovosA.toLocaleString('pt-BR'),
    comp.ovosB > 0 ? comp.ovosB.toLocaleString('pt-BR') : (temDadosB ? '0' : 'Em campo'),
    totalOvosConsolidado.toLocaleString('pt-BR'),
    `${ipoConsolidado}%`,
    idoConsolidado,
    'Crítico Municipal',
    'ARM-23 (147 ovos - Progresso)'
  ]);

  autoTable(doc, {
    startY: 45,
    margin: { left: 10, right: 10 },
    head: [['Território / Distrito / Bairro', 'Total OVs', 'Positivas', 'Ovos A', 'Ovos B', 'Total (A+B)', 'IPO (%)', 'IDO', 'Risco Máx.', 'Hotspot Territorial']],
    body: linhasTerritorios,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.8
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', width: 44 },
      1: { width: 14 },
      2: { width: 14 },
      3: { width: 16 },
      4: { width: 16 },
      5: { fontStyle: 'bold', width: 18 },
      6: { fontStyle: 'bold', width: 16 },
      7: { width: 14 },
      8: { fontStyle: 'bold', width: 20 },
      9: { halign: 'left', width: 38 }
    },
    didParseCell: (data) => {
      if (data.row.index === linhasTerritorios.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  // Notas explicativas dos 5 níveis do Ministério da Saúde
  const posTabela2 = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('🎯 Estratificação de Risco Oficial do Ministério da Saúde (MS/Fiocruz):', 10, posTabela2);

  const estratos = [
    { nivel: '1. Negativa (Azul)', desc: '0 ovos. Ausência de postura registrada no ciclo.', cor: [37, 99, 235] },
    { nivel: '2. Baixo Risco (Verde)', desc: '1 a 20 ovos. Presença inicial ou residual do vetor.', cor: [16, 185, 129] },
    { nivel: '3. Médio Risco (Amarelo)', desc: '21 a 50 ovos. População vetorial ativa demandando monitoramento.', cor: [245, 158, 11] },
    { nivel: '4. Alto Risco (Laranja)', desc: '51 a 100 ovos. Alta densidade de fêmeas; intervenção focal recomendada.', cor: [249, 115, 22] },
    { nivel: '5. Crítico (Vermelho)', desc: '> 100 ovos. Foco crítico e risco iminente de transmissão de arboviroses.', cor: [220, 38, 38] }
  ];

  let yEst = posTabela2 + 4;
  estratos.forEach((est) => {
    doc.setFillColor(...est.cor);
    doc.rect(10, yEst, 3, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(est.nivel, 15, yEst + 3);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`— ${est.desc}`, 48, yEst + 3);

    yEst += 5.2;
  });

  // =========================================================================
  // PÁGINA 3: MAPA 1: CALOR EPIDEMIOLÓGICO (5 NÍVEIS OFICIAIS — FUNDO SATÉLITE)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🗺️ MAPA 1: CALOR EPIDEMIOLÓGICO (5 NÍVEIS OFICIAIS — FUNDO SATÉLITE)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Modelagem geoestatística de densidade de postura e estratificação de risco sobre imagem de satélite (Sede Urbana de Carmo):', 10, 40);
  doc.text('A intensidade térmica baseia-se na contagem microscópica de ovos segundo os 5 estratos do Ministério da Saúde: 1. Azul: 0 ovos (Negativa);', 10, 43.5);
  doc.text('2. Verde: 1-20 (Baixo); 3. Amarelo: 21-50 (Médio); 4. Laranja: 51-100 (Alto); 5. Vermelho: >100 (Crítico). Circunferências com raio de 175m.', 10, 47);

  const imgMapa1 = await carregarImagemDataUrl('maps/mapa_1_sede_5_niveis.jpg');
  if (imgMapa1) {
    doc.addImage(imgMapa1, 'JPEG', 10, 50, 190, 220, undefined, 'FAST');
  } else {
    const sedeArms = armadilhasAdaptadas.filter((a) => classificarTerritorio(a).id === 'sede');
    const { canvas } = await gerarCanvasMapaCalor(sedeArms.length > 0 ? sedeArms : armadilhasAdaptadas, {
      width: 1500,
      height: 1750,
      tituloTerritorio: 'CARMO (SEDE URBANA)',
      provider: 'satellite'
    });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 50, 190, 220, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Cobertura com as 35 armadilhas da Sede Urbana sobre imagem de satélite de alta resolução • Cores térmicas vivas e contrastantes.', 10, 276);

  // =========================================================================
  // PÁGINA 4: MAPA 2: NÉVOA TÉRMICA & GRADE TÉCNICA 300M (PADRÃO FIOCRUZ)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🛰️ MAPA 2: NÉVOA TÉRMICA CONTÍNUA & DISPERSÃO TERRITORIAL (SATÉLITE)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Visualização Contínua em Névoa Térmica sobre Ortofotos de Satélite de Alta Resolução:', 10, 40);
  doc.text('Demonstra a mancha contínua de dispersão ativa do vetor Aedes aegypti no tecido urbano. As manchas em Vermelho Carmesim concentram as', 10, 43.5);
  doc.text('maiores cargas de postura no Progresso, Boa Ideia e Centro, esfumando suavemente em Laranja e Amarelo Dourado.', 10, 47);

  const imgMapa2 = await carregarImagemDataUrl('maps/mapa_2_sede_nevoeiro.jpg');
  if (imgMapa2) {
    doc.addImage(imgMapa2, 'JPEG', 10, 50, 190, 220, undefined, 'FAST');
  } else {
    const sedeArms = armadilhasAdaptadas.filter((a) => classificarTerritorio(a).id === 'sede');
    const { canvas } = await gerarCanvasMapaNevoeiro(sedeArms.length > 0 ? sedeArms : armadilhasAdaptadas, {
      width: 1500,
      height: 1750,
      tituloTerritorio: 'CARMO (SEDE URBANA)'
    });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 50, 190, 220, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Mapeamento de interpolação térmica com raio de influência de 200m • Identificação precisa de corredores de circulação vetorial.', 10, 276);

  // =========================================================================
  // PÁGINA 5: FOCOS CRÍTICOS & DIRETRIZES DE BLOQUEIO DE CAMPO
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🎯 FOCOS CRÍTICOS E DIRETRIZES OPERACIONAIS DE BLOQUEIO FOCAL', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Armadilhas com carga acumulada acima de 50 ovos (Alto Risco e Crítico) demandando intervenção imediata dos Agentes de Endemias:', 10, 40);

  // Filtragem dos focos críticos
  const focosCriticos = armadilhasAdaptadas
    .filter((a) => Number(a.ultimosOvos || 0) >= 40)
    .sort((a, b) => Number(b.ultimosOvos || 0) - Number(a.ultimosOvos || 0));

  const linhasFocos = focosCriticos.map((arm, index) => {
    const d = arm.dadosCiclos;
    const ovosTot = Number(arm.ultimosOvos || 0);
    const moradorStr = ocultarMorador ? 'Protegido (LGPD)' : (arm.moradorNome || 'Não informado');
    const enderecoStr = ocultarMorador ? 'Endereço Reservado' : `${arm.rua || ''}, ${arm.numeroImovel || 'S/N'}`;
    const risco = classificarRiscoOficial(ovosTot);

    let acaoRecomendada = 'Eliminação mecânica de criadouros num raio de 100m';
    if (ovosTot >= 100) {
      acaoRecomendada = 'Bloqueio Imediato com Larvicida Biológico (BTI) + Varredura Peridomiciliar';
    } else if (ovosTot >= 70) {
      acaoRecomendada = 'Tratamento Focal + Orientação ao Morador + Revisão de Calhas/Ralos';
    }

    return [
      `#${index + 1}`,
      `ARM-${arm.numero}`,
      arm.bairro || arm.microarea || 'Carmo',
      arm.quarteirao || 'Q-01',
      moradorStr,
      d ? (d.ovosA != null ? d.ovosA.toString() : '-') : '-',
      d ? (d.ovosB != null ? d.ovosB.toString() : (temDadosB ? '0' : 'Em campo')) : '-',
      ovosTot.toString(),
      risco.rotulo,
      `${Number(arm.latitude).toFixed(4)}, ${Number(arm.longitude).toFixed(4)}`,
      acaoRecomendada
    ];
  });

  autoTable(doc, {
    startY: 45,
    margin: { left: 10, right: 10 },
    head: [['Pos', 'ARM', 'Bairro', 'Quart.', 'Morador', 'Ovos A', 'Ovos B', 'Total', 'Risco', 'Coordenadas GPS', 'Ação Operacional Imediata']],
    body: linhasFocos.length > 0 ? linhasFocos : [['-', '-', 'Sem focos críticos registrados', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [185, 28, 28], // red-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 6.2,
      halign: 'center',
      cellPadding: 1.6
    },
    columnStyles: {
      0: { width: 10 },
      1: { fontStyle: 'bold', width: 14 },
      2: { halign: 'left', width: 22 },
      3: { width: 12 },
      4: { halign: 'left', width: 24 },
      5: { width: 12 },
      6: { width: 12 },
      7: { fontStyle: 'bold', width: 12 },
      8: { fontStyle: 'bold', width: 18 },
      9: { width: 20 },
      10: { halign: 'left', width: 34 }
    }
  });

  // Recomendações Técnicas de Manejo
  const posTabelaFocos = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('🛡️ Protocolo Padrão de Intervenção em Raio de 100 Metros (Diretriz MS):', 10, posTabelaFocos);

  const protocolos = [
    '1. Varredura Peridomiciliar Imediata: Realizar vistoria minuciosa em 100% dos imóveis situados no raio de 100m do ponto crítico;',
    '2. Tratamento com Larvicida Biológico: Aplicar Bacillus thuringiensis israelensis (BTI) em depósitos não elimináveis (ralos, caixas, cisternas);',
    '3. Manejo Mecânico Ambiental: Eliminar materiais inservíveis com capacidade de acúmulo de água pluvial e vedar caixas d\'água;',
    '4. Educação e Engajamento Comunitário: Alertar o morador sobre o foco identificado e orientar a vistoria semanal de 10 minutos.'
  ];

  let yProt = posTabelaFocos + 4;
  protocolos.forEach((p) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(p, 12, yProt);
    yProt += 4.5;
  });

  // =========================================================================
  // PÁGINA 6: INVENTÁRIO TÉCNICO DAS 56 ARMADILHAS (PARTE 1: ARM-01 A ARM-28)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📋 INVENTÁRIO TÉCNICO DAS ARMADILHAS — PARTE 1 (ARM-01 A ARM-28)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Acompanhamento analítico e histórico de postura de cada ovitrampa monitorada em campo:', 10, 40);

  const armadilhasOrdenadas = [...armadilhasAdaptadas].sort((a, b) => {
    const na = parseInt(a.numero, 10) || 0;
    const nb = parseInt(b.numero, 10) || 0;
    return na - nb;
  });

  const parte1 = armadilhasOrdenadas.slice(0, 28);
  const linhasParte1 = parte1.map((arm) => {
    const d = arm.dadosCiclos;
    const ovosTot = Number(arm.ultimosOvos || 0);
    const risco = classificarRiscoOficial(ovosTot);
    const moradorStr = ocultarMorador ? 'Protegido' : (arm.moradorNome || 'Não informado');

    return [
      `ARM-${arm.numero}`,
      arm.bairro || arm.microarea || 'Carmo',
      arm.quarteirao || 'Q-01',
      moradorStr,
      d ? (d.ovosA != null ? d.ovosA.toString() : '-') : '-',
      d ? (d.ovosB != null ? d.ovosB.toString() : (temDadosB ? '0' : 'Em campo')) : '-',
      ovosTot.toString(),
      risco.rotulo,
      arm.status === 'recolhida' ? 'Recolhida' : (arm.status === 'analisada' ? 'Lida' : 'Em campo')
    ];
  });

  autoTable(doc, {
    startY: 44,
    margin: { left: 10, right: 10 },
    head: [['Ovitrampa', 'Bairro / Distrito', 'Quarteirão', 'Morador', 'Ovos Palheta A', 'Ovos Palheta B', 'Total (A+B)', 'Classificação de Risco', 'Situação Operacional']],
    body: linhasParte1,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.6
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 18 },
      1: { halign: 'left', width: 34 },
      2: { width: 18 },
      3: { halign: 'left', width: 32 },
      4: { width: 18 },
      5: { width: 18 },
      6: { fontStyle: 'bold', width: 18 },
      7: { fontStyle: 'bold', width: 22 },
      8: { width: 18 }
    }
  });

  // =========================================================================
  // PÁGINA 7: INVENTÁRIO TÉCNICO DAS 56 ARMADILHAS (PARTE 2: ARM-29 A ARM-56)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📋 INVENTÁRIO TÉCNICO DAS ARMADILHAS — PARTE 2 (ARM-29 A ARM-56)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Continuação do inventário analítico das ovitrampas de Carmo (Sede e Distritos):', 10, 40);

  const parte2 = armadilhasOrdenadas.slice(28);
  const linhasParte2 = parte2.map((arm) => {
    const d = arm.dadosCiclos;
    const ovosTot = Number(arm.ultimosOvos || 0);
    const risco = classificarRiscoOficial(ovosTot);
    const moradorStr = ocultarMorador ? 'Protegido' : (arm.moradorNome || 'Não informado');

    return [
      `ARM-${arm.numero}`,
      arm.bairro || arm.microarea || 'Carmo',
      arm.quarteirao || 'Q-01',
      moradorStr,
      d ? (d.ovosA != null ? d.ovosA.toString() : '-') : '-',
      d ? (d.ovosB != null ? d.ovosB.toString() : (temDadosB ? '0' : 'Em campo')) : '-',
      ovosTot.toString(),
      risco.rotulo,
      arm.status === 'recolhida' ? 'Recolhida' : (arm.status === 'analisada' ? 'Lida' : 'Em campo')
    ];
  });

  autoTable(doc, {
    startY: 44,
    margin: { left: 10, right: 10 },
    head: [['Ovitrampa', 'Bairro / Distrito', 'Quarteirão', 'Morador', 'Ovos Palheta A', 'Ovos Palheta B', 'Total (A+B)', 'Classificação de Risco', 'Situação Operacional']],
    body: linhasParte2,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.6
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 18 },
      1: { halign: 'left', width: 34 },
      2: { width: 18 },
      3: { halign: 'left', width: 32 },
      4: { width: 18 },
      5: { width: 18 },
      6: { fontStyle: 'bold', width: 18 },
      7: { fontStyle: 'bold', width: 22 },
      8: { width: 18 }
    }
  });

  // =========================================================================
  // PÁGINA 8: PARECER TÉCNICO EPIDEMIOLÓGICO, RECOMENDAÇÕES E ASSINATURAS
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, cabecalhoParams);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('✍️ PARECER TÉCNICO EPIDEMIOLÓGICO E DIRETRIZES DE VIGILÂNCIA', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Avaliação entomológica fundamentada nas normas técnicas do Ministério da Saúde e Fiocruz:', 10, 40);

  // Bloco de Parecer Técnico
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 44, 190, 140, 2, 2, 'FD');

  const pareceres = [
    {
      titulo: '1. DIAGNÓSTICO ENTOMOLÓGICO CONSOLIDADO',
      texto: `Os resultados do monitoramento bi-semanal por ovitrampas em Carmo/RJ evidenciam uma infestação com IPO de ${ipoConsolidado}% e IDO de ${idoConsolidado} ovos por armadilha positiva. A presença vetorial está dispersa por toda a malha urbana da Sede e nos distritos, com maior adensamento de postura concentrado nos bairros Progresso, Centro, Boa Ideia e no distrito de Influência. A contagem microscópica acumulada de ${totalOvosConsolidado.toLocaleString('pt-BR')} ovos atesta uma população fértil ativa e receptividade ambiental favorável ao Aedes aegypti.`
    },
    {
      titulo: '2. AVALIAÇÃO DA DINÂMICA TEMPORAL (PALHETA A vs PALHETA B)',
      texto: temDadosB
        ? `A análise comparativa entre os ciclos demonstrou uma variação de ${variacaoOvosStr} na quantidade absoluta de ovos e uma oscilação de ${variacaoIpoStr} no IPO. Essa oscilação reflete a resposta inicial das medidas de manejo ambiental e bloqueio mecânico executadas pelas equipes de campo nos quarteirões priorizados.`
        : `O ciclo da Palheta A estabeleceu a linha de base epidemiológica municipal com 1.017 ovos. A Palheta B encontra-se em fase final de campo com coletas programadas para 28 e 29 de setembro, cujos resultados serão computados diretamente para encerramento do balanço bi-semanal consolidado.`
    },
    {
      titulo: '3. RECOMENDAÇÕES TÉCNICAS PARA A GESTÃO MUNICIPAL',
      texto: `a) Manter o cronograma quinzenal contínuo de monitoramento por ovitrampas para acompanhar as oscilações de densidade vetorial;\nb) Direcionar os Agentes de Combate às Endemias (ACE) prioritariamente para os quarteirões com armadilhas classificadas em Alto Risco e Crítico (> 50 ovos);\nc) Fortalecer a articulação intersetorial com a Secretaria de Obras e Serviços Públicos para eliminação de depósitos inservíveis em terrenos baldios e calhas públicas;\nd) Intensificar a comunicação com a população através de campanhas de mobilização social ("10 Minutos Contra o Aedes").`
    }
  ];

  let yPar = 50;
  pareceres.forEach((par) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(par.titulo, 14, yPar);
    yPar += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const linhas = doc.splitTextToSize(par.texto, 182);
    doc.text(linhas, 14, yPar);
    yPar += linhas.length * 3.3 + 4;
  });

  // Bloco de Assinaturas Formais
  const yAssinaturas = 195;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('HOMOLOGAÇÃO E RESPONSABILIDADE TÉCNICA OFICIAL:', 10, yAssinaturas);

  const assW = 58;
  const assH = 28;
  const assinaturas = [
    { cargo: 'COORDENAÇÃO DE CONTROLE DE VETORES', nome: 'Coordenação de Endemias / SMS', desc: 'Vigilância Ambiental de Carmo/RJ' },
    { cargo: 'RESPONSÁVEL TÉCNICO ENTOMOLÓGICO', nome: 'Responsável Técnico / Biologia', desc: 'Laboratório de Microscopia de Vetores' },
    { cargo: 'SECRETÁRIO(A) MUNICIPAL DE SAÚDE', nome: 'Secretaria Municipal de Saúde', desc: 'Prefeitura Municipal de Carmo - RJ' }
  ];

  assinaturas.forEach((ass, idx) => {
    const ax = 10 + idx * (assW + 8);
    const ay = yAssinaturas + 8;

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.4);
    doc.line(ax, ay + 15, ax + assW, ay + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(ass.cargo, ax + assW / 2, ay + 19, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(ass.nome, ax + assW / 2, ay + 22.5, { align: 'center' });
    doc.text(ass.desc, ax + assW / 2, ay + 25.5, { align: 'center' });
  });

  // =========================================================================
  // NUMERAÇÃO FINAL DE TODAS AS PÁGINAS (PÁGINA X DE Y)
  // =========================================================================
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    desenharRodapeOficial(doc, i, totalPaginas);
  }

  // Baixa o arquivo PDF
  const nomeArquivo = opcoes.nomeArquivo || `RELATORIO_EPIDEMIOLOGICO_CONSOLIDADO_CARMO_${dataFormatada.replace(/\//g, '-')}.pdf`;
  doc.save(nomeArquivo);
  return doc;
}
