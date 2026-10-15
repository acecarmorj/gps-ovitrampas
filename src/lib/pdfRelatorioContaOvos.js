/**
 * Tabela Oficial de Coordenadas Geográficas das Ovitrampas de Carmo-RJ
 * Para integração e cadastramento no Sistema Conta Ovos (Fiocruz / Ministério da Saúde).
 * Geração no navegador via jsPDF + jspdf-autotable (A4 Paisagem).
 */

import { carregarTimbresOficiais, PROPORCAO_BRASAO_CARMO, PROPORCAO_LOGO_PREFEITURA } from './timbresOficiais.js';
import trapsOficiaisJson from './trapsOficiaisCarmo.json';
import { aplicarMarcaDaguaDemo } from './pdfWatermarkDemo.js';

const W = 297; // A4 Landscape largura em mm
const H = 210; // A4 Landscape altura em mm
const M = 10;  // Margem lateral em mm

/**
 * Normaliza e consolida as 56 armadilhas oficiais de Carmo-RJ
 */
function prepararArmadilhas(lista, isDemo = false) {
  const fonte = Array.isArray(lista) && lista.length >= 56 ? lista : trapsOficiaisJson;

  // Mapa com os dados base oficiais para garantir integridade das 56 armadilhas
  const mapaOficial = new Map(trapsOficiaisJson.map((t) => [Number(t.numero), t]));

  return Array.from({ length: 56 }, (_, i) => {
    const num = i + 1;
    const baseOficial = mapaOficial.get(num) || {};
    const itemDinamico = fonte.find((a) => Number(a.numero) === num) || {};

    const numero = String(num).padStart(2, '0');
    const palheta = itemDinamico.palheta || itemDinamico.ultimaPalheta || itemDinamico.ultima_palheta || baseOficial.palheta || `${numero}A`;
    
    let morador = (itemDinamico.moradorNome || itemDinamico.morador_nome || itemDinamico.responsavel || baseOficial.morador_nome || '').trim() || '-';
    let rua = (itemDinamico.rua || baseOficial.rua || '').trim();
    let numIm = String(itemDinamico.numeroImovel || itemDinamico.numero_imovel || baseOficial.numero_imovel || '').trim();

    if (isDemo) {
      morador = 'XXX';
      rua = 'Rua XXXXXXXXX';
      numIm = 'XXX';
    }

    let endereco = '-';
    if (rua && numIm) {
      endereco = `${rua}, ${numIm}`;
    } else if (rua) {
      endereco = rua;
    }

    const bairro = (itemDinamico.bairro || itemDinamico.microarea || baseOficial.bairro || baseOficial.microarea || '').trim() || '-';
    const quarteirao = (itemDinamico.quarteirao || baseOficial.quarteirao || '').trim() || '-';

    const latRaw = itemDinamico.latitude !== undefined && itemDinamico.latitude !== null ? itemDinamico.latitude : baseOficial.latitude;
    const lngRaw = itemDinamico.longitude !== undefined && itemDinamico.longitude !== null ? itemDinamico.longitude : baseOficial.longitude;

    const lat = Number(latRaw || 0);
    const lng = Number(lngRaw || 0);

    const latStr = lat.toFixed(7);
    const lngStr = lng.toFixed(7);
    const coordFull = `${latStr}, ${lngStr}`;

    return {
      num,
      ovLabel: `OV-${numero}`,
      palheta,
      morador,
      endereco,
      bairro,
      quarteirao,
      latStr,
      lngStr,
      coordFull
    };
  }).sort((a, b) => a.num - b.num);
}

/**
 * Gera e realiza o download da Tabela Oficial de Coordenadas para Conta Ovos
 * @param {Array} armadilhas Lista opcional de armadilhas em memória
 * @param {Object} opcoes Configurações opcionais { isDemo: boolean }
 */
