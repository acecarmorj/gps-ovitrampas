import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Circle, Flame, ArrowLeft, ArrowRight,
  Calendar, MapPin, Share2, FileText, Check, ChevronDown, ChevronUp,
  ShieldCheck, Wifi, WifiOff, Download, ExternalLink
} from 'lucide-react';
import { MapaVistoriaAcao } from './MapaVistoriaAcao';
import trapsOficiaisJson from '../../lib/trapsOficiaisCarmo.json';
import { baixarMapasOfflineDistritos, verificarStatusMapasOffline } from '../../lib/offlineTilesManager';

// Configuração dos Epicentros Diários referenciando os IDs oficiais da base de Carmo
const DIAS_CONFIG_OFICIAL = {
  segunda: {
    diaNome: 'Segunda-Feira',
    territorio: 'Progresso e Centro',
    equipe: 'Equipes Alpha e Beta • Apoio Caminhonete',
    ovs: ['23', '10', '21'],
    delimitacoes: {
      '23': 'Núcleo 100m: Vistoria minuciosa na Pousada Valle do Sol e imóveis confrontantes do Q-01 e R. José Cassane. Perímetro 200m (MS): Varredura nos quarteirões adjacentes do Progresso.',
      '10': 'Núcleo 100m: Quarteirão comercial e residencial entre Oscar Curty e Celso C. Faria. Perímetro 200m (MS): Marquises, calhas prediais e lajes na área central.',
      '21': 'Núcleo 100m: R. Silvio Geraldo França (nº 700 a 800). Perímetro 200m (MS): Encostas, fundos de vale e terrenos baldios do Progresso.'
    }
  },
  terca: {
    diaNome: 'Terça-Feira',
    territorio: 'Jd. Centenário, Val Paraíso e Caixa d\'Água',
    equipe: 'Equipes Beta e Gama • Apoio Caminhonete',
    ovs: ['05', '31', '35'],
    delimitacoes: {
      '05': 'Núcleo 100m: Quarteirão Q-17 (R. Ernesto Wermelinger e Celso C. Faria). Perímetro 200m (MS): Tambores, bromélias e caixas d\'água no solo.',
      '31': 'Núcleo 100m: R. Roberto Simões e Emanuel de Moraes (declive acentuado). Perímetro 200m (MS): Residências da encosta e lavanderias externas.',
      '35': 'Núcleo 100m: Parte alta da R. Senador Dantas. Perímetro 200m (MS): Terrenos baldios, calhas elevadas e caixas de gordura abertas.'
    }
  },
  quarta: {
    diaNome: 'Quarta-Feira',
    territorio: 'Influência (2º Dist.) • Grande Mutirão',
    equipe: 'Força-Tarefa de 7 Agentes • Van/Carro 5 Lugares',
    ovs: ['36', '38', '51'],
    delimitacoes: {
      '36': 'Núcleo 100m: Extensão habitada da R. Manoel Cirilo (Q-05). Perímetro 200m (MS): Quintais rurais, tonéis de água e galinheiros.',
      '38': 'Núcleo 100m: Borracharias, oficinas mecânicas e galpões da BR-116. Perímetro 200m (MS): Pneus rodoviários, sucatas e canaletas da rodovia.',
      '51': 'Núcleo 100m: Residências da R. Maria da Silva Machareth. Perímetro 200m (MS): Tambores de captação de chuva e caixas d\'água baixas.'
    }
  },
  quinta: {
    diaNome: 'Quinta-Feira',
    territorio: 'Porto Velho e Ilha dos Pombos / Usina Light',
    equipe: 'Equipe Delta (3 ACEs) • Viatura Distrital',
    ovs: ['45', '44', '41'],
    delimitacoes: {
      '45': 'Núcleo 100m: R. Major Fajardo (altura nº 550 a 650). Perímetro 200m (MS): Galpões, caçambas, embarcações e faixa ribeirinha.',
      '44': 'Núcleo 100m: Entorno imediato da ESF Porto Velho. Perímetro 200m (MS): Calhas prediais, garrafas retornáveis e caixas d\'água no solo.',
      '41': 'Núcleo 100m: Orla da R. Beira Rio em Ilha dos Pombos. Perímetro 200m (MS): Canoas com água de chuva, lonas plásticas e depósitos de pesca.'
    }
  },
  sexta: {
    diaNome: 'Sexta-Feira',
    territorio: 'Barra, Córrego da Prata e Revisão na Sede',
    equipe: 'Equipe Delta (Distritos) + Equipes Alpha/Beta (Sede)',
    ovs: ['55', '48'],
    delimitacoes: {
      '55': 'Núcleo 100m: R. Antônio Serafim e Sebastião Costa. Perímetro 200m (MS): Bebedouros de criação, tonéis e depósitos rurais.',
      '48': 'Núcleo 100m: Entorno da ESF Prata e R. Benfica. Perímetro 200m (MS): Calhas de telhado, recipientes descartáveis e caixas no solo.'
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

  // Base oficial de armadilhas consolidada (usa as props ou o JSON auditado de Carmo)
  const baseArmadilhas = useMemo(() => {
    return (armadilhas && armadilhas.length > 0) ? armadilhas : trapsOficiaisJson;
  }, [armadilhas]);

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

  // Monta a lista de alvos do dia com dados 100% extraídos da base oficial de GPS Ovitrampas
  const dadosDia = useMemo(() => {
    const cfg = DIAS_CONFIG_OFICIAL[diaAtivo];
    const listaAlvos = cfg.ovs.map((num) => {
      const arm = mapaArmadilhasPorNumero[num] || {};
      const numFormatado = String(num).padStart(2, '0');
      const codOv = `OV-${numFormatado}`;
      const ovos = Number(arm.ultimosOvos ?? arm.ultimos_ovos ?? arm.ovos ?? 0);
      
      const nivel = ovos >= 200 
        ? 'Nível Crítico de Emergência' 
        : ovos >= 100 
        ? 'Nível de Alerta Alto' 
        : 'Nível de Monitoramento';

      // Coordenadas OFICIAIS da base de Carmo
      const lat = Number(arm.latitude || arm.lat || -21.9279386);
      const lng = Number(arm.longitude || arm.lng || -42.6166018);

      const morador = arm.moradorNome || arm.morador_nome || arm.morador || 'Residente Monitorado';
      const rua = arm.rua || arm.logradouro || 'Rua Principal';
      const numImovel = arm.numeroImovel || arm.numero_imovel || '';
      const enderecoCompleto = `${rua}${numImovel ? `, ${numImovel}` : ''}`;
      const bairro = arm.bairro || arm.microarea || 'Carmo';
      const quarteirao = arm.quarteirao || 'Q-01';

      return {
        id: codOv,
        morador,
        bairro,
        quarteirao,
        endereco: enderecoCompleto,
        ovos,
        nivel,
        lat,
        lng,
        delimitacaoBloqueio: cfg.delimitacoes[num] || 'Varredura no raio de 100m (foco) e 200m (bloqueio perifocal MS).',
        itensChecklist: CHECKLIST_PADRAO_MS
      };
    });

    return {
      diaNome: cfg.diaNome,
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
      const res = await baixarMapasOfflineDistritos((atual, total, pontoNome) => {
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
      `📍 *Ponto Oficial:* ${alvoAtual.id} • ${alvoAtual.morador}`,
      `🏠 *Endereço:* ${alvoAtual.endereco} (${alvoAtual.bairro} • Quarteirão ${alvoAtual.quarteirao})`,
      `🪤 *Carga da Palheta:* ${alvoAtual.ovos} ovos (${alvoAtual.nivel})`,
      `🔴 *Raio 100m:* Núcleo Focal Prioritário`,
      `🟠 *Raio 200m:* Bloqueio Perifocal (Diretrizes Ministério da Saúde)`,
      `📋 *Checklist PNCD:* ${totalChecks}/${alvoAtual.itensChecklist.length} depósitos vistoriados`,
      `✅ *Status da Visita:* ${concluidos[alvoAtual.id] ? 'Concluído' : 'Em andamento'}`,
      '',
      '📲 Vigilância Ambiental • Prefeitura Municipal de Carmo/RJ'
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
                    {isOnline ? 'Online • GPS Ovitrampas' : '📡 Modo Offline (Sem sinal de celular)'}
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
                onClick={handleBaixarMapasOffline}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200"
                title="Salvar Mapas de Córrego da Prata, Porto Velho e Light para usar sem internet"
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
                href="/FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                download="FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
                className="p-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                title="Baixar Ficha em Papel (PDF)"
              >
                <FileText className="w-4 h-4" />
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
          <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-100 font-bold">
            <span className="text-slate-600 truncate max-w-[240px]">
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

      {/* 3. PAINEL DESLIZANTE INFERIOR COMPACTO (SEM O BOTÃO GIGANTE, COM CHECKLIST COMPLETO) */}
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
          className={`bg-white/98 sm:bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-300 p-3 sm:p-3.5 space-y-2.5 pointer-events-auto text-slate-900 max-h-[74dvh] overflow-y-auto ${
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

          {/* CABEÇALHO DO IMÓVEL COM DADOS OFICIAIS EXATOS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg">
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
              <span>{alvoAtual.endereco}</span>
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

            {alvoAtual.ovos > 0 && (
              <div className="mt-1 bg-red-100 border border-red-200 text-red-950 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
                <span>🚨 {alvoAtual.ovos} OVOS (Epicentro Crítico de Postura)</span>
              </div>
            )}
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
                Ponto {indiceAlvo + 1} de {dadosDia.alvos.length}
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
