import React, { useState } from 'react';
import {
  Users, MapPin, Navigation, Calendar, Flame,
  CheckCircle2, Circle, Share2, Download,
  ZoomIn, Eye, ArrowLeft, ShieldAlert,
  FileText, Truck
} from 'lucide-react';

// DADOS OPERACIONAIS DO PLANO SEMANAL DE BLOQUEIO (56 OVITRAMPAS - CARMO/RJ)
// Acumulado Oficial das 2 Semanas: Semana A (1.017 ovos) + Semana B (2.665 ovos) = 3.682 ovos
// Efetivo: 10 ACEs 100% em Campo (Serviço interno possui equipe própria)
// Frota: 1 Carro 5 Lugares + 1 Caminhonete 2 Lugares = Máx. 7 lugares (Sem mutirão > 7 agentes)
const EQUIPES_DEFINICAO = [
  {
    id: 'equipe_1',
    nome: 'Equipe 1 (Dupla 1 • 2 ACEs)',
    efetivo: '2 ACEs de Campo',
    cor: 'border-red-300 bg-red-50 text-red-900',
    badge: 'bg-red-600 text-white',
    area: 'Seg: Barra (OV-55) • Ter: Val Paraíso (OV-31, OV-34) • Qua: Influência (OV-36, OV-51) • Qui: Porto Velho (OV-45) • Sex: Resgate Sede',
    descricao: 'Atua nos epicentros distritais e de encosta: OV-55 (125 ovos), OV-31 (192 ovos), OV-36 (222 ovos) e OV-45 (241 ovos) nas 2 semanas.'
  },
  {
    id: 'equipe_2',
    nome: 'Equipe 2 (Dupla 2 • 2 ACEs)',
    efetivo: '2 ACEs de Campo',
    cor: 'border-amber-300 bg-amber-50 text-amber-900',
    badge: 'bg-amber-600 text-white',
    area: 'Seg: Barra (OV-54, OV-56) • Ter: Jd. Centenário (OV-05) • Qua: Influência BR-116 (OV-38) • Qui: Porto Velho (OV-44) • Sex: Resgate Sede',
    descricao: 'Cobre Barra de São Francisco (OV-54: 74 e OV-56: 69 ovos), Jardim Centenário (OV-05: 173 ovos), BR-116 em Influência (OV-38: 210 ovos) e ESF Porto Velho (OV-44: 102 ovos).'
  },
  {
    id: 'equipe_3',
    nome: 'Equipe 3 (Dupla 3 • 2 ACEs)',
    efetivo: '2 ACEs de Campo',
    cor: 'border-orange-300 bg-orange-50 text-orange-900',
    badge: 'bg-orange-600 text-white',
    area: 'Seg: Progresso (OV-23) • Ter: Caixa d\'Água (OV-35, OV-13) • Qua: Usina Light (OV-41, OV-40) • Qui: Prata (OV-48, OV-49) • Sex: Resgate Sede',
    descricao: 'Lidera o bloqueio no maior foco municipal (OV-23 Pousada Valle do Sol: 342 ovos), Caixa d\'Água (OV-35: 121 e OV-13: 71 ovos), Light (OV-41: 203 e OV-40: 66 ovos) e Prata (OV-48: 121 e OV-49: 62 ovos).'
  },
  {
    id: 'equipe_4',
    nome: 'Equipe 4 (Dupla 4 • 2 ACEs)',
    efetivo: '2 ACEs de Campo',
    cor: 'border-blue-300 bg-blue-50 text-blue-900',
    badge: 'bg-blue-600 text-white',
    area: 'Seg: Centro (OV-10) • Ter: Morro do Estado (OV-28) • Qua: Resgate Progresso/Centenário • Qui: Jd. Centenário (OV-03, OV-04) • Sex: Resgate Distritos',
    descricao: 'Bloqueio pesado no Centro (OV-10: 242 ovos), Morro do Estado (OV-28: 95 ovos), varredura complementar em Jd. Centenário (OV-03: 53 e OV-04: 53 ovos) e resgate distrital na sexta.'
  },
  {
    id: 'equipe_5',
    nome: 'Equipe 5 (Dupla 5 • 2 ACEs)',
    efetivo: '2 ACEs de Campo',
    cor: 'border-purple-300 bg-purple-50 text-purple-900',
    badge: 'bg-purple-600 text-white',
    area: 'Seg: Progresso (OV-21) • Ter: Botafogo/Centro (OV-16, OV-12) • Qua: Boa Ideia (OV-08, OV-15) • Qui: Revisão Caixa d\'Água/Botafogo • Sex: Resgate Distritos',
    descricao: 'Cobre Progresso (OV-21: 100 ovos), Botafogo (OV-16: 89 ovos), Ladeira João Alfredo (OV-12: 84 ovos), Boa Ideia (OV-08: 93 e OV-15: 78 ovos) e resgate distrital na sexta.'
  }
];

const METODOLOGIA_RAIOS = [
  {
    raio: '100m / 200m',
    nivel: 'Crítico Máximo (≥150 ovos nas 2 sem.)',
    cor: 'bg-red-600 text-white',
    borda: 'border-red-400 bg-red-50 text-red-950',
    acoes: 'Núcleo Focal 100m + Perímetro Oficial MS 200m (até 9 quarteirões). Varredura 100% em ralos, caixas d\'água, calhas e piscinas.'
  },
  {
    raio: '80m / 200m',
    nivel: 'Alerta Alto (100 a 149 ovos nas 2 sem.)',
    cor: 'bg-amber-600 text-white',
    borda: 'border-amber-400 bg-amber-50 text-amber-950',
    acoes: 'Vistoria em todas as residências do quarteirão da armadilha e faces confrontantes no raio de 80m a 200m. Foco em tonéis e calhas.'
  },
  {
    raio: '50m / 200m',
    nivel: 'Risco Médio (50 a 99 ovos nas 2 sem.)',
    cor: 'bg-emerald-600 text-white',
    borda: 'border-emerald-400 bg-emerald-50 text-emerald-950',
    acoes: 'Inspeção no imóvel foco e nos vizinhos laterais/frontais (6 a 8 imóveis no núcleo + quarteirão). Remoção mecânica e larvicida.'
  },
  {
    raio: '30m / Vigilância',
    nivel: 'Vigilância (<50 ovos nas 2 sem.)',
    cor: 'bg-slate-600 text-white',
    borda: 'border-slate-300 bg-slate-50 text-slate-800',
    acoes: 'Ação preventiva no imóvel parceiro e nos vizinhos imediatos para impedir formação de novos focos.'
  }
];

