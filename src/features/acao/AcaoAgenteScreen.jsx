import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Circle, Flame, ArrowLeft, ArrowRight,
  Calendar, MapPin, Share2, FileText, Check, ChevronDown, ChevronUp,
  ShieldCheck, Wifi, WifiOff, Download, ExternalLink, Users, Truck
} from 'lucide-react';
import { MapaVistoriaAcao } from './MapaVistoriaAcao';
import trapsOficiaisJson from '../../lib/trapsOficiaisCarmo.json';
import { baixarMapasOfflineDistritos } from '../../lib/offlineTilesManager';

// Configuração Oficial dos Epicentros Diários (Acumulado das 2 Semanas: Sem A + Sem B = 3.682 ovos)
// Frota Municipal: 1 Carro 5 Lugares + 1 Caminhonete 2 Lugares (Máx. 7 lugares • Sem mutirão > 7 agentes)
// Efetivo: 10 ACEs 100% de Campo (Serviço interno possui equipe própria)
const DIAS_CONFIG_OFICIAL = {
  segunda: {
    diaNome: 'Segunda-Feira',
    pdfPlano: '/PLANO_DE_CAMPO_SEGUNDA_FEIRA.pdf',
    territorio: 'Carmo Sede (Progresso e Centro) + Barra de São Francisco (08h00 às 13h00)',
    equipe: '08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo (5 Duplas) • Carro 5L (4 ACEs na Barra) + 6 ACEs na Sede (Apoio Caminhonete 2L)',
    ovs: ['23', '10', '21', '55', '54', '56'],
    equipePorOv: {
      '23': 'Equipe 3 (2 ACEs) • Sede Urbana (Apoio Caminhonete 2L • 08h00 às 13h00)',
      '10': 'Equipe 4 (2 ACEs) • Sede Urbana (Centro a pé • 08h00 às 13h00)',
      '21': 'Equipe 5 (2 ACEs) • Sede Urbana (Progresso a pé • 08h00 às 13h00)',
      '55': 'Equipe 1 (2 ACEs) • Barra de São Francisco (Carro 5L • 08h00 às 13h00)',
      '54': 'Equipe 2 (2 ACEs) • Barra de São Francisco (Carro 5L • 08h00 às 13h00)',
      '56': 'Equipe 2 (2 ACEs) • Barra de São Francisco (Carro 5L • 08h00 às 13h00)'
    },
    delimitacoes: {
      '23': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Vistoria minuciosa na Pousada Valle do Sol (342 ovos: Sem A 147 + Sem B 195) e imóveis confrontantes do Q-01 e R. José Cassane. Perímetro 200m (MS): Varredura nos quarteirões adjacentes do Progresso com apoio da Caminhonete 2L.',
      '10': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Quarteirão Q-13 entre R. Oscar de Souza Curty e Celso C. Faria (242 ovos: Sem A 41 + Sem B 201). Perímetro 200m (MS): Marquises comerciais, calhas prediais e lajes na área central.',
      '21': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Silvio Geraldo França, altura nº 700 a 800 (100 ovos: Sem A 100 + Sem B 0). Perímetro 200m (MS): Encostas, fundos de vale, tambores e terrenos baldios do Progresso.',
      '55': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Antônio R. Serafim em Barra de São Francisco (125 ovos: Sem A 5 + Sem B 120). Perímetro 200m (MS): Bebedouros de criação rural, tonéis de 200L e depósitos agrícolas.',
      '54': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Sebastião F. da Costa, nº 389 em Barra de São Francisco (74 ovos: Sem A 13 + Sem B 61). Perímetro 200m (MS): Quintais rurais, caixas d\'água baixas e tambores.',
      '56': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Entorno da Escola da Barra na R. Sebastião F. da Costa, nº 10 (69 ovos: Sem A 3 + Sem B 66). Perímetro 200m (MS): Calhas escolares, ralos pluviais e residências vizinhas.'
    }
  },
  terca: {
    diaNome: 'Terça-Feira',
    pdfPlano: '/PLANO_DE_CAMPO_TERCA_FEIRA.pdf',
    territorio: 'Sede Urbana: Val Paraíso, Jd. Centenário, Caixa d\'Água, Morro do Estado e Botafogo (08h00 às 13h00)',
    equipe: '08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo (5 Duplas a pé na Sede) • Apoio Caminhonete 2L',
    ovs: ['31', '05', '35', '28', '16', '12', '13', '34'],
    equipePorOv: {
      '31': 'Equipe 1 (2 ACEs) • Val Paraíso (Encosta • 08h00 às 13h00)',
      '34': 'Equipe 1 (2 ACEs) • Val Paraíso (Av. Edgar Gismonti • 08h00 às 13h00)',
      '05': 'Equipe 2 (2 ACEs) • Jardim Centenário (Q-17 • 08h00 às 13h00)',
      '35': 'Equipe 3 (2 ACEs) • Caixa d\'Água (Apoio Caminhonete 2L • 08h00 às 13h00)',
      '13': 'Equipe 3 (2 ACEs) • Caixa d\'Água (Apoio Caminhonete 2L • 08h00 às 13h00)',
      '28': 'Equipe 4 (2 ACEs) • Morro do Estado (Q-05 • 08h00 às 13h00)',
      '16': 'Equipe 5 (2 ACEs) • Botafogo e Ladeira do Centro (08h00 às 13h00)',
      '12': 'Equipe 5 (2 ACEs) • Ladeira João Alfredo / Centro (08h00 às 13h00)'
    },
    delimitacoes: {
      '31': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Roberto Simões de Araújo e Emanuel de Moraes em Val Paraíso (192 ovos: Sem A 51 + Sem B 141). Perímetro 200m (MS): Residências da encosta, tonéis de chuva e lavanderias externas.',
      '05': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Quarteirão Q-17 na R. Ernesto Wermelinger e Celso C. Faria (173 ovos: Sem A 6 + Sem B 167). Perímetro 200m (MS): Tambores, bromélias e caixas d\'água no solo.',
      '35': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Parte alta da R. Senador Dantas na Caixa d\'Água (121 ovos: Sem A 4 + Sem B 117). Perímetro 200m (MS): Terrenos baldios, calhas elevadas e apoio da Caminhonete 2L para escadas.',
      '28': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Adalberto Pires da Silva, nº 235 no Morro do Estado (95 ovos: Sem A 86 + Sem B 9). Perímetro 200m (MS): Quintais em declive, caixas d\'água destampadas e vasilhames.',
      '16': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Soares Brandão, nº 347 em Botafogo (89 ovos: Sem A 0 + Sem B 89). Perímetro 200m (MS): Vistoria completa no Q-10 pela explosão de postura na Semana B.',
      '12': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Ladeira João Alfredo, nº 40 no Centro (84 ovos: Sem A 64 + Sem B 20). Perímetro 200m (MS): Calhas, ralos externos e muros de contenção.',
      '13': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Ulisses Lengruber, nº 618 na Caixa d\'Água (71 ovos: Sem A 48 + Sem B 23). Perímetro 200m (MS): Reservatórios ao nível do solo e quintais vizinhos do Q-16.',
      '34': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Av. Edgar Gismonti, nº 98 em Val Paraíso (66 ovos: Sem A 0 + Sem B 66). Perímetro 200m (MS): Bloqueio de foco recém-ativado na Semana B no Q-05.'
    }
  },
  quarta: {
    diaNome: 'Quarta-Feira',
    pdfPlano: '/PLANO_DE_CAMPO_QUARTA_FEIRA.pdf',
    territorio: 'Influência (2º Dist.) + Usina Light / Ilha dos Pombos (3º Dist.) + Campo Sede (08h00 às 13h00)',
    equipe: '08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo • 6 ACEs nas Viaturas (Carro 5L + Caminhonete 2L) + 4 ACEs a pé na Sede',
    ovs: ['36', '38', '51', '41', '40', '08', '15'],
    equipePorOv: {
      '36': 'Equipe 1 (2 ACEs) • Influência (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '51': 'Equipe 1 (2 ACEs) • Influência (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '38': 'Equipe 2 (2 ACEs) • Influência / BR-116 (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '41': 'Equipe 3 (2 ACEs) • Usina Light / Ilha dos Pombos (Viatura Distrital • 08h00 às 13h00)',
      '40': 'Equipe 3 (2 ACEs) • Usina Light / Ilha dos Pombos (Viatura Distrital • 08h00 às 13h00)',
      '08': 'Equipe 5 (2 ACEs) • Boa Ideia + Fechados Centro (08h00 às 13h00) | Equipe 4 (2 ACEs): Fechados Progresso/Centenário',
      '15': 'Equipe 5 (2 ACEs) • Boa Ideia + Fechados Centro (08h00 às 13h00) | Equipe 4 (2 ACEs): Fechados Progresso/Centenário'
    },
    delimitacoes: {
      '36': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Extensão habitada da R. Manoel Cirilo da Silva em Influência (222 ovos: Sem A 53 + Sem B 169). Perímetro 200m (MS): Quintais rurais, tonéis de horta e galinheiros.',
      '38': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Margens da BR-116 em Influência (210 ovos: Sem A 25 + Sem B 185). Perímetro 200m (MS): Borracharias, oficinas mecânicas, pneus rodoviários, sucatas e galpões.',
      '51': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Maria da Silva Machareth, nº 182 em Influência (109 ovos: Sem A 3 + Sem B 106). Perímetro 200m (MS): Tambores de captação de chuva e caixas d\'água baixas.',
      '41': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Orla da R. Beira Rio, nº 130 na Usina Light / Ilha dos Pombos (203 ovos: Sem A 40 + Sem B 163). Perímetro 200m (MS): Canoas com água de chuva, lonas plásticas e depósitos de pesca.',
      '40': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Antônio Carlos P. Cabral, nº 34 na Usina Light (66 ovos: Sem A 20 + Sem B 46). Perímetro 200m (MS): Quintais sombreados, calhas e reservatórios domésticos no Q-03.',
      '08': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Entorno da ESF Botafogo na R. Armando Chaves, nº 161 em Boa Ideia (93 ovos: Sem A 64 + Sem B 29). Perímetro 200m (MS): Vistoria a pé na Sede + resgate de imóveis fechados.',
      '15': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Jorge R. do Valle, nº 290 em Boa Ideia (78 ovos: Sem A 78 + Sem B 0). Perímetro 200m (MS): Eliminação de focos residuais no Q-15 + cobertura de fechados na Sede.'
    }
  },
  quinta: {
    diaNome: 'Quinta-Feira',
    pdfPlano: '/PLANO_DE_CAMPO_QUINTA_FEIRA.pdf',
    territorio: 'Porto Velho do Cunha (3º Dist.) + Córrego da Prata (4º Dist.) + Campo Sede (08h00 às 13h00)',
    equipe: '08h00 (Saída do P.A.) às 13h00 • 10 ACEs em Campo • 6 ACEs nas Viaturas (Carro 5L + Caminhonete 2L) + 4 ACEs a pé na Sede',
    ovs: ['45', '44', '48', '49', '03', '04'],
    equipePorOv: {
      '45': 'Equipe 1 (2 ACEs) • Porto Velho do Cunha (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '44': 'Equipe 2 (2 ACEs) • Porto Velho do Cunha (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '48': 'Equipe 3 (2 ACEs) • Córrego da Prata (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '49': 'Equipe 3 (2 ACEs) • Córrego da Prata (Carro 5L / Caminhonete 2L • 08h00 às 13h00)',
      '03': 'Equipe 4 (2 ACEs) • Varredura Jd. Centenário + Encostas (08h00 às 13h00) | Equipe 5 (2 ACEs): Varredura Caixa d\'Água/Botafogo',
      '04': 'Equipe 4 (2 ACEs) • Varredura Jd. Centenário + Encostas (08h00 às 13h00) | Equipe 5 (2 ACEs): Varredura Caixa d\'Água/Botafogo'
    },
    delimitacoes: {
      '45': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Major Fajardo, nº 601 em Porto Velho do Cunha (241 ovos: Sem A 35 + Sem B 206). Perímetro 200m (MS): Galpões, caçambas, embarcações e faixa ribeirinha.',
      '44': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Entorno da ESF Porto Velho na R. Major Fajardo, nº 312 (102 ovos: Sem A 2 + Sem B 100). Perímetro 200m (MS): Calhas prediais, garrafas retornáveis e caixas d\'água no solo.',
      '48': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: Entorno da ESF Córrego da Prata na R. Benfica, nº 48 (121 ovos: Sem A 7 + Sem B 114). Perímetro 200m (MS): Calhas de telhado, recipientes descartáveis e caixas no solo.',
      '49': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Alfredo Ferreira, S/N em Córrego da Prata (62 ovos: Sem A 2 + Sem B 60). Perímetro 200m (MS): Quintais rurais, bebedouros e tonéis de armazenamento.',
      '03': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Carolina França, nº 30 no Jardim Centenário (53 ovos: Sem A 5 + Sem B 48). Perímetro 200m (MS): Varredura complementar a pé nas encostas da Sede.',
      '04': 'Horário Corrido 08h00 às 13h00 (Saída do P.A. às 08h00). Núcleo 100m: R. Alceu Mattos, nº 99 no Jardim Centenário (53 ovos: Sem A 16 + Sem B 37). Perímetro 200m (MS): Varredura complementar no Q-11 + revisão em Caixa d\'Água e Botafogo (Equipe 5).'
    }
  },
  sexta: {
    diaNome: 'Sexta-Feira',
    pdfPlano: '/PLANO_DE_CAMPO_SEXTA_FEIRA.pdf',
    territorio: '08h00 às 12h00: Resgate de Fechados (Sede e Distritos) + 12h00 às 13h00: Reunião no P.A.',
    equipe: '10 ACEs em Campo das 08h00 às 12h00 (3 Duplas Sede + 2 Duplas Distritos) • 12h00 às 13h00: Reunião Geral no P.A. (Ponto de Apoio)',
    ovs: ['23', '10', '31', '05', '36', '45', '41', '55', '48'],
    equipePorOv: {
      '23': 'Equipes 1, 2 e 3 (6 ACEs na Sede das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '10': 'Equipes 1, 2 e 3 (6 ACEs na Sede das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '31': 'Equipes 1, 2 e 3 (6 ACEs na Sede das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '05': 'Equipes 1, 2 e 3 (6 ACEs na Sede das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '36': 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '45': 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '41': 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '55': 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.',
      '48': 'Equipes 4 e 5 (4 ACEs nas Viaturas das 08h00 às 12h00) • 12h00 às 13h00: Reunião no P.A.'
    },
    delimitacoes: {
      '23': '08h00 às 12h00 (Saída do P.A. às 08h00): Retorno obrigatório aos imóveis encontrados fechados ou com recusa no raio de 100m/200m da Pousada Valle do Sol (342 ovos nas 2 semanas). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '10': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate de comércios e residências fechadas no Q-13 do Centro (242 ovos nas 2 semanas). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '31': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate de imóveis pendentes na encosta de Val Paraíso (192 ovos nas 2 semanas). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '05': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate de imóveis fechados no Q-17 do Jardim Centenário (173 ovos nas 2 semanas). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '36': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate motorizado de imóveis pendentes em Influência (OV-36: 222 ovos, OV-38: 210 ovos, OV-51: 109 ovos). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '45': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate motorizado de pendências em Porto Velho do Cunha (OV-45: 241 ovos e OV-44: 102 ovos). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '41': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate motorizado na orla de Ilha dos Pombos / Usina Light (OV-41: 203 ovos). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '55': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate de pendências em Barra de São Francisco (OV-55: 125 ovos). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).',
      '48': '08h00 às 12h00 (Saída do P.A. às 08h00): Resgate de pendências em Córrego da Prata (OV-48: 121 ovos). 12h00 às 13h00: Reunião Geral de Avaliação no P.A. (Ponto de Apoio).'
    }
  }
};

// Checklist padronizado por categorias do Ministério da Saúde (PNCD: A1, A2, B, C, D1, D2, E)
const CHECKLIST_PADRAO_MS = [
  'A1: Caixa d\'água elevada (tampa, vedação, telas)',
  'A2: Tonéis, tambores 200L, barris e cisternas no solo',
  'B: Pratinhos de plantas, vasos e bebedouros de animais',
  'C: Ralos externos, grelhas pluviais, calhas e piscinas',
  'D1: Pneus de carros, caminhões, tratores e implementos',
  'D2: Lixo, entulho, garrafas descartáveis, latas e lonas',
  'E: Criadouros naturais (ocos de árvores, bromélias, pedras)',
  'Moradores orientados e ficha de visita assinada'
];

export function AcaoAgenteScreen({ armadilhas, userPos, onVoltar }) {
  const [diaAtivo, setDiaAtivo] = useState('segunda');
  const [indiceAlvo, setIndiceAlvo] = useState(0);
  const [painelAberto, setPainelAberto] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [statusDownloadOffline, setStatusDownloadOffline] = useState(null);

  // Monitora online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mapa das 56 armadilhas oficiais do JSON para garantir que ovosSem1, ovosSem2 e ovosTotal estejam sempre presentes
  const mapaJsonOficial = useMemo(() => {
    const m = {};
    trapsOficiaisJson.forEach((t) => {
      const numStr = String(t.numero || '').replace(/^OV[-_ ]*/i, '').padStart(2, '0');
      m[numStr] = t;
      m[String(parseInt(numStr, 10))] = t;
    });
    return m;
  }, []);

  // Base oficial de armadilhas consolidada (mescla props com os totais auditados das 2 semanas)
  const baseArmadilhas = useMemo(() => {
    const fonte = (armadilhas && armadilhas.length > 0) ? armadilhas : trapsOficiaisJson;
    return fonte.map((arm) => {
      const numStr = String(arm.numero || '').replace(/^OV[-_ ]*/i, '').padStart(2, '0');
      const of = mapaJsonOficial[numStr] || {};
      const ovosSem1 = Number(of.ovosSem1 ?? arm.ovosSem1 ?? 0);
      const ovosSem2 = Number(of.ovosSem2 ?? arm.ovosSem2 ?? 0);
      const ovosTotal = Number(of.ovosTotal ?? arm.ovosTotal ?? (ovosSem1 + ovosSem2));
      return {
        ...of,
        ...arm,
        ovosSem1,
        ovosSem2,
        ovosTotal,
        ultimosOvos: ovosTotal,
        ultimos_ovos: ovosTotal
      };
    });
  }, [armadilhas, mapaJsonOficial]);

  // Mapa de armadilhas por número ('01', '23', etc.)
  const mapaArmadilhasPorNumero = useMemo(() => {
    const map = {};
    baseArmadilhas.forEach((arm) => {
      const numStr = String(arm.numero || '').replace(/^OV[-_ ]*/i, '').padStart(2, '0');
      map[numStr] = arm;
      map[String(parseInt(numStr, 10))] = arm;
    });
    return map;
  }, [baseArmadilhas]);

  // Monta a lista de alvos do dia com dados 100% extraídos da base oficial das 2 semanas
  const dadosDia = useMemo(() => {
    const cfg = DIAS_CONFIG_OFICIAL[diaAtivo];
    const listaAlvos = cfg.ovs.map((num) => {
      const numFormatado = String(num).padStart(2, '0');
      const arm = mapaArmadilhasPorNumero[numFormatado] || mapaArmadilhasPorNumero[num] || {};
      const codOv = `OV-${numFormatado}`;
      const ovosSem1 = Number(arm.ovosSem1 ?? 0);
      const ovosSem2 = Number(arm.ovosSem2 ?? 0);
      const ovos = Number(arm.ovosTotal ?? arm.ultimosOvos ?? arm.ultimos_ovos ?? arm.ovos ?? (ovosSem1 + ovosSem2));

      const nivel = ovos >= 150
        ? 'Crítico Máximo (Raio 100m/200m)'
        : ovos >= 100
        ? 'Alerta Alto (Raio 80m/200m)'
        : 'Risco Moderado (Raio 50m/200m)';

      // Coordenadas OFICIAIS da base de Carmo
      const lat = Number(arm.latitude || arm.lat || -21.9279386);
      const lng = Number(arm.longitude || arm.lng || -42.6166018);

      const morador = arm.moradorNome || arm.morador_nome || arm.morador || 'Residente Monitorado';
      const rua = arm.rua || arm.logradouro || 'Rua Principal';
      const numImovel = arm.numeroImovel || arm.numero_imovel || '';
      const enderecoCompleto = `${rua}${numImovel ? `, ${numImovel}` : ''}`;
      const bairro = arm.bairro || arm.microarea || 'Carmo';
      const quarteirao = arm.quarteirao || 'Q-01';
      const equipeEscalacao = (cfg.equipePorOv && cfg.equipePorOv[numFormatado]) || (cfg.equipePorOv && cfg.equipePorOv[num]) || cfg.equipe;

      return {
        id: codOv,
        morador,
        bairro,
        quarteirao,
        endereco: enderecoCompleto,
        ovos,
        ovosSem1,
        ovosSem2,
        nivel,
        lat,
        lng,
        equipeEscalacao,
        delimitacaoBloqueio: cfg.delimitacoes[numFormatado] || cfg.delimitacoes[num] || 'Varredura no raio de 100m (foco) e 200m (bloqueio perifocal MS).',
        itensChecklist: CHECKLIST_PADRAO_MS
      };
    });

    return {
      diaNome: cfg.diaNome,
      pdfPlano: cfg.pdfPlano,
      territorio: cfg.territorio,
      equipe: cfg.equipe,
      alvos: listaAlvos
    };
  }, [diaAtivo, mapaArmadilhasPorNumero]);

  const alvoAtual = dadosDia.alvos[indiceAlvo] || dadosDia.alvos[0];

  // Estado local dos checklists
  const [checklist, setChecklist] = useState(() => {
    try {
      const s = localStorage.getItem('ovitrampa_checklist_acao_foco');
      return s ? JSON.parse(s) : {};
    } catch (_) {
      return {};
    }
  });

  const [concluidos, setConcluidos] = useState(() => {
    try {
      const s = localStorage.getItem('ovitrampa_alvos_concluidos');
      return s ? JSON.parse(s) : {};
    } catch (_) {
      return {};
    }
  });

  const toggleCheck = (idx) => {
    const key = `${alvoAtual.id}_${idx}`;
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('ovitrampa_checklist_acao_foco', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleConcluirAlvo = () => {
    setConcluidos((prev) => {
      const next = { ...prev, [alvoAtual.id]: true };
      try {
        localStorage.setItem('ovitrampa_alvos_concluidos', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    if (indiceAlvo < dadosDia.alvos.length - 1) {
      setIndiceAlvo(indiceAlvo + 1);
    }
  };

  // Baixar mapas offline dos distritos
  const handleBaixarMapasOffline = async () => {
    try {
      setStatusDownloadOffline('Iniciando download dos mapas...');
      await baixarMapasOfflineDistritos((atual, total, pontoNome) => {
        setStatusDownloadOffline(`Salvando ${pontoNome} (${atual}/${total})...`);
      });
      setStatusDownloadOffline('✅ Mapas salvos no celular! Funcionam 100% sem internet.');
      setTimeout(() => setStatusDownloadOffline(null), 4000);
    } catch (e) {
      setStatusDownloadOffline('Erro ao salvar mapas. Tente novamente conectado ao Wi-Fi.');
      setTimeout(() => setStatusDownloadOffline(null), 3500);
    }
  };

  const handleCompartilharWhatsApp = () => {
    const totalChecks = alvoAtual.itensChecklist.filter((_, idx) => checklist[`${alvoAtual.id}_${idx}`]).length;
    const texto = [
      `🚨 *VISTORIA DE CAMPO • GPS OVITRAMPAS CARMO-RJ*`,
      `📅 *Dia:* ${dadosDia.diaNome} (${dadosDia.territorio})`,
      `👥 *Equipe Escalada:* ${alvoAtual.equipeEscalacao}`,
      `📍 *Ponto Oficial:* ${alvoAtual.id} • ${alvoAtual.morador}`,
      `🏠 *Endereço:* ${alvoAtual.endereco} (${alvoAtual.bairro} • Quarteirão ${alvoAtual.quarteirao})`,
      `🪤 *Acumulado das 2 Semanas:* ${alvoAtual.ovos} ovos (Sem A: ${alvoAtual.ovosSem1} + Sem B: ${alvoAtual.ovosSem2})`,
      `🔴 *Raio 100m:* Núcleo Focal Prioritário`,
      `🟠 *Raio 200m:* Bloqueio Perifocal (Diretrizes Ministério da Saúde)`,
      `📋 *Checklist PNCD:* ${totalChecks}/${alvoAtual.itensChecklist.length} depósitos vistoriados`,
      `✅ *Status da Visita:* ${concluidos[alvoAtual.id] ? 'Concluído' : 'Em andamento'}`,
      '',
      '📲 Vigilância Ambiental • 10 ACEs em Campo • Prefeitura Municipal de Carmo/RJ'
    ].join('\n');

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const isAlvoConcluido = !!concluidos[alvoAtual.id];

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-900 font-sans select-none">
      
      {/* 1. MAPA INTERATIVO COM TODAS AS 56 ARMADILHAS DE CARMO E OS RAIOS DE 100M E 200M */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapaVistoriaAcao 
          alvo={alvoAtual} 
          todasArmadilhas={baseArmadilhas} 
          userPos={userPos} 
        />
      </div>

      {/* 2. BARRA SUPERIOR FLUTUANTE (SELETOR DE DIAS E CONTROLE OFFLINE) */}
      <div className="absolute top-2 left-0 right-0 z-20 px-3 max-w-lg mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-2 pointer-events-auto space-y-1.5">
          
          {/* Topo do Header: Voltar + Título + Status Conexão + Ações */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {onVoltar && (
                <button
                  type="button"
                  onClick={onVoltar}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                  title="Voltar ao Início"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className="text-[10px] font-black tracking-wider uppercase text-slate-700">
                    {isOnline ? '10 ACEs em Campo • 2 Semanas (A+B)' : '📡 Modo Offline (Sem sinal)'}
                  </span>
                </div>
                <h1 className="text-xs font-black text-slate-900 leading-tight">
                  Vistoria & Bloqueio Pós-Ovitrampas
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleBaixarMapasOffline}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200"
                title="Salvar Mapas de Córrego da Prata, Porto Velho, Influência, Barra e Light para usar sem internet"
              >
                <Download className="w-4 h-4 text-blue-600" />
              </button>

              <button
                type="button"
                onClick={handleCompartilharWhatsApp}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                title="Compartilhar no WhatsApp da equipe"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <a
                href={dadosDia.pdfPlano}
                download
                className="px-2 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 shadow-xs"
                title={`Baixar PDF do Plano de ${dadosDia.diaNome}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF {dadosDia.diaNome.split('-')[0]}</span>
              </a>

              <a
                href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 text-[10px] font-black transition-all flex items-center gap-1"
                title="Baixar Ficha de Campo por Dia (PDF 5 Dias)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fichas Dia</span>
              </a>

              <a
                href="/FICHAS_DE_CAMPO_POR_EQUIPE_1_A_5.pdf"
                download="FICHAS_DE_CAMPO_POR_EQUIPE_1_A_5.pdf"
                className="px-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-800 rounded-xl border border-indigo-200 text-[10px] font-black transition-all flex items-center gap-1"
                title="Baixar Fichas Individuais por Equipe (Equipes 1 a 5)"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Eq 1-5</span>
              </a>
            </div>
          </div>

          {/* Banner de download offline se ativo */}
          {statusDownloadOffline && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 text-[10.5px] font-bold px-2.5 py-1 rounded-xl text-center animate-pulse">
              {statusDownloadOffline}
            </div>
          )}

          {/* Abas dos Dias da Semana (Seg a Sex) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
            {Object.keys(DIAS_CONFIG_OFICIAL).map((chave) => {
              const d = DIAS_CONFIG_OFICIAL[chave];
              const ativo = diaAtivo === chave;
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => {
                    setDiaAtivo(chave);
                    setIndiceAlvo(0);
                  }}
                  className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border text-center ${
                    ativo
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.diaNome.split('-')[0]}
                </button>
              );
            })}
          </div>

          {/* Seletor Rápido de Alvo do Dia */}
          <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5 border-t border-slate-100 font-bold">
            <span className="text-slate-700 truncate text-[10.5px]" title={dadosDia.territorio}>
              {dadosDia.territorio}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {dadosDia.alvos.map((a, idx) => (
                <button
                  key={a.id}
                  onClick={() => setIndiceAlvo(idx)}
                  title={`${a.id} (${a.ovos} ovos nas 2 semanas)`}
                  className={`px-1.5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center border transition-all ${
                    indiceAlvo === idx
                      ? 'bg-blue-600 text-white border-blue-600 scale-105'
                      : concluidos[a.id]
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {concluidos[a.id] ? '✓' : a.id.replace('OV-', '')}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 3. PAINEL DESLIZANTE INFERIOR COMPACTO (COM SOMA DAS 2 SEMANAS, EQUIPE ESCALADA E CHECKLIST) */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-2 sm:p-3.5 max-w-md mx-auto w-full pointer-events-none">
        
        {/* Barra Recolhida */}
        {!painelAberto && (
          <button
            type="button"
            onClick={() => setPainelAberto(true)}
            className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/25 border border-white/80 px-4 py-2.5 pointer-events-auto text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-8 h-8 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
              <ChevronUp className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">{alvoAtual.id} • {alvoAtual.morador}</span>
                {alvoAtual.ovos > 0 && (
                  <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">
                    {alvoAtual.ovos} ovos (A:{alvoAtual.ovosSem1}+B:{alvoAtual.ovosSem2})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                {alvoAtual.endereco} • <strong>{alvoAtual.quarteirao}</strong>
              </p>
            </div>
            <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-xl shrink-0">
              Ver Ficha
            </span>
          </button>
        )}

        {/* Ficha Completa do Imóvel Expandida */}
        <div
          className={`bg-white/98 sm:bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-300 p-3 sm:p-3.5 space-y-2.5 pointer-events-auto text-slate-900 max-h-[75dvh] overflow-y-auto ${
            painelAberto ? '' : 'hidden'
          }`}
        >
          {/* Botão de recolher para liberar visão do mapa */}
          <button
            type="button"
            onClick={() => setPainelAberto(false)}
            className="w-full flex items-center justify-center gap-1.5 -mt-1 pb-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Ocultar ficha e ver o mapa completo</span>
          </button>

          {/* CABEÇALHO DO IMÓVEL COM DADOS OFICIAIS EXATOS DAS 2 SEMANAS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg shrink-0">
                  {alvoAtual.id}
                </span>
                <span className="text-xs font-black text-slate-900 truncate">
                  {alvoAtual.morador}
                </span>
              </div>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                {alvoAtual.nivel}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Bairro {alvoAtual.bairro} • Quarteirão <strong>{alvoAtual.quarteirao}</strong></span>
            </div>

            <div className="text-[11px] text-slate-700 font-medium pl-4 flex items-center justify-between">
              <span className="truncate">{alvoAtual.endereco}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${alvoAtual.lat},${alvoAtual.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 shrink-0 ml-2"
                title="Abrir no Google Maps se desejar rota externa"
              >
                <span>GPS: {alvoAtual.lat.toFixed(5)}, {alvoAtual.lng.toFixed(5)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* SOMA ACUMULADA DAS DUAS SEMANAS (SEM A + SEM B) */}
            <div className="mt-1 bg-red-100 border border-red-200 text-red-950 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
              <span>
                🚨 {alvoAtual.ovos} OVOS nas 2 Semanas (Sem A: {alvoAtual.ovosSem1} + Sem B: {alvoAtual.ovosSem2})
              </span>
            </div>

            {/* EQUIPE ESCALADA E LOGÍSTICA DO DIA */}
            <div className="bg-blue-50 border border-blue-200 text-blue-950 px-2.5 py-1.5 rounded-xl text-[11px] space-y-0.5">
              <div className="font-black flex items-center gap-1.5 text-blue-900">
                <Users className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>{alvoAtual.equipeEscalacao}</span>
              </div>
              <div className="text-[10px] text-blue-800 font-medium flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Logística do Dia: {dadosDia.equipe}</span>
              </div>
            </div>

            {/* BOTÕES DE DOWNLOAD DO PDF DO DIA E FICHA IMPRESSA */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href={dadosDia.pdfPlano}
                download
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-black py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PDF de {dadosDia.diaNome}</span>
              </a>
              <a
                href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10.5px] font-black py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 transition-all shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ficha Impressa</span>
              </a>
            </div>
          </div>

          {/* DELIMITAÇÃO OPERACIONAL DO BLOQUEIO (MS / SES-RJ) */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-2.5 text-xs space-y-1">
            <div className="font-black text-amber-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Delimitação de Bloqueio (Diretrizes MS / SES-RJ):</span>
            </div>
            <p className="text-amber-900 font-medium leading-relaxed text-[11px]">
              {alvoAtual.delimitacaoBloqueio}
            </p>
            <div className="pt-1 border-t border-amber-200/80 text-[10px] text-amber-800 flex items-center justify-between">
              <span>🔴 <b>Raio 100m:</b> Núcleo Focal</span>
              <span>🟠 <b>Raio 200m:</b> Perímetro Oficial MS</span>
            </div>
          </div>

          {/* CHECKLIST COMPLETO DO MINISTÉRIO DA SAÚDE (PNCD) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <span>📋</span> Checklist de Depósitos (PNCD):
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Toque para marcar
              </span>
            </div>

            <div className="space-y-1">
              {alvoAtual.itensChecklist.map((item, idx) => {
                const checked = !!checklist[`${alvoAtual.id}_${idx}`];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`p-2 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-2 transition-all ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 line-through opacity-85'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="text-[11px] leading-tight">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTÃO VERDE PRINCIPAL: CONCLUIR E PASSAR PARA A PRÓXIMA CASA */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={handleConcluirAlvo}
              className={`w-full font-black text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all ${
                isAlvoConcluido
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-emerald-600/30'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isAlvoConcluido
                  ? '✅ IMÓVEL CONCLUÍDO • PRÓXIMO PONTO'
                  : '✅ CONCLUIR E PASSAR PARA A PRÓXIMA CASA'}
              </span>
            </button>

            {/* Navegação entre alvos */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold mt-1.5">
              <button
                type="button"
                disabled={indiceAlvo === 0}
                onClick={() => setIndiceAlvo(indiceAlvo - 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ponto Anterior</span>
              </button>

              <span className="text-slate-700 text-[11px]">
                Ponto {indiceAlvo + 1} de {dadosDia.alvos.length} ({alvoAtual.id})
              </span>

              <button
                type="button"
                disabled={indiceAlvo === dadosDia.alvos.length - 1}
                onClick={() => setIndiceAlvo(indiceAlvo + 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-slate-900"
              >
                <span>Próximo Ponto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
