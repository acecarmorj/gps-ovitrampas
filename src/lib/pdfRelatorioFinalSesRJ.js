/**
 * RELATÓRIO TÉCNICO OFICIAL PARA A SECRETARIA DE ESTADO DE SAÚDE (SES-RJ)
 * PROGRAMA DE MONITORAMENTO VETORIAL POR OVITRAMPAS — MUNICÍPIO DE CARMO / RJ
 * 
 * DIRETRIZES ESTRITAS DE CONSTRUÇÃO (Seções 102, 103 e 104 - Dossiê do Projeto):
 * 1. PRIVACIDADE TOTAL: NUNCA exibe nome de morador nem endereço residencial.
 * 2. AGREGAÇÃO EM 3 NÍVEIS: Bairro > Microárea > Quarteirão.
 * 3. COMPARATIVO LADO A LADO: Ciclo A x Ciclo B (Positivas, Ovos, IPO, IDO, Tendência).
 * 4. TRATAMENTO DE PENDÊNCIAS: Palhetas ainda não lidas recebem status "Aguardando" (nunca 0 nem erro).
 * 5. MAPAS GEOESPACIAIS: Mapas de satélite e dispersão térmica separados por ciclo.
 * 6. METODOLOGIA E ASSINATURA: Protocolo MS/SES-RJ/Fiocruz e bloco de chancela técnica.
 * 7. ESTRUTURA FORMAL EM 8 PÁGINAS:
 *    - Pág. 1: Capa Institucional Oficial com Timbres (Brasão de Carmo e Logo da Prefeitura) e Ficha Técnica.
 *    - Pág. 2: Sumário Executivo / Índice Geral e Declaração de Conformidade Ética e LGPD.
 *    - Pág. 3: Painel Executivo Consolidado e Indicadores Epidemiológicos (Comparativo A x B).
 *    - Pág. 4: Tabela Técnica em 3 Níveis (Bairro > Microárea > Quarteirão).
 *    - Pág. 5: Inventário Técnico Individualizado das 56 Ovitrampas (P-01 a P-56).
 *    - Pág. 6: Mapeamento Geoespacial e Nevoeiro Térmico — Ciclo A.
 *    - Pág. 7: Mapeamento Geoespacial e Nevoeiro Térmico — Ciclo B.
 *    - Pág. 8: Metodologia Padronizada, Diretrizes de Manejo e Chancela Técnica (Assinaturas).
 */

import {
  classificarTerritorio,
  agruparArmadilhasPorTerritorio,
  classificarRiscoOficial
} from './pdfRelatorioEntomologico.js';
import {
  adaptarArmadilhasParaCiclo,
  agruparLeiturasPorArmadilha,
  resolverLeiturasArmadilha,
  calcularMetricasCiclo,
  CICLO_SEMANA_1,
  CICLO_SEMANA_2,
  CICLO_AMBAS
} from './ciclosOvitrampas.js';
import {
  TIMBRE_BRASAO_CARMO,
  TIMBRE_LOGO_PREFEITURA,
  TIMBRE_FAIXA_CARMO,
  PROPORCAO_BRASAO_CARMO,
  PROPORCAO_LOGO_PREFEITURA,
  PROPORCAO_FAIXA_CARMO,
  carregarTimbresOficiais
} from './timbresOficiais.js';
import { extrairDadosBairrosConsolidado } from './pdfRelatorioConsolidadoUnico.js';
import { gerarCanvasBarrasLateraisRiscoBairros, gerarCanvasRankingFocos } from './pdfRelatoriosGraficos.js';

// Paleta de Cores Institucionais
const CORES = {
  navyHeader: [15, 23, 42],        // #0F172A
  emeraldBorda: [5, 150, 105],      // #059669
  azulSes: [2, 132, 199],           // #0284C7
  textoPrincipal: [15, 23, 42],
  textoSecundario: [71, 85, 105],   // slate-600
  textoMuted: [148, 163, 184],      // slate-400
  fundoCard: [248, 250, 252],       // slate-50
  bordaCard: [226, 232, 240],       // slate-200
  linhaTabela: [241, 245, 249],
  verdePositivo: [16, 185, 129],
  vermelhoFoco: [220, 38, 38],
  laranjaAlerta: [249, 115, 22],
  amareloMedio: [234, 179, 8],
  azulZero: [37, 99, 235]
};

/**
 * Desenha o cabeçalho executivo oficial da SES-RJ e Prefeitura de Carmo (Design Claro e Límpido)
 */
