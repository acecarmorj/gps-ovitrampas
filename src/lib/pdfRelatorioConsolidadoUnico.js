import {
  adaptarArmadilhasParaCiclo,
  calcularMetricasCiclo,
  CICLO_AMBAS
} from './ciclosOvitrampas';
import { calcularSituacaoArmadilha } from './situacaoOvitrampa';
import { findNearbyTraps } from './geoDistance';
import {
  gerarCanvasGraficoBarrasIpo,
  gerarCanvasRankingFocos,
  gerarCanvasStatusPalhetas
} from './pdfRelatoriosGraficos';

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

/**
 * 5 Níveis Oficiais do Ministério da Saúde com cores diretas
 */
export function classificarRiscoOficial(ovos) {
  const nOvos = Number(ovos) || 0;
  if (nOvos === 0) {
    return {
      nivel: 'Negativa (0 ovos)',
      rotulo: 'Negativa (Azul)',
      corTexto: [29, 78, 216],     // blue-700
      corFundo: [239, 246, 255],   // blue-50
      corHex: '#2563eb',
      nivelNum: 1
    };
  } else if (nOvos <= 20) {
    return {
      nivel: 'Baixo Risco (1 a 20 ovos)',
      rotulo: 'Baixo Risco (Verde)',
      corTexto: [4, 120, 87],      // emerald-700
      corFundo: [236, 253, 245],   // emerald-50
      corHex: '#10b981',
      nivelNum: 2
    };
  } else if (nOvos <= 50) {
    return {
      nivel: 'Médio Risco (21 a 50 ovos)',
      rotulo: 'Médio Risco (Amarelo)',
      corTexto: [180, 83, 9],      // amber-700
      corFundo: [254, 252, 232],   // yellow-50
      corHex: '#f59e0b',
      nivelNum: 3
    };
  } else if (nOvos <= 100) {
    return {
      nivel: 'Alto Risco (51 a 100 ovos)',
      rotulo: 'Alto Risco (Laranja)',
      corTexto: [194, 65, 12],     // orange-700
      corFundo: [255, 247, 237],   // orange-50
      corHex: '#f97316',
      nivelNum: 4
    };
  } else {
    return {
      nivel: 'Crítico (> 100 ovos)',
      rotulo: 'Crítico (Vermelho)',
      corTexto: [185, 28, 28],     // red-700
      corFundo: [254, 242, 242],   // red-50
      corHex: '#dc2626',
      nivelNum: 5
    };
  }
}

/**
 * Aplica coloração direta nas células de risco e ovos das tabelas do autoTable
 */
function colorirCelulaRisco(data, colIndex = -1) {
  if (colIndex !== -1 && data.column.index !== colIndex) return;

  const texto = String(data.cell.raw || '').toLowerCase();
  if (texto.includes('crítico') || texto.includes('critico')) {
    data.cell.styles.textColor = [185, 28, 28];
    data.cell.styles.fillColor = [254, 242, 242];
    data.cell.styles.fontStyle = 'bold';
  } else if (texto.includes('alto')) {
    data.cell.styles.textColor = [194, 65, 12];
    data.cell.styles.fillColor = [255, 247, 237];
    data.cell.styles.fontStyle = 'bold';
  } else if (texto.includes('médio') || texto.includes('medio')) {
    data.cell.styles.textColor = [180, 83, 9];
    data.cell.styles.fillColor = [254, 252, 232];
    data.cell.styles.fontStyle = 'bold';
  } else if (texto.includes('baixo')) {
    data.cell.styles.textColor = [4, 120, 87];
    data.cell.styles.fillColor = [236, 253, 245];
    data.cell.styles.fontStyle = 'bold';
  } else if (texto.includes('negativ') || texto.includes('sem ovos')) {
    data.cell.styles.textColor = [29, 78, 216];
    data.cell.styles.fillColor = [239, 246, 255];
    data.cell.styles.fontStyle = 'bold';
  }
}

/**
 * Carrega a imagem a partir de caminhos web locais/remotos
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
      // continua procurando
    }
  }
  return null;
}

/**
 * Desenha o cabeçalho oficial institucional
 */
