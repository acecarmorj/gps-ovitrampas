import React, { useState } from 'react';
import { PainelMapaCalorInterativo } from '../mapa/PainelMapaCalorInterativo';
import { CentralRelatorios } from './CentralRelatorios';
import { CadastroArmadilhas } from './CadastroArmadilhas';
import { SeletorCampanha } from '../../components/SeletorCampanha';

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
  const [fundoMapa, setFundoMapa] = useState('satelite'); // fundo dos mapas (tela e PDFs)
  const isDemo = Boolean(props.isDemo);

  const abasDisponiveis = isDemo
    ? [
        ['mapas', 'Mapa de calor'],
        ['relatorios', 'Relatórios'],
        ['gestao', 'Armadilhas (Somente Leitura)']
      ]
    : ABAS;

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
              onMudarCampanha={props.onMudarCampanha}
              tamanho="compacto"
            />
          </div>
        )}
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {aba === 'mapas' && (
          <PainelMapaCalorInterativo {...props} isDemo={isDemo} fundoMapa={fundoMapa} onMudarFundoMapa={setFundoMapa} />
        )}

        {aba === 'relatorios' && (
          <CentralRelatorios
            armadilhas={props.armadilhas}
            armadilhasBrutas={props.armadilhasBrutas}
            todasLeituras={props.todasLeituras}
            campanhaAtiva={props.campanhaAtiva}
            fundoMapa={fundoMapa}
            onMudarFundoMapa={setFundoMapa}
            isDemo={isDemo}
          />
        )}

        {aba === 'gestao' && (
          <CadastroArmadilhas
            armadilhas={props.armadilhas}
            armadilhasBrutas={props.armadilhasBrutas}
            todasLeituras={props.todasLeituras}
            onAtualizarArmadilhas={props.onAtualizarArmadilhas}
            isDemo={isDemo}
          />
        )}
      </div>
    </div>
  );
}