const CRONOGRAMA_DIARIO = {
  segunda: {
    diaNome: 'Segunda-Feira',
    pdfDia: '/PLANO_DE_CAMPO_SEGUNDA_FEIRA.pdf',
    subtitulo: 'Horário Corrido 08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo (5 Duplas) • Carro 5L (4 ACEs na Barra) + 6 ACEs na Sede (Apoio Caminhonete 2L)',
    destaque: 'Carmo Sede (Progresso e Centro) + Barra de São Francisco (08h00 às 13h00)',
    alvos: [
      {
        id: 'OV-23',
        equipe: 'Equipe 3 (2 ACEs na Sede • Apoio Caminhonete 2L)',
        bairro: 'Progresso',
        quarteirao: 'Q-01',
        morador: 'Pousada Valle do sol',
        endereco: 'Rua Manoel José de Moraes, 51',
        ovos: 342,
        ovosSem1: 147,
        ovosSem2: 195,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Pousada + Quarteirão Completo: Vistoriar a pousada e 6 a 8 casas vizinhas para cada lado, frente e fundos (R. José Cassane).',
        lat: -21.9279386,
        lng: -42.6166018,
        acoes: 'Todo o Q-01 e início da Rua José Cassane. Inspecionar ralos externos, piscinas desativadas, reservatórios de chuva e bebedouros.',
        focos: ['Piscinas desativadas', 'Ralos de quintal', 'Reservatórios de chuva', 'Bebedouros de animais']
      },
      {
        id: 'OV-10',
        equipe: 'Equipe 4 (2 ACEs na Sede • Centro a pé)',
        bairro: 'Centro',
        quarteirao: 'Q-13',
        morador: 'Clea Suely',
        endereco: 'Rua Oscar de Souza Curty, 42',
        ovos: 242,
        ovosSem1: 41,
        ovosSem2: 201,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Imóvel-Foco + Quarteirão Comercial: Vistoriar entre a Oscar Curty e Celso C. Faria (calhas prediais, marquises e lajes).',
        lat: -21.9327654,
        lng: -42.6111087,
        acoes: 'Trecho entre Rua Oscar Curty e encontro com Celso C. Faria. Foco em calhas prediais, marquises comerciais e lajes com água empoçada.',
        focos: ['Calhas prediais', 'Marquises comerciais', 'Lajes com empoçamento', 'Pratos de plantas']
      },
      {
        id: 'OV-21',
        equipe: 'Equipe 5 (2 ACEs na Sede • Progresso a pé)',
        bairro: 'Progresso',
        quarteirao: 'Q-09',
        morador: 'Paula Miranda',
        endereco: 'Rua Silvio Geraldo França, 753',
        ovos: 100,
        ovosSem1: 100,
        ovosSem2: 0,
        raio: '80m / 200m MS',
        raioCor: 'bg-amber-600',
        raioPratico: 'Imóvel-Foco + Vizinhos da Rua: Vistoriar a casa da Paula Miranda e cerca de 4 a 6 casas para cada lado (nº 700 ao 800).',
        lat: -21.9262243,
        lng: -42.6149979,
        acoes: 'Rua Silvio Geraldo França (nº 700 a 800). Varrer fundos de vale, entulhos de obras e tambores no nível do solo.',
        focos: ['Fundos de vale', 'Entulho de construção', 'Tambores no solo', 'Baldes de quintal']
      },
      {
        id: 'OV-55',
        equipe: 'Equipe 1 (2 ACEs na Barra • Carro 5 Lugares)',
        bairro: 'Barra de São Francisco',
        quarteirao: 'Q-01',
        morador: 'Solange',
        endereco: 'Rua Antônio R. Serafim, S/N',
        ovos: 125,
        ovosSem1: 5,
        ovosSem2: 120,
        raio: '80m / 200m MS',
        raioCor: 'bg-amber-600',
        raioPratico: 'Quintais Rurais da Barra: Vistoriar a Rua Antônio R. Serafim e propriedades confrontantes.',
        lat: -21.9716954,
        lng: -42.6928679,
        acoes: 'Rua Antônio R. Serafim. Bebedouros de animais de porte rural, tambores de 200L e recipientes em quintais amplos.',
        focos: ['Bebedouros de animais', 'Tambores rurais 200L', 'Pneus de maquinário', 'Caixas no solo']
      },
      {
        id: 'OV-54',
        equipe: 'Equipe 2 (2 ACEs na Barra • Carro 5 Lugares)',
        bairro: 'Barra de São Francisco',
        quarteirao: 'Q-01',
        morador: 'Sebastião Ferreira',
        endereco: 'Rua Sebastião F. da Costa, 389',
        ovos: 74,
        ovosSem1: 13,
        ovosSem2: 61,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Eixo Sebastião F. da Costa (parte alta): Vistoriar o nº 389 e vizinhos laterais/frontais.',
        lat: -21.9660768,
        lng: -42.6886252,
        acoes: 'Vistoria completa nos quintais, tonéis de captação de chuva e depósitos agrícolas na Rua Sebastião F. da Costa.',
        focos: ['Tonéis de chuva', 'Galinheiros e bebedouros', 'Garrafas e latas', 'Calhas']
      },
      {
        id: 'OV-56',
        equipe: 'Equipe 2 (2 ACEs na Barra • Carro 5 Lugares)',
        bairro: 'Barra de São Francisco',
        quarteirao: 'Q-01',
        morador: 'Escola da Barra',
        endereco: 'Rua Sebastião F. da Costa, 10',
        ovos: 69,
        ovosSem1: 3,
        ovosSem2: 66,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Entorno da Escola da Barra: Vistoriar o prédio escolar e residências vizinhas no Q-01.',
        lat: -21.9675433,
        lng: -42.6898283,
        acoes: 'Inspeção de calhas escolares, ralos pluviais, caixas d\'água e residências confrontantes.',
        focos: ['Calhas da escola', 'Ralos externos', 'Caixas d\'água', 'Pátio externo']
      }
    ]
  },
  terca: {
    diaNome: 'Terça-Feira',
    pdfDia: '/PLANO_DE_CAMPO_TERCA_FEIRA.pdf',
    subtitulo: 'Horário Corrido 08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo (5 Duplas a pé na Sede) • Apoio Caminhonete 2L',
    destaque: 'Sede Urbana: Val Paraíso, Jd. Centenário, Caixa d\'Água, Morro do Estado e Botafogo (08h00 às 13h00)',
    alvos: [
      {
        id: 'OV-31',
        equipe: 'Equipe 1 (2 ACEs • Val Paraíso)',
        bairro: 'Val Paraíso',
        quarteirao: 'Q-05',
        morador: 'Rosimeri',
        endereco: 'Rua Roberto Simões de Araújo, 98',
        ovos: 192,
        ovosSem1: 51,
        ovosSem2: 141,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Encosta de Val Paraíso: Vistoriar a Rua Roberto Simões e Rua Emanuel de Moraes (quintais inclinados).',
        lat: -21.9427123,
        lng: -42.6125015,
        acoes: 'Rua Roberto Simões e Emanuel de Moraes. Foco em caixas d\'água destampadas, tonéis de chuva e lavanderias.',
        focos: ['Caixas d\'água sem tampa', 'Tonéis de chuva', 'Potes de animais', 'Ralos sem tela']
      },
      {
        id: 'OV-05',
        equipe: 'Equipe 2 (2 ACEs • Jardim Centenário)',
        bairro: 'Jardim Centenário',
        quarteirao: 'Q-17',
        morador: 'Manoel Ezidio',
        endereco: 'Rua Ernesto Wermelinger, 63',
        ovos: 173,
        ovosSem1: 6,
        ovosSem2: 167,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Quarteirão Q-17 Completo: Vistoriar a residência e vizinhos no encontro com a Celso Carrilho Faria.',
        lat: -21.9283241,
        lng: -42.6057119,
        acoes: 'Rua Ernesto Wermelinger e encontro com Celso Carrilho Faria. Tambores de lavanderia, bromélias e pratos de vasos.',
        focos: ['Tambores de lavar roupa', 'Bromélias em jardins', 'Pratos de vasos', 'Caixas d\'água']
      },
      {
        id: 'OV-35',
        equipe: 'Equipe 3 (2 ACEs • Caixa d\'Água com Apoio Caminhonete 2L)',
        bairro: 'Caixa d\'Água',
        quarteirao: 'Q-13',
        morador: 'Almir Lemgruber',
        endereco: 'Rua Senador Dantas, 269',
        ovos: 121,
        ovosSem1: 4,
        ovosSem2: 117,
        raio: '80m / 200m MS',
        raioCor: 'bg-amber-600',
        raioPratico: 'Parte Alta da Senador Dantas: Vistoriar o nº 269, terrenos baldios e calhas altas com escada da caminhonete.',
        lat: -21.9350995,
        lng: -42.6062633,
        acoes: 'Rua Senador Dantas (trecho superior). Terrenos baldios com descarte de inservíveis e calhas obstruídas.',
        focos: ['Terrenos baldios', 'Calhas obstruídas', 'Garrafas viradas para cima', 'Pneus']
      },
      {
        id: 'OV-28',
        equipe: 'Equipe 4 (2 ACEs • Morro do Estado)',
        bairro: 'Morro do Estado',
        quarteirao: 'Q-05',
        morador: 'Vicente',
        endereco: 'Rua Adalberto Pires da Silva, 235',
        ovos: 95,
        ovosSem1: 86,
        ovosSem2: 9,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Morro do Estado Q-05: Vistoriar a Rua Adalberto Pires da Silva (nº 200 a 280) e encosta adjacente.',
        lat: -21.9423531,
        lng: -42.6088396,
        acoes: 'Vistoria de manutenção e bloqueio de focos persistentes da Semana A no Morro do Estado.',
        focos: ['Caixas d\'água em lajes', 'Tambores de encosta', 'Baldes e bacias', 'Entulhos']
      },
      {
        id: 'OV-16',
        equipe: 'Equipe 5 (2 ACEs • Botafogo e Ladeira do Centro)',
        bairro: 'Botafogo',
        quarteirao: 'Q-10',
        morador: 'Selma Araújo',
        endereco: 'Rua Soares Brandão, 347',
        ovos: 89,
        ovosSem1: 0,
        ovosSem2: 89,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Foco Explosivo em Botafogo: Saltou de 0 para 89 ovos na Semana B. Varrer o Q-10 na Rua Soares Brandão.',
        lat: -21.9372323,
        lng: -42.6056147,
        acoes: 'Bloqueio imediato na Rua Soares Brandão (Q-10) para eliminar o criadouro recém-ativado na Semana B.',
        focos: ['Tonéis destampados', 'Ralos externos', 'Pratos de plantas', 'Calhas']
      },
      {
        id: 'OV-12',
        equipe: 'Equipe 5 (2 ACEs • Botafogo e Ladeira do Centro)',
        bairro: 'Centro',
        quarteirao: 'Q-10',
        morador: 'José Carlos enfermeiro',
        endereco: 'Ladeira João Alfredo, 40',
        ovos: 84,
        ovosSem1: 64,
        ovosSem2: 20,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Ladeira João Alfredo: Vistoriar o nº 40 e imóveis lindeiros na subida da ladeira.',
        lat: -21.9335936,
        lng: -42.6077504,
        acoes: 'Inspeção de calhas, muros de contenção, ralos pluviais e reservatórios domésticos.',
        focos: ['Calhas e marquises', 'Ralos de quintal', 'Vasos e bromélias', 'Caixas d\'água']
      },
      {
        id: 'OV-13',
        equipe: 'Equipe 3 (2 ACEs • Caixa d\'Água com Apoio Caminhonete 2L)',
        bairro: 'Caixa d\'Água',
        quarteirao: 'Q-16',
        morador: 'Lucia Glória',
        endereco: 'Rua Ulisses Lengruber, 618',
        ovos: 71,
        ovosSem1: 48,
        ovosSem2: 23,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Rua Ulisses Lengruber: Vistoriar o nº 618 e vizinhos imediatos do Q-16 na Caixa d\'Água.',
        lat: -21.9334224,
        lng: -42.6043283,
        acoes: 'Positiva nas duas semanas (48 + 23 = 71 ovos). Eliminar criadouros fixos em quintais e lavanderias.',
        focos: ['Tanques e tambores', 'Caixas d\'água no solo', 'Garrafas', 'Ralos']
      },
      {
        id: 'OV-34',
        equipe: 'Equipe 1 (2 ACEs • Val Paraíso)',
        bairro: 'Val Paraíso',
        quarteirao: 'Q-05',
        morador: 'Delvania',
        endereco: 'Avenida Edgar Gismonti, 98',
        ovos: 66,
        ovosSem1: 0,
        ovosSem2: 66,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Av. Edgar Gismonti: Novo foco na Semana B (66 ovos). Vistoriar o nº 98 e quarteirão Q-05.',
        lat: -21.9393970,
        lng: -42.6099252,
        acoes: 'Varredura integrada com a OV-31 no Q-05 de Val Paraíso.',
        focos: ['Reservatórios no solo', 'Piscinas plásticas', 'Calhas', 'Pratos de vasos']
      }
    ]
  },
  quarta: {
    diaNome: 'Quarta-Feira',
    pdfDia: '/PLANO_DE_CAMPO_QUARTA_FEIRA.pdf',
    subtitulo: 'Horário Corrido 08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo • 6 ACEs nas Viaturas (Carro 5L + Caminhonete 2L) + 4 ACEs a pé na Sede',
    destaque: 'Influência (2º Dist.) + Usina Light / Ilha dos Pombos (3º Dist.) + Campo Sede (08h00 às 13h00)',
    alvos: [
      {
        id: 'OV-36',
        equipe: 'Equipe 1 (2 ACEs • Viatura em Influência)',
        bairro: 'Influência',
        quarteirao: 'Q-05',
        morador: 'Silvana de Oliveira',
        endereco: 'Rua Manoel Cirilo da Silva, 116',
        ovos: 222,
        ovosSem1: 53,
        ovosSem2: 169,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Extensão da R. Manoel Cirilo (Q-05): Vistoriar quintais rurais, pneus agrícolas e tonéis de horta.',
        lat: -21.8758627,
        lng: -42.6660048,
        acoes: 'Extensão completa da Rua Manoel Cirilo (Q-05) em Influência. Pneus velhos, tonéis de uso agrícola e galinheiros.',
        focos: ['Pneus velhos', 'Tonéis agrícolas', 'Baldes de horta', 'Caixas d\'água baixas']
      },
      {
        id: 'OV-38',
        equipe: 'Equipe 2 (2 ACEs • Viatura em Influência / BR-116)',
        bairro: 'Influência',
        quarteirao: 'Q-06',
        morador: 'Independente',
        endereco: 'Rodovia BR-116, S/N',
        ovos: 210,
        ovosSem1: 25,
        ovosSem2: 185,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Margens da BR-116: Borracharias, oficinas mecânicas, carcaças de veículos e galpões.',
        lat: -21.8770524,
        lng: -42.6694291,
        acoes: 'Margens da Rodovia BR-116 em Influência. Vistoria intensiva em borracharias, oficinas, sucatas e pátios.',
        focos: ['Borracharias', 'Oficinas mecânicas', 'Carcaças de veículos', 'Galpões abertos']
      },
      {
        id: 'OV-51',
        equipe: 'Equipe 1 (2 ACEs • Viatura em Influência)',
        bairro: 'Influência',
        quarteirao: 'Q-11',
        morador: 'Aline Reiff',
        endereco: 'Rua Maria da Silva Machareth, 182',
        ovos: 109,
        ovosSem1: 3,
        ovosSem2: 106,
        raio: '80m / 200m MS',
        raioCor: 'bg-amber-600',
        raioPratico: 'R. Maria da Silva Machareth: Casas vizinhas, tonéis de captação de chuva e caixas d\'água baixas.',
        lat: -21.8733495,
        lng: -42.6616928,
        acoes: 'Rua Maria da Silva Machareth (Q-11). Tambores de captação de água de chuva e recipientes sombreados.',
        focos: ['Captação de água de chuva', 'Tanques sem vedação', 'Bacias de animais', 'Calhas']
      },
      {
        id: 'OV-41',
        equipe: 'Equipe 3 (2 ACEs • Viatura na Usina Light / Ilha dos Pombos)',
        bairro: 'Ilha dos Pombos (Light)',
        quarteirao: 'Q-01',
        morador: 'Dayse Regina Lopes',
        endereco: 'Rua Beira Rio, 130',
        ovos: 203,
        ovosSem1: 40,
        ovosSem2: 163,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Orla Ribeirinha da Light: Toda a extensão da Rua Beira Rio (canoas, embarcações e lonas de pesca).',
        lat: -21.8406223,
        lng: -42.5806883,
        acoes: 'Ao longo da orla do rio na Rua Beira Rio. Canoas com água de chuva, lonas plásticas e depósitos de pesca.',
        focos: ['Canoas com água de chuva', 'Lonas plásticas dobradas', 'Tambores', 'Tranqueiras de pesca']
      },
      {
        id: 'OV-40',
        equipe: 'Equipe 3 (2 ACEs • Viatura na Usina Light / Ilha dos Pombos)',
        bairro: 'Ilha dos Pombos (Light)',
        quarteirao: 'Q-03',
        morador: 'Meira Lúcia Ferreira Pinheiro',
        endereco: 'Rua Antônio Carlos P. Cabral, 34',
        ovos: 66,
        ovosSem1: 20,
        ovosSem2: 46,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Vila da Light (Q-03): Vistoriar o nº 34 e residências do entorno arborizado da Usina Light.',
        lat: -21.8415155,
        lng: -42.5769629,
        acoes: 'Inspeção de calhas, bromélias, ralos externos e caixas d\'água na Vila da Light.',
        focos: ['Calhas com folhas', 'Bromélias e jardins', 'Ralos pluviais', 'Caixas d\'água']
      },
      {
        id: 'OV-08',
        equipe: 'Equipe 5 (2 ACEs a pé na Sede) + Equipe 4 (2 ACEs: Resgate Progresso/Centenário)',
        bairro: 'Boa Ideia',
        quarteirao: 'Q-09',
        morador: 'ESF Botafogo',
        endereco: 'Rua Armando Chaves, 161',
        ovos: 93,
        ovosSem1: 64,
        ovosSem2: 29,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Entorno da ESF Botafogo / Boa Ideia: Vistoriar a Rua Armando Chaves e quarteirão Q-09 a pé.',
        lat: -21.9399999,
        lng: -42.6035886,
        acoes: 'Enquanto 6 ACEs estão nas viaturas em Influência e Light, os 4 ACEs da Sede cobrem Boa Ideia (OV-08 e OV-15) e resgatam imóveis fechados do Progresso/Centenário.',
        focos: ['Calhas do posto e vizinhos', 'Tambores domésticos', 'Pratos de plantas', 'Imóveis fechados']
      },
      {
        id: 'OV-15',
        equipe: 'Equipe 5 (2 ACEs a pé na Sede) + Equipe 4 (2 ACEs: Resgate Progresso/Centenário)',
        bairro: 'Boa Ideia',
        quarteirao: 'Q-15',
        morador: 'Maria das Dores Meneguiti',
        endereco: 'Rua Jorge R. do Valle, 290',
        ovos: 78,
        ovosSem1: 78,
        ovosSem2: 0,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Rua Jorge R. do Valle (Q-15): Vistoriar o nº 290 e vizinhos para consolidar o zeramento da Semana B.',
        lat: -21.9430886,
        lng: -42.6035061,
        acoes: 'Revisão fina no Q-15 de Boa Ideia e retorno a imóveis pendentes no Centro.',
        focos: ['Caixas d\'água', 'Lavanderias externas', 'Ralos', 'Vasilhames no quintal']
      }
    ]
  },
  quinta: {
    diaNome: 'Quinta-Feira',
    pdfDia: '/PLANO_DE_CAMPO_QUINTA_FEIRA.pdf',
    subtitulo: 'Horário Corrido 08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo • 6 ACEs nas Viaturas (Carro 5L + Caminhonete 2L) + 4 ACEs a pé na Sede',
    destaque: 'Porto Velho do Cunha (3º Dist.) + Córrego da Prata (4º Dist.) + Campo Sede (08h00 às 13h00)',
    alvos: [
      {
        id: 'OV-45',
        equipe: 'Equipe 1 (2 ACEs • Viatura em Porto Velho do Cunha)',
        bairro: 'Porto Velho do Cunha',
        quarteirao: 'Q-01',
        morador: 'Lindomar Noronha',
        endereco: 'Rua Major Fajardo, 601',
        ovos: 241,
        ovosSem1: 35,
        ovosSem2: 206,
        raio: '100m / 200m MS',
        raioCor: 'bg-red-600',
        raioPratico: 'Imóvel-Foco + Trecho Beira-Rio: Rua Major Fajardo (altura nº 550 ao 650) e faixa ribeirinha.',
        lat: -21.8238244,
        lng: -42.5454317,
        acoes: 'Rua Major Fajardo (nº 550 ao 650). Caçambas, carretas com água parada, recipientes plásticos e quintais na beira do rio.',
        focos: ['Carretas e caçambas', 'Recipientes plásticos', 'Fundos de quintal ribeirinho', 'Tambores']
      },
      {
        id: 'OV-44',
        equipe: 'Equipe 2 (2 ACEs • Viatura em Porto Velho do Cunha)',
        bairro: 'Porto Velho do Cunha',
        quarteirao: 'Q-10',
        morador: 'ESF Porto Velho',
        endereco: 'Rua Major Fajardo, 312',
        ovos: 102,
        ovosSem1: 2,
        ovosSem2: 100,
        raio: '80m / 200m MS',
        raioCor: 'bg-amber-600',
        raioPratico: 'Entorno da ESF Porto Velho: Rua Major Fajardo (nº 280 ao 350 ao redor do Posto de Saúde).',
        lat: -21.8248591,
        lng: -42.5481501,
        acoes: 'Rua Major Fajardo (entorno da ESF Porto Velho). Calhas prediais, caixas d\'água sem tampa e garrafas retornáveis.',
        focos: ['Entorno do Posto de Saúde', 'Calhas prediais', 'Caixas d\'água', 'Garrafas']
      },
      {
        id: 'OV-48',
        equipe: 'Equipe 3 (2 ACEs • Viatura em Córrego da Prata)',
        bairro: 'Córrego da Prata',
        quarteirao: 'Q-01',
        morador: 'ESF Córrego da Prata',
        endereco: 'Rua Benfica, 48',
        ovos: 121,
        ovosSem1: 7,
        ovosSem2: 114,
        raio: '80m / 200m MS',
        raioCor: 'bg-amber-600',
        raioPratico: 'Entorno da ESF Prata: Rua Benfica e caixas d\'água no nível do solo em Córrego da Prata.',
        lat: -21.8645750,
        lng: -42.4863877,
        acoes: 'Rua Benfica e entorno do posto de saúde em Córrego da Prata. Calhas de telhado, descartáveis e caixas no solo.',
        focos: ['Caixas d\'água no solo', 'Calhas obstruídas', 'Descarte de embalagens', 'Tonéis']
      },
      {
        id: 'OV-49',
        equipe: 'Equipe 3 (2 ACEs • Viatura em Córrego da Prata)',
        bairro: 'Córrego da Prata',
        quarteirao: 'Q-01',
        morador: 'Rosilene Souza Ferreira',
        endereco: 'Rua Alfredo Ferreira, S/N',
        ovos: 62,
        ovosSem1: 2,
        ovosSem2: 60,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'R. Alfredo Ferreira em Córrego da Prata: Vistoriar o imóvel foco e propriedades vizinhas.',
        lat: -21.8632567,
        lng: -42.4828514,
        acoes: 'Complementa o bloqueio de Córrego da Prata no mesmo deslocamento de quinta-feira junto com Porto Velho.',
        focos: ['Bebedouros rurais', 'Tambores de horta', 'Pneus', 'Caixas d\'água']
      },
      {
        id: 'OV-03',
        equipe: 'Equipe 4 (2 ACEs a pé na Sede) + Equipe 5 (2 ACEs: Caixa d\'Água/Botafogo)',
        bairro: 'Jardim Centenário',
        quarteirao: 'Q-09',
        morador: 'Samy Soares',
        endereco: 'Rua Carolina França, 30',
        ovos: 53,
        ovosSem1: 5,
        ovosSem2: 48,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Rua Carolina França (Q-09): Varredura a pé nas encostas do Jardim Centenário.',
        lat: -21.9255506,
        lng: -42.6095299,
        acoes: 'Enquanto 6 ACEs cobrem Porto Velho e Prata nas 2 viaturas, 4 ACEs permanecem em campo na Sede varrendo OV-03, OV-04 e Caixa d\'Água/Botafogo.',
        focos: ['Vasos e pratinhos', 'Tonéis de água', 'Calhas', 'Ralos externos']
      },
      {
        id: 'OV-04',
        equipe: 'Equipe 4 (2 ACEs a pé na Sede) + Equipe 5 (2 ACEs: Caixa d\'Água/Botafogo)',
        bairro: 'Jardim Centenário',
        quarteirao: 'Q-11',
        morador: 'PA',
        endereco: 'Rua Alceu Mattos, 99',
        ovos: 53,
        ovosSem1: 16,
        ovosSem2: 37,
        raio: '50m / 200m MS',
        raioCor: 'bg-emerald-600',
        raioPratico: 'Rua Alceu Mattos (Q-11): Vistoriar entorno do PA e residências confrontantes.',
        lat: -21.9295794,
        lng: -42.6090547,
        acoes: 'Bloqueio complementar no Jardim Centenário (positiva nas duas semanas: 16 + 37 = 53 ovos).',
        focos: ['Calhas prediais', 'Caixas d\'água', 'Ralos pluviais', 'Descartáveis']
      }
    ]
  },
  sexta: {
    diaNome: 'Sexta-Feira',
    pdfDia: '/PLANO_DE_CAMPO_SEXTA_FEIRA.pdf',
    subtitulo: '08h00 às 12h00: 10 ACEs em Campo (3 Duplas Sede + 2 Duplas Distritos) • 12h00 às 13h00: Reunião Geral no P.A. (Ponto de Apoio)',
    destaque: '08h00 às 12h00: Resgate de Fechados (Sede e Distritos) + 12h00 às 13h00: Reunião no P.A.',
    alvos: [
      {
        id: 'OV-23',
        equipe: 'Equipes 1, 2 e 3 (6 ACEs na Sede das 08h00 às 12h00)',
        bairro: 'Progresso (Sede)',
        quarteirao: 'Q-01',
        morador: 'Pousada Valle do sol (Resgate)',
        endereco: 'Rua Manoel José de Moraes, 51',
        ovos: 342,
        ovosSem1: 147,
        ovosSem2: 195,
        raio: 'Resgate 100m/200m',
        raioCor: 'bg-red-600',
        raioPratico: '08h00 às 12h00 (Saída do P.A. às 08h00): Retorno obrigatório às casas fechadas no Progresso (OV-23) e Centro (OV-10: 242 ovos).',
        lat: -21.9279386,
        lng: -42.6166018,
        acoes: 'Reabertura e vistoria de 100% dos imóveis pendentes da segunda-feira nos dois maiores focos urbanos. Às 12h00: Retorno ao P.A. (Ponto de Apoio).',
        focos: ['Imóveis fechados na 2ª feira', 'Casas de veraneio/pousada', 'Terrenos murados', 'Lajes e piscinas']
      },
      {
        id: 'OV-31',
        equipe: 'Equipes 1, 2 e 3 (6 ACEs na Sede das 08h00 às 12h00)',
        bairro: 'Val Paraíso & Jd. Centenário (Sede)',
        quarteirao: 'Q-05 / Q-17',
        morador: 'Rosimeri / Manoel Ezidio (Resgate)',
        endereco: 'R. Roberto Simões, 98 e R. Ernesto Wermelinger, 63',
        ovos: 192,
        ovosSem1: 51,
        ovosSem2: 141,
        raio: 'Resgate 100m/200m',
        raioCor: 'bg-red-600',
        raioPratico: '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate de fechados em Val Paraíso (OV-31: 192 ovos), Jd. Centenário (OV-05: 173 ovos) e Caixa d\'Água (OV-35: 121 ovos).',
        lat: -21.9427123,
        lng: -42.6125015,
        acoes: 'Garantir cobertura integral dos quarteirões de encosta trabalhados na terça-feira. Às 12h00: Retorno ao P.A. (Ponto de Apoio).',
        focos: ['Imóveis fechados na 3ª feira', 'Caixas d\'água sem vedação', 'Tonéis de chuva', 'Calhas']
      },
      {
        id: 'OV-36',
        equipe: 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00)',
        bairro: 'Influência e Usina Light (Distritos)',
        quarteirao: 'Q-05 / Q-01',
        morador: 'Resgate Distrital Eixo Sul/Oeste',
        endereco: 'R. Manoel Cirilo, 116 (Influência) e R. Beira Rio, 130 (Light)',
        ovos: 222,
        ovosSem1: 53,
        ovosSem2: 169,
        raio: 'Resgate Distrital',
        raioCor: 'bg-amber-600',
        raioPratico: '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate motorizado de pendentes em Influência (OV-36: 222, OV-38: 210, OV-51: 109) e Light (OV-41: 203).',
        lat: -21.8758627,
        lng: -42.6660048,
        acoes: 'Vistoria final nos imóveis rurais, borracharias e propriedades ribeirinhas que estavam fechadas na quarta-feira.',
        focos: ['Sítios e galpões fechados', 'Borracharias da BR-116', 'Embarcações na Light', 'Tonéis']
      },
      {
        id: 'OV-45',
        equipe: 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00 • 12h00 às 13h00 Reunião no P.A.)',
        bairro: 'Porto Velho, Prata e Barra (Distritos)',
        quarteirao: 'Q-01',
        morador: 'Resgate Distrital + Reunião 12h00 no P.A.',
        endereco: 'R. Major Fajardo, 601 (Porto Velho) / R. Benfica, 48 (Prata)',
        ovos: 241,
        ovosSem1: 35,
        ovosSem2: 206,
        raio: 'Resgate + 12h P.A.',
        raioCor: 'bg-blue-600',
        raioPratico: '08h00 às 12h00 em campo nos distritos (OV-45: 241, OV-55: 125, OV-48: 121). Das 12h00 às 13h00: Reunião Geral de Avaliação e Fechamento com os 10 ACEs no P.A. (Ponto de Apoio).',
        lat: -21.8238244,
        lng: -42.5454317,
        acoes: 'Fechamento de pendências distritais até 12h00 e retorno ao P.A. (Ponto de Apoio) para a Reunião Semanal das 12h00 às 13h00 (entrega de boletins à equipe interna).',
        focos: ['Imóveis pendentes nos distritos', 'Entrega de fichas às 12h00 no P.A.', 'Avaliação semanal no P.A. (12h às 13h)']
      }
    ]
  }
};

