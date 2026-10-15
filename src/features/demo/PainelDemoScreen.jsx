import React, { useState, useMemo } from 'react';
import { ShieldCheck, MapPin, Globe, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { PainelAdminSimples } from '../admin/PainelAdminSimples';
import { PainelAcompanhamentoScreen } from '../acompanhamento/PainelAcompanhamentoScreen';
import { PortalPublicoScreen } from '../publico/PortalPublicoScreen';
import { SeletorCampanha } from '../../components/SeletorCampanha';
import { CICLO_ID_ANTERIOR, adaptarArmadilhasParaCiclo } from '../../lib/ciclosOvitrampas';

/**
 * Painel de Demonstração e Apresentação para Grupos (100% Somente Leitura)
 * - Endereços e dados de moradores anonimizados com "XXX".
 * - Coordenadas de GPS, bairros, quarteirões e ovos preservados.
 * - Relatórios em PDF emitidos com marca d'água no fundo: "VERSÃO DEMONSTRAÇÃO".
 * - Funções de cadastro, exclusão, edição e gravação completamente desativadas.
 */
export function PainelDemoScreen(props) {
  const [visao, setVisao] = useState('admin'); // 'admin' | 'acompanhamento' | 'publico'
  const [campanhaDemo, setCampanhaDemo] = useState(CICLO_ID_ANTERIOR);

  const {
    armadilhasDemo = [],
    armadilhasBrutasDemo = [],
    todasLeituras = [],
    cicloAtivo = 'ambas',
    onMudarCiclo,
    userPos,
    outrosAgentes = []
  } = props;

  // Garante que na demonstração os dados exibidos utilizem o ciclo selecionado (padrão Ano Passado com dados)
  const armadilhasDemoAdaptadas = useMemo(() => {
    const base = armadilhasBrutasDemo && armadilhasBrutasDemo.length > 0 ? armadilhasBrutasDemo : armadilhasDemo;
    const adaptadas = adaptarArmadilhasParaCiclo(base, todasLeituras, cicloAtivo, campanhaDemo);
    return adaptadas.map((a) => ({
      ...a,
      moradorNome: 'XXX',
      morador_nome: 'XXX',
      responsavel: 'XXX',
      rua: 'Rua XXXXXXXXX',
      numeroImovel: 'XXX',
      numero_imovel: 'XXX'
    }));
  }, [armadilhasBrutasDemo, armadilhasDemo, todasLeituras, cicloAtivo, campanhaDemo]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 text-slate-900 font-sans select-none overflow-hidden">
      {/* 1. BARRA SUPERIOR DE AVISO DE MODO DEMONSTRAÇÃO */}
      <header className="bg-amber-400 text-slate-950 px-3 sm:px-4 py-2 border-b border-amber-500 shadow-sm shrink-0 z-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🎓</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-tight">
                GPS OVITRAMPAS · MODO DEMONSTRAÇÃO
              </span>
              <span className="text-[10px] font-extrabold uppercase bg-black text-amber-300 px-2 py-0.5 rounded shadow-xs">
                Somente Leitura
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-800 leading-tight">
              Ambiente de apresentação para grupos · Endereços anonimizados com <b>XXX</b> · Relatórios com marca d'água de fundo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-300/80 p-1 rounded-lg border border-amber-500/70">
          <button
            type="button"
            onClick={() => setVisao('admin')}
            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
              visao === 'admin'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-900 hover:bg-amber-400/80'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Painel & Relatórios</span>
          </button>

          <button
            type="button"
            onClick={() => setVisao('acompanhamento')}
            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
              visao === 'acompanhamento'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-900 hover:bg-amber-400/80'
            }`}
          >
            <MapPin size={13} />
            <span>Mapa Acompanhamento</span>
          </button>

          <button
            type="button"
            onClick={() => setVisao('publico')}
            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
              visao === 'publico'
                ? 'bg-black text-white shadow-xs'
                : 'text-slate-900 hover:bg-amber-400/80'
            }`}
          >
            <Globe size={13} />
            <span>Portal Público</span>
          </button>
        </div>
      </header>

      {/* 2. ÁREA DE VISUALIZAÇÃO SELECIONADA */}
      <main className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
        {visao === 'admin' && (
          <PainelAdminSimples
            armadilhas={armadilhasDemoAdaptadas}
            armadilhasBrutas={armadilhasBrutasDemo}
            todasLeituras={todasLeituras}
            cicloAtivo={cicloAtivo}
            onMudarCiclo={onMudarCiclo}
            campanhaAtiva={campanhaDemo}
            onMudarCampanha={setCampanhaDemo}
            userPos={userPos}
            outrosAgentes={outrosAgentes}
            onAtualizarArmadilhas={() => {}}
            isDemo={true}
          />
        )}

        {visao === 'acompanhamento' && (
          <div className="w-full h-full relative">
            <PainelAcompanhamentoScreen
              armadilhas={armadilhasDemoAdaptadas}
              armadilhasBrutas={armadilhasBrutasDemo}
              todasLeituras={todasLeituras}
              cicloAtivo={cicloAtivo}
              onMudarCiclo={onMudarCiclo}
              campanhaAtiva={campanhaDemo}
              onMudarCampanha={setCampanhaDemo}
              userPos={userPos}
              outrosAgentes={outrosAgentes}
              onExcluirArmadilha={() => {}}
              onIrParaLaboratorio={() => {}}
              isDemo={true}
            />
          </div>
        )}

        {visao === 'publico' && (
          <div className="w-full h-full relative">
            <PortalPublicoScreen
              armadilhas={armadilhasDemoAdaptadas}
              todasLeituras={todasLeituras}
              campanhaAtiva={campanhaDemo}
              onMudarCampanha={setCampanhaDemo}
              onVoltar={() => setVisao('admin')}
            />
          </div>
        )}
      </main>
    </div>
  );
}
