import React, { useState } from 'react';
import {
  Sparkles, FileText, Send, Copy, Check,
  Bot, HelpCircle, MessageSquare, RefreshCw,
  AlertTriangle, ShieldCheck, ArrowRight, Share2,
  BookOpen, Volume2
} from 'lucide-react';
import {
  gerarBoletimEpidemiologicoOficial,
  gerarAlertaPopulacaoWhatsApp,
  consultarManualSUS
} from '../../lib/geminiAdminIntelligence';

export function PainelInteligenciaIA({ armadilhas = [], leituras = [] }) {
  // Estados do Boletim Oficial
  const [gerandoBoletim, setGerandoBoletim] = useState(false);
  const [boletimTexto, setBoletimTexto] = useState('');
  const [boletimCopiado, setBoletimCopiado] = useState(false);

  // Estados do Alerta Comunitário
  const [gerandoAlerta, setGerandoAlerta] = useState(false);
  const [alertaTexto, setAlertaTexto] = useState('');
  const [alertaCopiado, setAlertaCopiado] = useState(false);

  // Estados do Consultor SUS
  const [pergunta, setPergunta] = useState('');
  const [consultandoSUS, setConsultandoSUS] = useState(false);
  const [respostaSUS, setRespostaSUS] = useState('');
  const [erro, setErro] = useState(null);

  // 1. Gerar Boletim Oficial
  const handleGerarBoletim = async () => {
    setGerandoBoletim(true);
    setErro(null);
    try {
      const texto = await gerarBoletimEpidemiologicoOficial(armadilhas, leituras);
      setBoletimTexto(texto);
    } catch (err) {
      setErro(err.message || 'Falha ao conectar com o Gemini.');
    } finally {
      setGerandoBoletim(false);
    }
  };

  const copiarBoletim = () => {
    if (!boletimTexto) return;
    navigator.clipboard.writeText(boletimTexto);
    setBoletimCopiado(true);
    setTimeout(() => setBoletimCopiado(false), 3000);
  };

  const compartilharBoletimWhatsApp = () => {
    if (!boletimTexto) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(boletimTexto)}`, '_blank');
  };

  // 2. Gerar Alerta para Moradores
  const handleGerarAlerta = async () => {
    setGerandoAlerta(true);
    setErro(null);
    try {
      const texto = await gerarAlertaPopulacaoWhatsApp(armadilhas);
      setAlertaTexto(texto);
    } catch (err) {
      setErro(err.message || 'Falha ao conectar com o Gemini.');
    } finally {
      setGerandoAlerta(false);
    }
  };

  const copiarAlerta = () => {
    if (!alertaTexto) return;
    navigator.clipboard.writeText(alertaTexto);
    setAlertaCopiado(true);
    setTimeout(() => setAlertaCopiado(false), 3000);
  };

  const compartilharAlertaWhatsApp = () => {
    if (!alertaTexto) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(alertaTexto)}`, '_blank');
  };

  // 3. Consultar Manual do SUS
  const handleConsultarSUS = async (duvida = pergunta) => {
    const q = duvida || pergunta;
    if (!q.trim()) return;
    setConsultandoSUS(true);
    setErro(null);
    try {
      const resposta = await consultarManualSUS(q.trim());
      setRespostaSUS(resposta);
    } catch (err) {
      setErro(err.message || 'Falha ao consultar normas do SUS.');
    } finally {
      setConsultandoSUS(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20 select-none font-sans">
      
      {/* CABEÇALHO DO PAINEL (TOUCH ERGONÔMICO) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Inteligência Epidemiológica
              </h2>
              <span className="text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2.5 py-0.5 rounded-full">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Boletins oficiais da SES-RJ, alertas comunitários e consultoria técnica do SUS em um toque.
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center justify-between sm:justify-start gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">Base Territorial</span>
            <span className="text-sm sm:text-base font-black text-amber-400">
              {armadilhas.length} ovitrampas
            </span>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </div>
      </div>

      {erro && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-4 rounded-3xl flex items-center gap-3 text-xs sm:text-sm font-bold shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{erro}</span>
        </div>
      )}

      {/* GRADE EM TABLET: 2 COLUNAS EM PAISAGEM / 1 COLUNA EM RETRATO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. BOLETIM EPIDEMIOLÓGICO OFICIAL */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Boletim Oficial (SES-RJ)
                </h3>
                <p className="text-xs text-slate-500">
                  Calcula IPO e IDO e redige o relatório técnico da semana
                </p>
              </div>
            </div>

            {boletimTexto ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 max-h-72 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {boletimTexto}
              </div>
            ) : (
              <div className="bg-indigo-50/40 border-2 border-dashed border-indigo-200 rounded-2xl p-6 text-center space-y-2">
                <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
                  Toque no botão abaixo para analisar todas as ovitrampas de Carmo e redigir o boletim completo em 3 segundos.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleGerarBoletim}
              disabled={gerandoBoletim}
              className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-wider"
            >
              {gerandoBoletim ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Redigindo Boletim com Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{boletimTexto ? 'Atualizar Boletim' : 'Gerar Boletim Oficial Agora'}</span>
                </>
              )}
            </button>

            {boletimTexto && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={copiarBoletim}
                  className="min-h-[44px] bg-slate-100 hover:bg-slate-200 active:scale-95 border border-slate-200 text-slate-700 font-black text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  {boletimCopiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{boletimCopiado ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
                <button
                  type="button"
                  onClick={compartilharBoletimWhatsApp}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. ALERTAS PARA A POPULAÇÃO */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Alerta WhatsApp (População)
                </h3>
                <p className="text-xs text-slate-500">
                  Mensagem clara destacando os bairros com mais ovos
                </p>
              </div>
            </div>

            {alertaTexto ? (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 max-h-72 overflow-y-auto text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                {alertaTexto}
              </div>
            ) : (
              <div className="bg-purple-50/40 border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-purple-400 mx-auto" />
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
                  Cria um comunicado amigável destacando os bairros prioritários para disparo nos grupos comunitários e redes da Prefeitura.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleGerarAlerta}
              disabled={gerandoAlerta}
              className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all uppercase tracking-wider"
            >
              {gerandoAlerta ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Criando Alerta para Moradores...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{alertaTexto ? 'Recriar Alerta' : 'Gerar Alerta para Moradores'}</span>
                </>
              )}
            </button>

            {alertaTexto && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={copiarAlerta}
                  className="min-h-[44px] bg-slate-100 hover:bg-slate-200 active:scale-95 border border-slate-200 text-slate-700 font-black text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  {alertaCopiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{alertaCopiado ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={compartilharAlertaWhatsApp}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Disparar WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. CONSULTOR TÉCNICO OFICIAL DO SUS (MANUAIS DO MINISTÉRIO DA SAÚDE) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Consultor Técnico Oficial do SUS
            </h3>
            <p className="text-xs text-slate-500">
              Tira dúvidas sobre dosagens de larvicida, normas de controle de vetores e portarias
            </p>
          </div>
        </div>

        {/* ATALHOS RÁPIDOS DE TOQUE EM TABLET (CHIPS GRANDES E CONFORTÁVEIS) */}
        <div>
          <span className="text-[11px] font-extrabold uppercase text-slate-400 block mb-2">
            Perguntas Rápidas (Toque para consultar):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: '💧 Dosagem de Piriproxifem (1.000L)', q: 'Qual a dosagem exata de Piriproxifem recomendada pelo Ministério da Saúde para uma caixa dágua de 1.000 litros?' },
              { label: '🚨 Conduta quando o IPO passa de 40%', q: 'Qual a conduta recomendada pelo Ministério da Saúde quando o Índice de Positividade de Ovitrampas (IPO) ultrapassa 40%?' },
              { label: '📏 Regra de 300m e troca de palhetas', q: 'Qual a distância recomendada entre ovitrampas e qual a periodicidade correta de troca das palhetas segundo a Funasa?' },
              { label: '🔬 Diferença visual Aedes aegypti e albopictus', q: 'Como diferenciar visualmente o Aedes aegypti do Aedes albopictus no microscópio ou lupa?' }
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setPergunta(item.q);
                  handleConsultarSUS(item.q);
                }}
                className="bg-slate-50 hover:bg-indigo-50 active:scale-[0.98] border border-slate-200 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 font-bold text-xs sm:text-sm p-3 rounded-2xl text-left transition-all shadow-xs flex items-center justify-between"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>

        {/* CAMPO DE PERGUNTA LIVRE */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            placeholder="Ou digite sua dúvida sobre controle de vetores ou normas do SUS..."
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConsultarSUS()}
            className="flex-1 min-h-[48px] bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => handleConsultarSUS()}
            disabled={consultandoSUS || !pergunta.trim()}
            className="min-h-[48px] bg-slate-900 hover:bg-indigo-600 active:scale-95 disabled:opacity-40 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm uppercase tracking-wider"
          >
            {consultandoSUS ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>Consultar SUS</span>
          </button>
        </div>

        {/* RESPOSTA TÉCNICA DA IA */}
        {respostaSUS && (
          <div className="bg-gradient-to-r from-amber-50/80 to-indigo-50/80 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 text-xs sm:text-sm space-y-2.5 animate-in fade-in shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Orientação Técnica Baseada nos Manuais Oficiais do Ministério da Saúde:</span>
            </div>
            <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-wrap bg-white/70 p-3.5 rounded-2xl border border-amber-200/60">
              {respostaSUS}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