const ROTEIRO_5_PASSOS = [
  {
    passo: '1. Abordagem Padronizada',
    texto: '"Bom dia! A equipe da Saúde detectou alta proliferação do mosquito da Dengue nesta rua nas duas últimas semanas de monitoramento. Viemos vistoriar seu quintal para eliminar os focos antes que as pessoas adoeçam."'
  },
  {
    passo: '2. Varredura do Chão',
    texto: 'Pratos de plantas, garrafas viradas para cima, potes de água de animais, baldes esquecidos e ralos de quintal.'
  },
  {
    passo: '3. Varredura de Meia Altura',
    texto: 'Tanques de lavar roupa, tonéis de captação de chuva (exigir tampa hermética ou tela), torneiras com vazamento contínuo.'
  },
  {
    passo: '4. Varredura do Alto',
    texto: 'Verificar vedação da tampa da caixa d\'água e calhas entupidas por folhas que acumulam água da chuva.'
  },
  {
    passo: '5. Ação Física Imediata',
    texto: 'Eliminar na hora. Não deixar água parada. Furar, virar de cabeça para baixo ou descartar no lixo imediatamente.'
  }
];

export function PlanoAcaoAgentesScreen({ onVoltar, onAbrirMapa, onAbrirAcaoFoco }) {
  const [diaSelecionado, setDiaSelecionado] = useState('segunda');
  const [modalMapa, setModalMapa] = useState(null); // 'sede' | 'distritos' | null
  const [checklist, setChecklist] = useState(() => {
    try {
      const salvo = localStorage.getItem('ovitrampa_checklist_plano');
      return salvo ? JSON.parse(salvo) : {};
    } catch (_) {
      return {};
    }
  });

  const toggleCheckItem = (idAlvo, indexItem) => {
    setChecklist((prev) => {
      const key = `${idAlvo}_${indexItem}`;
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('ovitrampa_checklist_plano', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const dadosDia = CRONOGRAMA_DIARIO[diaSelecionado];

  // Compartilhar no WhatsApp
  const handleCompartilharWhatsApp = () => {
    const urlPlano = typeof window !== 'undefined' ? `${window.location.origin}/plano` : 'https://gps-ovitrampas-demo.pages.dev/plano';
    const texto = [
      '🚨 *PLANO DE AÇÃO SEMANAL (2 SEMANAS: SEM A + SEM B) - OVITRAMPAS CARMO/RJ*',
      '🎯 *10 ACEs 100% em Campo • Horário Corrido 08h00 às 13h00 (Saída do P.A.)*',
      '',
      `📅 *Dia em Destaque: ${dadosDia.diaNome}*`,
      `📍 *Território:* ${dadosDia.destaque}`,
      `👥 *Escala:* ${dadosDia.subtitulo}`,
      '',
      '📌 *Armadilhas Críticas a Bloquear (Soma das 2 Semanas):*',
      ...dadosDia.alvos.map((a) => `• ${a.id} (${a.bairro}): ${a.ovos} ovos (Sem A: ${a.ovosSem1} + Sem B: ${a.ovosSem2}) ➔ ${a.equipe}`),
      '',
      '📲 *Acesse o plano completo e o App de Campo no celular:*',
      urlPlano
    ].join('\n');

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Abrir GPS no Google Maps
  const handleAbrirGps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full h-full min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between overflow-y-auto font-sans select-none pb-12">
      
      {/* 1. CABEÇALHO OFICIAL DO PLANO */}
      <header className="bg-white border-b border-slate-200/90 shadow-xs px-3 sm:px-6 py-4 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            {onVoltar && (
              <button
                type="button"
                onClick={onVoltar}
                className="p-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-2xl border border-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                title="Voltar ao Guia"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-200 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-600" /> 2 Semanas (A+B): 3.682 Ovos
                </span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  10 ACEs em Campo • 08h00 às 13h00 (P.A.)
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                Plano Semanal de Bloqueio Vetorial
              </h1>
              <p className="text-xs text-slate-500">
                Consolidado Semana 1 (1.017) + Semana 2 (2.665) • Horário Corrido 08h00 às 13h00 (Saída do P.A.)
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA (WHATSAPP + PDFS) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
              title="Compartilhar cronograma no grupo de WhatsApp da equipe"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp da Equipe</span>
            </button>

            <a
              href={dadosDia.pdfDia}
              download
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
              title={`Baixar PDF do Plano de ${dadosDia.diaNome}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF {dadosDia.diaNome}</span>
            </a>

            <a
              href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
              download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all border border-indigo-700"
              title="Baixar Ficha de Campo para Prancheta por Dia (5 Páginas A4 - 1 dia por folha)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Fichas por Dia (5 Págs)</span>
            </a>

            <a
              href="/FICHAS_DE_CAMPO_POR_EQUIPE_1_A_5.pdf"
              download="FICHAS_DE_CAMPO_POR_EQUIPE_1_A_5.pdf"
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all border border-blue-700"
              title="Baixar Fichas de Campo Individuais por Equipe (5 Páginas A4 - Equipe 1 a Equipe 5)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Fichas por Equipe (1 a 5)</span>
            </a>

            <a
              href="/PLANO_GERAL_SEMANAL_COORDENACAO_SUPERVISAO.pdf"
              download="PLANO_GERAL_SEMANAL_COORDENACAO_SUPERVISAO.pdf"
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
              title="Baixar Plano Geral Semanal da Coordenação e Supervisão (1 Página A4)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Plano Coordenação</span>
            </a>
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto w-full p-3 sm:p-6 space-y-5 flex-1">
        
        {/* ALERTA DE DIRECIONAMENTO TÁTICO */}
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-950">
                Diretrizes Operacionais Consolidadas (Semanas A + B = 3.682 Ovos)
              </h2>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                <strong>1. Equipe 100% de Campo e Ponto de Encontro no P.A.:</strong> Os <strong>10 ACEs (5 Duplas)</strong> reúnem-se diariamente no <strong>P.A. (Ponto de Apoio)</strong> e atuam em <strong>Horário Corrido das 08h00 às 13h00</strong> (o serviço interno já possui equipe própria).<br />
                <strong>2. Limite Real de Frota (Máx. 7 Lugares):</strong> 1 Carro de Passeio (5 lugares) + 1 Caminhonete (2 lugares). Nenhum deslocamento distrital ultrapassa 6 ACEs motorizados.<br />
                <strong>3. Rotas Casadas por Eixo (08h00 às 13h00):</strong> Seg (Carmo Sede + Barra), Ter (Encostas da Sede), Qua (Influência + Light + Sede), Qui (Porto Velho + Prata + Sede), Sex (08h00 às 12h00: Resgate de Fechados em Campo + 12h00 às 13h00: Reunião Geral de Avaliação no P.A.).
              </p>
            </div>
          </div>
        </div>

        {/* BANNER DE ACESSO AO APP FOCADO DO AGENTE (/acao) */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 border border-blue-700/80 rounded-3xl p-4 sm:p-5 shadow-lg text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  📱 Modo Celular do Agente (/acao)
                </span>
                <h3 className="text-sm sm:text-base font-black text-white mt-1">
                  App Interativo de Vistoria & Bloqueio em Campo
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Sincronizado 100% com o acumulado das 2 semanas, escala das 5 duplas, raios de 100m/200m no mapa de satélite e checklists PNCD.
                </p>
              </div>
            </div>
            {onAbrirAcaoFoco ? (
              <button
                type="button"
                onClick={onAbrirAcaoFoco}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 transition-all border border-blue-400 shrink-0"
              >
                <span>Abrir App do Agente ➔</span>
              </button>
            ) : (
              <a
                href="/acao"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 transition-all border border-blue-400 shrink-0"
              >
                <span>Abrir App do Agente ➔</span>
              </a>
            )}
          </div>
        </div>

        {/* 2. DISTRIBUIÇÃO DOS 10 AGENTES (5 DUPLAS DE CAMPO) */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Escala dos 10 Agentes de Campo (5 Duplas Operacionais)
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              100% Efetivo de Rua
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {EQUIPES_DEFINICAO.map((eq) => (
              <div
                key={eq.id}
                className={`p-3 rounded-2xl border ${eq.cor} flex flex-col justify-between gap-2`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-xs">{eq.nome}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${eq.badge}`}>
                      {eq.efetivo}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 mt-1">
                    📍 {eq.area}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {eq.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LOGÍSTICA DE VIATURAS DO MUNICÍPIO (MÁX 7 LUGARES) */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Logística Real de Frota (Máximo 7 Lugares Simultâneos)
                </h2>
                <p className="text-xs text-slate-500">
                  1 Carro de Passeio (5 Lugares) + 1 Caminhonete de Apoio (2 Lugares) • Zero Mutirão &gt; 7 Agentes
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              5L + 2L = 7 Lugares
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-950 flex items-center gap-1.5">
                  🚗 Carro de Passeio (5 Lugares)
                </span>
                <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Eixos Distritais
                </span>
              </div>
              <p className="text-blue-900 leading-relaxed">
                <strong>Segunda:</strong> Leva 4 ACEs (Equipes 1 e 2) para Barra de São Francisco.<br />
                <strong>Quarta:</strong> Opera junto à Caminhonete levando ao todo 6 ACEs (Equipes 1, 2 e 3) para Influência + Usina Light.<br />
                <strong>Quinta:</strong> Opera junto à Caminhonete levando 6 ACEs (Equipes 1, 2 e 3) para Porto Velho + Córrego da Prata.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-950 flex items-center gap-1.5">
                  🛻 Caminhonete (2 Lugares)
                </span>
                <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  Apoio Pesado & Distritos
                </span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                <strong>Segunda e Terça:</strong> Apoio pesado na Sede (escadas para calhas, recolhimento de inservíveis e subidas no Progresso e Caixa d'Água).<br />
                <strong>Quarta, Quinta e Sexta:</strong> Soma 2 lugares ao Carro de 5 lugares para garantir deslocamento dos distritos sem jamais exceder o limite de 7 lugares.
              </p>
            </div>
          </div>
        </section>

        {/* 3. METODOLOGIA DOS RAIOS DE AÇÃO */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Raios de Ação Calibrados pela Soma das 2 Semanas
              </h2>
              <p className="text-xs text-slate-500">
                Padrão Ministério da Saúde & SES-RJ (Núcleo Focal 100m + Perímetro Perifocal 200m)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {METODOLOGIA_RAIOS.map((r) => (
              <div key={r.raio} className={`p-3 rounded-2xl border ${r.borda} flex flex-col justify-between`}>
                <div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${r.cor} inline-block mb-1`}>
                    Raio {r.raio}
                  </span>
                  <div className="text-xs font-black">{r.nivel}</div>
                  <p className="text-[11px] mt-1 leading-snug opacity-90">
                    {r.acoes}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. CRONOGRAMA INTERATIVO POR DIA DA SEMANA */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Cronograma de Bloqueio Diário (Segunda a Sexta)
              </h2>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Toque no dia para ver os alvos e baixar o PDF diário
            </span>
          </div>

          {/* ABAS DOS DIAS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {Object.keys(CRONOGRAMA_DIARIO).map((chave) => {
              const d = CRONOGRAMA_DIARIO[chave];
              const ativo = diaSelecionado === chave;
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setDiaSelecionado(chave)}
                  className={`px-3 py-2 rounded-2xl font-black whitespace-nowrap transition-all border ${
                    ativo
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.diaNome}
                </button>
              );
            })}
          </div>

          {/* CABEÇALHO DO DIA ATIVO */}
          <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                {dadosDia.diaNome}
              </span>
              <h3 className="text-sm sm:text-base font-black mt-1">
                {dadosDia.destaque}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {dadosDia.subtitulo}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={dadosDia.pdfDia}
                download
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-3 py-2 rounded-2xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF de {dadosDia.diaNome}</span>
              </a>
            </div>
          </div>

          {/* LISTA DE ALVOS DO DIA */}
          <div className="space-y-3">
            {dadosDia.alvos.map((alvo) => (
              <div
                key={alvo.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                {/* Linha 1: Identificação e Badges */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black bg-slate-900 text-white px-2.5 py-1 rounded-xl">
                      {alvo.id}
                    </span>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {alvo.bairro} • Quarteirão {alvo.quarteirao}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        {alvo.endereco} • <strong>{alvo.morador}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-black bg-red-100 text-red-900 px-2.5 py-1 rounded-xl border border-red-200 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-red-600" />
                      🚨 {alvo.ovos} ovos nas 2 Sem. (Sem A: {alvo.ovosSem1} + Sem B: {alvo.ovosSem2})
                    </span>
                    <span className={`text-xs font-black text-white px-2.5 py-1 rounded-xl ${alvo.raioCor}`}>
                      {alvo.raio}
                    </span>
                  </div>
                </div>

                {/* Linha 2: Equipe e Ação Tática */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="font-bold text-slate-800">
                    👥 <strong className="text-blue-900">{alvo.equipe}</strong>
                  </div>
                  {alvo.raioPratico && (
                    <div className="bg-amber-100/80 border border-amber-300 text-amber-950 font-bold p-2.5 rounded-xl text-xs flex items-start gap-2">
                      <span className="text-base leading-none">📏</span>
                      <div>
                        <strong className="text-amber-900 block mb-0.5">Como delimitar na prática (Raio 100m / 200m MS):</strong>
                        <span className="font-medium text-amber-950">{alvo.raioPratico}</span>
                      </div>
                    </div>
                  )}
                  <p className="text-slate-600 leading-relaxed">
                    🎯 <strong>Ação Operacional:</strong> {alvo.acoes}
                  </p>
                </div>

                {/* Linha 3: Checklist Interativo de Eliminação */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Criadouros Críticos para Eliminar (Marque no Celular):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {alvo.focos.map((foco, idx) => {
                      const checked = !!checklist[`${alvo.id}_${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleCheckItem(alvo.id, idx)}
                          className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer flex items-center gap-2 transition-all ${
                            checked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 line-through'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {checked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span>{foco}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Linha 4: Botão de Navegação GPS Direta */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAbrirGps(alvo.lat, alvo.lng)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Abrir Rota no Google Maps (GPS)</span>
                  </button>

                  {onAbrirMapa && (
                    <button
                      type="button"
                      onClick={onAbrirMapa}
                      className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs py-2.5 px-3 rounded-2xl border border-slate-200 flex items-center gap-1.5 transition-all"
                      title="Ver no Mapa de Monitoramento do Sistema"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">Mapa do Sistema</span>
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </section>

        {/* 5. CARTOGRAFIA: MAPAS DE CALOR E NEVOEIRO TÉRMICO */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-600" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Cartografia Oficial: Mapas de Calor de Infestação
                </h2>
                <p className="text-xs text-slate-500">
                  Nevoeiro Térmico da Sede Urbana e dos Distritos (Acumulado 2 Semanas)
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Toque na imagem para ampliar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Mapa 1: Sede Urbana */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col justify-between">
              <div
                className="relative group cursor-pointer overflow-hidden max-h-64 flex items-center justify-center bg-black/5"
                onClick={() => setModalMapa('sede')}
              >
                <img
                  src="/maps/mapa_2_sede_nevoeiro.jpg"
                  alt="Mapa de Nevoeiro Térmico da Sede Urbana"
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                  <ZoomIn className="w-5 h-5" />
                  <span>Ampliar Mapa da Sede</span>
                </div>
              </div>
              <div className="p-3">
                <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Mapa 1: Sede Urbana
                </span>
                <p className="text-xs text-slate-700 leading-snug">
                  Epicentros nos bairros <strong>Progresso (OV-23: 342 ovos)</strong>, <strong>Centro (OV-10: 242 ovos)</strong>, <strong>Val Paraíso (OV-31: 192 ovos)</strong> e <strong>Jd. Centenário (OV-05: 173 ovos)</strong>.
                </p>
              </div>
            </div>

            {/* Mapa 2: Distritos */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col justify-between">
              <div
                className="relative group cursor-pointer overflow-hidden max-h-64 flex items-center justify-center bg-black/5"
                onClick={() => setModalMapa('distritos')}
              >
                <img
                  src="/maps/mapa_3_distritos_nevoeiro.jpg"
                  alt="Mapa de Nevoeiro Térmico dos Distritos"
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                  <ZoomIn className="w-5 h-5" />
                  <span>Ampliar Mapa dos Distritos</span>
                </div>
              </div>
              <div className="p-3">
                <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full inline-block mb-1">
                  Mapa 2: Distritos Municipais
                </span>
                <p className="text-xs text-slate-700 leading-snug">
                  Rotas casadas: <strong>Seg (Barra: 268 ovos)</strong>, <strong>Qua (Influência: 557 ovos + Light: 320 ovos)</strong> e <strong>Qui (Porto Velho: 343 ovos + Prata: 183 ovos)</strong>.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 6. ROTEIRO DOS 5 PASSOS DE INSPEÇÃO */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Roteiro dos 5 Passos para o Agente em Cada Residência
            </h2>
          </div>

          <div className="space-y-2">
            {ROTEIRO_5_PASSOS.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="font-black text-slate-900 mb-0.5">
                  {item.passo}
                </div>
                <div className="text-slate-600 leading-relaxed italic">
                  {item.texto}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* MODAL PARA EXPANDIR OS MAPAS DE CALOR EM TELA CHEIA */}
      {modalMapa && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => setModalMapa(null)}
        >
          <div className="max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-black text-sm">
                {modalMapa === 'sede' ? 'Mapa 1: Sede Urbana (Nevoeiro Térmico)' : 'Mapa 2: Distritos Municipais (Nevoeiro Térmico)'}
              </span>
              <button
                type="button"
                onClick={() => setModalMapa(null)}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-bold"
              >
                Fechar ✕
              </button>
            </div>
            <div className="overflow-auto flex-1 p-2 flex items-center justify-center bg-slate-950">
              <img
                src={modalMapa === 'sede' ? '/maps/mapa_2_sede_nevoeiro.jpg' : '/maps/mapa_3_distritos_nevoeiro.jpg'}
                alt="Mapa em Alta Resolução"
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ DO PLANO */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 px-4 text-center shrink-0 space-y-1">
        <p className="text-xs text-slate-500 font-medium">
          Prefeitura Municipal de Carmo - RJ • Secretaria Municipal de Saúde • Vigilância Ambiental
        </p>
        <p className="text-[11px] text-slate-400">
          Plano Operacional Semanal de Bloqueio Vetorial • Consolidado das 2 Semanas (56 Ovitrampas • 3.682 Ovos)
        </p>
      </footer>

    </div>
  );
}
