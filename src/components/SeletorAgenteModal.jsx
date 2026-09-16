import React from 'react';
import { User, Check, X, Users, Radio } from 'lucide-react';
import { AGENTES_DISPONIVEIS, getMeuAgente, setMeuAgente } from '../lib/agentLiveTracking';

export function SeletorAgenteModal({ aberto, onClose, onAgenteSelecionado }) {
  if (!aberto) return null;

  const atual = getMeuAgente();

  const handleEscolher = (ag) => {
    const novo = setMeuAgente(ag.id, ag.label);
    if (onAgenteSelecionado) onAgenteSelecionado(novo);
    if (onClose) onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Quem é Você?</h3>
              <p className="text-[10px] text-slate-500 font-medium">Selecione seu crachá de campo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto p-0.5">
          {AGENTES_DISPONIVEIS.map((ag) => {
            const isSelecionado = atual.id === ag.id;
            return (
              <button
                key={ag.id}
                type="button"
                onClick={() => handleEscolher(ag)}
                className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-black transition-all active:scale-95 ${
                  isSelecionado
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <span>{ag.label}</span>
                {isSelecionado ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[10px] text-blue-900 leading-tight">
          💡 <strong>Dica:</strong> Seus colegas verão seu crachá em tempo real no mapa de Carmo-RJ.
        </div>
      </div>
    </div>
  );
}
