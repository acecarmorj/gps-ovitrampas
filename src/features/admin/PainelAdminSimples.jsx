import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PainelAdminScreen } from './PainelAdminScreen';
import { PainelRelatorios } from './PainelRelatorios';

// Porta de entrada do administrador: central de relatorios. O painel
// completo (mapa, tabela, edicao, exclusao) continua inteiro, um clique
// adiante, para nada se perder.
export function PainelAdminSimples(props) {
  const [completo, setCompleto] = useState(false);

  if (completo) {
    return (
      <div className="h-full flex flex-col">
        <button
          type="button"
          onClick={() => setCompleto(false)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-slate-700 bg-white border-b border-slate-200 text-left"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar aos relatórios
        </button>
        <div className="flex-1 min-h-0">
          <PainelAdminScreen {...props} />
        </div>
      </div>
    );
  }

  return <PainelRelatorios armadilhas={props.armadilhas} onAbrirPainelCompleto={() => setCompleto(true)} />;
}
