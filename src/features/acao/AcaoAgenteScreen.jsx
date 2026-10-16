import React, { useState } from 'react';
import {
  Navigation, CheckCircle2, Circle, Flame, ArrowLeft, ArrowRight,
  Calendar, MapPin, Share2, FileText, Check, ChevronDown, ChevronUp,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { MapaVistoriaAcao } from './MapaVistoriaAcao';

const ALVOS_POR_DIA = {
  segunda: {
    diaNome: 'Segunda-Feira',
    territorio: 'Progresso e Centro',
    alvos: [
      {
        id: 'OV-23',
        morador: 'Pousada Valle do Sol',
        bairro: 'Progresso',
        quarteirao: 'Q-01',
        endereco: 'Rua Manoel José de Moraes, 51',
        ovos: 342,
        nivel: 'Nível Crítico de Emergência',
        lat: -21.9312450,
        lng: -42.6078120,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Vistoria completa na pousada e imóveis confrontantes do Q-01 e R. José Cassane. Perímetro Ampliado (200m): Varredura nos quarteirões adjacentes do Progresso.',
        itensChecklist: [
          'Ralos externos e grelhas de quintal',
          'Piscina desativada e reservatórios',
          'Pratos de plantas e bebedouros de animais',
          'Calhas do telhado e caixas d\'água',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-10',
        morador: 'Residência Monitorada',
        bairro: 'Centro',
        quarteirao: 'Q-10',
        endereco: 'Rua Oscar de Souza Curty, 45',
        ovos: 242,
        nivel: 'Nível Crítico de Emergência',
        lat: -21.9351200,
        lng: -42.6094500,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Quarteirão Q-10 entre R. Maestro Tom Jobim e Cel. Ferreira. Perímetro Ampliado (200m): Imóveis comerciais e residenciais confrontantes no Centro.',
        itensChecklist: [
          'Baldes e recipientes de água de chuva',
          'Ralos e calhas de fundos',
          'Vasos de plantas e garrafas viradas',
          'Vistoria da tampa da caixa d\'água',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-09',
        morador: 'Residência Monitorada',
        bairro: 'Centro',
        quarteirao: 'Q-10',
        endereco: 'Rua Oscar de Souza Curty, 112',
        ovos: 158,
        nivel: 'Nível de Alerta',
        lat: -21.9358900,
        lng: -42.6091200,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Extensão da face sul do Q-10. Perímetro Ampliado (200m): Varredura e eliminação de criadouros em comércios e residências adjacentes.',
        itensChecklist: [
          'Tambores de água e tanques de lavar',
          'Bebedouros de animais e calhas',
          'Descarte de lixo e recipientes plásticos',
          'Eliminação mecânica imediata na visita',
          'Moradores orientados'
        ]
      }
    ]
  },
  terca: {
    diaNome: 'Terça-Feira',
    territorio: 'Jd. Centenário, Val Paraíso e Caixa d\'Água',
    alvos: [
      {
        id: 'OV-05',
        morador: 'Residência Monitorada',
        bairro: 'Jardim Centenário',
        quarteirao: 'Q-06',
        endereco: 'Rua Ernesto Wermelinger, 88',
        ovos: 173,
        nivel: 'Nível Crítico de Emergência',
        lat: -21.9284500,
        lng: -42.6101200,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Quarteirão Q-06 (R. Celso Carrilho Faria e Jorge Ramos do Valle). Perímetro Ampliado (200m): Quarteirões circunvizinhos do Jardim Centenário.',
        itensChecklist: [
          'Tonéis de captação de chuva sem tela',
          'Pratos de vasos e baldes esquecidos',
          'Ralos pluviais e calhas com folhas',
          'Vistoria de caixa d\'água destampada',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-31',
        morador: 'Residência Monitorada',
        bairro: 'Val Paraíso',
        quarteirao: 'Q-04',
        endereco: 'Rua Roberto Simões, 55',
        ovos: 192,
        nivel: 'Nível de Alerta',
        lat: -21.9372100,
        lng: -42.6045300,
        delimitacaoBloqueio: 'Núcleo Focal (100m): R. Roberto Simões e Emanuel de Moraes (declive acentuado). Perímetro Ampliado (200m): Residências da encosta e fundos de vale.',
        itensChecklist: [
          'Caixas d\'água no nível do solo',
          'Potes de animais em quintais com declive',
          'Lonas e plásticos retendo água',
          'Eliminação física dos criadouros',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-35',
        morador: 'Almir Lemgruber',
        bairro: 'Caixa d\'Água',
        quarteirao: 'Q-13',
        endereco: 'Rua Senador Dantas, 240',
        ovos: 121,
        nivel: 'Nível de Alerta (Apoio Caminhonete)',
        lat: -21.9389100,
        lng: -42.6031200,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Parte alta da R. Senador Dantas. Perímetro Ampliado (200m): Terrenos baldios, calhas elevadas e quintais de encosta.',
        itensChecklist: [
          'Terrenos baldios vizinhos com entulho',
          'Calhas altas de telhado obstruídas',
          'Baldes e tonéis de horta',
          'Recolhimento de materiais com a caminhonete',
          'Moradores orientados'
        ]
      }
    ]
  },
  quarta: {
    diaNome: 'Quarta-Feira',
    territorio: 'Influência (2º Dist.) • Mutirão Integrado',
    alvos: [
      {
        id: 'OV-36',
        morador: 'Morador Local',
        bairro: 'Influência',
        quarteirao: 'Q-05',
        endereco: 'Rua Manoel Cirilo, 140',
        ovos: 222,
        nivel: 'Nível Crítico (Mutirão 7 Agentes)',
        lat: -21.9056157,
        lng: -42.6393661,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Toda a extensão habitada da Rua Manoel Cirilo (Q-05). Perímetro Ampliado (200m): Eixo central de Influência e quintais rurais confrontantes.',
        itensChecklist: [
          'Pneus velhos e implementos agrícolas',
          'Tonéis de 200L para captação de água',
          'Bebedouros de animais e galinheiros',
          'Caixas d\'água sem tampa no solo',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-38',
        morador: 'Independente',
        bairro: 'Influência',
        quarteirao: 'Q-06',
        endereco: 'Rodovia BR-116, KM 12',
        ovos: 210,
        nivel: 'Nível Crítico (Mutirão 7 Agentes)',
        lat: -21.9062300,
        lng: -42.6385100,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Borracharias, oficinas mecânicas e galpões da BR-116. Perímetro Ampliado (200m): Faixa marginal da rodovia e imóveis adjacentes.',
        itensChecklist: [
          'Pilhas de pneus de caminhão e trator',
          'Carcaças de veículos abertas à chuva',
          'Barris de lavagem de peças com água',
          'Valas e canaletas com água estagnada',
          'Proprietários de oficinas notificados'
        ]
      },
      {
        id: 'OV-51',
        morador: 'Morador Local',
        bairro: 'Influência',
        quarteirao: 'Q-11',
        endereco: 'Rua Maria da Silva Machareth, 182',
        ovos: 109,
        nivel: 'Nível de Alerta',
        lat: -21.9071500,
        lng: -42.6402100,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Residências da Rua Maria da Silva Machareth. Perímetro Ampliado (200m): Tonéis e caixas d\'água baixas nos quarteirões adjacentes.',
        itensChecklist: [
          'Tambores de captação de água de chuva',
          'Caixas d\'água baixas em quintais úmidos',
          'Plantas em água e bebedouros de aves',
          'Eliminação mecânica imediata de criadouros',
          'Moradores orientados'
        ]
      }
    ]
  },
  quinta: {
    diaNome: 'Quinta-Feira',
    territorio: 'Porto Velho e Ilha dos Pombos',
    alvos: [
      {
        id: 'OV-45',
        morador: 'Morador Local',
        bairro: 'Porto Velho do Cunha',
        quarteirao: 'Q-01',
        endereco: 'Rua Major Fajardo, 601',
        ovos: 241,
        nivel: 'Nível Crítico de Emergência',
        lat: -21.8791200,
        lng: -42.5482300,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Rua Major Fajardo (altura nº 550 ao 650). Perímetro Ampliado (200m): Faixa ribeirinha do Rio Paraíba e residências do entorno.',
        itensChecklist: [
          'Caçambas e carretas com água de chuva',
          'Recipientes plásticos descartados',
          'Quintais que descem até o rio',
          'Caixas d\'água rurais sem vedação',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-44',
        morador: 'Morador Local',
        bairro: 'Porto Velho do Cunha',
        quarteirao: 'Q-10',
        endereco: 'Rua Major Fajardo, 312',
        ovos: 102,
        nivel: 'Nível de Alerta',
        lat: -21.8784500,
        lng: -42.5491100,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Entorno imediato da Unidade de Saúde (ESF Porto Velho). Perímetro Ampliado (200m): Residências do eixo principal da Major Fajardo.',
        itensChecklist: [
          'Calhas prediais e canaletas pluviais',
          'Caixas d\'água no nível do chão',
          'Garrafas retornáveis de bebidas',
          'Vistoria minuciosa do posto e vizinhos',
          'Moradores orientados'
        ]
      },
      {
        id: 'OV-41',
        morador: 'Morador Local',
        bairro: 'Ilha dos Pombos',
        quarteirao: 'Q-01',
        endereco: 'Rua Beira Rio, 130',
        ovos: 203,
        nivel: 'Nível Crítico de Emergência',
        lat: -21.8456100,
        lng: -42.5891200,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Orla ribeirinha habitada de Ilha dos Pombos. Perímetro Ampliado (200m): Embarcações atracadas, lonas plásticas e depósitos ribeirinhos.',
        itensChecklist: [
          'Canoas e botes acumulando água',
          'Lonas plásticas estendidas em barrancos',
          'Recipientes e caixas de pesca',
          'Tanques de água para peixe e plantas',
          'Ribeirinhos orientados'
        ]
      }
    ]
  },
  sexta: {
    diaNome: 'Sexta-Feira',
    territorio: 'Barra, Prata e Revisão da Sede',
    alvos: [
      {
        id: 'OV-55',
        morador: 'Morador Local',
        bairro: 'Barra de São Francisco',
        quarteirao: 'Q-01',
        endereco: 'Rua Antônio R. Serafim, S/N',
        ovos: 125,
        nivel: 'Nível de Alerta',
        lat: -21.8214500,
        lng: -42.5123400,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Residências rurais da Rua Antônio R. Serafim. Perímetro Ampliado (200m): Tonéis de captação e bebedouros de animais nas propriedades rurais.',
        itensChecklist: [
          'Bebedouros de gado, cavalos e porcos',
          'Tambores de armazenamento de água',
          'Pneus usados em cercas e mourões',
          'Valas de irrigação e caixas baixas',
          'Moradores rurais orientados'
        ]
      },
      {
        id: 'OV-48',
        morador: 'Morador Local',
        bairro: 'Córrego da Prata',
        quarteirao: 'Q-01',
        endereco: 'Rua Benfica, 48 (ESF)',
        ovos: 121,
        nivel: 'Nível de Alerta',
        lat: -21.9891200,
        lng: -42.6789100,
        delimitacaoBloqueio: 'Núcleo Focal (100m): Entorno da Unidade de Saúde (ESF Prata) e Rua Benfica. Perímetro Ampliado (200m): Quarteirões residenciais do distrito.',
        itensChecklist: [
          'Caixas d\'água baixas em quintais',
          'Calhas do posto de saúde e vizinhos',
          'Garrafas e descartáveis na beira da via',
          'Eliminação mecânica imediata',
          'Moradores orientados'
        ]
      },
      {
        id: 'SEDE-REVISAO',
        morador: 'Imóveis Pendentes',
        bairro: 'Sede Urbana (Progresso e Centro)',
        quarteirao: 'Revisão',
        endereco: 'Retorno a Imóveis Fechados',
        ovos: 0,
        nivel: 'Varredura e Retorno a Fechados',
        lat: -21.9333333,
        lng: -42.6083333,
        delimitacaoBloqueio: 'Varredura Integrada: Retorno programado aos imóveis que estavam fechados durante as vistorias de segunda e terça para garantir 100% de cobertura.',
        itensChecklist: [
          'Visita aos imóveis fechados de Segunda',
          'Visita aos imóveis fechados de Terça',
          'Eliminação de criadouros em quintais vazios',
          'Consolidação final dos dados com a Coordenação',
          'Equipe com missão semanal concluída'
        ]
      }
    ]
  }
};

export function AcaoAgenteScreen({ userPos, onVoltar }) {
  const [diaAtivo, setDiaAtivo] = useState('segunda');
  const [indiceAlvo, setIndiceAlvo] = useState(0);
  const [painelAberto, setPainelAberto] = useState(true);

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

  const dadosDia = ALVOS_POR_DIA[diaAtivo];
  const alvoAtual = dadosDia.alvos[indiceAlvo] || dadosDia.alvos[0];

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

  const handleAbrirGps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${alvoAtual.lat},${alvoAtual.lng}`;
    window.open(url, '_blank');
  };

  const handleCompartilharWhatsApp = () => {
    const totalChecks = alvoAtual.itensChecklist.filter((_, idx) => checklist[`${alvoAtual.id}_${idx}`]).length;
    const texto = [
      `🚨 *VISTORIA DE CAMPO • GPS OVITRAMPAS CARMO-RJ*`,
      `📍 *Ponto:* ${alvoAtual.id} • ${alvoAtual.morador}`,
      `🏠 *Endereço:* ${alvoAtual.endereco} (${alvoAtual.bairro} • Quarteirão ${alvoAtual.quarteirao})`,
      `🪤 *Carga Entomológica:* ${alvoAtual.ovos} ovos (${alvoAtual.nivel})`,
      `🔴 *Raio 100m:* Núcleo Focal Prioritário`,
      `🟠 *Raio 200m:* Bloqueio Perifocal (Diretrizes Ministério da Saúde)`,
      `📋 *Checklist:* ${totalChecks}/${alvoAtual.itensChecklist.length} itens inspecionados`,
      `✅ *Status:* ${concluidos[alvoAtual.id] ? 'Concluído' : 'Em andamento'}`,
      '',
      '📲 Vigilância Ambiental • Prefeitura Municipal de Carmo/RJ'
    ].join('\n');

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const isAlvoConcluido = !!concluidos[alvoAtual.id];

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-900 font-sans select-none">
      
      {/* 1. MAPA INTERATIVO EM TELA CHEIA (LEAFLET + ARCGIS) COM OS RAIOS DE 100M E 200M */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapaVistoriaAcao alvo={alvoAtual} userPos={userPos} />
      </div>

      {/* 2. BARRA SUPERIOR FLUTUANTE (SELETOR DE DIAS E ALVOS) */}
      <div className="absolute top-2 left-0 right-0 z-20 px-3 max-w-lg mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-2 pointer-events-auto space-y-2">
          
          {/* Topo do Header: Voltar + Título + Ações */}
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
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black tracking-wider uppercase text-emerald-700">
                    App do Agente de Campo
                  </span>
                </div>
                <h1 className="text-xs font-black text-slate-900 leading-tight">
                  Vistoria & Bloqueio Pós-Ovitrampas
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCompartilharWhatsApp}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                title="Compartilhar no WhatsApp"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <a
                href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                className="p-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                title="Baixar Ficha em Papel (PDF)"
              >
                <FileText className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Abas dos Dias da Semana (Seg a Sex) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
            {Object.keys(ALVOS_POR_DIA).map((chave) => {
              const d = ALVOS_POR_DIA[chave];
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
          <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-100 font-bold">
            <span className="text-slate-600 truncate">
              {dadosDia.territorio}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {dadosDia.alvos.map((a, idx) => (
                <button
                  key={a.id}
                  onClick={() => setIndiceAlvo(idx)}
                  className={`w-6 h-5 rounded-lg text-[10px] font-black flex items-center justify-center border transition-all ${
                    indiceAlvo === idx
                      ? 'bg-blue-600 text-white border-blue-600 scale-105'
                      : concluidos[a.id]
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {concluidos[a.id] ? '✓' : idx + 1}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 3. PAINEL DESLIZANTE INFERIOR (BOTTOM SHEET RETRÁTIL - ESTILO /CAMPO) */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-2.5 sm:p-4 max-w-md mx-auto w-full pointer-events-none">
        
        {/* Barra Recolhida: O Agente pode tocar para expandir */}
        {!painelAberto && (
          <button
            type="button"
            onClick={() => setPainelAberto(true)}
            className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/25 border border-white/80 px-4 py-3 pointer-events-auto text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-9 h-9 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
              <ChevronUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">{alvoAtual.id} • {alvoAtual.morador}</span>
                {alvoAtual.ovos > 0 && (
                  <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">
                    {alvoAtual.ovos} ovos
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
          className={`bg-white/98 sm:bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-300 p-3.5 sm:p-4 space-y-3 pointer-events-auto text-slate-900 max-h-[78dvh] overflow-y-auto ${
            painelAberto ? '' : 'hidden'
          }`}
        >
          {/* Botão de recolher para ver o mapa ampliado */}
          <button
            type="button"
            onClick={() => setPainelAberto(false)}
            className="w-full flex items-center justify-center gap-1.5 -mt-1 pb-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Ocultar e ver mapa ampliado</span>
          </button>

          {/* CABEÇALHO DO IMÓVEL-FOCO */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-xl">
                {alvoAtual.id}
              </span>
              <span className="text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                {alvoAtual.nivel}
              </span>
            </div>

            <h2 className="text-base font-black text-slate-900 leading-tight">
              {alvoAtual.morador}
            </h2>

            <div className="text-xs text-slate-600 font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Bairro {alvoAtual.bairro} • Quarteirão <strong>{alvoAtual.quarteirao}</strong></span>
            </div>

            <div className="text-xs text-slate-500 font-medium pl-4">
              {alvoAtual.endereco}
            </div>

            {alvoAtual.ovos > 0 && (
              <div className="mt-1 bg-red-100 border border-red-200 text-red-950 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
                <span>🚨 {alvoAtual.ovos} OVOS (Epicentro Crítico de Infestação)</span>
              </div>
            )}
          </div>

          {/* BOTÃO AZUL: ABRIR ROTA NO GOOGLE MAPS */}
          <div>
            <button
              type="button"
              onClick={handleAbrirGps}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/20 transition-all border border-blue-700"
            >
              <Navigation className="w-4 h-4 text-white" />
              <span>🗺️ ABRIR ROTA NO GOOGLE MAPS</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-1 font-medium">
              ➔ Toca aqui e o GPS do celular guia até o portão!
            </p>
          </div>

          {/* DELIMITAÇÃO OPERACIONAL DO BLOQUEIO (MINISTÉRIO DA SAÚDE / SES-RJ) */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-xs space-y-1.5">
            <div className="font-black text-amber-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Delimitação Operacional de Bloqueio (MS / SES-RJ):</span>
            </div>
            <p className="text-amber-900 font-medium leading-relaxed">
              {alvoAtual.delimitacaoBloqueio}
            </p>
            <div className="pt-1 border-t border-amber-200/80 text-[10px] text-amber-800 space-y-0.5">
              <div>• <b>Raio 100m (Núcleo Focal):</b> Varredura em 100% dos depósitos lindeiros e confrontantes.</div>
              <div>• <b>Raio 200m (Perímetro MS):</b> Contenção perifocal em até 9 quarteirões em áreas de alta carga.</div>
            </div>
          </div>

          {/* CHECKLIST NA TELA (TOCA COM O DEDO PARA MARCAR) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Checklist de Eliminação:
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Toca com o dedo para marcar
              </span>
            </div>

            <div className="space-y-1">
              {alvoAtual.itensChecklist.map((item, idx) => {
                const checked = !!checklist[`${alvoAtual.id}_${idx}`];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-2.5 transition-all ${
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
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTÃO VERDE PRINCIPAL: CONCLUIR E PASSAR PARA A PRÓXIMA CASA */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleConcluirAlvo}
              className={`w-full font-black text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all ${
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
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold mt-2">
              <button
                type="button"
                disabled={indiceAlvo === 0}
                onClick={() => setIndiceAlvo(indiceAlvo - 1)}
                className="flex items-center gap-1 disabled:opacity-30 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ponto Anterior</span>
              </button>

              <span className="text-slate-700">
                Alvo {indiceAlvo + 1} de {dadosDia.alvos.length}
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
