import React, { useEffect, useState } from 'react';
import { PainelMapaCalorInterativo } from '../mapa/PainelMapaCalorInterativo';
import { CentralRelatorios } from './CentralRelatorios';
import { CadastroArmadilhas } from './CadastroArmadilhas';
import { SeletorCampanha } from '../../components/SeletorCampanha';
import { CICLO_ID_ANTERIOR, CICLO_ID_ATUAL, CICLO_ID_FEV2025, classificarCampanhaLeitura } from '../../lib/ciclosOvitrampas';

/**
 * Painel do administrador (versao simples, preto no branco):
 *  1. Mapa de calor (quarteirao, calor, pontos, nevoeiro; Ciclo A, B e Ambas; mapa ou satelite)
 *  2. Relatorios em PDF
 *  3. Cadastro (gestao das armadilhas)
 */
const ABAS = [
  ['mapas', 'Mapa de calor'],
  ['relatorios', 'Relatórios'],
  ['gestao', 'Cadastro']
];

export function PainelAdminSimples(props) {
  const [aba, setAba] = useState('mapas');
  const [campanhaHistorica, setCampanhaHistorica] = useState(null);
  const [fundoMapa, setFundoMapa] = useState('satelite'); // fundo dos mapas (tela e PDFs)
  const isDemo = Boolean(props.isDemo);

  // O Header do app tem outro seletor de campanha (Set/2026 | Novo Ciclo). Qualquer troca feita la
  // dispara este evento: sai do historico para o mapa nao ficar preso em Fev/2025.
  useEffect(() => {
    const sairDoHistorico = () => setCampanhaHistorica(null);
    window.addEventListener('ovitrampa_campanha_alterada', sairDoHistorico);
    return () => window.removeEventListener('ovitrampa_campanha_alterada', sairDoHistorico);
  }, []);

  const handleMudarCampanhaAdmin = (id) => {
    if (id === CICLO_ID_FEV2025) {
      setCampanhaHistorica(CICLO_ID_FEV2025);
      setAba('mapas');
    } else {
      setCampanhaHistorica(null);
      props.onMudarCampanha?.(id);
    }
  };

  const abasDisponiveis = isDemo
    ? [
        ['mapas', 'Mapa de calor'],
        ['relatorios', 'Relatórios'],
        ['gestao', 'Armadilhas (Somente Leitura)']
      ]
    : ABAS;

  const ehHistorico = campanhaHistorica === CICLO_ID_FEV2025;

  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans select-none overflow-hidden">
      {isDemo && (
        <div className="bg-amber-400 text-slate-950 px-3 py-1.5 text-xs font-black flex items-center justify-between border-b border-amber-500 shadow-xs shrink-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm">👁️</span>
            <span>MODO DEMONSTRAÇÃO (SOMENTE LEITURA)</span>
            <span className="hidden sm:inline font-normal text-[11px] bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400">
              Endereços anonimizados com XXX · Relatórios com marca d'água no fundo · Edição bloqueada
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-amber-300 px-2 py-0.5 rounded">
            Apresentação Segura
          </span>
        </div>
      )}

      <nav className="bg-white border-b border-slate-300 px-3 py-2 shrink-0 flex items-center justify-between gap-2 z-40">
        <div className="flex items-center gap-2">
          {abasDisponiveis.map(([k, r]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                aba === k ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {props.onMudarCampanha && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Ciclo de Gestão:</span>
            <SeletorCampanha
              campanhaAtiva={props.campanhaAtiva}
              campanhaHistorica={campanhaHistorica}
              incluirHistorico={true}
              onMudarCampanha={handleMudarCampanhaAdmin}
              tamanho="compacto"
            />
          </div>
        )}
      </nav>

      {!ehHistorico && aba !== 'mapas' && props.campanhaAtiva === CICLO_ID_ATUAL && (!props.todasLeituras || !props.todasLeituras.some((l) => classificarCampanhaLeitura(l) === CICLO_ID_ATUAL)) && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            <span>
              Você está no <b>Novo Ciclo (2026/2027)</b>, pronto para receber novas coletas (0 leituras até o momento).
              Para visualizar os dados e relatórios das <b>56 armadilhas (113 leituras)</b>, alterne para Set/2026.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleMudarCampanhaAdmin(CICLO_ID_ANTERIOR)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
          >
            Voltar a Set/2026
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {aba === 'mapas' && (
          <PainelMapaCalorInterativo
            {...props}
            campanhaHistorica={campanhaHistorica}
            onMudarCampanhaHistorica={setCampanhaHistorica}
            isDemo={isDemo}
            fundoMapa={fundoMapa}
            onMudarFundoMapa={setFundoMapa}
          />
        )}

        {aba === 'relatorios' && (
          ehHistorico ? (
            <div className="p-8 max-w-lg mx-auto my-12 bg-white border border-slate-300 rounded-2xl shadow-sm text-center">
              <div className="text-3xl mb-3">📜</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Fev/2025 é histórico</h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                Fev/2025 é histórico: só consulta no Mapa de calor. Para relatórios e cadastro, escolha Set/2026 ou Novo Ciclo.
              </p>
              <button
                type="button"
                onClick={() => handleMudarCampanhaAdmin(CICLO_ID_ANTERIOR)}
                className="px-4 py-2 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs"
              >
                Voltar a Set/2026
              </button>
            </div>
          ) : (
            <CentralRelatorios
              armadilhas={props.armadilhas}
              armadilhasBrutas={props.armadilhasBrutas}
              todasLeituras={props.todasLeituras}
              campanhaAtiva={props.campanhaAtiva}
              fundoMapa={fundoMapa}
              onMudarFundoMapa={setFundoMapa}
              isDemo={isDemo}
            />
          )
        )}

        {aba === 'gestao' && (
          ehHistorico ? (
            <div className="p-8 max-w-lg mx-auto my-12 bg-white border border-slate-300 rounded-2xl shadow-sm text-center">
              <div className="text-3xl mb-3">📜</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Fev/2025 é histórico</h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                Fev/2025 é histórico: só consulta no Mapa de calor. Para relatórios e cadastro, escolha Set/2026 ou Novo Ciclo.
              </p>
              <button
                type="button"
                onClick={() => handleMudarCampanhaAdmin(CICLO_ID_ANTERIOR)}
                className="px-4 py-2 bg-black hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs"
              >
                Voltar a Set/2026
              </button>
            </div>
          ) : (
            <CadastroArmadilhas
              armadilhas={props.armadilhas}
              armadilhasBrutas={props.armadilhasBrutas}
              todasLeituras={props.todasLeituras}
              onAtualizarArmadilhas={props.onAtualizarArmadilhas}
              isDemo={isDemo}
            />
          )
        )}
      </div>
    </div>
  );
}
