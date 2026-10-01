import React, { useState } from 'react';
import { temAcessoEquipe, entrarNaEquipe, sairDaEquipe, getAgente } from '../lib/acessoEquipe';

/**
 * Acesso da equipe: nome do agente + senha simples da equipe (uma vez por aparelho).
 * Libera nome/rua/numero do imovel, permite sincronizar com o servidor e grava quem lancou cada leitura.
 * Props: aberto = ja mostra o formulario (usado no aviso do laboratorio/painel/campo).
 */
export function AcessoEquipe({ aberto: abertoInicial = false }) {
  const [ativo] = useState(temAcessoEquipe());
  const [aberto, setAberto] = useState(abertoInicial);
  const [nome, setNome] = useState(getAgente());
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState('');
  const [verificando, setVerificando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setVerificando(true);
    setErro('');
    const r = await entrarNaEquipe(chave, nome);
    setVerificando(false);
    if (r.ok) {
      window.location.reload(); // recarrega para buscar os dados completos e sincronizar
    } else {
      setErro(r.motivo);
    }
  };

  if (ativo) {
    return (
      <div className="text-[11px] text-slate-600 flex items-center justify-center gap-2 flex-wrap">
        <span>
          Acesso da equipe: <b className="text-black">ativo</b>
          {getAgente() ? <> · Agente: <b className="text-black">{getAgente()}</b></> : null}
        </span>
        <button
          type="button"
          onClick={() => {
            sairDaEquipe();
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
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-32"
          />
          <input
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="Senha da equipe"
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

/** Aviso fixo (laboratorio, painel e campo) enquanto o aparelho nao tem o Acesso da equipe. */
export function AvisoAcessoEquipe() {
  if (temAcessoEquipe()) return null;
  return (
    <div className="bg-white border-b border-black px-3 py-2 text-center">
      <p className="text-[11px] font-bold text-black mb-1">
        Acesso da equipe desligado: os dados ficam salvos só neste aparelho e não sobem para o servidor. Digite seu nome e a senha da equipe.
      </p>
      <AcessoEquipe aberto />
    </div>
  );
}