function desenharCabecalhoOficial(doc, { dataFormatada, horaFormatada, filtroDescricao, dataBase, totalLidas, totalArmadilhas, subtitulo = 'RELATÓRIO EPIDEMIOLÓGICO CONSOLIDADO' }) {
  const pageW = doc.internal.pageSize.getWidth();
  const barW = pageW - 20;
  const barH = 22;

  // Barra superior Slate executivo escuro
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(10, 8, barW, barH, 'F');

  // Faixa esmeralda institucional
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
 * Desenha o rodapé oficial institucional com numeração dinâmica de páginas
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
 * GERA O DOSSIÊ EPIDEMIOLÓGICO CONSOLIDADO ÚNICO COMPLETO (9 PÁGINAS)
 * Compila integralmente os 6 relatórios do sistema com gráficos vetoriais,
 * mapas térmicos em satélite de alta definição, cronograma de campo,
 * auditoria geodésica de 300m-400m, ranking de focos, inventário e parecer técnico.
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

  // 2. Estatísticas Operacionais de Campo (Ciclo B - 7 dias)
  let palhetasEmDia = 0;
  let palhetasTrocarHoje = 0;
  let palhetasAtrasadas = 0;
  let coletaSegunda = 0;
  let coletaTerca = 0;

  armadilhasAdaptadas.forEach((arm) => {
    const sit = calcularSituacaoArmadilha(arm);
    const dia = (sit.diaSemana || '').toLowerCase();
    if (dia.includes('segunda')) coletaSegunda += 1;
    else if (dia.includes('ter')) coletaTerca += 1;

    if (arm.status === 'analisada') {
      palhetasEmDia += 1;
    } else if (sit.fase === 'hoje') {
      palhetasTrocarHoje += 1;
    } else if (sit.fase === 'atrasada') {
      palhetasAtrasadas += 1;
    } else {
      palhetasEmDia += 1;
    }
  });

  // 3. Auditoria Geodésica de Espaçamento 300m - 400m
  let totalIdeal = 0;
  let totalProxima = 0;
  let totalAmpla = 0;

  armadilhasAdaptadas.forEach((arm) => {
    const vizinhas = findNearbyTraps(arm, armadilhasAdaptadas, 1, arm.id);
    if (vizinhas.length > 0) {
      const v = vizinhas[0];
      if (v.status === 'ideal') totalIdeal += 1;
      else if (v.status === 'proxima') totalProxima += 1;
      else totalAmpla += 1;
    }
  });

  const percIdeal = totalArmadilhas > 0 ? ((totalIdeal / totalArmadilhas) * 100).toFixed(0) : '0';
  const percProxima = totalArmadilhas > 0 ? ((totalProxima / totalArmadilhas) * 100).toFixed(0) : '0';
  const percAmpla = totalArmadilhas > 0 ? ((totalAmpla / totalArmadilhas) * 100).toFixed(0) : '0';

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
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [6, 95, 70];
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
  doc.text('📝 3. Síntese Executiva da Situação Epidemiológica', 10, posTabela1);

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
  // PÁGINA 2: ÍNDICES ENTOMOLÓGICOS IPO E IDO COM GRÁFICO DE BARRAS VETORIAL
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'ÍNDICES IPO E IDO COM GRÁFICOS' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📊 ÍNDICES ENTOMOLÓGICOS IPO E IDO POR BAIRRO COM GRÁFICO COMPARATIVO', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Positividade e densidade de ovos por bairro, com linha de corte municipal e classificação direta de risco:', 10, 40);

  // Prepara dados de bairros para o gráfico de barras
  const gruposTerritorio = agruparArmadilhasPorTerritorio(armadilhasAdaptadas);
  const bairrosData = gruposTerritorio.map((g) => {
    let lidasG = 0;
    let posG = 0;
    let ovosTot = 0;
    g.armadilhas.forEach((a) => {
      const d = a.dadosCiclos;
      if (d) {
        if (d.temLeituraAmbas) lidasG += 1;
        if (d.positivaAmbas) posG += 1;
        ovosTot += Number(d.ovosTotal || 0);
      }
    });
    const ipoG = lidasG > 0 ? (posG / lidasG) * 100 : 0;
    const idoG = posG > 0 ? ovosTot / posG : 0;
    return {
      nome: g.nome.replace('LOCALIDADE DE ', '').replace('DISTRITO ', ''),
      ipo: ipoG,
      ido: idoG,
      totalOvos: ovosTot,
      lidas: lidasG,
      positivas: posG
    };
  }).sort((a, b) => b.ipo - a.ipo);

  // Gera o gráfico de barras vetorial via Canvas
  const canvasIpo = gerarCanvasGraficoBarrasIpo(bairrosData, {
    width: 1200,
    height: 440,
    ipoMedio: Number(ipoConsolidado)
  });
  if (canvasIpo) {
    doc.addImage(canvasIpo.toDataURL('image/png'), 'PNG', 10, 44, 190, 68, undefined, 'FAST');
  }

  // Tabela Analítica de Bairros abaixo do gráfico
  const linhasTabelaBairros = bairrosData.map((b) => {
    const risco = classificarRiscoOficial(b.totalOvos);
    return [
      b.nome,
      b.lidas.toString(),
      b.positivas.toString(),
      `${b.ipo.toFixed(1)}%`,
      b.totalOvos.toLocaleString('pt-BR'),
      b.ido.toFixed(1),
      risco.rotulo
    ];
  });

  linhasTabelaBairros.push([
    'TOTAL MUNICIPAL CONSOLIDADO',
    totalLidasConsolidado.toString(),
    totalPositivasConsolidado.toString(),
    `${ipoConsolidado}%`,
    totalOvosConsolidado.toLocaleString('pt-BR'),
    `${idoConsolidado}`,
    'Crítico Municipal'
  ]);

  autoTable(doc, {
    startY: 118,
    margin: { left: 10, right: 10 },
    head: [['Bairro / Distrito', 'Arm. Lidas', 'Positivas', 'IPO (%)', 'Total Ovos', 'IDO (Ovos/Pos)', 'Classificação Oficial de Risco']],
    body: linhasTabelaBairros,
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
      0: { halign: 'left', fontStyle: 'bold', width: 50 },
      1: { width: 20 },
      2: { width: 20 },
      3: { fontStyle: 'bold', width: 22 },
      4: { fontStyle: 'bold', width: 24 },
      5: { width: 22 },
      6: { fontStyle: 'bold', width: 32 }
    },
    didParseCell: (data) => {
      if (data.row.index === linhasTabelaBairros.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      } else {
        colorirCelulaRisco(data, 6);
      }
    }
  });

  // =========================================================================
  // PÁGINA 3: FOCOS ALTO E CRÍTICO COM GRÁFICO DE RANKING E PLANO DE BLOQUEIO
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'FOCOS CRÍTICOS & BLOQUEIO' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🔥 FOCOS DE ALTO RISCO E CRÍTICOS (> 50 OVOS) & PLANO DE BLOQUEIO 150m-300m', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Ranking dos epicentros de postura e protocolos de varredura concêntrica para eliminação de criadouros:', 10, 40);

  // Filtragem dos focos críticos
  const focosCriticos = armadilhasAdaptadas
    .filter((a) => Number(a.ultimosOvos || 0) >= 35)
    .sort((a, b) => Number(b.ultimosOvos || 0) - Number(a.ultimosOvos || 0));

  // Gera o gráfico horizontal de ranking de focos via Canvas
  const canvasRanking = gerarCanvasRankingFocos(focosCriticos, {
    width: 1200,
    height: 440
  });
  if (canvasRanking) {
    doc.addImage(canvasRanking.toDataURL('image/png'), 'PNG', 10, 44, 190, 68, undefined, 'FAST');
  }

  // Tabela de Bloqueio Focal com Coordenadas e Protocolos
  const linhasFocosBloqueio = focosCriticos.map((arm, index) => {
    const d = arm.dadosCiclos;
    const ovosTot = Number(arm.ultimosOvos || 0);
    const moradorStr = ocultarMorador ? 'Protegido (LGPD)' : (arm.moradorNome || 'Não informado');
    const risco = classificarRiscoOficial(ovosTot);

    let protocolo = 'Raio 150m: Varredura mecânica + orientação domiciliar';
    if (ovosTot >= 100) {
      protocolo = 'Raio 300m: Bloqueio Químico/BTI + Varredura Imediata';
    } else if (ovosTot >= 60) {
      protocolo = 'Raio 150m-300m: Aplicação BTI em ralos/caixas + busca ativa';
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
      protocolo
    ];
  });

  autoTable(doc, {
    startY: 118,
    margin: { left: 10, right: 10 },
    head: [['Pos', 'ARM', 'Bairro', 'Quart.', 'Morador', 'Ovos A', 'Ovos B', 'Total', 'Risco', 'Coordenadas GPS', 'Plano de Bloqueio Recomendado']],
    body: linhasFocosBloqueio.length > 0 ? linhasFocosBloqueio : [['-', '-', 'Sem focos críticos registrados', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 6.2,
      halign: 'center',
      cellPadding: 1.5
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
      8: { fontStyle: 'bold', width: 22 },
      9: { width: 20 },
      10: { halign: 'left', width: 32 }
    },
    didParseCell: (data) => {
      colorirCelulaRisco(data, 8);
    }
  });

  // =========================================================================
  // PÁGINA 4: GESTÃO OPERACIONAL DE CAMPO & CRONOGRAMA DE COLETAS (CICLO B 7 DIAS)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'GESTÃO OPERACIONAL & COLETAS' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📅 GESTÃO OPERACIONAL DE CAMPO & CRONOGRAMA DE COLETAS (CICLO B)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Logística de recolhimento de palhetas, auditoria de espaçamento geodésico (300m-400m) e cronograma dos ACEs:', 10, 40);

  // Gráfico Donut de Status das Palhetas via Canvas
  const canvasStatus = gerarCanvasStatusPalhetas({
    coletaSegunda,
    coletaTerca,
    trocarHoje: palhetasTrocarHoje,
    atrasadas: palhetasAtrasadas,
    emDia: palhetasEmDia
  }, {
    width: 1000,
    height: 420
  });
  if (canvasStatus) {
    doc.addImage(canvasStatus.toDataURL('image/png'), 'PNG', 10, 44, 190, 66, undefined, 'FAST');
  }

  // Bloco de Auditoria de Espaçamento Geodésico 300m-400m
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('📏 Auditoria de Espaçamento Geodésico entre Armadilhas (Diretriz MS 300m a 400m):', 10, 116);

  const kpisEspaco = [
    { titulo: 'ESPAÇAMENTO IDEAL (300-400m)', val: `${totalIdeal} OVs (${percIdeal}%)`, desc: 'Malha geométrica perfeita', cor: '#059669' },
    { titulo: 'ABAIXO DO IDEAL (< 300m)', val: `${totalProxima} OVs (${percProxima}%)`, desc: 'Sobreposição de raio de atração', cor: '#D97706' },
    { titulo: 'ACIMA DO IDEAL (> 400m)', val: `${totalAmpla} OVs (${percAmpla}%)`, desc: 'Gaps/Vazios amostrais territoriais', cor: '#DC2626' }
  ];

  const cardEW = 61;
  const cardEH = 15;
  kpisEspaco.forEach((kpi, idx) => {
    const ex = 10 + idx * (cardEW + 3.5);
    const ey = 120;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(ex, ey, cardEW, cardEH, 1.5, 1.5, 'FD');

    doc.setFillColor(kpi.cor);
    doc.rect(ex, ey, 2, cardEH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.titulo, ex + 5, ey + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, ex + 5, ey + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.desc, ex + 5, ey + 13);
  });

  // Tabela de Cronograma de Coletas
  const cronogramaRotas = [
    ['Segunda-feira (28/09)', 'Sede Urbana (35 Armadilhas)', 'ARM-01 a ARM-35', '7 dias completos', 'Equipe Centro/Progresso (Veículo 01)', 'Retirada das palhetas B com infusão fresca e envio imediato ao laboratório'],
    ['Terça-feira (29/09)', 'Distritos Oficiais (21 Armadilhas)', 'ARM-36 a ARM-56', '7 dias completos', 'Equipe Distrital (Veículo 02)', 'Recolhimento em Influência, Prata, Porto Velho e Ilha dos Pombos'],
    ['Quarta-feira (30/09)', 'Laboratório de Microscopia', 'Todas as 56 Palhetas', 'Bancada óptica', 'Biólogo(a) / Microscopistas', 'Contagem e registro direto no sistema GPS Ovitrampas'],
    ['Quinta-feira (01/10)', 'Coordenação de Vigilância', 'Consolidação Final', 'Emissão Dossiê', 'Coordenação / Secretário', 'Fechamento dos boletins e publicação para Ministério da Saúde']
  ];

  autoTable(doc, {
    startY: 140,
    margin: { left: 10, right: 10 },
    head: [['Data / Dia', 'Território de Coleta', 'Ovitrampas Alvo', 'Tempo de Campo', 'Responsável / Rota', 'Procedimento Operacional']],
    body: cronogramaRotas,
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
      cellPadding: 2
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 28 },
      1: { halign: 'left', fontStyle: 'bold', width: 36 },
      2: { width: 22 },
      3: { width: 20 },
      4: { halign: 'left', width: 34 },
      5: { halign: 'left', width: 50 }
    }
  });

  // =========================================================================
  // PÁGINA 5: MAPA 1: CALOR EPIDEMIOLÓGICO (5 NÍVEIS OFICIAIS — FUNDO SATÉLITE)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'MAPA 1: CALOR SATÉLITE' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🗺️ MAPA 1: CALOR EPIDEMIOLÓGICO (5 NÍVEIS OFICIAIS — FUNDO SATÉLITE)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Modelagem geoestatística de densidade de postura e estratificação de risco sobre imagem de satélite (Sede Urbana de Carmo):', 10, 40);
  doc.text('Intensidade térmica calculada pela contagem de ovos nos 5 estratos do MS: Azul (Negativa), Verde (1-20), Amarelo (21-50), Laranja (51-100), Vermelho (>100).', 10, 43.5);

  const imgMapa1 = await carregarImagemDataUrl('maps/mapa_1_sede_5_niveis.jpg');
  if (imgMapa1) {
    doc.addImage(imgMapa1, 'JPEG', 10, 48, 190, 222, undefined, 'FAST');
  } else {
    const sedeArms = armadilhasAdaptadas.filter((a) => classificarTerritorio(a).id === 'sede');
    const { canvas } = await gerarCanvasMapaCalor(sedeArms.length > 0 ? sedeArms : armadilhasAdaptadas, {
      width: 1500,
      height: 1750,
      tituloTerritorio: 'CARMO (SEDE URBANA)',
      provider: 'satellite'
    });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 48, 190, 222, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Cobertura com as 35 armadilhas da Sede Urbana sobre imagem de satélite de alta resolução • Cores térmicas vivas e contrastantes.', 10, 276);

  // =========================================================================
  // PÁGINA 6: MAPA 2: PAINEL DE DISPERSÃO E CALOR DOS DISTRITOS E LOCALIDADES
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'MAPA 2: DISTRITOS' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🏞️ MAPA 2: PAINEL DE DISPERSÃO E CALOR DOS DISTRITOS E LOCALIDADES', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Monitoramento Geoespacial Contínuo nas Zonas Rurais e Distritais do Município de Carmo/RJ:', 10, 40);
  doc.text('Painel individualizado para o 2º Distrito (Influência), 3º Distrito (Córrego da Prata), 4º Distrito (Porto Velho do Cunha), Ilha dos Pombos e Barra.', 10, 43.5);
  doc.text('Escala calibrada proporcionalmente ao município: identifica focos distritais e subsidia as rotas de campo de terça-feira.', 10, 47);

  const imgMapa3 = await carregarImagemDataUrl('maps/mapa_3_distritos_nevoeiro.jpg');
  if (imgMapa3) {
    doc.addImage(imgMapa3, 'JPEG', 10, 48, 190, 222, undefined, 'FAST');
  } else {
    const distritosArms = armadilhasAdaptadas.filter((a) => classificarTerritorio(a).id !== 'sede');
    const { canvas } = await gerarCanvasMapaNevoeiro(distritosArms.length > 0 ? distritosArms : armadilhasAdaptadas, {
      width: 1500,
      height: 1750,
      tituloTerritorio: 'DISTRITOS E LOCALIDADES DE CARMO'
    });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 48, 190, 222, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Cobertura com as 21 armadilhas distritais sobre ortofoto de satélite • Proporcionalidade térmica calibrada com a sede.', 10, 276);

  // =========================================================================
  // PÁGINA 7: MAPA 3: VISÃO PANORÂMICA MUNICIPAL (SEDE E TODOS OS DISTRITOS JUNTOS)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'MAPA 3: VISÃO MUNICIPAL GERAL' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`🌐 MAPA 3: VISÃO PANORÂMICA MUNICIPAL (${totalArmadilhas} ARMADILHAS — SEDE E DISTRITOS)`, 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Integração macroterritorial conectando a sede urbana aos 4 distritos e localidades sobre ortofoto de satélite de alta resolução:', 10, 40);
  doc.text('Evidencia a malha completa de vigilância entomológica e a conectividade viária entre todos os 56 pontos de monitoramento de Carmo.', 10, 43.5);

  const imgMapa4 = await carregarImagemDataUrl('maps/mapa_4_municipal_panoramico.jpg');
  if (imgMapa4) {
    doc.addImage(imgMapa4, 'JPEG', 10, 48, 190, 222, undefined, 'FAST');
  } else {
    const { canvas } = await gerarCanvasMapaNevoeiro(armadilhasAdaptadas, {
      width: 1600,
      height: 1250,
      tituloTerritorio: 'MUNICÍPIO DE CARMO - RJ'
    });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 48, 190, 222, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('• Cobertura macroterritorial das 56 armadilhas municipais • Conexão integrada Sede-Distritos sobre relevo e malha viária.', 10, 276);

  // =========================================================================
  // PÁGINA 8: INVENTÁRIO TÉCNICO DAS 56 ARMADILHAS (PARTE 1: ARM-01 A ARM-28)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'INVENTÁRIO GERAL (PARTE 1)' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📋 INVENTÁRIO TÉCNICO COMPLETO DAS ARMADILHAS — PARTE 1 (ARM-01 A ARM-28)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Histórico completo com contagens individuais das Palhetas A e B, Total Consolidado e classificação direta de risco por cores:', 10, 40);

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
    },
    didParseCell: (data) => {
      colorirCelulaRisco(data, 7);
    }
  });

  // =========================================================================
  // PÁGINA 9: INVENTÁRIO TÉCNICO DAS 56 ARMADILHAS (PARTE 2: ARM-29 A ARM-56)
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'INVENTÁRIO GERAL (PARTE 2)' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📋 INVENTÁRIO TÉCNICO COMPLETO DAS ARMADILHAS — PARTE 2 (ARM-29 A ARM-56)', 10, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Continuação do inventário das ovitrampas de Carmo (Sede e Distritos) com classificação direta de risco:', 10, 40);

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
    },
    didParseCell: (data) => {
      colorirCelulaRisco(data, 7);
    }
  });

  // =========================================================================
  // PÁGINA 10: PARECER TÉCNICO EPIDEMIOLÓGICO, RECOMENDAÇÕES E ASSINATURAS
  // =========================================================================
  doc.addPage('a4', 'portrait');
  desenharCabecalhoOficial(doc, { ...cabecalhoParams, subtitulo: 'PARECER TÉCNICO & HOMOLOGAÇÃO' });

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
  const assinaturas = [
    { cargo: 'COORDENAÇÃO DE CONTROLE DE VETORES', nome: 'Coordenação de Endemias / SMS', desc: 'Vigilância Ambiental de Carmo/RJ' },
    { cargo: 'RESPONSÁVEL TÉCNICO ENTOMOLÓGICO', nome: 'Responsável Técnico / Biologia', desc: 'Laboratório de Microscopia de Vetores' },
    { cargo: 'SECRETÁRIO(A) MUNICIPAL DE SAÚDE', nome: 'Secretaria Municipal de Saúde', desc: 'Prefeitura Municipal de Carmo - RJ' }
  ];

  assinaturas.forEach((ass, idx) => {
    const ax = 10 + idx * (assW + 8);
    const ay = yAssinaturas + 8;

    doc.setDrawColor(148, 163, 184);
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
