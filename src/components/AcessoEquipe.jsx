import React, { useState } from 'react';
import { temAcessoEquipe, entrarNaEquipe, sairDaEquipe } from '../lib/acessoEquipe';

/** Botao discreto "Acesso da equipe" (rodape do menu). Pede a chave uma vez por aparelho. */
export function AcessoEquipe() {
  const [ativo, setAtivo] = useState(temAcessoEquipe());
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, setVerificando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setVerificando(true);
    setErro('');
    const r = await entrarNaEquipe(chave);
    setVerificando(false);
    if (r.ok) {
      window.location.reload(); // recarrega para buscar os dados completos com a chave
    } else {
      setErro(r.motivo);
    }
  };

  if (ativo) {
    return (
      <div className="text-[11px] text-slate-600 flex items-center justify-center gap-2">
        <span>Acesso da equipe: <b className="text-black">ativo</b></span>
        <button
          type="button"
          onClick={() => {
            sairDaEquipe();
            setAtivo(false);
            window.location.reload();
          }}
          className="underline"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="text-[11px] text-slate-600 text-center">
      {!aberto ? (
        <button type="button" onClick={() => setAberto(true)} className="underline">
          Acesso da equipe
        </button>
      ) : (
        <form onSubmit={entrar} className="inline-flex flex-wrap items-center justify-center gap-2">
          <input
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="Chave da equipe"
            autoCapitalize="characters"
            autoComplete="off"
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-36 uppercase"
          />
          <button
            type="submit"
            disabled={verificando}
            className="px-3 py-1 rounded-lg border border-black bg-black text-white text-xs font-bold disabled:opacity-50"
          >
            {verificando ? 'Verificando...' : 'Entrar'}
          </button>
          {erro && <span className="w-full text-red-700 font-semibold">{erro}</span>}
        </form>
      )}
    </div>
  );
}
