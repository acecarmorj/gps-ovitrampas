import React, { useState, useEffect } from 'react';
import {
  Navigation, CheckCircle2, Circle, Flame, ArrowLeft, ArrowRight,
  Calendar, MapPin, Share2, FileText, Check, ShieldAlert, Sparkles,
  Phone, Users, Plus, Minus, RotateCcw
} from 'lucide-react';

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
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.9312450,
        lng: -42.6078120,
        regraSemTrena: 'Vistoriar a pousada + cerca de 6 a 8 casas vizinhas para a direita, 6 a 8 para a esquerda, casas em frente e fundos (R. José Cassane).',
        itensChecklist: [
          'Ralos externos e grelhas de quintal',
          'Piscina / reservatórios de água',
          'Pratos de plantas e bebedouros de animais',
          'Calhas do telhado e caixas d\'água',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-10',
        morador: 'Residência Monitorada',
        bairro: 'Centro',
        quarteirao: 'Q-10',
        endereco: 'Rua Oscar de Souza Curty, 45',
        ovos: 242,
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.9351200,
        lng: -42.6094500,
        regraSemTrena: 'Vistoriar a casa-foco + todas as residências vizinhas entre a R. Maestro Tom Jobim e Cel. Ferreira (foco em quintais murados).',
        itensChecklist: [
          'Baldes e recipientes de água de chuva',
          'Ralos e calhas de fundos',
          'Vasos de plantas e garrafas viradas',
          'Vistoria da tampa da caixa d\'água',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-09',
        morador: 'Residência Monitorada',
        bairro: 'Centro',
        quarteirao: 'Q-10',
        endereco: 'Rua Oscar de Souza Curty, 112',
        ovos: 158,
        nivel: 'Nível de Alerta (P2)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.9358900,
        lng: -42.6091200,
        regraSemTrena: 'Vistoriar a casa-foco + 4 casas de cada lado no mesmo quarteirão Q-10 (comércio e residências).',
        itensChecklist: [
          'Tambores de água e tanques de lavar',
          'Bebedouros de animais e calhas',
          'Descarte de lixo e recipientes plásticos',
          'Eliminação mecânica imediata na visita',
          'Moradores orientados com crachá da Saúde'
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
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.9284500,
        lng: -42.6101200,
        regraSemTrena: 'Vistoriar a casa-foco + extensão do quarteirão Q-06 (R. Celso Carrilho Faria e Jorge Ramos do Valle).',
        itensChecklist: [
          'Tonéis de captação de chuva sem tela',
          'Pratos de vasos e baldes esquecidos',
          'Ralos pluviais e calhas com folhas',
          'Vistoria de caixa d\'água destampada',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-31',
        morador: 'Residência Monitorada',
        bairro: 'Val Paraíso',
        quarteirao: 'Q-04',
        endereco: 'Rua Roberto Simões, 55',
        ovos: 192,
        nivel: 'Nível de Alerta (P2)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.9372100,
        lng: -42.6045300,
        regraSemTrena: 'Vistoriar a casa-foco + vizinhos da R. Roberto Simões e Emanuel de Moraes (quintais em declive).',
        itensChecklist: [
          'Caixas d\'água no nível do solo',
          'Potes de animais em quintais com declive',
          'Lonas e plásticos retendo água',
          'Eliminação física dos criadouros',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-35',
        morador: 'Almir Lemgruber',
        bairro: 'Caixa d\'Água',
        quarteirao: 'Q-13',
        endereco: 'Rua Senador Dantas, 240',
        ovos: 121,
        nivel: 'Nível de Alerta (P2 • Apoio Caminhonete)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.9389100,
        lng: -42.6031200,
        regraSemTrena: 'Vistoriar a residência do Almir + vizinhos da parte alta da Senador Dantas (terrenos baldios e calhas altas).',
        itensChecklist: [
          'Terrenos baldios vizinhos com entulho',
          'Calhas altas de telhado obstruídas',
          'Baldes e tonéis de horta',
          'Recolhimento de materiais com a caminhonete',
          'Moradores orientados com crachá da Saúde'
        ]
      }
    ]
  },
  quarta: {
    diaNome: 'Quarta-Feira (Mutirão)',
    territorio: '2º Distrito (Influência) • 7 Agentes Juntos',
    alvos: [
      {
        id: 'OV-36',
        morador: 'Morador Local',
        bairro: 'Influência',
        quarteirao: 'Q-05',
        endereco: 'Rua Manoel Cirilo, 140',
        ovos: 222,
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.9056157,
        lng: -42.6393661,
        regraSemTrena: 'Mutirão em Conjunto: toda a extensão da Rua Manoel Cirilo (Q-05 inteiro com a força-tarefa da Sede).',
        itensChecklist: [
          'Pneus velhos e implementos agrícolas',
          'Tonéis de 200L para captação de água',
          'Bebedouros de animais e galinheiros',
          'Caixas d\'água sem tampa no solo',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-38',
        morador: 'Independente',
        bairro: 'Influência',
        quarteirao: 'Q-06',
        endereco: 'Rodovia BR-116, KM 12',
        ovos: 210,
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.9062300,
        lng: -42.6385100,
        regraSemTrena: 'Mutirão na Rodovia: todas as borracharias, oficinas mecânicas, carcaças de veículos e galpões ao longo da BR-116.',
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
        nivel: 'Nível de Alerta (P2)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.9071500,
        lng: -42.6402100,
        regraSemTrena: 'Mutirão na Machareth: casas vizinhas, tonéis de captação de chuva e caixas d\'água baixas.',
        itensChecklist: [
          'Tambores de captação de água de chuva',
          'Caixas d\'água baixas em quintais úmidos',
          'Plantas em água e bebedouros de aves',
          'Eliminação mecânica imediata de criadouros',
          'Moradores orientados com crachá da Saúde'
        ]
      }
    ]
  },
  quinta: {
    diaNome: 'Quinta-Feira',
    territorio: 'Porto Velho do Cunha e Ilha dos Pombos',
    alvos: [
      {
        id: 'OV-45',
        morador: 'Morador Local',
        bairro: 'Porto Velho do Cunha',
        quarteirao: 'Q-01',
        endereco: 'Rua Major Fajardo, 601',
        ovos: 241,
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.8791200,
        lng: -42.5482300,
        regraSemTrena: 'Imóvel-Foco + Beira-Rio: Rua Major Fajardo (altura nº 550 ao 650) e faixa ribeirinha.',
        itensChecklist: [
          'Caçambas e carretas com água de chuva',
          'Recipientes plásticos descartados',
          'Quintais que descem até o rio',
          'Caixas d\'água rurais sem vedação',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-44',
        morador: 'Morador Local',
        bairro: 'Porto Velho do Cunha',
        quarteirao: 'Q-10',
        endereco: 'Rua Major Fajardo, 312',
        ovos: 102,
        nivel: 'Nível de Alerta (P2)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.8784500,
        lng: -42.5491100,
        regraSemTrena: 'Imóvel-Foco + Entorno da ESF: Rua Major Fajardo (nº 280 ao 350 ao redor do Posto de Saúde).',
        itensChecklist: [
          'Calhas prediais e canaletas pluviais',
          'Caixas d\'água no nível do chão',
          'Garrafas retornáveis de bebidas',
          'Vistoria minuciosa do posto e vizinhos',
          'Moradores orientados com crachá da Saúde'
        ]
      },
      {
        id: 'OV-41',
        morador: 'Morador Local',
        bairro: 'Ilha dos Pombos',
        quarteirao: 'Q-01',
        endereco: 'Rua Beira Rio, 130',
        ovos: 203,
        nivel: 'Nível Crítico de Emergência (P1)',
        corBadge: 'bg-red-600 text-white',
        lat: -21.8456100,
        lng: -42.5891200,
        regraSemTrena: 'Orla Ribeirinha Completa: toda a extensão da Rua Beira Rio (canoas, embarcações e lonas plásticas).',
        itensChecklist: [
          'Canoas e botes acumulando água',
          'Lonas plásticas estendidas em barrancos',
          'Recipientes e caixas de pesca',
          'Tanques de água para peixe e plantas',
          'Ribeirinhos orientados com crachá da Saúde'
        ]
      }
    ]
  },
  sexta: {
    diaNome: 'Sexta-Feira',
    territorio: 'Barra, Córrego da Prata e Revisão da Sede',
    alvos: [
      {
        id: 'OV-55',
        morador: 'Morador Local',
        bairro: 'Barra de São Francisco',
        quarteirao: 'Q-01',
        endereco: 'Rua Antônio R. Serafim, S/N',
        ovos: 125,
        nivel: 'Nível de Alerta (P2)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.8214500,
        lng: -42.5123400,
        regraSemTrena: 'Quintais Rurais: Rua Antônio R. Serafim e Sebastião Ferreira Costa (bebedouros de animais rurais e tonéis).',
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
        nivel: 'Nível de Alerta (P2)',
        corBadge: 'bg-amber-600 text-white',
        lat: -21.9891200,
        lng: -42.6789100,
        regraSemTrena: 'Entorno da ESF Prata: Rua Benfica e caixas d\'água no nível do solo ao redor do posto de saúde.',
        itensChecklist: [
          'Caixas d\'água baixas em quintais',
          'Calhas do posto de saúde e vizinhos',
          'Garrafas e descartáveis na beira da via',
          'Eliminação mecânica imediata',
          'Moradores orientados com crachá da Saúde'
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
        corBadge: 'bg-blue-600 text-white',
        lat: -21.9333333,
        lng: -42.6083333,
        regraSemTrena: 'Retorno a todos os imóveis que estavam fechados no início da semana para garantir 100% de cobertura.',
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

export function AcaoAgenteScreen({ onVoltar }) {
  const [diaAtivo, setDiaAtivo] = useState('segunda');
  const [indiceAlvo, setIndiceAlvo] = useState(0);
  const [casasVistoriadas, setCasasVistoriadas] = useState(() => {
    try {
      const s = localStorage.getItem('ovitrampa_casas_vistoriadas');
      return s ? JSON.parse(s) : {};
    } catch (_) {
      return {};
    }
  });

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

  // Alterna checkbox
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

  // Ajusta contador de casas
  const ajustarCasas = (delta) => {
    setCasasVistoriadas((prev) => {
      const atual = prev[alvoAtual.id] || 0;
      const novo = Math.max(0, atual + delta);
      const next = { ...prev, [alvoAtual.id]: novo };
      try {
        localStorage.setItem('ovitrampa_casas_vistoriadas', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Concluir alvo e passar para o próximo
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

  // Abrir GPS no Google Maps
  const handleAbrirGps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${alvoAtual.lat},${alvoAtual.lng}`;
    window.open(url, '_blank');
  };

  // Compartilhar status no WhatsApp
  const handleCompartilharWhatsApp = () => {
    const totalChecks = alvoAtual.itensChecklist.filter((_, idx) => checklist[`${alvoAtual.id}_${idx}`]).length;
    const casas = casasVistoriadas[alvoAtual.id] || 0;
    const texto = [
      `🚨 *RELATÓRIO DE CAMPO • ${alvoAtual.id}*`,
      `📍 *Local:* ${alvoAtual.morador} (${alvoAtual.bairro})`,
      `🏠 *Endereço:* ${alvoAtual.endereco}`,
      `🪤 *Carga:* ${alvoAtual.ovos} ovos`,
      `📋 *Criadouros Verificados:* ${totalChecks}/${alvoAtual.itensChecklist.length}`,
      `🏘️ *Casas Vizinhas Vistoriadas:* ${casas} imóveis`,
      `✅ *Status:* ${concluidos[alvoAtual.id] ? 'Concluído' : 'Em andamento'}`,
      '',
      '📲 Registro pelo App GPS Ovitrampas Carmo/RJ'
    ].join('\n');

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const isAlvoConcluido = !!concluidos[alvoAtual.id];
  const numCasas = casasVistoriadas[alvoAtual.id] || 0;

  return (
    <div className="w-full min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col justify-between font-sans select-none pb-8">
      
      {/* 1. TOPO OFICIAL COM BOTÃO VOLTAR & IDENTIFICAÇÃO DO AGENTE */}
      <header className="bg-slate-950/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2">
            {onVoltar && (
              <button
                type="button"
                onClick={onVoltar}
                className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold transition-all"
                title="Voltar ao Menu"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400">
                  Modo Focado do Agente
                </span>
              </div>
              <h1 className="text-sm font-black text-white leading-tight">
                Vigilância Ambiental • Carmo/RJ
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCompartilharWhatsApp}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Enviar status no WhatsApp da equipe"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <a
              href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
              download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold transition-all"
              title="Baixar Ficha em Papel (PDF)"
            >
              <FileText className="w-4 h-4" />
            </a>
          </div>

        </div>
      </header>

      {/* 2. SELETOR DE DIA DA SEMANA (SEGUNDA A SEXTA) */}
      <div className="max-w-md mx-auto w-full px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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
                className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all border ${
                  ativo
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {d.diaNome.split('-')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NAVEGAÇÃO DE PONTOS DO DIA (1 de 3) */}
      <div className="max-w-md mx-auto w-full px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold text-slate-300">{dadosDia.diaNome}:</span>
          <span>{dadosDia.territorio}</span>
        </div>
        <div className="flex items-center gap-1">
          {dadosDia.alvos.map((a, idx) => (
            <button
              key={a.id}
              onClick={() => setIndiceAlvo(idx)}
              className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border transition-all ${
                indiceAlvo === idx
                  ? 'bg-blue-600 text-white border-blue-400 scale-105'
                  : concluidos[a.id]
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {concluidos[a.id] ? '✓' : idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 4. CARD PRINCIPAL: TELA DO CELULAR DO AGENTE (EXATAMENTE COMO NO WIREFRAME) */}
      <main className="max-w-md mx-auto w-full px-4 flex-1 flex flex-col justify-between space-y-3">
        
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
          
          {/* IDENTIFICAÇÃO DO PONTO */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-0.5 rounded-lg">
                {alvoAtual.id}
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${alvoAtual.corBadge}`}>
                {alvoAtual.nivel}
              </span>
            </div>

            <h2 className="text-lg font-black text-white mt-1.5 leading-tight">
              {alvoAtual.morador}
            </h2>
            
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{alvoAtual.bairro} • Quarteirão <strong>{alvoAtual.quarteirao}</strong></span>
            </div>

            <div className="text-xs text-slate-400 mt-0.5 pl-5">
              {alvoAtual.endereco}
            </div>

            {alvoAtual.ovos > 0 && (
              <div className="mt-2.5 bg-red-950/60 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500 animate-bounce" />
                <span>🚨 {alvoAtual.ovos} OVOS DETECTADOS NESTA ARMADILHA</span>
              </div>
            )}
          </div>

          {/* BOTÃO PRINCIPAL: ABRIR ROTA NO GOOGLE MAPS */}
          <div>
            <button
              type="button"
              onClick={handleAbrirGps}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-black text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/30 transition-all border border-blue-400"
            >
              <Navigation className="w-5 h-5 text-white animate-pulse" />
              <span>🗺️ ABRIR ROTA NO GOOGLE MAPS</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-1">
              ➔ Toca aqui e o GPS do celular guia até o portão!
            </p>
          </div>

          <hr className="border-slate-700/80" />

          {/* O QUE FAZER AO CHEGAR (SEM TRENA!) */}
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-3 text-xs space-y-1">
            <div className="font-black text-amber-300 flex items-center gap-1.5">
              <span>🎯</span>
              <span>O QUE FAZER AO CHEGAR (SEM TRENA!):</span>
            </div>
            <p className="text-amber-100 font-medium leading-relaxed italic">
              "{alvoAtual.regraSemTrena}"
            </p>
          </div>

          {/* CHECKLIST NA TELA (TOCA COM O DEDO PARA MARCAR) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📋</span> Checklist de Eliminação:
              </span>
              <span className="text-[11px] text-slate-400">
                Toque com o dedo para marcar
              </span>
            </div>

            <div className="space-y-1.5">
              {alvoAtual.itensChecklist.map((item, idx) => {
                const checked = !!checklist[`${alvoAtual.id}_${idx}`];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center gap-2.5 transition-all ${
                      checked
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200 line-through'
                        : 'bg-slate-900/70 border-slate-700 text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONTADOR DE CASAS VIZINHAS VISTORIADAS */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-white">
                Casas Vizinhas Vistoriadas:
              </div>
              <div className="text-[11px] text-slate-400">
                Meta: 6 a 8 casas de cada lado
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => ajustarCasas(-1)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black flex items-center justify-center border border-slate-600"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="w-10 text-center font-black text-base text-emerald-400">
                {numCasas}
              </span>

              <button
                type="button"
                onClick={() => ajustarCasas(1)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black flex items-center justify-center border border-slate-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* BOTÃO PRINCIPAL DE CONCLUSÃO DO ALVO */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleConcluirAlvo}
            className={`w-full font-black text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all ${
              isAlvoConcluido
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-emerald-900/40'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              {isAlvoConcluido
                ? '✅ ALVO CONCLUÍDO • PASSAR PARA O PRÓXIMO'
                : '✅ CONCLUIR E PASSAR PARA A PRÓXIMA CASA'}
            </span>
          </button>

          {/* Navegação entre alvos */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <button
              type="button"
              disabled={indiceAlvo === 0}
              onClick={() => setIndiceAlvo(indiceAlvo - 1)}
              className="flex items-center gap-1 disabled:opacity-30 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Alvo Anterior</span>
            </button>

            <span className="font-bold text-slate-300">
              Ponto {indiceAlvo + 1} de {dadosDia.alvos.length}
            </span>

            <button
              type="button"
              disabled={indiceAlvo === dadosDia.alvos.length - 1}
              onClick={() => setIndiceAlvo(indiceAlvo + 1)}
              className="flex items-center gap-1 disabled:opacity-30 hover:text-white"
            >
              <span>Próximo Alvo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </main>

      {/* RODAPÉ DISCRETO */}
      <footer className="text-center pt-3 text-[11px] text-slate-500">
        Prefeitura Municipal de Carmo • SMS • Vigilância Ambiental
      </footer>

    </div>
  );
}
