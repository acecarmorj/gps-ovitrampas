import React, { useEffect, useState } from 'react';
import { X, Download, RefreshCw, ImageOff } from 'lucide-react';
import { listarFotosDeLeituras } from '../../lib/storage';

function nomeArquivo(leitura) {
  const data = leitura.lidaEm ? new Date(leitura.lidaEm) : new Date();
  const dataStr = data.toISOString().slice(0, 10);
  const arm = leitura.numeroArmadilha || 'sem-numero';
  const palheta = (leitura.numeroPalheta || '').replace(/[^\w-]/g, '');
  return `ARM-${arm}_palheta-${palheta || 'X'}_${dataStr}.jpg`;
}

function baixar(dataUrl, nome) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Fotos de palheta ficam guardadas so no aparelho onde foram tiradas (nunca
// vao para o servidor). Esta tela deixa o tecnico baixar cada uma como
// arquivo de verdade, para poder enviar por fora (WhatsApp, e-mail) quando
// precisar delas noutro lugar - por exemplo, mandar para o Claude conferir
// o contador de ovos.
export function FotosSalvasScreen({ onFechar }) {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState([]);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    let vivo = true;
    listarFotosDeLeituras().then((lista) => {
      if (vivo) {
        setItens(lista);
        setCarregando(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  const baixarTodas = async () => {
    setBaixando(true);
    for (const { leitura, foto } of itens) {
      baixar(foto, nomeArquivo(leitura));
      // Pequena pausa: o navegador do celular bloqueia downloads em
      // sequencia muito rapida como se fosse pop-up.
      await new Promise((r) => setTimeout(r, 350));
    }
    setBaixando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-black">Fotos Salvas Neste Aparelho</h2>
            <p className="text-[10px] text-slate-400">
              {carregando ? 'Procurando...' : `${itens.length} foto(s) guardada(s) aqui`}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50">
          {carregando && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-bold">Lendo o armazenamento do aparelho...</span>
            </div>
          )}

          {!carregando && itens.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400 text-center px-6">
              <ImageOff className="w-8 h-8" />
              <p className="text-xs font-bold">Nenhuma foto guardada neste aparelho.</p>
              <p className="text-[11px]">
                As fotos só aparecem aqui se a leitura foi feita neste mesmo celular/navegador.
              </p>
            </div>
          )}

          {!carregando && itens.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {itens.map(({ leitura, foto }) => (
                <div
                  key={leitura.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col"
                >
                  <img src={foto} alt={`Palheta ${leitura.numeroPalheta || ''}`} className="w-full aspect-square object-cover" />
                  <div className="p-2 space-y-1">
                    <p className="text-[11px] font-black text-slate-900 leading-tight">
                      ARM-{leitura.numeroArmadilha} · {leitura.numeroPalheta}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {leitura.ovos ?? 0} ovos ·{' '}
                      {leitura.lidaEm ? new Date(leitura.lidaEm).toLocaleDateString('pt-BR') : '-'}
                    </p>
                    <button
                      type="button"
                      onClick={() => baixar(foto, nomeArquivo(leitura))}
                      className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-black py-1.5 rounded-xl flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Baixar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!carregando && itens.length > 0 && (
          <div className="p-3.5 bg-white border-t border-slate-200 shrink-0 space-y-1.5">
            <button
              type="button"
              onClick={baixarTodas}
              disabled={baixando}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-wider"
            >
              <Download className="w-4 h-4" />
              {baixando ? 'Baixando...' : `Baixar Todas (${itens.length})`}
            </button>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              As fotos vão para a pasta de Downloads do aparelho. Depois é só enviar por WhatsApp,
              e-mail ou anexar aqui no chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