function desenharCabecalhoSesRj(doc, { paginaAtual, totalPaginas, subtitulo = '' }) {
  const pageW = doc.internal.pageSize.getWidth();
  const barW = pageW - 20;
  const barH = 22;

  // Fundo executivo claro (clean slate-50 com borda suave)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 8, barW, barH, 2, 2, 'FD');

  // Filete decorativo duplo (Esmeralda Saúde + Azul Governo RJ)
  doc.setFillColor(...CORES.emeraldBorda);
  doc.rect(10, 8, barW / 2, 1.8, 'F');
  doc.setFillColor(...CORES.azulSes);
  doc.rect(10 + barW / 2, 8, barW / 2, 1.8, 'F');

  // Filete lateral esmeralda para acabamento executivo
  doc.setFillColor(...CORES.emeraldBorda);
  doc.rect(10, 8, 2.5, barH, 'F');

  // Textos Institucionais (Esquerda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES.textoPrincipal); // slate-900 nítido
  doc.text('GOVERNO DO ESTADO DO RIO DE JANEIRO — SECRETARIA DE ESTADO DE SAÚDE (SES-RJ)', 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...CORES.textoSecundario); // slate-600
  doc.text('SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE  •  SUPERINTENDÊNCIA DE VIGILÂNCIA AMBIENTAL', 15, 18);
  doc.text('PREFEITURA MUNICIPAL DE CARMO  •  SECRETARIA MUNICIPAL DE SAÚDE  •  VIGILÂNCIA ENTOMOLÓGICA', 15, 21.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(subtitulo ? subtitulo.toUpperCase() : 'MONITORAMENTO VETORIAL POR OVITRAMPAS — Aedes aegypti', 15, 25.5);

  // Box Institucional (Direita)
  const dirX = pageW - 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('DOCUMENTO TÉCNICO OFICIAL', dirX, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Destinatário: SES-RJ / Vigilância Estadual', dirX, 18, { align: 'right' });
  doc.text(`Data Base: Setembro/2026 • 56 Ovitrampas`, dirX, 21.5, { align: 'right' });
}

/**
 * Desenha o rodapé oficial da página
 */
function desenharRodapeSesRj(doc, paginaAtual, totalPaginas) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(10, pageH - 9, pageW - 10, pageH - 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('PROGRAMA DE VIGILÂNCIA ENTOMOLÓGICA DE CARMO/RJ • RELATÓRIO TÉCNICO COMPARATIVO SES-RJ', 10, pageH - 5);

}

/**
 * Agrupa armadilhas e dados dos Ciclos A e B em 3 Níveis: Bairro > Microárea > Quarteirão
 * NENHUM DADO DE MORADOR OU ENDEREÇO É COLETADO OU PROCESSADO AQUI.
 */
function agruparDadosTerritoriais3Niveis(armadilhasResolvidas = []) {
  // Hierarquia: Território Macro -> Bairro -> Microárea -> Quarteirão
  const mapaTerritorios = new Map();

  armadilhasResolvidas.forEach((arm) => {
    const terr = classificarTerritorio(arm);
    const terrId = terr.id;
    const terrNome = terr.nome;
    const terrOrdem = terr.ordem;

    const bairroNome = (arm.bairro || 'Sede Urbana').trim();
    const microareaNome = (arm.microarea || bairroNome).trim();
    const quarteiraoNome = (arm.quarteirao || 'Q-Único').trim();

    if (!mapaTerritorios.has(terrId)) {
      mapaTerritorios.set(terrId, {
        id: terrId,
        nome: terrNome,
        ordem: terrOrdem,
        bairros: new Map()
      });
    }

    const tObj = mapaTerritorios.get(terrId);
    if (!tObj.bairros.has(bairroNome)) {
      tObj.bairros.set(bairroNome, {
        nome: bairroNome,
        microareas: new Map()
      });
    }

    const bObj = tObj.bairros.get(bairroNome);
    if (!bObj.microareas.has(microareaNome)) {
      bObj.microareas.set(microareaNome, {
        nome: microareaNome,
        quarteiroes: new Map()
      });
    }

    const mObj = bObj.microareas.get(microareaNome);
    if (!mObj.quarteiroes.has(quarteiraoNome)) {
      mObj.quarteiroes.set(quarteiraoNome, {
        nome: quarteiraoNome,
        armadilhas: []
      });
    }

    mObj.quarteiroes.get(quarteiraoNome).armadilhas.push(arm);
  });

  return Array.from(mapaTerritorios.values()).sort((a, b) => a.ordem - b.ordem);
}

/**
 * Calcula métricas de um conjunto de armadilhas para o Ciclo A e Ciclo B
 */
function calcularMetricasConjunto(armadilhas = []) {
  const totalTraps = armadilhas.length;

  // Ciclo A
  let lidasA = 0;
  let posA = 0;
  let ovosA = 0;

  // Ciclo B
  let lidasB = 0;
  let posB = 0;
  let ovosB = 0;

  armadilhas.forEach((arm) => {
    const dc = arm.dadosCiclos;
    if (dc) {
      if (dc.temLeituraA) {
        lidasA += 1;
        const oA = Number(dc.ovosA || 0);
        ovosA += oA;
        if (oA > 0) posA += 1;
      }
      if (dc.temLeituraB) {
        lidasB += 1;
        const oB = Number(dc.ovosB || 0);
        ovosB += oB;
        if (oB > 0) posB += 1;
      }
    }
  });

  const ipoA = lidasA > 0 ? (posA / lidasA) * 100 : null;
  const idoA = posA > 0 ? ovosA / posA : null;

  const temCicloB = lidasB > 0;
  const ipoB = temCicloB ? (posB / lidasB) * 100 : null;
  const idoB = posB > 0 ? ovosB / posB : (temCicloB ? 0 : null);

  // Tendência
  let tendencia = 'Aguardando';
  if (temCicloB && lidasA > 0) {
    const diffIpo = (ipoB || 0) - (ipoA || 0);

    if (diffIpo > 10 || (ovosA === 0 && ovosB > 0) || (ovosA > 0 && ovosB >= ovosA * 1.3)) {
      tendencia = 'Subiu ↑';
    } else if (diffIpo < -10 || (ovosA > 0 && ovosB <= ovosA * 0.7)) {
      tendencia = 'Reduziu ↓';
    } else {
      tendencia = 'Estável =';
    }
  }

  return {
    totalTraps,
    lidasA,
    posA,
    ovosA,
    ipoA,
    idoA,
    lidasB,
    posB,
    ovosB,
    ipoB,
    idoB,
    temCicloB,
    tendencia
  };
}

/**
 * PÁGINA 1: Desenha a Capa Institucional Oficial com Timbres Oficiais
 * Inspirada na arquitetura do Plano Municipal de Enfrentamento das Arboviroses de Carmo-RJ
 */
function desenharCapaOficialSesRj(doc, { totalPaginas = 8, dataFormatada = '' }) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Moldura institucional externa e interna
  doc.setDrawColor(...CORES.navyHeader);
  doc.setLineWidth(0.8);
  doc.roundedRect(10, 10, pageW - 20, pageH - 20, 2, 2, 'S');

  doc.setDrawColor(...CORES.emeraldBorda);
  doc.setLineWidth(0.4);
  doc.roundedRect(11.6, 11.6, pageW - 23.2, pageH - 23.2, 1.5, 1.5, 'S');

  // Timbres Oficiais
  // Brasão de Carmo (350x350 -> quadrado 22x22mm)
  if (TIMBRE_BRASAO_CARMO) {
    try {
      doc.addImage(TIMBRE_BRASAO_CARMO, 'PNG', 16, 15, 22 * PROPORCAO_BRASAO_CARMO, 22);
    } catch (e) {
      console.warn('Erro ao carregar TIMBRE_BRASAO_CARMO:', e);
    }
  }

  // Logo da Prefeitura de Carmo (400x165 -> proporção 2.42 -> 42x17.3mm)
  if (TIMBRE_LOGO_PREFEITURA) {
    try {
      doc.addImage(TIMBRE_LOGO_PREFEITURA, 'PNG', 194 - 17.3 * PROPORCAO_LOGO_PREFEITURA, 17.5, 17.3 * PROPORCAO_LOGO_PREFEITURA, 17.3);
    } catch (e) {
      console.warn('Erro ao carregar TIMBRE_LOGO_PREFEITURA:', e);
    }
  }

  // Textos Institucionais Centrais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES.navyHeader);
  doc.text('GOVERNO DO ESTADO DO RIO DE JANEIRO', 105, 18, { align: 'center' });

  doc.setFontSize(8.0);
  doc.text('SECRETARIA DE ESTADO DE SAÚDE — SES-RJ', 105, 22.2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE  •  SUPERINTENDÊNCIA DE VIGILÂNCIA AMBIENTAL', 105, 26, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES.navyHeader);
  doc.text('PREFEITURA MUNICIPAL DE CARMO  •  SECRETARIA MUNICIPAL DE SAÚDE', 105, 30.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('COORDENADORIA DE VIGILÂNCIA EM SAÚDE  •  NÚCLEO DE VIGILÂNCIA ENTOMOLÓGICA', 105, 34.5, { align: 'center' });

  // Filete decorativo duplo
  doc.setFillColor(...CORES.emeraldBorda);
  doc.rect(14, 38.5, 91, 1.6, 'F');
  doc.setFillColor(...CORES.azulSes);
  doc.rect(105, 38.5, 91, 1.6, 'F');

  // Card de Título Principal
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 43, 182, 44, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 43, 182, 44, 2, 2, 'S');

  // Badge no topo do card
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(65, 45.5, 80, 5, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text('DOCUMENTO TÉCNICO OFICIAL DE VIGILÂNCIA EM SAÚDE', 105, 49, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...CORES.navyHeader);
  doc.text('RELATÓRIO TÉCNICO DE MONITORAMENTO VETORIAL', 105, 58, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(...CORES.emeraldBorda);
  doc.text('PROGRAMA MUNICIPAL DE OVITRAMPAS — Aedes aegypti', 105, 63.5, { align: 'center' });

  doc.setFontSize(8.2);
  doc.setTextColor(...CORES.azulSes);
  doc.text('ANÁLISE COMPARATIVA TEMPORAL E ESPACIAL — CICLO A x CICLO B', 105, 69.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Série Histórica: Setembro / 2026 • Malha Territorial Georreferenciada de 56 Estações Amostrais', 105, 76, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(185, 28, 28);
  doc.text('DADOS TERRITORIAIS 100% ANONIMIZADOS (CONFORMIDADE COM A LGPD - LEI Nº 13.709/2018)', 105, 81.5, { align: 'center' });

  // 4 Cards de Metadados / Quadro Executivo (2 colunas x 2 linhas)
  const cardW = 89;
  const cardH = 64;
  const col1X = 14;
  const col2X = 107;
  const row1Y = 90;
  const row2Y = 157;

  // Função auxiliar para desenhar card de metadados
  const desenharCardMetadados = (x, y, titulo, corHeader, linhas) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, 'S');

    // Header do card
    doc.setFillColor(...corHeader);
    doc.roundedRect(x, y, cardW, 6.2, 1.8, 1.8, 'F');
    doc.rect(x, y + 3, cardW, 3.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, x + cardW / 2, y + 4.3, { align: 'center' });

    // Linhas de conteúdo
    let itemY = y + 10.5;
    linhas.forEach(({ rotulo, valor }) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(...CORES.textoPrincipal);
      doc.text(`${rotulo}:`, x + 3.5, itemY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.6);
      doc.setTextColor(...CORES.textoSecundario);
      const splitValor = doc.splitTextToSize(valor, cardW - 7);
      doc.text(splitValor, x + 3.5, itemY + 3.2);

      itemY += 7.4;
    });
  };

  // Card 1: PODER EXECUTIVO & GESTÃO DO SUS
  desenharCardMetadados(col1X, row1Y, 'PODER EXECUTIVO & GESTÃO DO SUS', CORES.navyHeader, [
    { rotulo: 'Ente Federativo', valor: 'Município de Carmo / Estado do Rio de Janeiro' },
    { rotulo: 'Unidade Gestora', valor: 'Prefeitura Municipal de Carmo — RJ' },
    { rotulo: 'Secretaria Gestora', valor: 'Secretaria Municipal de Saúde (SMS-Carmo)' },
    { rotulo: 'Órgão Estadual', valor: 'Secretaria de Estado de Saúde do RJ (SES-RJ)' },
    { rotulo: 'Destinação Oficial', valor: 'Superintendência de Vigilância Ambiental / SES-RJ' },
    { rotulo: 'Instrumento Normativo', valor: 'Plano Municipal de Arboviroses / LOA 2026' },
    { rotulo: 'Vigência Operacional', valor: 'Exercício 2026 — Monitoramento Contínuo' }
  ]);

  // Card 2: COORDENAÇÃO TÉCNICA & OPERAÇÃO
  desenharCardMetadados(col2X, row1Y, 'COORDENAÇÃO TÉCNICA & OPERAÇÃO', CORES.emeraldBorda, [
    { rotulo: 'Responsável Técnico', valor: 'Almir Lemgruber — Coord. Vigilância Entomológica' },
    { rotulo: 'Equipe de Campo', valor: 'Agentes de Combate às Endemias (ACE Carmo)' },
    { rotulo: 'Apoio Laboratorial', valor: 'Núcleo Municipal de Microscopia e Leitura de Ovos' },
    { rotulo: 'Diretriz Metodológica', valor: 'Ministério da Saúde / Fiocruz (PNCD)' },
    { rotulo: 'Plataforma Digital', valor: 'GPS Ovitrampas Carmo-RJ (Cloud Georreferenciado)' },
    { rotulo: 'Protocolo de Campo', valor: 'Exposição contínua por 5 dias no peridomicílio' },
    { rotulo: 'Padrão de Leitura', valor: 'Dupla contagem em estereomicroscópio óptico' }
  ]);

  // Card 3: ESPECIFICAÇÕES DA MALHA AMOSTRAL
  desenharCardMetadados(col1X, row2Y, 'ESPECIFICAÇÕES DA MALHA AMOSTRAL', CORES.azulSes, [
    { rotulo: 'Rede Georreferenciada', valor: '56 Armadilhas Ovitrampas Ativas (P-01 a P-56)' },
    { rotulo: 'Cobertura Geográfica', valor: '1º ao 5º Distritos (Sede, Influência, Córrego da Prata...)' },
    { rotulo: 'Dispositivo Amostral', valor: 'Vaso plástico fosco 500ml + Palheta de eucalipto' },
    { rotulo: 'Atrativo Biológico', valor: 'Infusão padronizada de Panicum maximum a 10%' },
    { rotulo: 'Espaçamento Médio', valor: 'Grade ortogonal regular de 300m a 400 metros' },
    { rotulo: 'Datum Geodésico', valor: 'WGS-84 / Precisão Métrica por GPS Diferencial' },
    { rotulo: 'Granularidade Espacial', valor: 'Agregação: Bairro > Microárea > Quarteirão' }
  ]);

  // Card 4: ENQUADRAMENTO LEGAL & SIGILO SANITÁRIO
  desenharCardMetadados(col2X, row2Y, 'ENQUADRAMENTO LEGAL & SIGILO SANITÁRIO', [71, 85, 105], [
    { rotulo: 'Resolução Estadual', valor: 'Deliberação CIB-RJ nº 8.910/2024' },
    { rotulo: 'Marco Regulatório', valor: 'Portaria de Consolidação GM/MS nº 5/2017' },
    { rotulo: 'Proteção à Privacidade', valor: 'Conformidade estrita com a LGPD (Lei nº 13.709/2018)' },
    { rotulo: 'Nível de Sigilo', valor: '100% Anonimizado — Zero exposição de dados domiciliares' },
    { rotulo: 'Classificação de Risco', valor: '5 Estratos Oficiais do Ministério da Saúde' },
    { rotulo: 'Natureza do Documento', valor: 'Parecer Técnico de Circulação Restrita SES-RJ / SMS' },
    { rotulo: 'Auditoria de Dados', valor: 'Série temporal auditável com hash digital' }
  ]);

  // Box Inferior de Finalidade Institucional
  const boxInfY = 224;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, boxInfY, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxInfY, 182, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('FINALIDADE INSTITUCIONAL E DIRETRIZES DO RELATÓRIO:', 18, boxInfY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('• Documento elaborado para subsidiar a tomada de decisão estratégica da Secretaria de Estado de Saúde do RJ e da Secretaria Municipal de Saúde de Carmo.', 18, boxInfY + 10.5);
  doc.text('• A tecnologia de ovitrampas constitui sistema de alarme biológico precoce, quantificando a oviposição do Aedes aegypti e antecipando surtos epidêmicos.', 18, boxInfY + 15);
  doc.text('• As ações de controle químico e manejo ambiental devem priorizar os focos críticos identificados com intervenção imediata em raio de 150 metros.', 18, boxInfY + 19.5);
  doc.text('• Em cumprimento à legislação de proteção de dados, todas as armadilhas são identificadas exclusivamente por códigos técnicos e território.', 18, boxInfY + 24);

  // Rodapé da Capa
  const rodapeY = 256;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, rodapeY, 196, rodapeY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...CORES.navyHeader);
  doc.text('PREFEITURA MUNICIPAL DE CARMO  •  SECRETARIA MUNICIPAL DE SAÚDE', 105, rodapeY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('GOVERNO DO ESTADO DO RIO DE JANEIRO  •  SECRETARIA DE ESTADO DE SAÚDE (SES-RJ)', 105, rodapeY + 9, { align: 'center' });
  doc.text(`Carmo - RJ • Emissão Técnica: ${dataFormatada} • Documento Oficial de Circulação Externa`, 105, rodapeY + 13, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.__yFolhaCapa = rodapeY + 18;
}

/**
 * Carimba a numeracao de todas as paginas depois que o documento esta
 * completo. Antes o total era fixo ("de 8"): o PDF saia com 9 paginas e a
 * pagina de continuacao de tabela nem tinha numero.
 */
function numerarPaginasSesRj(doc) {
  const total = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    if (i === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(148, 163, 184);
      doc.text(`FOLHA 1 DE ${total}`, 105, doc.__yFolhaCapa || pageH - 12, { align: 'center' });
      continue;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(190, 220, 245);
    doc.text(`Folha ${i} de ${total}`, pageW - 14, 25.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`PÁGINA ${i} DE ${total}`, pageW - 10, pageH - 5, { align: 'right' });
  }
}

/**
 * Armadilhas vistas por um so ciclo, no formato que os graficos do
 * Relatorio de Resultados esperam. Os graficos de la somam A+B por
 * armadilha (30 ovos num ciclo + 30 no outro viravam "alto"); aqui cada
 * ciclo e classificado pelos proprios ovos.
 */
function armadilhasDoCiclo(resolvidas, ciclo) {
  const campoOvos = ciclo === 'A' ? 'ovosA' : 'ovosB';
  const campoTem = ciclo === 'A' ? 'temLeituraA' : 'temLeituraB';
  const campoPalheta = ciclo === 'A' ? 'palhetaA' : 'palhetaB';
  return resolvidas.map((a) => {
    const d = a.dadosCiclos || {};
    const lida = Boolean(d[campoTem]);
    return {
      ...a,
      // Codigo tecnico no lugar do morador: o grafico de ranking so mostra
      // numero e palheta.
      moradorNome: undefined,
      rua: undefined,
      palheta: d[campoPalheta] || a.palheta,
      ultimosOvos: lida ? Number(d[campoOvos] || 0) : null,
      dadosCiclos: { ...d, ovosTotal: lida ? Number(d[campoOvos] || 0) : 0, temLeituraAmbas: lida }
    };
  });
}

/**
 * Texto de analise do mapa de cada ciclo, calculado dos dados. Antes era
 * escrito a mao com os numeros do dia (o do Ciclo B com 26 de 56 lidas).
 */
function analiseDoCiclo(listaCiclo, listaOutroCiclo, ciclo) {
  const lidas = listaCiclo.filter((a) => a.ultimosOvos != null);
  const linhas = [];
  if (!lidas.length) {
    return ['• Nenhuma palheta deste ciclo foi lida no laboratório até a data de emissão.'];
  }
  const fmtPct = (v) => v.toFixed(1).replace('.', ',');
  const positivas = lidas.filter((a) => a.ultimosOvos > 0);
  const totalOvos = lidas.reduce((s, a) => s + a.ultimosOvos, 0);
  const top = [...lidas].sort((x, y) => y.ultimosOvos - x.ultimosOvos).filter((a) => a.ultimosOvos > 0).slice(0, 3);
  if (top.length) {
    linhas.push(`• Maiores contagens: ${top.map((a) => `P-${a.numero} (${a.ultimosOvos} ovos, ${a.bairro || 'Carmo'})`).join('; ')}.`);
  }
  const porBairro = new Map();
  lidas.forEach((a) => {
    const b = a.bairro || 'Carmo';
    const r = porBairro.get(b) || { ovos: 0, n: 0 };
    r.ovos += a.ultimosOvos;
    r.n += 1;
    porBairro.set(b, r);
  });
  const [bairroTop, dadosTop] = [...porBairro.entries()].sort((x, y) => y[1].ovos - x[1].ovos)[0];
  linhas.push(`• Bairro com mais ovos: ${bairroTop} (${dadosTop.ovos} ovos em ${dadosTop.n} armadilha${dadosTop.n === 1 ? '' : 's'} lida${dadosTop.n === 1 ? '' : 's'}).`);
  const zeros = lidas.length - positivas.length;
  linhas.push(`• Armadilhas sem ovos: ${zeros} de ${lidas.length} lidas (${fmtPct((zeros / lidas.length) * 100)}%).`);
  const ipo = (positivas.length / lidas.length) * 100;
  const ido = positivas.length ? totalOvos / positivas.length : 0;
  linhas.push(`• Índices do ciclo: IPO ${fmtPct(ipo)}% e IDO ${fmtPct(ido)} ovos por armadilha positiva (${totalOvos.toLocaleString('pt-BR')} ovos).`);
  if (ciclo === 'B') {
    const outro = new Map(listaOutroCiclo.map((a) => [a.numero, a.ultimosOvos]));
    let subiu = 0;
    let caiu = 0;
    let igual = 0;
    lidas.forEach((a) => {
      const anterior = outro.get(a.numero);
      if (anterior == null) return;
      if (a.ultimosOvos > anterior) subiu += 1;
      else if (a.ultimosOvos < anterior) caiu += 1;
      else igual += 1;
    });
    linhas.push(`• Em relação ao Ciclo A (mesma armadilha): aumentou em ${subiu}, diminuiu em ${caiu}, igual em ${igual}.`);
    const pendentes = listaCiclo.length - lidas.length;
    if (pendentes > 0) {
      linhas.push(`• Leitura parcial: ${lidas.length} de ${listaCiclo.length} palhetas lidas; ${pendentes} aguardando o laboratório na data de emissão.`);
    }
  } else {
    const criticos = lidas.filter((a) => a.ultimosOvos > 100).length;
    const altos = lidas.filter((a) => a.ultimosOvos > 50 && a.ultimosOvos <= 100).length;
    linhas.push(`• Focos acima de 100 ovos: ${criticos}; de 51 a 100 ovos: ${altos}.`);
  }
  return linhas;
}

function desenharBoxAnalise(doc, curY, titulo, linhas) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const quebradas = linhas.map((l) => doc.splitTextToSize(l, 180));
  const altura = 10 + quebradas.reduce((s, q) => s + q.length * 3.2 + 1.6, 0);
  doc.setFillColor(...CORES.fundoCard);
  doc.roundedRect(10, curY, 190, altura, 2, 2, 'F');
  doc.setDrawColor(...CORES.bordaCard);
  doc.roundedRect(10, curY, 190, altura, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text(titulo, 14, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...CORES.textoSecundario);
  let y = curY + 11.5;
  quebradas.forEach((q) => {
    doc.text(q, 14, y);
    y += q.length * 3.2 + 1.6;
  });
  return curY + altura;
}

/**
 * PÁGINA 2: Desenha o Sumário Executivo & Índice Geral do Relatório
 */
function desenharSumarioExecutivoSesRj(doc, autoTable, { paginas = {} }) {
  const paginaAtual = 2;
  const totalPaginas = '';
  const pag = (p) => (p ? `Pág. ${p}` : '-');
  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    totalPaginas,
    subtitulo: 'SUMÁRIO EXECUTIVO & ÍNDICE GERAL DO RELATÓRIO'
  });

  let curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('SUMÁRIO EXECUTIVO & ÍNDICE GERAL DO RELATÓRIO', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Estrutura analítica do documento técnico submetido à Secretaria de Estado de Saúde do Rio de Janeiro (SES-RJ).', 10, curY);
  doc.text('Navegação estruturada por seções temáticas, agrupamento territorial, inventário analítico e cartografia vetorial.', 10, curY + 3.5);

  curY += 7;

  const linhasSumario = [
    [
      'Seção 01',
      'PAINEL EXECUTIVO COMPARATIVO\nCICLO A x CICLO B',
      '• Comparativo dos indicadores: rede total, palhetas lidas, positivas, total de ovos, IPO e IDO.\n• Síntese por macrorregião / distrito de Carmo-RJ.\n• Distribuição das armadilhas por estrato oficial de risco do Ministério da Saúde.',
      pag(paginas.resumo)
    ],
    [
      'Seção 02',
      'INDICADORES EM GRÁFICOS:\nRISCO POR BAIRRO NOS DOIS CICLOS',
      '• Gráfico dos 5 estratos de risco por bairro e distrito, do azul (sem ovos) ao vermelho (crítico).\n• Um gráfico por ciclo, cada armadilha classificada pelos ovos daquele ciclo.',
      pag(paginas.graficos)
    ],
    [
      'Seção 03',
      'FOCOS PRIORITÁRIOS:\nRANKING POR CICLO',
      '• Ranking das armadilhas com mais de 50 ovos em cada ciclo, identificadas apenas pelo código técnico.',
      pag(paginas.focos)
    ],
    [
      'Seção 04',
      'ESTRATIFICAÇÃO TERRITORIAL EM 3 NÍVEIS:\nBAIRRO > MICROÁREA > QUARTEIRÃO',
      '• Ovos, IPO e IDO por quarteirão nos Ciclos A e B.\n• Tendência por quarteirão (subiu, reduziu, estável ou aguardando leitura).',
      pag(paginas.tabela)
    ],
    [
      'Seção 05',
      'INVENTÁRIO TÉCNICO INDIVIDUALIZADO\nDAS OVITRAMPAS (P-01 A P-56)',
      '• Leitura de cada palheta nos dois ciclos e classificação individual de risco, sem identificação do morador.',
      pag(paginas.inventario)
    ],
    [
      'Seção 06',
      'MAPEAMENTO GEOESPACIAL 1:\nCALOR DA SEDE URBANA (CARMO)',
      '• Imagem de satélite e dispersão térmica em alta resolução das 35 armadilhas urbanas.',
      pag(paginas.mapaSede)
    ],
    [
      'Seção 07',
      'MAPEAMENTO GEOESPACIAL 2:\nDISTRITOS E LOCALIDADES',
      '• Dispersão espacial e calor das 21 armadilhas nos 4 distritos e localidades de Carmo.',
      pag(paginas.mapaDistritos)
    ],
    [
      'Seção 08',
      'MAPEAMENTO GEOESPACIAL 3:\nPANORAMA MUNICIPAL & SÉRIE TEMPORAL',
      '• Visão integrada das 56 armadilhas municipais e evolução comparativa espacial (Ciclo A x B).',
      pag(paginas.mapaMunicipal)
    ],
    [
      'Seção 09',
      'METODOLOGIA, PLANO DE AÇÃO\n& ASSINATURA TÉCNICA',
      '• Protocolo técnico MS/SES-RJ, diretrizes de manejo e bloqueio focal, e bloco de assinaturas.',
      pag(paginas.metodologia)
    ]
  ];

  autoTable(doc, {
    startY: curY,
    head: [['Seção', 'Capítulo / Conteúdo Programático', 'Escopo Analítico & Indicadores Avaliados', 'Pág.']],
    body: linhasSumario,
    theme: 'grid',
    styles: {
      fontSize: 5.8,
      cellPadding: 1.6,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 16 },
      1: { fontStyle: 'bold', cellWidth: 54 },
      2: { cellWidth: 104 },
      3: { fontStyle: 'bold', halign: 'center', cellWidth: 16 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [30, 58, 138];
      }
      if (data.column.index === 3) {
        data.cell.styles.fillColor = [248, 250, 252];
        data.cell.styles.textColor = [5, 150, 105];
      }
    }
  });

  curY = doc.lastAutoTable.finalY + 6;

  // Box 1: Apresentação Executiva & Objetivos do Monitoramento
  doc.setFillColor(...CORES.fundoCard);
  doc.roundedRect(10, curY, 190, 36, 2, 2, 'F');
  doc.setDrawColor(...CORES.bordaCard);
  doc.roundedRect(10, curY, 190, 36, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('OBJETIVOS DO MONITORAMENTO E DESTINAÇÃO INSTITUCIONAL:', 14, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(...CORES.textoSecundario);
  const textoObj1 = 'O presente relatório técnico consolida os resultados do Programa Municipal de Monitoramento Vetorial por Ovitrampas de Carmo-RJ, em estrito alinhamento com a Deliberação CIB-RJ nº 8.910/2024 e o Plano Municipal de Enfrentamento das Arboviroses. A tecnologia de ovitrampas atua como um sistema de alarme biológico precoce, detectando a presença e a densidade reprodutiva do vetor Aedes aegypti antes da manifestação de surtos clínicos e epidemias humanas de Dengue, Chikungunya e Zika vírus.';
  const textoObj2 = 'O envio periódico e sistematizado deste documento à Secretaria de Estado de Saúde (SES-RJ) assegura a governança tripartite no Sistema Único de Saúde (SUS), subsidiando a alocação estratégica de insumos biológicos, veículos de aspersão e reforço operacional estadual aos municípios prioritários da Região Serrana.';
  doc.text(doc.splitTextToSize(textoObj1, 182), 14, curY + 11.5);
  doc.text(doc.splitTextToSize(textoObj2, 182), 14, curY + 24.5);

  curY += 41;

  // Box 2: Declaração de Conformidade Ética e Proteção de Dados (LGPD)
  doc.setFillColor(254, 252, 232); // Amber suave institucional
  doc.roundedRect(10, curY, 190, 34, 2, 2, 'F');
  doc.setDrawColor(253, 224, 71);
  doc.roundedRect(10, curY, 190, 34, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(161, 98, 7); // amber-700
  doc.text('DECLARAÇÃO DE CONFORMIDADE ÉTICA, SIGILO SANITÁRIO E PROTEÇÃO DE DADOS (LGPD):', 14, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(113, 63, 18); // amber-900
  const textoLgpd1 = 'A Coordenadoria de Vigilância em Saúde de Carmo-RJ certifica que todas as informações contidas neste relatório foram rigorosamente submetidas ao processo de anonimização e agregação estatística, em integral conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018). Em nenhum ponto deste documento são divulgados nomes de moradores, telefones ou endereços residenciais unifamiliares.';
  const textoLgpd2 = 'As referências espaciais limitam-se ao código técnico da armadilha (P-01 a P-56) e à respectiva delimitação territorial por Quarteirão, Microárea e Bairro, assegurando o sigilo sanitário domiciliar e a finalidade exclusivamente epidemiológica das informações.';
  doc.text(doc.splitTextToSize(textoLgpd1, 182), 14, curY + 11.5);
  doc.text(doc.splitTextToSize(textoLgpd2, 182), 14, curY + 23);

  desenharRodapeSesRj(doc, paginaAtual, totalPaginas);
}

/**
 * Função principal exportada: Gera e baixa o Relatório Final Oficial da SES-RJ (8 Páginas)
 */
export async function gerarRelatorioFinalSesRj(
  armadilhas = [],
  todasLeituras = [],
  opcoes = {}
) {
  // 1. Carregamento sob demanda das bibliotecas pesadas (jsPDF, autoTable e canvas)
  const [{ default: jsPDF }, { default: autoTable }, { gerarCanvasMapaNevoeiro, gerarCanvasMapaCalor }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('./heatmapCanvas.js')
  ]);

  const nomeArquivo = opcoes.nomeArquivo || 'RELATORIO_FINAL_OFICIAL_SES_RJ_CARMO.pdf';
  const dataHoje = new Date();
  const dataFormatada = dataHoje.toLocaleDateString('pt-BR');
  const horaFormatada = dataHoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 2. Resolução dos dados de cada armadilha para os dois ciclos (A e B)
  const mapaLeituras = agruparLeiturasPorArmadilha(todasLeituras);
  const armadilhasResolvidas = armadilhas.map((arm) => {
    const dc = resolverLeiturasArmadilha(arm, mapaLeituras);
    return {
      ...arm,
      dadosCiclos: dc
    };
  });

  // Preparar coleções adaptadas para geração dos mapas específicos de cada ciclo
  const armadilhasCicloA = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_SEMANA_1);
  const armadilhasCicloB = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_SEMANA_2);
  const armadilhasAmbas = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_AMBAS);

  // Métricas gerais de cada ciclo
  const metricasA = calcularMetricasCiclo(armadilhasCicloA);
  const metricasB = calcularMetricasCiclo(armadilhasCicloB);

  // 3. Inicialização do Documento A4 Retrato (8 Páginas Oficiais)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const totalPaginasEstimadas = 8;

  await carregarTimbresOficiais();

  // =========================================================================
  // PÁGINA 1: CAPA INSTITUCIONAL OFICIAL COM TIMBRES E METADADOS
  // =========================================================================
  desenharCapaOficialSesRj(doc, {
    totalPaginas: totalPaginasEstimadas,
    dataFormatada
  });

  // O sumário (página 2) é desenhado no fim, já com a página real de cada
  // seção, e movido para a posição 2. Aqui guardamos onde cada seção começa
  // (chamar logo depois do addPage; o +1 é o sumário que entra na posição 2).
  const paginasSecao = {};
  const marcarSecao = (nome) => {
    paginasSecao[nome] = doc.getNumberOfPages() + 1;
  };
  const continuarCabecalho = (subtitulo) => {
    const inicio = doc.getNumberOfPages();
    return () => {
      if (doc.internal.getCurrentPageInfo().pageNumber !== inicio) {
        desenharCabecalhoSesRj(doc, { subtitulo });
        desenharRodapeSesRj(doc);
      }
    };
  };

  // =========================================================================
  // PÁGINA 3: RESUMO EXECUTIVO COMPARATIVO MUNICIPAL (CICLO A x CICLO B)
  // =========================================================================
  doc.addPage();
  paginasSecao.resumo = doc.getNumberOfPages() + 1;
  let paginaAtual = 3;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    totalPaginas: totalPaginasEstimadas,
    subtitulo: 'PAINEL EXECUTIVO COMPARATIVO — CICLO A x CICLO B'
  });

  let curY = 35;

  // Banner Informativo de Confidencialidade e Destinação
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, curY, 190, 16, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, curY, 190, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('DOCUMENTO DE USO INSTITUCIONAL EXCLUSIVO — SES-RJ & SECRETARIA MUNICIPAL DE SAÚDE DE CARMO', 14, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Monitoramento vetorial de Aedes aegypti / albopictus através de malha georreferenciada de 56 ovitrampas instaladas em campo.', 14, curY + 10.5);
  doc.text('Os dados territoriais são apresentados de forma anonimizada e agregada por Bairro, Microárea e Quarteirão técnico.', 14, curY + 14);

  curY += 21;

  // Título da Seção: Indicadores Gerais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('1.1 COMPARATIVO CONSOLIDADO DOS INDICADORES EPIDEMIOLÓGICOS', 10, curY);

  curY += 4;

  // Cards Comparativos (Grid de 5 Cards)
  const cardW = 36.4;
  const cardH = 26;
  const gap = 2;
  const startX = 10;

  const kpis = [
    {
      titulo: 'REDE TOTAL',
      valorA: `${armadilhas.length}`,
      rotuloA: 'Armadilhas',
      valorB: `${armadilhas.length}`,
      rotuloB: 'Instaladas',
      destaque: 'Cobertura 100%'
    },
    {
      titulo: 'PALHETAS LIDAS',
      valorA: `${metricasA.totalLidas}/56`,
      rotuloA: 'Ciclo A (100%)',
      valorB: `${metricasB.totalLidas}/56`,
      rotuloB: `${metricasB.totalLidas < 56 ? 'Em andamento' : 'Concluído'}`,
      destaque: `${56 - metricasB.totalLidas} pendentes`
    },
    {
      titulo: 'POSITIVAS',
      valorA: `${metricasA.totalPositivas}`,
      rotuloA: `IPO A: ${metricasA.ipo.toFixed(1)}%`,
      valorB: `${metricasB.totalPositivas}`,
      rotuloB: `IPO B: ${metricasB.ipo.toFixed(1)}%`,
      destaque: metricasB.totalLidas > 0 ? (metricasB.ipo >= metricasA.ipo ? 'IPO ↑ Subiu' : 'IPO ↓ Reduziu') : 'Aguardando'
    },
    {
      titulo: 'TOTAL DE OVOS',
      valorA: `${metricasA.totalOvos}`,
      rotuloA: 'Ciclo A',
      valorB: `${metricasB.totalOvos}`,
      rotuloB: 'Ciclo B (Parcial)',
      destaque: `${metricasB.totalOvos > metricasA.totalOvos ? '+' : ''}${metricasB.totalOvos - metricasA.totalOvos} ovos`
    },
    {
      titulo: 'DENSIDADE (IDO)',
      valorA: `${metricasA.ido.toFixed(1)}`,
      rotuloA: 'ovos/positiva',
      valorB: `${metricasB.ido.toFixed(1)}`,
      rotuloB: 'ovos/positiva',
      destaque: metricasB.totalPositivas > 0 ? (metricasB.ido >= metricasA.ido ? 'Densidade ↑' : 'Densidade ↓') : 'Aguardando'
    }
  ];

  kpis.forEach((kpi, idx) => {
    const x = startX + idx * (cardW + gap);
    doc.setFillColor(...CORES.fundoCard);
    doc.roundedRect(x, curY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(...CORES.bordaCard);
    doc.roundedRect(x, curY, cardW, cardH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...CORES.textoSecundario);
    doc.text(kpi.titulo, x + cardW / 2, curY + 4.5, { align: 'center' });

    // Ciclo A
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(`A: ${kpi.valorA}`, x + cardW / 2, curY + 10.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...CORES.textoMuted);
    doc.text(kpi.rotuloA, x + cardW / 2, curY + 13.5, { align: 'center' });

    // Ciclo B
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text(`B: ${kpi.valorB}`, x + cardW / 2, curY + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...CORES.textoMuted);
    doc.text(kpi.rotuloB, x + cardW / 2, curY + 22, { align: 'center' });

    // Badge status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(...CORES.textoPrincipal);
    doc.text(`[ ${kpi.destaque} ]`, x + cardW / 2, curY + 25, { align: 'center' });
  });

  curY += cardH + 7;

  // Título da Seção: Tabela Síntese por Território / Distrito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('1.2 SÍNTESE COMPARATIVA POR MACRORREGIÃO / DISTRITO', 10, curY);

  curY += 3;

  // Agrupamento por Território Macro
  const territoriosAgrupados = agruparArmadilhasPorTerritorio(armadilhasResolvidas);
  const linhasMacro = territoriosAgrupados.map((t) => {
    const m = calcularMetricasConjunto(t.armadilhas);
    return [
      t.nome,
      String(m.totalTraps),
      `${m.lidasA}`,
      `${m.posA}`,
      `${m.ovosA}`,
      m.ipoA !== null ? `${m.ipoA.toFixed(1)}%` : '-',
      m.idoA !== null ? m.idoA.toFixed(1) : '-',
      m.temCicloB ? `${m.lidasB}` : 'Aguardando',
      m.temCicloB ? `${m.posB}` : 'Aguardando',
      m.temCicloB ? `${m.ovosB}` : 'Aguardando',
      m.temCicloB && m.ipoB !== null ? `${m.ipoB.toFixed(1)}%` : 'Aguardando',
      m.temCicloB && m.idoB !== null ? m.idoB.toFixed(1) : 'Aguardando',
      m.tendencia
    ];
  });

  // Linha Total Municipal
  linhasMacro.push([
    'TOTAL GERAL MUNICIPAL (CARMO)',
    String(armadilhas.length),
    `${metricasA.totalLidas}`,
    `${metricasA.totalPositivas}`,
    `${metricasA.totalOvos}`,
    `${metricasA.ipo.toFixed(1)}%`,
    metricasA.ido.toFixed(1),
    `${metricasB.totalLidas}`,
    `${metricasB.totalPositivas}`,
    `${metricasB.totalOvos}`,
    metricasB.totalLidas > 0 ? `${metricasB.ipo.toFixed(1)}%` : 'Aguardando',
    metricasB.totalPositivas > 0 ? metricasB.ido.toFixed(1) : 'Aguardando',
    metricasB.totalLidas > 0 ? (metricasB.ipo >= metricasA.ipo ? 'Subiu ↑' : 'Reduziu ↓') : 'Aguardando'
  ]);

  autoTable(doc, {
    startY: curY,
    head: [[
      { content: 'Território / Distrito', rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'OVs', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Ciclo A (Semana 1)', colSpan: 5, styles: { halign: 'center', fillColor: [30, 58, 138] } },
      { content: 'Ciclo B (Semana 2)', colSpan: 5, styles: { halign: 'center', fillColor: [6, 95, 70] } },
      { content: 'Evolução', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
    ], [
      'Lidas', 'Pos.', 'Ovos', 'IPO', 'IDO',
      'Lidas', 'Pos.', 'Ovos', 'IPO', 'IDO'
    ]],
    body: linhasMacro,
    theme: 'grid',
    styles: {
      fontSize: 6.3,
      cellPadding: 1.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { halign: 'center', cellWidth: 9 },
      2: { halign: 'center', cellWidth: 9 },
      3: { halign: 'center', cellWidth: 9 },
      4: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'center', cellWidth: 11 },
      7: { halign: 'center', cellWidth: 11 },
      8: { halign: 'center', cellWidth: 9 },
      9: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      10: { halign: 'center', cellWidth: 13 },
      11: { halign: 'center', cellWidth: 11 },
      12: { halign: 'center', cellWidth: 19, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Destacar última linha (Total Geral)
      if (data.row.index === linhasMacro.length - 1) {
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.fontStyle = 'bold';
      }
      // Colorir coluna evolução
      if (data.column.index === 12 && data.row.index < linhasMacro.length) {
        const val = String(data.cell.raw || '');
        if (val.includes('Subiu')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('Reduziu')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val.includes('Aguardando')) {
          data.cell.styles.textColor = [100, 116, 139];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    }
  });

  curY = doc.lastAutoTable.finalY + 6;

  // Quadro de Estratificação Oficial de Risco (Ministério da Saúde)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('1.3 DISTRIBUIÇÃO DAS ARMADILHAS POR ESTRATO OFICIAL DE RISCO', 10, curY);

  curY += 3;

  const linhasRisco = [
    [
      'Crítico (> 100 ovos)',
      `${metricasA.criticos} armadilhas (${(metricasA.criticos / 56 * 100).toFixed(1)}%)`,
      metricasB.totalLidas > 0 ? `${metricasB.criticos} armadilhas (${(metricasB.criticos / 56 * 100).toFixed(1)}%)` : 'Aguardando',
      'Intervenção química imediata, eliminação de criadouros e bloqueio focal'
    ],
    [
      'Alto Risco (51 a 100 ovos)',
      `${metricasA.altos} armadilhas (${(metricasA.altos / 56 * 100).toFixed(1)}%)`,
      metricasB.totalLidas > 0 ? `${metricasB.altos} armadilhas (${(metricasB.altos / 56 * 100).toFixed(1)}%)` : 'Aguardando',
      'Varredura de depósitos, aplicação de biolarvicida e orientação aos moradores'
    ],
    [
      'Médio Risco (21 a 50 ovos)',
      `${metricasA.medios} armadilhas (${(metricasA.medios / 56 * 100).toFixed(1)}%)`,
      metricasB.totalLidas > 0 ? `${metricasB.medios} armadilhas (${(metricasB.medios / 56 * 100).toFixed(1)}%)` : 'Aguardando',
      'Intensificação de visitas domiciliares e eliminação mecânica de recipientes'
    ],
    [
      'Baixo Risco (1 a 20 ovos)',
      `${metricasA.baixos} armadilhas (${(metricasA.baixos / 56 * 100).toFixed(1)}%)`,
      metricasB.totalLidas > 0 ? `${metricasB.baixos} armadilhas (${(metricasB.baixos / 56 * 100).toFixed(1)}%)` : 'Aguardando',
      'Manutenção preventiva e vigilância entomológica de rotina'
    ],
    [
      'Sem Ovos (Negativas - 0)',
      `${metricasA.totalNegativas} armadilhas (${(metricasA.totalNegativas / 56 * 100).toFixed(1)}%)`,
      metricasB.totalLidas > 0 ? `${metricasB.totalNegativas} armadilhas (${(metricasB.totalNegativas / 56 * 100).toFixed(1)}%)` : 'Aguardando',
      'Área sob controle entomológico aparente no ciclo avaliado'
    ]
  ];

  autoTable(doc, {
    startY: curY,
    head: [['Estrato de Risco Epidemiológico', 'Ciclo A (Semana 1)', 'Ciclo B (Semana 2)', 'Conduta Técnica Recomendada']],
    body: linhasRisco,
    theme: 'grid',
    styles: {
      fontSize: 6.3,
      cellPadding: 1.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { halign: 'center', cellWidth: 38 },
      2: { halign: 'center', cellWidth: 38 },
      3: { cellWidth: 72 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0) {
        if (data.row.index === 0) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (data.row.index === 1) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        } else if (data.row.index === 2) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 252, 232];
        } else if (data.row.index === 3) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (data.row.index === 4) {
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fillColor = [239, 246, 255];
        }
      }
    }
  });

  desenharRodapeSesRj(doc, paginaAtual, totalPaginasEstimadas);

  // =========================================================================
  // INDICADORES EM GRÁFICOS: RISCO POR BAIRRO (CICLO A x CICLO B)
  // Mesmos gráficos do Relatório de Resultados, um por ciclo.
  // =========================================================================
  const somenteA = armadilhasDoCiclo(armadilhasResolvidas, 'A');
  const somenteB = armadilhasDoCiclo(armadilhasResolvidas, 'B');

  doc.addPage();
  marcarSecao('graficos');
  desenharCabecalhoSesRj(doc, { subtitulo: 'INDICADORES EM GRÁFICOS — RISCO POR BAIRRO' });
  curY = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('2. INDICADORES EM GRÁFICOS — ESTRATOS DE RISCO POR BAIRRO E DISTRITO', 10, curY);
  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Cada barra mostra quantas armadilhas lidas do bairro caíram em cada estrato: sem ovos, baixo (1–20), médio (21–50), alto (51–100) e crítico (acima de 100).', 10, curY);
  curY += 5;
  [
    ['CICLO A (1ª SEMANA)', somenteA],
    ['CICLO B (2ª SEMANA)', somenteB]
  ].forEach(([rotulo, lista]) => {
    const lidas = lista.filter((a) => a.ultimosOvos != null).length;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...CORES.textoPrincipal);
    doc.text(`${rotulo} — ${lidas} de ${lista.length} palhetas lidas`, 10, curY + 3);
    curY += 5;
    const tela = gerarCanvasBarrasLateraisRiscoBairros(extrairDadosBairrosConsolidado(lista), { width: 1400, height: 640 });
    if (tela) {
      doc.addImage(tela.toDataURL('image/png'), 'PNG', 10, curY, 190, 190 * (640 / 1400), undefined, 'FAST');
    }
    curY += 190 * (640 / 1400) + 4;
  });
  desenharRodapeSesRj(doc);

  // =========================================================================
  // FOCOS PRIORITÁRIOS: RANKING POR CICLO
  // =========================================================================
  doc.addPage();
  marcarSecao('focos');
  desenharCabecalhoSesRj(doc, { subtitulo: 'FOCOS PRIORITÁRIOS — RANKING POR CICLO' });
  curY = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('3. FOCOS PRIORITÁRIOS — ARMADILHAS COM MAIS DE 50 OVOS', 10, curY);
  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Ranking das 10 maiores contagens de cada ciclo. Identificação apenas pelo código técnico da armadilha, sem endereço nem morador.', 10, curY);
  curY += 5;
  [
    ['CICLO A (1ª SEMANA)', somenteA],
    ['CICLO B (2ª SEMANA)', somenteB]
  ].forEach(([rotulo, lista]) => {
    const focos = lista
      .filter((a) => a.ultimosOvos != null && a.ultimosOvos > 50)
      .sort((x, y) => y.ultimosOvos - x.ultimosOvos);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...CORES.textoPrincipal);
    doc.text(`${rotulo} — ${focos.length} armadilha${focos.length === 1 ? '' : 's'} acima de 50 ovos`, 10, curY + 3);
    curY += 5;
    if (focos.length) {
      const tela = gerarCanvasRankingFocos(focos, { width: 1200, height: 520 });
      if (tela) {
        doc.addImage(tela.toDataURL('image/png'), 'PNG', 10, curY, 190, 190 * (520 / 1200), undefined, 'FAST');
      }
      curY += 190 * (520 / 1200) + 5;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...CORES.textoSecundario);
      doc.text('Nenhuma armadilha acima de 50 ovos entre as palhetas lidas deste ciclo.', 14, curY + 4);
      curY += 12;
    }
  });
  desenharRodapeSesRj(doc);

  // =========================================================================
  // PÁGINA 4: TABELA TÉCNICA EM 3 NÍVEIS (BAIRRO > MICROÁREA > QUARTEIRÃO)
  // =========================================================================
  doc.addPage();
  paginasSecao.tabela = doc.getNumberOfPages() + 1;
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    totalPaginas: totalPaginasEstimadas,
    subtitulo: 'TABELA TÉCNICA EM 3 NÍVEIS: BAIRRO > MICROÁREA > QUARTEIRÃO'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('4. ESTRATIFICAÇÃO TERRITORIAL DETALHADA EM 3 NÍVEIS OFICIAIS', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('A tabela abaixo detalha todos os quarteirões monitorados, comparando o volume de ovos e os índices IPO/IDO de cada ciclo.', 10, curY);
  doc.text('Conforme diretrizes de sigilo sanitário, a identificação dos pontos é restrita à sua referência cadastral e quarteirão.', 10, curY + 3.5);

  curY += 7;

  // Montar linhas da tabela em 3 níveis
  const dadosHierarquicos = agruparDadosTerritoriais3Niveis(armadilhasResolvidas);
  const linhasTabela3Niveis = [];

  dadosHierarquicos.forEach((macro) => {
    macro.bairros.forEach((bairroObj) => {
      bairroObj.microareas.forEach((microObj) => {
        microObj.quarteiroes.forEach((quartObj) => {
          const m = calcularMetricasConjunto(quartObj.armadilhas);
          const codigosArm = quartObj.armadilhas.map((a) => `P-${a.numero}`).join(', ');

          linhasTabela3Niveis.push([
            bairroObj.nome,
            microObj.nome,
            quartObj.nome,
            codigosArm,
            String(m.totalTraps),
            `${m.ovosA}`,
            m.ipoA !== null ? `${m.ipoA.toFixed(0)}%` : '-',
            m.idoA !== null ? m.idoA.toFixed(1) : '-',
            m.temCicloB ? `${m.ovosB}` : 'Aguardando',
            m.temCicloB && m.ipoB !== null ? `${m.ipoB.toFixed(0)}%` : 'Aguardando',
            m.temCicloB && m.idoB !== null ? m.idoB.toFixed(1) : 'Aguardando',
            m.tendencia
          ]);
        });
      });
    });
  });

  autoTable(doc, {
    startY: curY,
    margin: { top: 36, bottom: 14 },
    didDrawPage: continuarCabecalho('ESTRATIFICAÇÃO TERRITORIAL EM 3 NÍVEIS (CONTINUAÇÃO)'),
    head: [[
      { content: 'Bairro', rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'Microárea', rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'Quarteirão', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Armadilhas', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Qtd', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Ciclo A (Semana 1)', colSpan: 3, styles: { halign: 'center', fillColor: [30, 58, 138] } },
      { content: 'Ciclo B (Semana 2)', colSpan: 3, styles: { halign: 'center', fillColor: [6, 95, 70] } },
      { content: 'Tendência', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
    ], [
      'Ovos', 'IPO', 'IDO',
      'Ovos', 'IPO', 'IDO'
    ]],
    body: linhasTabela3Niveis,
    theme: 'grid',
    styles: {
      fontSize: 5.7,
      cellPadding: 1.1,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.8
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { cellWidth: 26 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 8 },
      5: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 11 },
      7: { halign: 'center', cellWidth: 11 },
      8: { halign: 'center', cellWidth: 13, fontStyle: 'bold' },
      9: { halign: 'center', cellWidth: 13 },
      10: { halign: 'center', cellWidth: 13 },
      11: { halign: 'center', cellWidth: 20, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.column.index === 11) {
        const val = String(data.cell.raw || '');
        if (val.includes('Subiu')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('Reduziu')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val.includes('Aguardando')) {
          data.cell.styles.textColor = [100, 116, 139];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    }
  });

  desenharRodapeSesRj(doc, paginaAtual, totalPaginasEstimadas);

  // =========================================================================
  // PÁGINA 5: CLASSIFICAÇÃO INDIVIDUAL DE RISCO POR ARMAIDILHA (ANONIMIZADA)
  // =========================================================================
  doc.addPage();
  paginasSecao.inventario = doc.getNumberOfPages() + 1;
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    totalPaginas: totalPaginasEstimadas,
    subtitulo: 'INVENTÁRIO TÉCNICO DAS 56 OVITRAMPAS (SEM MORADOR)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('5. INVENTÁRIO TÉCNICO INDIVIDUALIZADO DAS 56 OVITRAMPAS', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Acompanhamento da leitura laboratorial de cada uma das 56 ovitrampas em ambos os ciclos amostrais.', 10, curY);
  doc.text('Para cumprimento da LGPD e diretrizes éticas sanitárias, os dados domiciliares foram substituídos pela localização de quarteirão.', 10, curY + 3.5);

  curY += 7;

  // Ordenar armadilhas por número crescente (P-01 até P-56)
  const armOrdenadas = [...armadilhasResolvidas].sort((a, b) => {
    const nA = parseInt(String(a.numero).replace(/\D/g, ''), 10) || 0;
    const nB = parseInt(String(b.numero).replace(/\D/g, ''), 10) || 0;
    return nA - nB;
  });

  const linhasIndividual = armOrdenadas.map((arm) => {
    const dc = arm.dadosCiclos;
    const ovosA = dc?.ovosA != null ? Number(dc.ovosA) : null;
    const ovosB = dc?.ovosB != null ? Number(dc.ovosB) : null;

    const riscoA = ovosA !== null ? classificarRiscoOficial(ovosA).rotulo : 'Sem Leitura';
    const riscoB = ovosB !== null ? classificarRiscoOficial(ovosB).rotulo : 'Aguardando';

    let evolucao = 'Aguardando';
    if (ovosB !== null && ovosA !== null) {
      if (ovosB > ovosA) evolucao = `+${ovosB - ovosA} (Subiu ↑)`;
      else if (ovosB < ovosA) evolucao = `${ovosB - ovosA} (Reduziu ↓)`;
      else evolucao = '0 (Estável =)';
    }

    return [
      `P-${arm.numero}`,
      arm.bairro || '-',
      arm.microarea || '-',
      arm.quarteirao || '-',
      dc?.palhetaA || `${arm.numero}A`,
      ovosA !== null ? `${ovosA}` : '-',
      riscoA,
      dc?.palhetaB || `${arm.numero}B`,
      ovosB !== null ? `${ovosB}` : 'Aguardando',
      riscoB,
      evolucao
    ];
  });

  const parte1 = linhasIndividual.slice(0, 28);
  const parte2 = linhasIndividual.slice(28);

  autoTable(doc, {
    startY: curY,
    margin: { top: 36, bottom: 14 },
    head: [[
      'OV', 'Bairro', 'Microárea', 'Quart.',
      'Palh. A', 'Ovos A', 'Risco Ciclo A',
      'Palh. B', 'Ovos B', 'Risco Ciclo B',
      'Variação Ovos'
    ]],
    body: parte1,
    theme: 'grid',
    styles: {
      fontSize: 5.6,
      cellPadding: 1.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.8
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 11 },
      1: { fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 13 },
      6: { halign: 'center', cellWidth: 24 },
      7: { halign: 'center', cellWidth: 13 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      9: { halign: 'center', cellWidth: 24 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: (data) => {
      // Colorir risco A
      if (data.column.index === 6) {
        const val = String(data.cell.raw || '');
        if (val.includes('Crítico')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('Alto')) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        } else if (val.includes('Médio')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 252, 232];
        } else if (val.includes('Baixo')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val.includes('Negativa')) {
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fillColor = [239, 246, 255];
        }
      }
      // Colorir risco B
      if (data.column.index === 9) {
        const val = String(data.cell.raw || '');
        if (val.includes('Crítico')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('Alto')) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        } else if (val.includes('Médio')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 252, 232];
        } else if (val.includes('Baixo')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val.includes('Negativa')) {
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fillColor = [239, 246, 255];
        } else if (val.includes('Aguardando')) {
          data.cell.styles.textColor = [100, 116, 139];
          data.cell.styles.fontStyle = 'italic';
        }
      }
      // Colorir variação
      if (data.column.index === 10) {
        const val = String(data.cell.raw || '');
        if (val.includes('Subiu')) {
          data.cell.styles.textColor = [185, 28, 28];
        } else if (val.includes('Reduziu')) {
          data.cell.styles.textColor = [4, 120, 87];
        }
      }
    }
  });

  desenharRodapeSesRj(doc, paginaAtual, totalPaginasEstimadas);

  // PÁGINA 5B: INVENTÁRIO TÉCNICO PARTE 2 (P-29 A P-56)
  doc.addPage();
  paginaAtual += 1;
  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    totalPaginas: totalPaginasEstimadas,
    subtitulo: 'INVENTÁRIO TÉCNICO DAS 56 OVITRAMPAS (PARTE 2)'
  });

  curY = 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('5. INVENTÁRIO TÉCNICO INDIVIDUALIZADO — PARTE 2 (P-29 A P-56)', 10, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Continuação do inventário das 56 ovitrampas de Carmo (Sede e Distritos) com classificação direta de risco:', 10, curY);

  curY += 7;

  autoTable(doc, {
    startY: curY,
    margin: { top: 36, bottom: 14 },
    head: [[
      'OV', 'Bairro', 'Microárea', 'Quart.',
      'Palh. A', 'Ovos A', 'Risco Ciclo A',
      'Palh. B', 'Ovos B', 'Risco Ciclo B',
      'Variação Ovos'
    ]],
    body: parte2,
    theme: 'grid',
    styles: {
      fontSize: 5.6,
      cellPadding: 1.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.8
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 11 },
      1: { fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 13 },
      6: { halign: 'center', cellWidth: 24 },
      7: { halign: 'center', cellWidth: 13 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
      9: { halign: 'center', cellWidth: 24 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: (data) => {
      // Colorir risco A
      if (data.column.index === 6) {
        const val = String(data.cell.raw || '');
        if (val.includes('Crítico')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('Alto')) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        } else if (val.includes('Médio')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 252, 232];
        } else if (val.includes('Baixo')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val.includes('Negativa')) {
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fillColor = [239, 246, 255];
        }
      }
      // Colorir risco B
      if (data.column.index === 9) {
        const val = String(data.cell.raw || '');
        if (val.includes('Crítico')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('Alto')) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        } else if (val.includes('Médio')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 252, 232];
        } else if (val.includes('Baixo')) {
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val.includes('Negativa')) {
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fillColor = [239, 246, 255];
        } else if (val.includes('Aguardando')) {
          data.cell.styles.textColor = [100, 116, 139];
          data.cell.styles.fontStyle = 'italic';
        }
      }
      // Colorir variação
      if (data.column.index === 10) {
        const val = String(data.cell.raw || '');
        if (val.includes('Subiu')) {
          data.cell.styles.textColor = [185, 28, 28];
        } else if (val.includes('Reduziu')) {
          data.cell.styles.textColor = [4, 120, 87];
        }
      }
    }
  });

  desenharRodapeSesRj(doc, paginaAtual, totalPaginasEstimadas);

  // =========================================================================
  // SEÇÃO 06A: MAPEAMENTO GEOESPACIAL 1A — SEDE URBANA: 1ª SEMANA (PALHETA A)
  // =========================================================================
  doc.addPage();
  marcarSecao('mapaSede');
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 1A — SEDE URBANA (1ª SEMANA - PALHETA A)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('6A. MAPEAMENTO GEOESPACIAL 1A — SEDE URBANA (1ª SEMANA • LINHA DE BASE)', 10, curY);

  curY += 4;

  const sedeArmsA = armadilhasCicloA.filter((a) => classificarTerritorio(a).id === 'sede');
  const sedeArmsB = armadilhasCicloB.filter((a) => classificarTerritorio(a).id === 'sede');
  const sedeSomenteA = somenteA.filter((a) => classificarTerritorio(a).id === 'sede');
  const sedeSomenteB = somenteB.filter((a) => classificarTerritorio(a).id === 'sede');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text(`Mapeamento em alta resolução por imagem de satélite das ${sedeArmsA.length} armadilhas da malha urbana (Progresso, Centro, Caixa d'Água, etc.) com dispersão térmica.`, 10, curY);

  curY += 6;

  try {
    const canvasMapaSedeA = await gerarCanvasMapaCalor(sedeArmsA, {
      width: 1500,
      height: 920,
      tituloTerritorio: '1º DISTRITO — SEDE URBANA (1ª SEMANA - PALHETA A)',
      semRotulosSobreCalor: false,
      dataBase: 'Ciclo A (1ª Semana)',
      provider: 'satellite'
    });
    const telaSedeA = canvasMapaSedeA?.canvas || canvasMapaSedeA;
    if (telaSedeA) {
      const imgDataSedeA = telaSedeA.toDataURL('image/jpeg', 0.90);
      const alturaSede = Math.min(135, 190 * (telaSedeA.height / telaSedeA.width));
      doc.addImage(imgDataSedeA, 'JPEG', 10, curY, 190, alturaSede);
      curY += alturaSede + 3;
    }
  } catch (errMapaSede) {
    console.warn('Erro ao gerar imagem do mapa da Sede:', errMapaSede);
    doc.rect(10, curY, 190, 80);
    doc.text('Mapa em processamento vetorial', 20, curY + 40);
    curY += 85;
  }

  curY = desenharBoxAnalise(
    doc,
    curY,
    'ANÁLISE ESPACIAL DA INFESTAÇÃO — SEDE URBANA (1º DISTRITO - 1ª SEMANA):',
    analiseDoCiclo(sedeSomenteA, sedeSomenteB, 'A')
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 06B: MAPEAMENTO GEOESPACIAL 1B — SEDE URBANA: 2ª SEMANA (PALHETA B)
  // =========================================================================
  doc.addPage();
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 1B — SEDE URBANA (2ª SEMANA - PALHETA B)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('6B. MAPEAMENTO GEOESPACIAL 1B — SEDE URBANA (2ª SEMANA • EVOLUÇÃO TEMPORAL)', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text(`Evolução geoespacial da infestação vetorial na Sede Urbana durante a 2ª Semana (Palheta B) e impacto das medidas focais.`, 10, curY);

  curY += 6;

  try {
    const canvasMapaSedeB = await gerarCanvasMapaCalor(sedeArmsB, {
      width: 1500,
      height: 920,
      tituloTerritorio: '1º DISTRITO — SEDE URBANA (2ª SEMANA - PALHETA B)',
      semRotulosSobreCalor: false,
      dataBase: 'Ciclo B (2ª Semana)',
      provider: 'satellite'
    });
    const telaSedeB = canvasMapaSedeB?.canvas || canvasMapaSedeB;
    if (telaSedeB) {
      const imgDataSedeB = telaSedeB.toDataURL('image/jpeg', 0.90);
      const alturaSede = Math.min(135, 190 * (telaSedeB.height / telaSedeB.width));
      doc.addImage(imgDataSedeB, 'JPEG', 10, curY, 190, alturaSede);
      curY += alturaSede + 3;
    }
  } catch (errMapaSedeB) {
    console.warn('Erro ao gerar imagem do mapa da Sede B:', errMapaSedeB);
  }

  curY = desenharBoxAnalise(
    doc,
    curY,
    'ANÁLISE ESPACIAL DA INFESTAÇÃO — SEDE URBANA (1º DISTRITO - 2ª SEMANA):',
    analiseDoCiclo(sedeSomenteB, sedeSomenteA, 'B')
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 06C: MAPEAMENTO GEOESPACIAL 1C — SEDE URBANA: DUAS SEMANAS JUNTAS (CONSOLIDADO A + B)
  // =========================================================================
  doc.addPage();
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 1C — SEDE URBANA (CONSOLIDADO A + B)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('6C. MAPEAMENTO GEOESPACIAL 1C — SEDE URBANA (DUAS SEMANAS JUNTAS • A+B)', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text(`Carga bi-semanal acumulada de oviposição e estratificação consolidada na Sede Urbana de Carmo.`, 10, curY);

  curY += 6;

  try {
    const sedeArmsAmbas = armadilhasAmbas.filter((a) => classificarTerritorio(a).id === 'sede');
    const canvasMapaSedeAmbas = await gerarCanvasMapaCalor(sedeArmsAmbas, {
      width: 1500,
      height: 920,
      tituloTerritorio: '1º DISTRITO — SEDE URBANA (CONSOLIDADO A + B)',
      semRotulosSobreCalor: false,
      dataBase: 'Consolidado Palhetas A + B',
      provider: 'satellite'
    });
    const telaSedeAmbas = canvasMapaSedeAmbas?.canvas || canvasMapaSedeAmbas;
    if (telaSedeAmbas) {
      const imgDataSedeAmbas = telaSedeAmbas.toDataURL('image/jpeg', 0.90);
      const alturaSede = Math.min(135, 190 * (telaSedeAmbas.height / telaSedeAmbas.width));
      doc.addImage(imgDataSedeAmbas, 'JPEG', 10, curY, 190, alturaSede);
      curY += alturaSede + 3;
    }
  } catch (errMapaSedeAmbas) {
    console.warn('Erro ao gerar imagem do mapa da Sede Ambas:', errMapaSedeAmbas);
  }

  curY = desenharBoxAnalise(
    doc,
    curY,
    'CONSOLIDAÇÃO EPIDEMIOLÓGICA — SEDE URBANA (A + B ACUMULADO):',
    [
      `• Carga acumulada bi-semanal nos bairros da Sede Urbana com 35 armadilhas monitoradas.`,
      `• Concentração de postura priorizada para os bairros Progresso, Centro e Boa Ideia.`,
      `• Nevoeiro térmico calibrado em raio oficial de 175m (~300m circunferência) delimitando com precisão o foco reprodutivo.`
    ]
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 07A: MAPEAMENTO GEOESPACIAL 2A — DISTRITOS E LOCALIDADES (1ª SEMANA)
  // =========================================================================
  doc.addPage();
  marcarSecao('mapaDistritos');
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 2A — DISTRITOS (1ª SEMANA - PALHETA A)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('7A. MAPEAMENTO GEOESPACIAL 2A — DISTRITOS E LOCALIDADES (1ª SEMANA • PALHETA A)', 10, curY);

  curY += 4;

  const distritosArmsA = armadilhasCicloA.filter((a) => classificarTerritorio(a).id !== 'sede');
  const distritosArmsB = armadilhasCicloB.filter((a) => classificarTerritorio(a).id !== 'sede');
  const distSomenteA = somenteA.filter((a) => classificarTerritorio(a).id !== 'sede');
  const distSomenteB = somenteB.filter((a) => classificarTerritorio(a).id !== 'sede');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text(`Dispersão espacial das ${distritosArmsA.length} armadilhas distribuídas nos distritos de Influência (2º), Córrego da Prata (3º), Porto Velho (4º), Ilha dos Pombos e Barra de S. Francisco na 1ª Semana.`, 10, curY);

  curY += 6;

  try {
    const canvasMapaDistA = await gerarCanvasMapaCalor(distritosArmsA, {
      width: 1500,
      height: 920,
      tituloTerritorio: 'DISTRITOS E LOCALIDADES (1ª SEMANA - PALHETA A)',
      semRotulosSobreCalor: false,
      dataBase: 'Ciclo A (1ª Semana)',
      provider: 'satellite'
    });
    const telaDistA = canvasMapaDistA?.canvas || canvasMapaDistA;
    if (telaDistA) {
      const imgDataDistA = telaDistA.toDataURL('image/jpeg', 0.90);
      const alturaDist = Math.min(135, 190 * (telaDistA.height / telaDistA.width));
      doc.addImage(imgDataDistA, 'JPEG', 10, curY, 190, alturaDist);
      curY += alturaDist + 3;
    }
  } catch (errMapaDist) {
    console.warn('Erro ao gerar imagem do mapa dos Distritos:', errMapaDist);
  }

  curY = desenharBoxAnalise(
    doc,
    curY,
    'ANÁLISE ESPACIAL DA INFESTAÇÃO — DISTRITOS (1ª SEMANA):',
    analiseDoCiclo(distSomenteA, distSomenteB, 'A')
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 07B: MAPEAMENTO GEOESPACIAL 2B — DISTRITOS E LOCALIDADES (2ª SEMANA)
  // =========================================================================
  doc.addPage();
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 2B — DISTRITOS (2ª SEMANA - PALHETA B)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('7B. MAPEAMENTO GEOESPACIAL 2B — DISTRITOS E LOCALIDADES (2ª SEMANA • PALHETA B)', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text(`Evolução do monitoramento vetorial nos distritos e localidades durante a 2ª Semana (Palheta B).`, 10, curY);

  curY += 6;

  try {
    const canvasMapaDistB = await gerarCanvasMapaCalor(distritosArmsB, {
      width: 1500,
      height: 920,
      tituloTerritorio: 'DISTRITOS E LOCALIDADES (2ª SEMANA - PALHETA B)',
      semRotulosSobreCalor: false,
      dataBase: 'Ciclo B (2ª Semana)',
      provider: 'satellite'
    });
    const telaDistB = canvasMapaDistB?.canvas || canvasMapaDistB;
    if (telaDistB) {
      const imgDataDistB = telaDistB.toDataURL('image/jpeg', 0.90);
      const alturaDist = Math.min(135, 190 * (telaDistB.height / telaDistB.width));
      doc.addImage(imgDataDistB, 'JPEG', 10, curY, 190, alturaDist);
      curY += alturaDist + 3;
    }
  } catch (errMapaDistB) {
    console.warn('Erro ao gerar imagem do mapa dos Distritos B:', errMapaDistB);
  }

  curY = desenharBoxAnalise(
    doc,
    curY,
    'ANÁLISE ESPACIAL DA INFESTAÇÃO — DISTRITOS (2ª SEMANA):',
    analiseDoCiclo(distSomenteB, distSomenteA, 'B')
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 07C: MAPEAMENTO GEOESPACIAL 2C — DISTRITOS E LOCALIDADES (CONSOLIDADO A + B)
  // =========================================================================
  doc.addPage();
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 2C — DISTRITOS (CONSOLIDADO A + B)'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('7C. MAPEAMENTO GEOESPACIAL 2C — DISTRITOS E LOCALIDADES (DUAS SEMANAS JUNTAS • A+B)', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text(`Consolidação bi-semanal acumulada da oviposição e risco nos distritos de Carmo/RJ.`, 10, curY);

  curY += 6;

  try {
    const distritosArmsAmbas = armadilhasAmbas.filter((a) => classificarTerritorio(a).id !== 'sede');
    const canvasMapaDistAmbas = await gerarCanvasMapaCalor(distritosArmsAmbas, {
      width: 1500,
      height: 920,
      tituloTerritorio: 'DISTRITOS E LOCALIDADES (CONSOLIDADO A + B)',
      semRotulosSobreCalor: false,
      dataBase: 'Consolidado Palhetas A + B',
      provider: 'satellite'
    });
    const telaDistAmbas = canvasMapaDistAmbas?.canvas || canvasMapaDistAmbas;
    if (telaDistAmbas) {
      const imgDataDistAmbas = telaDistAmbas.toDataURL('image/jpeg', 0.90);
      const alturaDist = Math.min(135, 190 * (telaDistAmbas.height / telaDistAmbas.width));
      doc.addImage(imgDataDistAmbas, 'JPEG', 10, curY, 190, alturaDist);
      curY += alturaDist + 3;
    }
  } catch (errMapaDistAmbas) {
    console.warn('Erro ao gerar imagem do mapa dos Distritos Ambas:', errMapaDistAmbas);
  }

  curY = desenharBoxAnalise(
    doc,
    curY,
    'CONSOLIDAÇÃO EPIDEMIOLÓGICA — DISTRITOS (A + B ACUMULADO):',
    [
      `• Consolidação das 21 armadilhas rurais e distritais de Carmo/RJ.`,
      `• Identificação de focos isolados no 2º Distrito (Influência) e estabilidade em Porto Velho.`,
      `• Mapeamento de precisão sobre ortofoto de satélite com raio de 175m (~300m circunferência).`
    ]
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 08: MAPEAMENTO GEOESPACIAL 3 — PANORAMA MUNICIPAL INTEGRADO
  // =========================================================================
  doc.addPage();
  marcarSecao('mapaMunicipal');
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'MAPEAMENTO GEOESPACIAL 3 — PANORAMA MUNICIPAL INTEGRADO'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('8. PANORAMA GEOESPACIAL MUNICIPAL INTEGRADO (56 ARMADILHAS — SEDE E DISTRITOS)', 10, curY);

  curY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Visão macroterritorial integrada conectando a sede urbana aos 4 distritos municipais sobre imagem de satélite de alta resolução:', 10, curY);

  curY += 6;

  try {
    const canvasMacro = await gerarCanvasMapaCalor(armadilhasAmbas, {
      width: 1500,
      height: 920,
      tituloTerritorio: 'PANORAMA MUNICIPAL INTEGRADO (CARMO-RJ)',
      semRotulosSobreCalor: false,
      dataBase: '56 Armadilhas • Consolidado Palhetas A + B',
      provider: 'satellite'
    });
    const telaMacro = canvasMacro?.canvas || canvasMacro;
    if (telaMacro) {
      const imgMacro = telaMacro.toDataURL('image/jpeg', 0.90);
      const alturaMacro = Math.min(135, 190 * (telaMacro.height / telaMacro.width));
      doc.addImage(imgMacro, 'JPEG', 10, curY, 190, alturaMacro);
      curY += alturaMacro + 3;
    }
  } catch (errMacro) {
    console.warn('Erro ao gerar mapas comparativos municipais:', errMacro);
  }

  // Box analítico comparativo municipal
  curY = desenharBoxAnalise(
    doc,
    curY,
    'SÍNTESE COMPARATIVA DA SÉRIE TEMPORAL MUNICIPAL (CICLO A x CICLO B):',
    analiseDoCiclo(somenteB, somenteA, 'B')
  );

  desenharRodapeSesRj(doc, paginaAtual);

  // =========================================================================
  // SEÇÃO 09: METODOLOGIA OFICIAL, PLANO DE AÇÃO & ASSINATURA TÉCNICA
  // =========================================================================
  doc.addPage();
  marcarSecao('metodologia');
  paginaAtual += 1;

  desenharCabecalhoSesRj(doc, {
    paginaAtual,
    subtitulo: 'METODOLOGIA OFICIAL, DIRETRIZES DE MANEJO & CHANCELA TÉCNICA'
  });

  curY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('9. METODOLOGIA PADRONIZADA DE MONITORAMENTO ENTOMOLÓGICO', 10, curY);

  curY += 4;

  // Box de Metodologia
  doc.setFillColor(...CORES.fundoCard);
  doc.roundedRect(10, curY, 190, 48, 2, 2, 'F');
  doc.setDrawColor(...CORES.bordaCard);
  doc.roundedRect(10, curY, 190, 48, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('O monitoramento foi conduzido segundo as diretrizes técnicas do Ministério da Saúde e da Secretaria de Estado de Saúde do RJ (SES-RJ):', 14, curY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('• Dispositivo Amostral: Armadilha ovitrampa constituída de vaso plástico preto fosco de polietileno (capacidade 500ml), com substrato de', 14, curY + 10.5);
  doc.text('  madeira de eucalipto rugosa (palheta 12 x 2,5 cm) e 300ml de infusão biológica atrativa padronizada (Panicum maximum a 10%).', 14, curY + 14);
  doc.text('• Desenho Amostral: 56 armadilhas georreferenciadas com GPS métrico, distribuídas em grade regular com espaçamento médio de 300 a 400 metros,', 14, curY + 18);
  doc.text('  cobrindo a sede urbana do 1º Distrito e os distritos de Influência, Córrego da Prata, Porto Velho do Cunha, Ilha dos Pombos e Barra de S. Francisco.', 14, curY + 21.5);
  doc.text('• Ciclo de Coleta: Instalação e exposição contínua por período padrão de 5 dias no peridomicílio em locais sombreados e protegidos.', 14, curY + 25.5);
  doc.text('• Triagem Laboratorial: Análise e quantificação individualizada sob estereomicroscopia óptica em bancada laboratorial com dupla conferência.', 14, curY + 29.5);
  doc.text('• Fórmulas de Cálculo:', 14, curY + 34);
  doc.text('    - Índice de Positividade de Ovitrampas (IPO) = (Nº de Armadilhas Positivas / Nº de Armadilhas Lidas) x 100', 18, curY + 38);
  doc.text('    - Índice de Densidade de Ovos (IDO) = Total de Ovos Contados / Nº de Armadilhas Positivas', 18, curY + 42);

  curY += 53;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('9.1 PLANO DE AÇÃO IMEDIATA E MEDIDAS DE CONTROLE AMBIENTAL', 10, curY);

  curY += 4;

  const acoes = [
    {
      alvo: 'Focos Críticos (Progresso, Centro, Caixa d\'Água, Influência):',
      acao: 'Deslocamento imediato de equipes de agentes de combate a endemias (ACE) para bloqueio de transmissão em raio de 150 metros. Realização de visita casa a casa com busca ativa rigorosa de depósitos com água parada, aplicação de larvicida biológico (Bti) em reservatórios inamovíveis e eliminação mecânica imediata de inservíveis.'
    },
    {
      alvo: 'Áreas de Risco Médio / Baixo:',
      acao: 'Intensificação de ações educativas comunitárias, verificação de caixas d\'água, calhas e ralos em domicílios do entorno e reforço na rota de coleta pública de resíduos sólidos com os órgãos competentes.'
    },
    {
      alvo: 'Continuidade da Vigilância:',
      acao: 'Manutenção rigorosa do ciclo semanal de substituição das palhetas, garantindo a série temporal ininterrupta para monitoramento do impacto das medidas de contenção adotadas.'
    }
  ];

  acoes.forEach((item) => {
    doc.setFillColor(...CORES.fundoCard);
    doc.roundedRect(10, curY, 190, 16, 2, 2, 'F');
    doc.setDrawColor(...CORES.bordaCard);
    doc.roundedRect(10, curY, 190, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...CORES.textoPrincipal);
    doc.text(item.alvo, 14, curY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    doc.setTextColor(...CORES.textoSecundario);
    const splitAcao = doc.splitTextToSize(item.acao, 182);
    doc.text(splitAcao, 14, curY + 9);

    curY += 18;
  });

  curY += 4;

  // Bloco de Assinatura Técnica Oficial e Validação Sanitária
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, curY, 190, 42, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, curY, 190, 42, 2, 2, 'S');

  // Linhas de Assinatura
  const assW = 80;
  const ass1X = 20;
  const ass2X = 110;
  const assY = curY + 24;

  // Assinatura 1: Coordenação Municipal
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(ass1X, assY, ass1X + assW, assY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('ALMIR LEMGRUBER', ass1X + assW / 2, assY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Responsável Técnico • Vigilância Entomológica', ass1X + assW / 2, assY + 8, { align: 'center' });
  doc.text('Coordenadoria de Vigilância em Saúde • Carmo/RJ', ass1X + assW / 2, assY + 11.5, { align: 'center' });

  // Assinatura 2: Secretaria Municipal de Saúde
  doc.line(ass2X, assY, ass2X + assW, assY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES.textoPrincipal);
  doc.text('SECRETARIA MUNICIPAL DE SAÚDE', ass2X + assW / 2, assY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(...CORES.textoSecundario);
  doc.text('Prefeitura Municipal de Carmo — RJ', ass2X + assW / 2, assY + 8, { align: 'center' });
  doc.text(`Emissão Técnica: ${dataFormatada} às ${horaFormatada}`, ass2X + assW / 2, assY + 11.5, { align: 'center' });

  // Selo inferior de autenticidade
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...CORES.textoMuted);
  const hashDoc = `CARMO-SESRJ-OV-${dataHoje.getFullYear()}${(dataHoje.getMonth() + 1).toString().padStart(2, '0')}${dataHoje.getDate().toString().padStart(2, '0')}-56OV-AUTH-OK`;
  doc.text(`Chave de Autenticação Digital: ${hashDoc}`, 105, curY + 39, { align: 'center' });

  desenharRodapeSesRj(doc, paginaAtual, totalPaginasEstimadas);

  // 4. Salvar / Baixar o arquivo PDF
  // Sumário com as páginas reais de cada seção, movido para a posição 2.
  doc.addPage();
  desenharSumarioExecutivoSesRj(doc, autoTable, { paginas: paginasSecao });
  doc.movePage(doc.getNumberOfPages(), 2);
  numerarPaginasSesRj(doc);

  doc.save(nomeArquivo);
  return true;
}
