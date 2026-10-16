import React, { useState, useMemo } from 'react';
import {
  Users, MapPin, Navigation, Calendar, Flame, AlertTriangle,
  CheckCircle2, Circle, Share2, Download, ExternalLink,
  ChevronRight, ZoomIn, Eye, Sparkles, ArrowLeft, ShieldAlert,
  HelpCircle, Check, Info, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

// DADOS OPERACIONAIS DO PLANO SEMANAL DE BLOQUEIO (56 OVITRAMPAS - CARMO/RJ)
const EQUIPES_DEFINICAO = [
  {
    id: 'fixa_influencia',
    nome: 'Agente Fixa 1 (Influência)',
    efetivo: '1 ACE (Dedicada)',
    cor: 'border-purple-300 bg-purple-50 text-purple-900',
    badge: 'bg-purple-600 text-white',
    area: '2º Distrito (Influência)',
    descricao: 'Presença permanente no distrito com maior carga (557 ovos). Monitora OVs 36, 37, 38, 50, 51 e 52; atua em quintais e margens da BR-116. Recebe reforço da Equipe Delta na quarta-feira.'
  },
  {
    id: 'alpha',
    nome: 'Equipe Alpha (Dupla 1)',
    efetivo: '2 ACEs',
    cor: 'border-red-300 bg-red-50 text-red-900',
    badge: 'bg-red-600 text-white',
    area: 'Progresso e Centro',
    descricao: 'Bloqueio nos dois maiores epicentros urbanos: OV-23 (Pousada Valle do Sol - 342 ovos / Raio 100m) e OV-10 (R. Oscar de Souza Curty - 242 ovos / Raio 100m).'
  },
  {
    id: 'beta',
    nome: 'Equipe Beta (Dupla 2)',
    efetivo: '2 ACEs',
    cor: 'border-amber-300 bg-amber-50 text-amber-900',
    badge: 'bg-amber-600 text-white',
    area: 'Jardim Centenário e Boa Ideia',
    descricao: 'Bloqueio na OV-05 (R. Ernesto Wermelinger - 173 ovos / Raio 100m) e quarteirões vizinhos da Celso Carrilho Faria e Jorge Ramos do Valle.'
  },
  {
    id: 'gama',
    nome: 'Equipe Gama (Dupla 3)',
    efetivo: '2 ACEs',
    cor: 'border-orange-300 bg-orange-50 text-orange-900',
    badge: 'bg-orange-600 text-white',
    area: 'Val Paraíso, Morro do Estado e Caixa d\'Água',
    descricao: 'Bloqueio na OV-31 (R. Roberto Simões - 192 ovos / Raio 80m), OV-35 (R. Senador Dantas - 121 ovos / Raio 80m) e encostas críticas.'
  },
  {
    id: 'delta',
    nome: 'Equipe Delta (Volante Distrital)',
    efetivo: '3 ACEs (Viatura)',
    cor: 'border-blue-300 bg-blue-50 text-blue-900',
    badge: 'bg-blue-600 text-white',
    area: 'Porto Velho, Ilha dos Pombos, Barra e Prata',
    descricao: 'Viatura motorizada para cobrir os distritos distantes: Major Fajardo (343 ovos / Raio 100m), Beira Rio (203 ovos / Raio 100m) e reforço do mutirão em Influência.'
  }
];

const METODOLOGIA_RAIOS = [
  {
    raio: '100 Metros',
    nivel: 'Crítico Máximo (>150 ovos)',
    cor: 'bg-red-600 text-white',
    borda: 'border-red-400 bg-red-50 text-red-950',
    acoes: 'Bloqueio total do quarteirão sede + quarteirões confrontantes e vizinhos em 360º. Varredura completa em ralos, caixas d\'água, calhas e piscinas.'
  },
  {
    raio: '80 Metros',
    nivel: 'Alerta Alto (100 a 149 ovos)',
    cor: 'bg-amber-600 text-white',
    borda: 'border-amber-400 bg-amber-50 text-amber-950',
    acoes: 'Vistoria em todas as residências do quarteirão da armadilha e toda a face frontal da rua. Foco em tonéis, calhas e garrafas.'
  },
  {
    raio: '50 Metros',
    nivel: 'Risco Médio (50 a 99 ovos)',
    cor: 'bg-emerald-600 text-white',
    borda: 'border-emerald-400 bg-emerald-50 text-emerald-950',
    acoes: 'Inspeção no imóvel foco e nas 6 a 8 residências vizinhas mais próximas. Orientação do morador e remoção de pratos de plantas.'
  },
  {
    raio: '30 Metros',
    nivel: 'Vigilância (<50 ovos)',
    cor: 'bg-slate-600 text-white',
    borda: 'border-slate-300 bg-slate-50 text-slate-800',
    acoes: 'Ação preventiva no imóvel parceiro e nos 2 vizinhos imediatos.'
  }
];

const CRONOGRAMA_DIARIO = {
  segunda: {
    diaNome: 'Segunda-Feira',
    subtitulo: 'Abertura da Semana • Bloqueio nos 2 Maiores Epicentros Urbanos',
    destaque: 'Progresso e Centro',
    alvos: [
      {
        id: 'OV-23',
        equipe: 'Equipe Alpha (2 ACEs • Apoio da Caminhonete)',
        bairro: 'Progresso',
        quarteirao: 'Q-01',
        morador: 'Pousada Valle do Sol',
        endereco: 'Rua Manoel José de Moraes, 51',
        ovos: 342,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Pousada + Quarteirão Completo: Vistoriar a pousada e cerca de 6 a 8 casas vizinhas para a direita, 6 a 8 para a esquerda, casas de frente e fundos (na José Cassane).',
        lat: -21.9333333,
        lng: -42.6083333,
        acoes: 'Todo o Q-01 e início da Rua José Cassane. Inspecionar ralos externos, piscinas desativadas, reservatórios de chuva e bebedouros de animais.',
        focos: ['Piscinas desativadas', 'Ralos de quintal', 'Reservatórios de chuva', 'Bebedouros de animais']
      },
      {
        id: 'OV-10',
        equipe: 'Equipe Alpha (2 ACEs a pé)',
        bairro: 'Centro',
        quarteirao: 'Q-13',
        morador: 'Morador Local',
        endereco: 'Rua Oscar de Souza Curty, 42',
        ovos: 242,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Imóvel-Foco + Quarteirão Comercial: Vistoriar entre a Oscar Curty e Celso C. Faria (foco em calhas prediais, marquises e lajes com água empoçada).',
        lat: -21.9333333,
        lng: -42.6083333,
        acoes: 'Trecho entre Rua Oscar Curty e encontro com Celso C. Faria. Foco em calhas prediais, marquises comerciais e lajes com água empoçada.',
        focos: ['Calhas prediais', 'Marquises comerciais', 'Lajes com empoçamento', 'Pratos de plantas']
      },
      {
        id: 'OV-21',
        equipe: 'Equipe Alpha (2 ACEs)',
        bairro: 'Progresso',
        quarteirao: 'Q-09',
        morador: 'Paula Miranda',
        endereco: 'Rua Silvio Geraldo França, 753',
        ovos: 100,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Imóvel-Foco + Vizinhos da Rua: Vistoriar a casa da Paula Miranda e cerca de 4 casas para cada lado (nº 700 ao 800).',
        lat: -21.9333333,
        lng: -42.6083333,
        acoes: 'Rua Silvio Geraldo França (nº 700 a 800). Varrer fundos de vale, entulhos de obras e tambores no nível do solo.',
        focos: ['Fundos de vale', 'Entulho de construção', 'Tambores no solo', 'Baldes de quintal']
      },
      {
        id: 'FIXA-INF',
        equipe: 'Agente Fixa (1 ACE)',
        bairro: 'Influência (2º Distrito)',
        quarteirao: 'Setor Rural / BR-116',
        morador: 'Monitoramento Contínuo',
        endereco: 'Trecho da BR-116 e vias de acesso',
        ovos: 557,
        raio: 'Inspeção Prévia',
        raioCor: 'bg-purple-600',
        raioPratico: 'Reconhecimento prévio dos criadouros nas margens da BR-116 e quintais rurais para preparar o grande mutirão de quarta-feira.',
        lat: -21.9056157,
        lng: -42.6393661,
        acoes: 'Reconhecimento prévio dos criadouros nas margens da BR-116 e articulação com moradores para o grande mutirão de quarta-feira.',
        focos: ['Borracharias da BR', 'Carcaças de veículos', 'Galpões agrícolas']
      }
    ]
  },
  terca: {
    diaNome: 'Terça-Feira',
    subtitulo: 'Bloqueio Vetorial em Encostas e Áreas Elevadas da Sede',
    destaque: 'Jardim Centenário, Val Paraíso e Caixa d\'Água',
    alvos: [
      {
        id: 'OV-05',
        equipe: 'Equipe Beta (2 ACEs a pé)',
        bairro: 'Jardim Centenário',
        quarteirao: 'Q-17',
        morador: 'Morador Local',
        endereco: 'Rua Ernesto Wermelinger, 63',
        ovos: 173,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Imóvel-Foco + Quarteirão Completo: Vistoriar a residência e cerca de 6 a 8 vizinhos no encontro com a Celso Carrilho Faria.',
        lat: -21.9351048,
        lng: -42.6097103,
        acoes: 'Rua Ernesto Wermelinger e encontro com Celso Carrilho Faria. Vistoria minuciosa em tambores de lavanderia, bromélias e pratos de vasos.',
        focos: ['Tambores de lavar roupa', 'Bromélias em jardins', 'Pratos de vasos', 'Caixas d\'água']
      },
      {
        id: 'OV-31',
        equipe: 'Equipe Gama (2 ACEs)',
        bairro: 'Val Paraíso',
        quarteirao: 'Q-05',
        morador: 'Morador Local',
        endereco: 'Rua Roberto Simões de Araújo, 98',
        ovos: 192,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Imóvel-Foco + Vizinhos da Rua: Vistoriar a residência e vizinhos da Rua Roberto Simões e Emanuel de Moraes (quintais inclinados).',
        lat: -21.9372100,
        lng: -42.6045300,
        acoes: 'Rua Roberto Simões e Rua Emanuel de Moraes. Foco em caixas d\'água destampadas, tonéis de água de chuva e quintais acidentados.',
        focos: ['Caixas d\'água sem tampa', 'Tonéis de chuva', 'Potes de animais', 'Ralos sem tela']
      },
      {
        id: 'OV-35',
        equipe: 'Equipe Gama (2 ACEs • Apoio da Caminhonete)',
        bairro: 'Caixa d\'Água',
        quarteirao: 'Q-13',
        morador: 'Almir Lemgruber',
        endereco: 'Rua Senador Dantas, 269',
        ovos: 121,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Imóvel-Foco + Vizinhos Altos: Vistoriar a residência do Almir Lemgruber e vizinhos da parte alta da Senador Dantas (terrenos baldios e calhas).',
        lat: -21.9389100,
        lng: -42.6031200,
        acoes: 'Rua Senador Dantas (trecho superior). Terrenos baldios com descarte clandestino de inservíveis e calhas de telhado obstruídas por folhas.',
        focos: ['Terrenos baldios', 'Calhas obstruídas', 'Garrafas viradas para cima', 'Pneus']
      }
    ]
  },
  quarta: {
    diaNome: 'Quarta-Feira',
    subtitulo: 'Grande Mutirão de Bloqueio Vetorial no Distrito Crítico',
    destaque: '2º Distrito (Influência) • 557 Ovos Acumulados',
    alvos: [
      {
        id: 'OV-36',
        equipe: 'Agente Fixa + Força-Tarefa da Sede (7 ACEs em Conjunto • Carro + Caminhonete)',
        bairro: 'Influência (2º Distrito)',
        quarteirao: 'Q-05',
        morador: 'Morador Local',
        endereco: 'Rua Manoel Cirilo da Silva, 116',
        ovos: 222,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Mutirão em Conjunto: Extensão completa da Rua Manoel Cirilo (Q-05 inteiro com a força-tarefa). Pneus agrícolas e tonéis de horta.',
        lat: -21.9056157,
        lng: -42.6393661,
        acoes: 'Extensão completa da Rua Manoel Cirilo (Q-05). Agente fixa + reforço de 3 agentes da equipe Delta. Pneus velhos e tonéis de uso agrícola.',
        focos: ['Pneus velhos', 'Tonéis agrícolas', 'Baldes de horta', 'Caixas d\'água baixas']
      },
      {
        id: 'OV-38',
        equipe: 'Agente Fixa + Força-Tarefa da Sede (7 ACEs em Conjunto • Carro + Caminhonete)',
        bairro: 'Influência (2º Distrito)',
        quarteirao: 'Q-06',
        morador: 'Independente',
        endereco: 'Rodovia BR-116, S/N',
        ovos: 210,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Mutirão na Rodovia: Margens da BR-116 (todas as borracharias, oficinas mecânicas, carcaças de veículos e galpões).',
        lat: -21.9062300,
        lng: -42.6385100,
        acoes: 'Margens da Rodovia BR-116. Vistoria intensiva em borracharias, oficinas mecânicas, carcaças de veículos e galpões de implementos.',
        focos: ['Borracharias', 'Oficinas mecânicas', 'Carcaças de veículos', 'Galpões abertos']
      },
      {
        id: 'OV-51',
        equipe: 'Agente Fixa + Força-Tarefa da Sede (7 ACEs em Conjunto • Carro + Caminhonete)',
        bairro: 'Influência (2º Distrito)',
        quarteirao: 'Q-11',
        morador: 'Morador Local',
        endereco: 'Rua Maria da Silva Machareth, 182',
        ovos: 109,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Mutirão na Machareth: Rua Maria da Silva Machareth (casas vizinhas, tonéis de captação de água de chuva e caixas d\'água baixas).',
        lat: -21.9071500,
        lng: -42.6402100,
        acoes: 'Rua Maria da Silva Machareth. Tambores de captação de água de chuva, caixas d\'água baixas e recipientes sombreados em quintais úmidos.',
        focos: ['Captação de água de chuva', 'Tanques sem vedação', 'Bacias de animais']
      }
    ]
  },
  quinta: {
    diaNome: 'Quinta-Feira',
    subtitulo: 'Bloqueio Vetorial nos Distritos do Eixo Leste e Usina',
    destaque: 'Porto Velho do Cunha e Ilha dos Pombos',
    alvos: [
      {
        id: 'OV-45',
        equipe: 'Equipe Delta (3 ACEs • Carro de Passeio 5 Lugares)',
        bairro: 'Porto Velho do Cunha (5º Dist.)',
        quarteirao: 'Q-01',
        morador: 'Morador Local',
        endereco: 'Rua Major Fajardo, 601',
        ovos: 241,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Imóvel-Foco + Trecho Beira-Rio: Rua Major Fajardo (altura nº 550 ao 650) e faixa ribeirinha (caçambas, carretas e recipientes plásticos).',
        lat: -21.8791200,
        lng: -42.5482300,
        acoes: 'Rua Major Fajardo (altura do nº 550 ao 650). Caçambas, carretas com água parada, recipientes plásticos e quintais na beira do rio.',
        focos: ['Carretas e caçambas', 'Recipientes plásticos', 'Fundos de quintal ribeirinho']
      },
      {
        id: 'OV-44',
        equipe: 'Equipe Delta (3 ACEs • Carro de Passeio 5 Lugares)',
        bairro: 'Porto Velho do Cunha (5º Dist.)',
        quarteirao: 'Q-10',
        morador: 'Morador Local',
        endereco: 'Rua Major Fajardo, 312 (ESF)',
        ovos: 102,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Imóvel-Foco + Entorno da ESF: Rua Major Fajardo (nº 280 ao 350 ao redor do Posto de Saúde, calhas e caixas d\'água).',
        lat: -21.8784500,
        lng: -42.5491100,
        acoes: 'Rua Major Fajardo (nº 280 ao 350 - entorno da ESF Porto Velho). Calhas prediais, caixas d\'água sem tampa e garrafas retornáveis.',
        focos: ['Entorno do Posto de Saúde', 'Calhas prediais', 'Caixas d\'água', 'Garrafas']
      },
      {
        id: 'OV-41',
        equipe: 'Equipe Delta (3 ACEs • Carro de Passeio 5 Lugares)',
        bairro: 'Ilha dos Pombos',
        quarteirao: 'Q-01',
        morador: 'Morador Local',
        endereco: 'Rua Beira Rio, 130',
        ovos: 203,
        raio: '100 Metros',
        raioCor: 'bg-red-600',
        raioPratico: 'Orla Ribeirinha Completa: Toda a extensão da Rua Beira Rio (canoas, embarcações e lonas plásticas de pesca com água de chuva).',
        lat: -21.8456100,
        lng: -42.5891200,
        acoes: 'Ao longo da orla do rio na Rua Beira Rio. Canoas e embarcações com acúmulo de água de chuva, lonas plásticas e recipientes de pesca.',
        focos: ['Canoas com água de chuva', 'Lonas plásticas dobradas', 'Tambores de óleo', 'Tranqueiras de pesca']
      }
    ]
  },
  sexta: {
    diaNome: 'Sexta-Feira',
    subtitulo: 'Bloqueio nos Distritos Limítrofes e Fechamento Semanal',
    destaque: 'Barra de São Francisco, Córrego da Prata e Revisão Geral',
    alvos: [
      {
        id: 'OV-55',
        equipe: 'Equipe Delta (3 ACEs • Carro de Passeio 5 Lugares)',
        bairro: 'Barra de São Francisco',
        quarteirao: 'Q-01',
        morador: 'Morador Local',
        endereco: 'Rua Antônio R. Serafim, S/N',
        ovos: 125,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Quintais Rurais: Rua Antônio R. Serafim e Sebastião F. Costa (bebedouros de animais rurais, tonéis e recipientes em quintais amplos).',
        lat: -21.8214500,
        lng: -42.5123400,
        acoes: 'Rua Antônio R. Serafim e Sebastião Ferreira Costa. Bebedouros de animais de porte rural, tambores e recipientes em quintais amplos.',
        focos: ['Bebedouros de animais', 'Tambores rurais', 'Pneus de maquinário']
      },
      {
        id: 'OV-48',
        equipe: 'Equipe Delta (3 ACEs • Carro de Passeio 5 Lugares)',
        bairro: 'Córrego da Prata',
        quarteirao: 'Q-01',
        morador: 'Morador Local',
        endereco: 'Rua Benfica, 48 (ESF)',
        ovos: 121,
        raio: '80 Metros',
        raioCor: 'bg-amber-600',
        raioPratico: 'Entorno do Posto de Saúde: Rua Benfica e caixas d\'água no nível do solo na ESF Prata.',
        lat: -21.9891200,
        lng: -42.6789100,
        acoes: 'Rua Benfica e entorno do posto de saúde. Calhas de telhado, recipientes descartáveis e caixas d\'água no nível do solo.',
        focos: ['Caixas d\'água no solo', 'Calhas obstruídas', 'Descarte de embalagens']
      },
      {
        id: 'SEDE-REVISAO',
        equipe: 'Equipes Alpha, Beta e Gama (6 ACEs)',
        bairro: 'Sede Urbana (Geral)',
        quarteirao: 'Revisão',
        morador: 'Imóveis Pendentes',
        endereco: 'Progresso, Centro e Jd. Centenário',
        ovos: 0,
        raio: 'Varredura',
        raioCor: 'bg-blue-600',
        raioPratico: 'Retorno a todos os imóveis que estavam fechados ou com recusa inicial durante a semana para atingir 100% de cobertura.',
        lat: -21.9333333,
        lng: -42.6083333,
        acoes: 'Retorno aos imóveis que estavam fechados ou desocupados no início da semana. Tabulação dos focos eliminados com a Coordenação.',
        focos: ['Imóveis fechados', 'Terrenos murados', 'Consolidação de dados']
      }
    ]
  }
};

const ROTEIRO_5_PASSOS = [
  {
    passo: '1. Abordagem Padronizada',
    texto: '"Bom dia! A equipe da Saúde detectou alta proliferação do mosquito da Dengue nesta rua pelo nosso monitoramento. Viemos vistoriar seu quintal para eliminar os focos antes que as pessoas adoeçam."'
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

export function PlanoAcaoAgentesScreen({ onVoltar, onAbrirMapa }) {
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
      '🚨 *PLANO DE AÇÃO SEMANAL - OVITRAMPAS CARMO/RJ*',
      '🎯 *10 Agentes em Campo • Bloqueio por Raio de Ação*',
      '',
      `📅 *Dia em Destaque: ${dadosDia.diaNome}*`,
      `📍 *Território:* ${dadosDia.destaque}`,
      '',
      '📌 *Armadilhas Críticas a Bloquear:*',
      ...dadosDia.alvos.map((a) => `• ${a.id} (${a.bairro}): ${a.ovos > 0 ? a.ovos + ' ovos' : 'Vistoria'} ➔ Raio ${a.raio}`),
      '',
      '📲 *Acesse o plano completo no celular com rotas GPS:*',
      urlPlano,
      '',
      '📄 *PDF Oficial disponível para impressão no mesmo link.*'
    ].join('\n');

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Abrir GPS no Google Maps
  const handleAbrirGps = (lat, lng, label) => {
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-200 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-600" /> Operação Segunda-Feira
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  10 Agentes em Campo
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                Plano Semanal de Bloqueio Vetorial
              </h1>
              <p className="text-xs text-slate-500">
                Direcionamento por Mapa de Calor & Raio de Ação • Carmo/RJ
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
              href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
              download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all border border-indigo-700"
              title="Baixar Ficha de Campo para Prancheta em Papel (5 Páginas A4 - 1 dia por folha)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha Papel (5 Págs)</span>
            </a>

            <a
              href="/GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
              download="GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all border border-blue-700"
              title="Baixar Guia Rápido de Bolso/Prancheta (1 Página A4 com todos os alvos e raios)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Prancheta (1 Pág)</span>
            </a>

            <a
              href="/PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ_REVISADO.pdf"
              download="PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ_REVISADO.pdf"
              className="bg-red-700 hover:bg-red-800 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
              title="Baixar PDF Técnico Completo (8 Páginas com polígonos Q-xx e os dois ciclos)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Completo (8 Págs)</span>
            </a>

            <a
              href="/PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf"
              download="PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf"
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
              title="Baixar PDF de Campo Rápido (2 Páginas A4 com mapas de nevoeiro)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Campo (2 Págs)</span>
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
                Coordenação de Vigilância Ambiental: Missão Operacional
              </h2>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                Este plano organiza os <strong>10 Agentes de Combate às Endemias (ACE)</strong> para agir onde o risco de surto é iminente. O mosquito não voa longe quando tem alimento e água: <strong>a ação de eliminação deve cobrir o raio exato de 100m ou 80m</strong> em volta de cada armadilha crítica.
              </p>
            </div>
          </div>
        </div>

        {/* BANNER: TRABALHO EM PAPEL / PRANCHETA */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-indigo-950">
                  Prefere trabalhar no papel ou acabou a bateria do celular?
                </h3>
                <p className="text-xs text-indigo-900 mt-0.5 leading-relaxed">
                  Geramos uma <strong>Ficha de Campo Oficial Idêntica ao Aplicativo</strong> em PDF (1 página por dia, Segunda a Sexta). Os agentes levam na prancheta com caneta e marcam os mesmos quadrinhos de criadouros e alvos.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
              <a
                href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Ficha Papel (5 Págs)</span>
              </a>
              <a
                href="/GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
                download="GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
                className="flex-1 sm:flex-none bg-white hover:bg-indigo-50 active:scale-95 text-indigo-700 font-extrabold text-xs py-2.5 px-4 rounded-2xl border border-indigo-300 flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Guia 1 Pág (Bolso)</span>
              </a>
            </div>
          </div>
        </div>

        {/* 2. DISTRIBUIÇÃO DOS 10 AGENTES */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Distribuição da Equipe (10 Agentes em Campo)
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              5 Frentes de Trabalho
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
                  <div className="text-[11px] font-bold text-slate-700 mt-0.5">
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

        {/* LOGÍSTICA DE VIATURAS DO MUNICÍPIO */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Logística das 2 Viaturas Municipais
                </h2>
                <p className="text-xs text-slate-500">
                  1 Carro de Passeio (5 Lugares) + 1 Caminhonete de Apoio (2 Lugares) para 10 Agentes
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
              Frota Dedicada
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Viatura 1: Carro 5 Lugares */}
            <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-950 flex items-center gap-1.5">
                  🚗 Carro de Passeio (5 Lugares)
                </span>
                <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Deslocamento de Pessoal
                </span>
              </div>
              <p className="text-blue-900 leading-relaxed">
                <strong>Equipe Delta (3 ACEs nos Distritos):</strong> Transporta a equipe volante para Porto Velho do Cunha, Ilha dos Pombos, Barra de São Francisco e Córrego da Prata.
              </p>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100 text-blue-950 text-[11px]">
                ⚡ <strong>Quarta-feira (Mutirão):</strong> Transporta 4 agentes urbanos da sede até Influência (2º Distrito) para somar forças com a Agente Fixa local.
              </div>
            </div>

            {/* Viatura 2: Caminhonete 2 Lugares */}
            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-950 flex items-center gap-1.5">
                  🛻 Caminhonete (2 Lugares)
                </span>
                <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  Apoio Pesado & Terreno Difícil
                </span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                <strong>Apoio Tático & Encostas Íngremes:</strong> Conduzida pelo motorista/supervisor. Transporta escadas de vistoria de calhas altas, sacos para recolhimento de inservíveis pesados e sobe os morros mais inclinados da sede.
              </p>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-100 text-amber-950 text-[11px]">
                🏔️ <strong>Subidas Críticas:</strong> Dá apoio direto na Pousada Valle do Sol (Morro do Progresso) e na R. Senador Dantas (Morro da Caixa d'Água).
              </div>
            </div>
          </div>
        </section>

        {/* 3. METODOLOGIA DOS RAIOS DE AÇÃO */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Raios de Ação Calibrados por Densidade de Ovos
              </h2>
              <p className="text-xs text-slate-500">
                Padrão Ministério da Saúde & Fiocruz (Bioecologia do <i>Aedes aegypti</i>)
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
              Toque no dia para ver os alvos
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
          <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                {dadosDia.diaNome}
              </span>
              <h3 className="text-sm sm:text-base font-black mt-1">
                {dadosDia.destaque}
              </h3>
              <p className="text-xs text-slate-300">
                {dadosDia.subtitulo}
              </p>
            </div>
            <div className="text-xs text-slate-300">
              <strong className="text-white font-bold">{dadosDia.alvos.length}</strong> armadilha(s) / ponto(s) de ação
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
                    <span className="text-sm font-black bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-900">
                      {alvo.id}
                    </span>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {alvo.bairro} • Quarteirão {alvo.quarteirao}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {alvo.endereco}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {alvo.ovos > 0 && (
                      <span className="text-xs font-black bg-red-100 text-red-900 px-2 py-1 rounded-xl border border-red-200 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-red-600" />
                        {alvo.ovos} ovos
                      </span>
                    )}
                    <span className={`text-xs font-black text-white px-2 py-1 rounded-xl ${alvo.raioCor}`}>
                      Raio {alvo.raio}
                    </span>
                  </div>
                </div>

                {/* Linha 2: Equipe e Ação Tática */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="font-bold text-slate-700">
                    👤 <strong className="text-slate-900">{alvo.equipe}</strong> • Morador: {alvo.morador}
                  </div>
                  {alvo.raioPratico && (
                    <div className="bg-amber-100/80 border border-amber-300 text-amber-950 font-bold p-2.5 rounded-xl text-xs flex items-start gap-2">
                      <span className="text-base leading-none">📏</span>
                      <div>
                        <strong className="text-amber-900 block mb-0.5">Como delimitar na prática (sem trena):</strong>
                        <span className="font-medium text-amber-950">{alvo.raioPratico}</span>
                      </div>
                    </div>
                  )}
                  <p className="text-slate-600 leading-relaxed">
                    🎯 <strong>Delimitação do Bloqueio:</strong> {alvo.acoes}
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
                    onClick={() => handleAbrirGps(alvo.lat, alvo.lng, alvo.endereco)}
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
                  Nevoeiro Térmico da Sede Urbana e dos Distritos
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
                  Epicentros nos bairros <strong>Progresso (OV-23 - 342 ovos)</strong>, <strong>Centro (OV-10 - 242 ovos)</strong>, Jardim Centenário e Val Paraíso. Prioridade para segunda e terça-feira.
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
                  Destaque para o <strong>2º Distrito (Influência: 557 ovos)</strong>, <strong>Porto Velho (Major Fajardo: 343 ovos)</strong> e Ilha dos Pombos. Área da agente fixa e da volante Delta.
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
          Plano Operacional Semanal de Bloqueio Vetorial • Monitoramento Oficial das 56 Ovitrampas
        </p>
      </footer>

    </div>
  );
}
