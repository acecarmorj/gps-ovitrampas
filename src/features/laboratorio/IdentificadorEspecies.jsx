import React, { useState, useRef } from 'react';
import {
  Camera, Upload, Sparkles, Bot, AlertTriangle,
  CheckCircle2, X, RefreshCw, Share2, ShieldAlert, Bug, Key
} from 'lucide-react';
import { identificarEspeciePorFoto } from '../../lib/geminiSpeciesIdentifier';
import { compressImage } from '../../lib/storage';
import { ModalConfigChaveGemini } from './ModalConfigChaveGemini';

export function IdentificadorEspecies() {
  const fileInputRef = useRef(null);
  const galeriaInputRef = useRef(null);
  const [foto, setFoto] = useState(null);
  const [identificando, setIdentificando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [mostrarModalChave, setMostrarModalChave] = useState(false);

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 0.85);
      setFoto(compressed);
      setResultado(null);
      setErro(null);
    } catch (err) {
      alert('Erro ao carregar a foto.');
    }
  };

  const handleIdentificar = async () => {
    if (!foto) return;
    setIdentificando(true);
    setErro(null);
    try {
      const laudo = await identificarEspeciePorFoto(foto);
      setResultado(laudo);
    } catch (err) {
      setErro(err.message || 'Falha ao identificar especie com a IA.');
    } finally {
      setIdentificando(false);
    }
  };

  const handleLimpar = () => {
    setFoto(null);
    setResultado(null);
    setErro(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galeriaInputRef.current) galeriaInputRef.current.value = '';
  };

  const compartilharWhatsApp = () => {
    if (!resultado) return;
    const texto = `*LAUDO ENTOMOLOGICO - CARMO/RJ*\n` +
      `*Especie:* ${resultado.especie} (${resultado.nomePopular})\n` +
      `*Fase:* ${resultado.fase}\n` +
      `*Risco:* ${resultado.riscoEpidemiologico}\n` +
      `*Confianca:* ${resultado.confianca}%\n` +
      `*Caracteristicas:* ${resultado.caracteristicasVisuais}\n` +
      `*Acao:* ${resultado.acaoRecomendada}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Identificador de Espécies por IA
            </h2>
            <p className="text-[11px] text-slate-500">
              Fotografe o mosquito adulto ou larva na lâmina
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMostrarModalChave(true)}
          className="w-8 h-8 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center transition-colors"
          title="Configurar Chave da IA Gemini"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFotoChange}
        className="hidden"
      />
      {/* Campo separado SEM capture: com capture o celular abre a camera
          direto e nunca oferece a galeria. */}
      <input
        type="file"
        ref={galeriaInputRef}
        accept="image/*"
        onChange={handleFotoChange}
        className="hidden"
      />

      {!foto ? (
        <div className="p-6 text-center space-y-3.5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <div className="w-14 h-14 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-0.5">
              Fotografe o Espécime
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Tire foto com boa iluminacao do torax/pernas do mosquito adulto ou da larva para analise do sifao.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Tirar Foto</span>
            </button>
            <button
              type="button"
              onClick={() => galeriaInputRef.current?.click()}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Galeria</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-purple-200 bg-slate-900 max-h-56 flex items-center justify-center">
            <img src={foto} alt="Espécime" className="w-full h-full object-contain max-h-56" />
            <button
              type="button"
              onClick={handleLimpar}
              className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1.5 rounded-xl shadow-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!resultado && (
            <button
              type="button"
              onClick={handleIdentificar}
              disabled={identificando}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all uppercase tracking-wider"
            >
              {identificando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Examinando com Gemini 3.6 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Identificar Espécie com IA</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {erro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1 font-semibold leading-relaxed">{erro}</span>
          </div>
          {(erro.includes('401') || erro.includes('403') || erro.includes('Chave') || erro.includes('configurada')) && (
            <button
              type="button"
              onClick={() => setMostrarModalChave(true)}
              className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all uppercase tracking-wider"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Configurar Chave Google Gemini</span>
            </button>
          )}
        </div>
      )}

      {resultado && (
        <div className="bg-slate-50 border-2 border-purple-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                {resultado.fase}
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1 italic">
                {resultado.especie}
              </h3>
              <p className="text-xs font-bold text-slate-600">
                {resultado.nomePopular}
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              {resultado.confianca}% Certeza
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            resultado.riscoEpidemiologico === 'ALTO' || resultado.riscoEpidemiologico === 'CRÍTICO'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Risco: {resultado.riscoEpidemiologico}
              {resultado.vetorDe?.length > 0 && ` · Transmissor de ${resultado.vetorDe.join(', ')}`}
            </span>
          </div>

          <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <span className="font-black text-slate-700 block uppercase text-[10px]">
              Detalhes Morfológicos Detectados:
            </span>
            <p className="text-slate-600 leading-relaxed">
              {resultado.caracteristicasVisuais}
            </p>
          </div>

          <div className="space-y-1 bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-xs">
            <span className="font-black text-indigo-900 block uppercase text-[10px]">
              Ação Recomendada (Carmo - RJ):
            </span>
            <p className="text-indigo-950 leading-relaxed font-medium">
              {resultado.acaoRecomendada}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleLimpar}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs py-2.5 rounded-xl transition-colors active:scale-95"
            >
              Nova Análise
            </button>
            <button
              type="button"
              onClick={compartilharWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO DA CHAVE GEMINI */}
      <ModalConfigChaveGemini
        aberto={mostrarModalChave}
        onFechar={() => setMostrarModalChave(false)}
        onSalvo={(nova) => {
          setMostrarModalChave(false);
          setErro(null);
          if (nova && foto) {
            setTimeout(() => handleIdentificar(), 200);
          }
        }}
      />
    </div>
  );
}
