import React, { useState } from 'react';
import { PainelMapaCalorInterativo } from '../mapa/PainelMapaCalorInterativo';
import { CentralRelatorios } from './CentralRelatorios';
import { CadastroArmadilhas } from './CadastroArmadilhas';

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

  return (
    <div className="w-full h-full flex flex-col bg-white text-black font-sans select-none overflow-hidden">
      <nav className="bg-white border-b border-slate-300 px-3 py-2 shrink-0 flex items-center gap-2 z-40">
        {ABAS.map(([k, r]) => (
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
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {aba === 'mapas' && (
          <PainelMapaCalorInterativo {...props} fundoMapa={fundoMapa} onMudarFundoMapa={setFundoMapa} />
        )}

        {aba === 'relatorios' && (
          <CentralRelatorios
            armadilhas={props.armadilhas}
            armadilhasBrutas={props.armadilhasBrutas}
            todasLeituras={props.todasLeituras}
            fundoMapa={fundoMapa}
            onMudarFundoMapa={setFundoMapa}
          />
        )}

        {aba === 'gestao' && (
          <CadastroArmadilhas
            armadilhas={props.armadilhas}
            armadilhasBrutas={props.armadilhasBrutas}
            todasLeituras={props.todasLeituras}
            onAtualizarArmadilhas={props.onAtualizarArmadilhas}
          />
        )}
      </div>
    </div>
  );
}
