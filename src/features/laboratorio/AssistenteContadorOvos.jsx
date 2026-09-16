import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Upload, ZoomIn, ZoomOut,
  CheckCircle2, X, AlertTriangle, Sparkles, Sliders,
  RefreshCw, Bot, Check, HelpCircle
} from 'lucide-react';
import { analyzeEggImage, calculateEggConfidence } from '../../lib/eggCounter';
import { auditarFotoComGemini } from '../../lib/geminiEggAuditor';

const MAX_IMAGE_EDGE = 1200;
const SENSITIVITY_DEFAULT = 45;

export function AssistenteContadorOvos({
  fotoInicial = null,
  onConfirmar,
  onFechar
}) {
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const imageDataRef = useRef(null);
  const sensitivityTimerRef = useRef(null);

  const [fotoDataUrl, setFotoDataUrl] = useState(fotoInicial);
  const [photoSize, setPhotoSize] = useState({ width: 0, height: 0 });
  const [markers, setMarkers] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [sensitivity, setSensitivity] = useState(SENSITIVITY_DEFAULT);
  const [warning, setWarning] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showSlider, setShowSlider] = useState(false);

  // Estados da Auditoria por IA Gemini
  const [auditandoIA, setAuditandoIA] = useState(false);
  const [laudoIA, setLaudoIA] = useState(null);
  const [erroIA, setErroIA] = useState(null);

  useEffect(() => {
    if (fotoInicial) {
      processarDataUrl(fotoInicial);
    }
  }, []);

  const processarDataUrl = (dataUrl) => {
    const img = new Image();
    img.onload = () => {
      prepararCanvasEAnalisar(img, dataUrl, sensitivity);
    };
    img.src = dataUrl;
  };

  const prepararCanvasEAnalisar = (image, dataUrl, sens) => {
    setAnalyzing(true);
    setFotoDataUrl(dataUrl);
    setLaudoIA(null);
    setErroIA(null);

    try {
      const naturalW = image.naturalWidth || image.width;
      const naturalH = image.naturalHeight || image.height;
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(naturalW, naturalH));
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));

      const prepCanvas = document.createElement('canvas');
      prepCanvas.width = width;
      prepCanvas.height = height;
      const ctx = prepCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Falha ao inicializar o canvas.');

      ctx.drawImage(image, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      imageDataRef.current = imgData;
      setPhotoSize({ width, height });
      setZoom(1);

      const result = analyzeEggImage(imgData.data, width, height, sens);
      const conf = calculateEggConfidence(result);

      setMarkers(result.candidates);
      setWarning(result.warning || '');
      setConfidence(conf);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setWarning('Falha ao analisar a fotografia.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleArquivoSelecionado = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        processarDataUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const recalcularAnalise = useCallback((novaSens) => {
    const imgData = imageDataRef.current;
    if (!imgData) return;
    setAnalyzing(true);
    setTimeout(() => {
      const result = analyzeEggImage(imgData.data, imgData.width, imgData.height, novaSens);
      const conf = calculateEggConfidence(result);
      setMarkers((prev) => {
        const manuais = prev.filter((m) => m.source === 'manual');
        return [...result.candidates, ...manuais];
      });
      setWarning(result.warning || '');
      setConfidence(conf);
      setAnalyzing(false);
    }, 20);
  }, []);

  const handleSensitivityChange = (nova) => {
    const val = Math.min(80, Math.max(20, Math.round(nova)));
    setSensitivity(val);
    if (sensitivityTimerRef.current) clearTimeout(sensitivityTimerRef.current);
    sensitivityTimerRef.current = setTimeout(() => {
      recalcularAnalise(val);
    }, 200);
  };

  // Executa a Auditoria Pericial com IA Gemini 3.6 Flash
  const handleAuditarComGemini = async () => {
    if (!fotoDataUrl) return;
    setAuditandoIA(true);
    setErroIA(null);
    try {
      const resultado = await auditarFotoComGemini(fotoDataUrl);
      setLaudoIA(resultado);
    } catch (err) {
      setErroIA(err.message || 'Não foi possível conectar com a IA do Google.');
    } finally {
      setAuditandoIA(false);
    }
  };

  // Desenhar os anéis no Canvas
  const desenharCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const imgData = imageDataRef.current;
    if (!canvas || !imgData) return;

    canvas.width = imgData.width;
    canvas.height = imgData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(imgData, 0, 0);

    for (const marker of markers) {
      ctx.save();
      const isManual = marker.source === 'manual';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      if (isManual) {
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = '#10b981';
      } else {
        ctx.strokeStyle = '#0284c7';
        ctx.fillStyle = '#0284c7';
      }
      ctx.lineWidth = Math.max(1.8, imgData.width / 450);
      ctx.beginPath();
      if (marker.rx && marker.ry) {
        ctx.ellipse(
          marker.x,
          marker.y,
          marker.rx,
          marker.ry,
          marker.angle ?? -Math.PI / 2,
          0,
          Math.PI * 2
        );
      } else {
        ctx.arc(marker.x, marker.y, marker.radius || 7, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, Math.max(1.2, imgData.width / 600), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [markers]);

  useEffect(() => {
    desenharCanvas();
  }, [desenharCanvas, photoSize]);

  const handlePointerDown = (e) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageDataRef.current) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const hitRadius = Math.max(14, canvas.width / 60);
    let nearestIndex = -1;
    let nearestDist = Infinity;

    markers.forEach((m, idx) => {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= Math.max(hitRadius, (m.radius || 7) + 8) && d < nearestDist) {
        nearestDist = d;
        nearestIndex = idx;
      }
    });

    if (nearestIndex >= 0) {
      setMarkers((prev) => prev.filter((_, idx) => idx !== nearestIndex));
    } else {
      const newMarker = {
        x,
        y,
        radius: Math.max(7, canvas.width / 120),
        rx: Math.max(8, canvas.width / 110),
        ry: Math.max(5, canvas.width / 160),
        angle: 0,
        score: 1,
        source: 'manual'
      };
      setMarkers((prev) => [...prev, newMarker]);
    }
  };

  const handleLimparFoto = () => {
    imageDataRef.current = null;
    setFotoDataUrl(null);
    setPhotoSize({ width: 0, height: 0 });
    setMarkers([]);
    setWarning('');
    setConfidence(null);
    setLaudoIA(null);
    setErroIA(null);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAplicar = () => {
    const totalFinal = laudoIA ? laudoIA.ovos : markers.length;
    if (onConfirmar) {
      onConfirmar(totalFinal, fotoDataUrl, markers, laudoIA);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl max-h-[96vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* CABEÇALHO */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                Assistente de Contagem de Ovos
              </h2>
              <p className="text-[10px] text-slate-400">
                Toque nos ovos para corrigir · Auditoria com IA Gemini
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {markers.length > 0 && (
              <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-xs">
                {laudoIA ? `${laudoIA.ovos} ovos (IA)` : `${markers.length} ovos`}
              </span>
            )}
            <button
              type="button"
              onClick={onFechar}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ÁREA DA FOTO / CANVAS */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center overflow-hidden relative min-h-[300px]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleArquivoSelecionado}
            className="hidden"
          />

          {!fotoDataUrl ? (
            <div className="p-6 text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-white mb-1">
                  Fotografe a Palheta
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tire uma foto bem aproximada e focada dos ovos na palheta para a leitura automática e auditoria por IA.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tirar Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  <span>Galeria</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="w-full h-full overflow-auto flex items-center justify-center p-2 cursor-crosshair relative touch-pinch-zoom"
            >
              {analyzing && (
                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <span className="text-xs font-bold tracking-wider">Identificando ovos localmente...</span>
                </div>
              )}

              {auditandoIA && (
                <div className="absolute inset-0 z-20 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-indigo-400 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">Google Gemini 3.6 Flash</h4>
                    <p className="text-xs text-indigo-200">Examinando morfologia, aglomerados e eliminando sujeiras...</p>
                  </div>
                </div>
              )}

              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                style={{
                  width: `${100 * zoom}%`,
                  maxWidth: zoom === 1 ? '100%' : 'none',
                  imageRendering: 'auto'
                }}
                className="rounded-xl shadow-2xl transition-all duration-100 object-contain"
              />

              {/* CONTROLES DE ZOOM */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-lg text-white text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 10) / 10))}
                  disabled={zoom <= 1}
                  className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded-xl transition-colors"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold px-1 text-[11px] min-w-[2.8rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.5) * 10) / 10))}
                  disabled={zoom >= 3}
                  className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded-xl transition-colors"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* BOTÃO SENSIBILIDADE */}
              <div className="absolute top-3 left-3 z-10">
                <button
                  type="button"
                  onClick={() => setShowSlider((s) => !s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold backdrop-blur-md border shadow-lg transition-all ${
                    showSlider
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Sensibilidade ({sensitivity}%)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PAINEL INFERIOR */}
        {fotoDataUrl && (
          <div className="bg-slate-50 border-t border-slate-200 p-3.5 space-y-2.5 shrink-0 max-h-[46vh] overflow-y-auto">
            
            {/* SLIDER DE SENSIBILIDADE */}
            {showSlider && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-3 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Sensibilidade Local
                  </span>
                  <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {sensitivity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={sensitivity}
                  onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            {/* CARD DE RESULTADO DA IA GEMINI (SE AUDITADO) */}
            {laudoIA && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl p-3 shadow-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-indigo-600" />
                    Laudo Oficial Gemini 3.6 Flash
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {laudoIA.confianca}% Confiança
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-900">{laudoIA.ovos}</span>
                  <span className="text-xs font-bold text-indigo-700 uppercase">
                    ovos confirmados pela IA
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-2 rounded-xl border border-indigo-100">
                  {laudoIA.laudo}
                </p>
                {laudoIA.observacoes && (
                  <p className="text-[10px] text-slate-500 italic">
                    Obs: {laudoIA.observacoes}
                  </p>
                )}
              </div>
            )}

            {/* ERRO DA IA SE HOUVER */}
            {erroIA && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{erroIA}</span>
              </div>
            )}

            {/* AVISO DO DETECTOR LOCAL */}
            {warning && !laudoIA && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{warning}</span>
              </div>
            )}

            {/* RESUMO E BOTÃO DE AUDITORIA GEMINI */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="text-base font-black text-slate-900 flex items-baseline gap-1">
                <span>{laudoIA ? laudoIA.ovos : markers.length}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {laudoIA ? 'ovos (auditado IA)' : 'ovos detectados'}
                </span>
              </div>

              {/* BOTÃO DA IA GEMINI */}
              <button
                type="button"
                onClick={handleAuditarComGemini}
                disabled={auditandoIA}
                className="bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all shrink-0"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{auditandoIA ? 'Auditando...' : 'Conferir com IA'}</span>
              </button>
            </div>

            {/* BOTÕES DE AÇÃO FINAIS */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleLimparFoto}
                className="col-span-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs py-3 rounded-2xl transition-colors active:scale-95"
              >
                Nova Foto
              </button>
              <button
                type="button"
                onClick={handleAplicar}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar ({laudoIA ? laudoIA.ovos : markers.length} Ovos)</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
