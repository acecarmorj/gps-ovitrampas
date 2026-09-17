import React, { useState, useEffect } from 'react';
import {
  Key, Eye, EyeOff, CheckCircle2, AlertTriangle,
  ExternalLink, RefreshCw, X, Trash2, Sparkles, ShieldCheck
} from 'lucide-react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  removerGeminiApiKey,
  testarChaveGemini
} from '../../lib/geminiKeyManager';

export function ModalConfigChaveGemini({ aberto, onFechar, onSalvo }) {
  const [chave, setChave] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [testando, setTestando] = useState(false);
  const [statusTeste, setStatusTeste] = useState(null); // { ok: boolean, msg: string }

  useEffect(() => {
    if (aberto) {
      setChave(getGeminiApiKey());
      setStatusTeste(null);
      setMostrarSenha(false);
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleTestar = async () => {
    if (!chave.trim()) {
      setStatusTeste({ ok: false, msg: 'Digite ou cole uma chave antes de testar.' });
      return;
    }
    setTestando(true);
    setStatusTeste(null);
    try {
      const res = await testarChaveGemini(chave);
      setStatusTeste({ ok: res.ok, msg: res.mensagem });
    } catch (err) {
      setStatusTeste({ ok: false, msg: 'Erro inesperado ao testar conexão.' });
    } finally {
      setTestando(false);
    }
  };

  const handleSalvar = async () => {
    const limpa = chave.trim();
    if (!limpa) {
      removerGeminiApiKey();
      if (onSalvo) onSalvo('');
      onFechar();
      return;
    }

    setTestando(true);
    setStatusTeste(null);
    const res = await testarChaveGemini(limpa);
    setTestando(false);

    if (!res.ok) {
      setStatusTeste({ ok: false, msg: res.mensagem });
      return;
    }

    setGeminiApiKey(limpa);
    setStatusTeste({ ok: true, msg: 'Chave salva com sucesso!' });
    setTimeout(() => {
      if (onSalvo) onSalvo(limpa);
      onFechar();
    }, 400);
  };

  const handleRemover = () => {
    if (window.confirm('Deseja remover a chave configurada deste aparelho?')) {
      removerGeminiApiKey();
      setChave('');
      setStatusTeste({ ok: true, msg: 'Chave removida.' });
      if (onSalvo) onSalvo('');
      setTimeout(() => onFechar(), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* CABEÇALHO */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                Chave da IA Google Gemini
              </h3>
              <p className="text-[10px] text-slate-400">
                Auditoria de ovos e identificação de espécies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CORPO */}
        <div className="p-5 space-y-4">
          
          <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3.5 text-xs text-purple-900 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-black text-purple-950">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Inteligência Artificial Oficial do Google</span>
            </div>
            <p className="text-[11px] text-purple-800/90">
              A contagem microscópica e a identificação taxonômica utilizam o <strong>Google Gemini</strong>. Para ativar no laboratório, insira sua chave gratuita da API do Google AI Studio.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-extrabold text-purple-700 hover:text-purple-900 underline text-[11px]"
            >
              <span>Obter chave gratuita no Google AI Studio (1 minuto)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* INPUT DA CHAVE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
              Chave de API do Gemini (AIzaSy...)
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={chave}
                onChange={(e) => {
                  setChave(e.target.value);
                  setStatusTeste(null);
                }}
                placeholder="Cole sua chave aqui (ex: AIzaSy...)"
                className="w-full bg-slate-50 border border-slate-300 focus:border-purple-500 focus:bg-white rounded-2xl px-3.5 py-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={mostrarSenha ? 'Ocultar chave' : 'Mostrar chave'}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              A chave fica gravada apenas na memória local deste aparelho (armazenamento seguro do navegador).
            </p>
          </div>

          {/* STATUS DO TESTE */}
          {statusTeste && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${
                statusTeste.ok
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusTeste.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 font-medium leading-relaxed">{statusTeste.msg}</span>
            </div>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestar}
                disabled={testando || !chave.trim()}
                className="w-full bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 text-slate-700 font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
              >
                {testando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Testar Chave</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSalvar}
                disabled={testando}
                className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all uppercase tracking-wider"
              >
                {testando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar Chave</span>
                  </>
                )}
              </button>
            </div>

            {getGeminiApiKey() && (
              <button
                type="button"
                onClick={handleRemover}
                className="w-full text-slate-400 hover:text-rose-600 text-[11px] font-bold py-1.5 flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remover chave deste aparelho</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