export async function gerarPdfTabelaContaOvos(armadilhas = [], opcoes = {}) {
  const isDemo = Boolean(opcoes.isDemo);
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable || autoTableMod;
  const timbres = await carregarTimbresOficiais().catch(() => ({}));

  const traps = prepararArmadilhas(armadilhas, isDemo);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const desenharCabecalhoPrincipal = () => {
    // Brasão à esquerda
    if (timbres.TIMBRE_BRASAO_CARMO) {
      try {
        const alt = 15;
        const larg = alt * PROPORCAO_BRASAO_CARMO;
        doc.addImage(timbres.TIMBRE_BRASAO_CARMO, 'PNG', M, 6.5, larg, alt);
      } catch (_) {}
    }

    // Logo da Prefeitura à direita
    if (timbres.TIMBRE_LOGO_PREFEITURA) {
      try {
        const alt = 13;
        const larg = alt * PROPORCAO_LOGO_PREFEITURA;
        doc.addImage(timbres.TIMBRE_LOGO_PREFEITURA, 'PNG', W - M - larg, 7.5, larg, alt);
      } catch (_) {}
    }

    // Textos Oficiais Centralizados
    doc.setTextColor(15, 41, 66);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ESTADO DO RIO DE JANEIRO · PREFEITURA MUNICIPAL DE CARMO', W / 2, 10, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('SECRETARIA MUNICIPAL DE SAÚDE · SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE', W / 2, 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES', W / 2, 17.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(3, 105, 161);
    doc.text('REDE MUNICIPAL DE MONITORAMENTO ENTOMOLÓGICO DE ARBOVIROSES (AEDES AEGYPTI)', W / 2, 21.5, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setTextColor(10, 37, 64);
    doc.text('TABELA OFICIAL DE COORDENADAS GEOGRÁFICAS — INTEGRAÇÃO SISTEMA CONTA OVOS', W / 2, 26, { align: 'center' });

    // Faixa de Metadados e Instruções
    const boxY = 29;
    const boxH = 9.5;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, boxY, W - 2 * M, boxH, 1, 1, 'FD');

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);

    const linhaMeta1 = `Município: Carmo/RJ (IBGE: 3301207)  |  Total de Armadilhas Oficiais: 56 Ovitrampas (OV-01 a OV-56)  |  Datum: WGS 84 / SIRGAS 2000  |  Formato: Graus Decimais (DD)  |  Emissão: ${dataHoje}`;
    doc.text(linhaMeta1, M + 3, boxY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    const linhaMeta2 = "INSTRUÇÃO CONTA OVOS (FIOCRUZ/MS): Coordenadas prontas para inserção cadastral. A coluna 'Coordenada Completa' (Lat, Long) pode ser copiada e colada diretamente no sistema.";
    doc.text(linhaMeta2, M + 3, boxY + 7.5);
  };

  desenharCabecalhoPrincipal();

  // Cabeçalho e corpo da tabela
  const colunas = [
    { header: 'Nº OV', dataKey: 'ovLabel' },
    { header: 'Palheta Oficial', dataKey: 'palheta' },
    { header: 'Morador / Responsável', dataKey: 'morador' },
    { header: 'Logradouro e Nº', dataKey: 'endereco' },
    { header: 'Bairro / Distrito', dataKey: 'bairro' },
    { header: 'Quart.', dataKey: 'quarteirao' },
    { header: 'Latitude (DD)', dataKey: 'latStr' },
    { header: 'Longitude (DD)', dataKey: 'lngStr' },
    { header: 'Coordenada Completa (Lat, Long)', dataKey: 'coordFull' }
  ];

  const linhasCorpo = traps.map((t) => [
    t.ovLabel,
    t.palheta,
    t.morador,
    t.endereco,
    t.bairro,
    t.quarteirao,
    t.latStr,
    t.lngStr,
    t.coordFull
  ]);

  autoTable(doc, {
    startY: 40.5,
    margin: { left: M, right: M, top: 20, bottom: 20 },
    head: [[
      'Nº OV',
      'Palheta Oficial',
      'Morador / Responsável',
      'Logradouro e Nº',
      'Bairro / Distrito',
      'Quart.',
      'Latitude (DD)',
      'Longitude (DD)',
      'Coordenada Completa (Lat, Long)'
    ]],
    body: linhasCorpo,
    styles: {
      fontSize: 6.8,
      cellPadding: 1.2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 41, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: 1.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [30, 58, 138] },
      1: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [4, 120, 87] },
      2: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 58, halign: 'left' },
      4: { cellWidth: 36, halign: 'left', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 26, halign: 'center', font: 'courier' },
      7: { cellWidth: 26, halign: 'center', font: 'courier' },
      8: { cellWidth: 43, halign: 'center', font: 'courier', fontStyle: 'bold', textColor: [3, 105, 161] }
    },
    didDrawPage: (data) => {
      // Se estiver na página 2 em diante, desenha cabeçalho superior resumido
      if (data.pageNumber > 1) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(M, 8, W - M, 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 41, 66);
        doc.text('PREFEITURA MUNICIPAL DE CARMO/RJ · VIGILÂNCIA AMBIENTAL · TABELA OFICIAL DE COORDENADAS CONTA OVOS', M, 12.5);
        doc.text('56 OVITRAMPAS OFICIAIS (CONTINUAÇÃO)', W - M, 12.5, { align: 'right' });
      }
    }
  });

  // Bloco técnico e de assinaturas ao final do relatório
  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 180;
  const alturaBlocoFinal = 32;

  // Se não couber na página atual, quebra para uma nova página
  if (finalY + alturaBlocoFinal > H - 22) {
    doc.addPage();
    finalY = 18;
  } else {
    finalY += 4;
  }

  // Caixa técnica informativa
  const boxTecnicoY = finalY;
  const boxTecnicoH = 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, boxTecnicoY, W - 2 * M, boxTecnicoH, 1, 1, 'FD');

  // Divisória vertical no meio do bloco técnico
  const meioX = M + (W - 2 * M) * 0.53;
  doc.setDrawColor(226, 232, 240);
  doc.line(meioX, boxTecnicoY + 1.5, meioX, boxTecnicoY + boxTecnicoH - 1.5);

  // Lado esquerdo: Estrutura Territorial
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTRUTURAÇÃO TERRITORIAL DA MALHA DE 56 OVITRAMPAS:', M + 3, boxTecnicoY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(51, 65, 85);
  doc.text('• Sede Urbana (35 armadilhas): Jardim Centenário, Centro, Boa Ideia, Caixa d\'Água, Botafogo, Progresso, Morro do Estado, Val Paraíso.', M + 3, boxTecnicoY + 7.5);
  doc.text('• Distritos (21 armadilhas): Influência (6), Ilha dos Pombos (4), Porto Velho do Cunha (5), Córrego da Prata (3), Barra de São Francisco (3).', M + 3, boxTecnicoY + 11.5);

  // Lado direito: Declaração de Conformidade Técnica
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DECLARAÇÃO DE CONFORMIDADE TÉCNICA:', meioX + 3, boxTecnicoY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(51, 65, 85);
  doc.text('Coordenadas obtidas por levantamento georreferenciado GNSS/GPS de alta precisão em conformidade', meioX + 3, boxTecnicoY + 7.5);
  doc.text('com as diretrizes do Ministério da Saúde. Base: WGS-84 / SIRGAS 2000 | Software: Conta Ovos (Fiocruz).', meioX + 3, boxTecnicoY + 11.5);

  // Linhas de Assinatura
  const yAss = boxTecnicoY + boxTecnicoH + 7;
  const colAssLarg = (W - 2 * M) / 3;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  // Assinatura 1
  const x1 = M + 8;
  const x1Fim = M + colAssLarg - 8;
  doc.line(x1, yAss, x1Fim, yAss);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Responsável Técnico pelo Monitoramento', (x1 + x1Fim) / 2, yAss + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.text('Vigilância Ambiental de Carmo/RJ', (x1 + x1Fim) / 2, yAss + 6.5, { align: 'center' });

  // Assinatura 2
  const x2 = M + colAssLarg + 8;
  const x2Fim = M + colAssLarg * 2 - 8;
  doc.line(x2, yAss, x2Fim, yAss);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Coordenação de Vigilância em Saúde', (x2 + x2Fim) / 2, yAss + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.text('Secretaria Municipal de Saúde', (x2 + x2Fim) / 2, yAss + 6.5, { align: 'center' });

  // Assinatura 3
  const x3 = M + colAssLarg * 2 + 8;
  const x3Fim = W - M - 8;
  doc.line(x3, yAss, x3Fim, yAss);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Secretaria Municipal de Saúde', (x3 + x3Fim) / 2, yAss + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.text('Prefeitura Municipal de Carmo/RJ', (x3 + x3Fim) / 2, yAss + 6.5, { align: 'center' });

  // Rodapé em todas as páginas com numeração "Página X de Y"
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);

    // Linha divisória do rodapé
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(M, H - 12, W - M, H - 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text('Prefeitura Municipal de Carmo · Secretaria Municipal de Saúde · Vigilância Ambiental e Zoonoses', M, H - 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`Página ${p} de ${totalPaginas}`, W - M, H - 8.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Rede Municipal de Monitoramento de Ovitrampas (56 Armadilhas Oficiais) · Datum WGS 84 / SIRGAS 2000 · Integração Sistema Conta Ovos (Fiocruz/MS)', M, H - 5);
    doc.text('Documento Técnico Oficial — Carmo/RJ', W - M, H - 5, { align: 'right' });
  }

  if (isDemo) {
    aplicarMarcaDaguaDemo(doc, {
      texto: 'VERSÃO DEMONSTRAÇÃO',
      subtexto: 'USO DIDÁTICO / APRESENTAÇÃO · DADOS PESSOAIS ANONIMIZADOS COM XXX'
    });
    doc.save('TABELA_COORDENADAS_OVITRAMPAS_DEMO_CARMO_RJ.pdf');
  } else {
    doc.save('TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf');
  }
}
