import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera, Upload, ZoomIn, ZoomOut,
  CheckCircle2, X, AlertTriangle, Sparkles, Sliders,
  RefreshCw, Bot, Key, Hash, Circle, FileText, Download
} from 'lucide-react';
import { analyzeEggImage } from '../../lib/eggCounter';
import { localizarOvosComGemini } from '../../lib/geminiEggAuditor';
import { numerarEmOrdemDeLeitura, mesclarConferenciaIA, estimarContornoPalheta } from '../../lib/eggAudit';
import { ModalConfigChaveGemini } from './ModalConfigChaveGemini';

// O detector local foi calibrado nesta escala - não mudar sem remedir.
const MAX_IMAGE_EDGE = 1200;
// Resolução guardada só para os quadros da IA (ver geminiEggAuditor.js).
const MAX_FONTE_IA = 2400;
const SENSITIVITY_DEFAULT = 45;
// O canvas é desenhado em 2x para os números continuarem nítidos no zoom.
const ESCALA_DESENHO = 2;
const ZOOM_MAXIMO = 6;

// numero: sobre a foto (claro, contorno preto) · anel: modo círculos ·
// folha: modo "Folha" (fundo branco, como impresso no papel)
const CORES = {
  automatic: { numero: '#38bdf8', anel: '#0284c7', folha: '#0f172a' },
  manual: { numero: '#34d399', anel: '#10b981', folha: '#047857' },
  so_app: { numero: '#fb923c', anel: '#ea580c', folha: '#c2410c' },
  ia: { numero: '#f0abfc', anel: '#c026d3', folha: '#a21caf' }
};

const MODOS = {
  numeros: { proximo: 'circulos', rotulo: 'Números' },
  circulos: { proximo: 'folha', rotulo: 'Círculos' },
  folha: { proximo: 'numeros', rotulo: 'Folha' }
};

function corDoMarker(m) {
  if (m.source === 'manual') return CORES.manual;
  if (m.source === 'ia') return CORES.ia;
  if (m.divergencia === 'so_app') return CORES.so_app;
  return CORES.automatic;
}

function carregarImagem(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function redimensionar(img, ladoMaximo) {
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  const scale = Math.min(1, ladoMaximo / Math.max(naturalW, naturalH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(naturalW * scale));
  canvas.height = Math.max(1, Math.round(naturalH * scale));
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function AssistenteContadorOvos({
  fotoInicial = null,
  onConfirmar,
  onFechar
}) {
  const fileInputRef = useRef(null);
  // Campo separado SEM capture: com capture="environment" o celular abre a
  // camera direto e nunca oferece a galeria - os dois botoes caiam na camera.
  const galeriaInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const imageDataRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const contornoRef = useRef(null);
  const fonteIARef = useRef(null);
  const pontosIARef = useRef(null);
  const markersRef = useRef([]);
  const sensitivityTimerRef = useRef(null);

  const [fotoDataUrl, setFotoDataUrl] = useState(fotoInicial);
  const [photoSize, setPhotoSize] = useState({ width: 0, height: 0 });
  const [markers, setMarkers] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [sensitivity, setSensitivity] = useState(SENSITIVITY_DEFAULT);
  const [warning, setWarning] = useState('');
  const [zoom, setZoom] = useState(1);
  const [showSlider, setShowSlider] = useState(false);
  const [modoExibicao, setModoExibicao] = useState('numeros');

  // Conferência por IA (Gemini, por quadros)
  const [auditandoIA, setAuditandoIA] = useState(false);
  const [progressoIA, setProgressoIA] = useState({ feitos: 0, total: 0 });
  const [auditoria, setAuditoria] = useState(null);
  const [erroIA, setErroIA] = useState(null);
  const [mostrarModalChave, setMostrarModalChave] = useState(false);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    if (fotoInicial) {
      processarDataUrl(fotoInicial);
    }
  }, []);

  const processarDataUrl = async (dataUrl) => {
    setAnalyzing(true);
    setAuditoria(null);
    setErroIA(null);
    pontosIARef.current = null;
    try {
      const img = await carregarImagem(dataUrl);
      // A foto original do celular (12MP+) nao vai para o estado: guarda uma
      // copia de ate 2400px para os quadros da IA e trabalha/salva em 1200px.
      fonteIARef.current = redimensionar(img, MAX_FONTE_IA).toDataURL('image/jpeg', 0.92);
      const base = redimensionar(img, MAX_IMAGE_EDGE);
      baseCanvasRef.current = base;
      setFotoDataUrl(base.toDataURL('image/jpeg', 0.85));

      const imgData = base
        .getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, base.width, base.height);
      imageDataRef.current = imgData;
      contornoRef.current = estimarContornoPalheta(imgData.data, base.width, base.height);
      setPhotoSize({ width: base.width, height: base.height });
      setZoom(1);

      const result = analyzeEggImage(imgData.data, base.width, base.height, sensitivity);
      setMarkers(result.candidates);
      setWarning(result.warning || '');
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
      const manuais = markersRef.current.filter((m) => m.source === 'manual');
      let novos = [...result.candidates, ...manuais];
      // Se a IA ja conferiu, recruza os mesmos pontos dela com as novas
      // marcacoes - nao precisa gastar outra rodada de quadros.
      if (pontosIARef.current) {
        const mescla = mesclarConferenciaIA(novos, pontosIARef.current);
        novos = mescla.markers;
        setAuditoria((prev) => (prev ? { ...prev, ...mescla.resumo } : prev));
      }
      setMarkers(novos);
      setWarning(result.warning || '');
      setAnalyzing(false);
    }, 20);
  }, []);

  const handleSensitivityChange = (nova) => {
    const val = Math.min(95, Math.max(10, Math.round(nova)));
    setSensitivity(val);
    if (sensitivityTimerRef.current) clearTimeout(sensitivityTimerRef.current);
    sensitivityTimerRef.current = setTimeout(() => {
      recalcularAnalise(val);
    }, 200);
  };

  const handleChaveSalva = (novaChave) => {
    setMostrarModalChave(false);
    setErroIA(null);
    if (novaChave && fotoDataUrl) {
      setTimeout(() => {
        handleConferirComIA();
      }, 200);
    }
  };

  const handleConferirComIA = async () => {
    const imgData = imageDataRef.current;
    const fonte = fonteIARef.current || fotoDataUrl;
    if (!fonte || !imgData) return;
    setAuditandoIA(true);
    setErroIA(null);
    setProgressoIA({ feitos: 0, total: 0 });
    try {
      const resultado = await localizarOvosComGemini(
        fonte,
        { largura: imgData.width, altura: imgData.height },
        (feitos, total) => setProgressoIA({ feitos, total })
      );
      pontosIARef.current = resultado.pontos;
      const mescla = mesclarConferenciaIA(markersRef.current, resultado.pontos);
      setMarkers(mescla.markers);
      setAuditoria({
        ...mescla.resumo,
        modelo: resultado.modelo,
        quadros: resultado.quadros
      });
    } catch (err) {
      console.error('Erro na conferência com Gemini:', err);
      setErroIA(err.message || 'Não foi possível conectar com a IA do Google.');
    } finally {
      setAuditandoIA(false);
    }
  };

  const numeroPorIndice = useMemo(() => numerarEmOrdemDeLeitura(markers), [markers]);

  // Contagens ao vivo: mudam conforme o técnico apaga/acrescenta.
  const contagem = useMemo(() => {
    const soApp = markers.filter((m) => m.divergencia === 'so_app').length;
    const soIA = markers.filter((m) => m.source === 'ia').length;
    const manuais = markers.filter((m) => m.source === 'manual').length;
    const revisar = markers
      .map((m, i) => (m.divergencia ? numeroPorIndice[i] : null))
      .filter((n) => n != null)
      .sort((a, b) => a - b);
    return { soApp, soIA, manuais, revisar };
  }, [markers, numeroPorIndice]);

  const desenharCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    const imgData = imageDataRef.current;
    if (!canvas || !base || !imgData) return;

    const w = imgData.width;
    const h = imgData.height;
    canvas.width = w * ESCALA_DESENHO;
    canvas.height = h * ESCALA_DESENHO;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const folha = modoExibicao === 'folha';
    if (folha) {
      // Palheta "impressa": sem a foto, só o contorno e os ovos no lugar.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(ESCALA_DESENHO, ESCALA_DESENHO);
      const c = contornoRef.current || { x: 0, y: 0, w, h };
      ctx.fillStyle = '#f7f3ea';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#ebe3d3';
      ctx.lineWidth = 1;
      const passoSulco = Math.max(8, c.w / 40);
      for (let sx = c.x + passoSulco; sx < c.x + c.w; sx += passoSulco) {
        ctx.beginPath();
        ctx.moveTo(sx, c.y);
        ctx.lineTo(sx, c.y + c.h);
        ctx.stroke();
      }
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(1.5, w / 500);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    } else {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
      ctx.scale(ESCALA_DESENHO, ESCALA_DESENHO);
    }

    const tamanhoFonte = Math.max(9, w / 85);
    const raioPonto = Math.max(1.3, w / 650);

    markers.forEach((marker, idx) => {
      const cor = corDoMarker(marker);
      ctx.save();
      if (folha) {
        // O ovo desenhado com o tamanho e a inclinação medidos na foto.
        const rx = Math.max(2.5, (marker.rx || 6) * 0.75);
        const ry = Math.max(1.6, (marker.ry || 4) * 0.6);
        ctx.beginPath();
        ctx.ellipse(marker.x, marker.y, rx, ry, marker.angle ?? -Math.PI / 2, 0, Math.PI * 2);
        ctx.fillStyle = cor.folha;
        ctx.fill();
        const texto = String(numeroPorIndice[idx]).padStart(2, '0');
        ctx.font = `800 ${tamanhoFonte}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        const tx = marker.x + ry + 2;
        const ty = marker.y - tamanhoFonte * 0.35;
        ctx.lineWidth = tamanhoFonte * 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(texto, tx, ty);
        ctx.fillStyle = cor.folha;
        ctx.fillText(texto, tx, ty);
      } else if (modoExibicao === 'circulos') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 3;
        ctx.strokeStyle = cor.anel;
        ctx.fillStyle = cor.anel;
        ctx.lineWidth = Math.max(1.8, w / 450);
        ctx.beginPath();
        if (marker.rx && marker.ry) {
          ctx.ellipse(marker.x, marker.y, marker.rx, marker.ry, marker.angle ?? -Math.PI / 2, 0, Math.PI * 2);
        } else {
          ctx.arc(marker.x, marker.y, marker.radius || 7, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, Math.max(1.2, w / 600), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ponto pequeno no centro (para nao esconder o ovo) + numero ao lado.
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, raioPonto, 0, Math.PI * 2);
        ctx.fillStyle = cor.numero;
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.stroke();

        const texto = String(numeroPorIndice[idx]).padStart(2, '0');
        ctx.font = `800 ${tamanhoFonte}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        const tx = marker.x + raioPonto + 1.5;
        const ty = marker.y - raioPonto - tamanhoFonte * 0.35;
        ctx.lineWidth = tamanhoFonte * 0.3;
        ctx.strokeStyle = 'rgba(0,0,0,0.88)';
        ctx.strokeText(texto, tx, ty);
        ctx.fillStyle = cor.numero;
        ctx.fillText(texto, tx, ty);
      }
      ctx.restore();
    });
  }, [markers, modoExibicao, numeroPorIndice]);

  useEffect(() => {
    desenharCanvas();
  }, [desenharCanvas, photoSize]);

  const handlePointerDown = (e) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    const canvas = canvasRef.current;
    const imgData = imageDataRef.current;
    if (!canvas || !imgData) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      return;
    }
    // Coordenadas na escala da imagem (o canvas em si e desenhado em 2x).
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imgData.width;
    const y = ((e.clientY - rect.top) / rect.height) * imgData.height;
    // Raio de toque em pixels de TELA, convertido para a imagem: com zoom
    // alto o dedo precisa acertar mais perto, senao apaga o ovo vizinho.
    const pixelsImagemPorTela = imgData.width / rect.width;
    const hitRadius = Math.max(4, 16 * pixelsImagemPorTela);
    let nearestIndex = -1;
    let nearestDist = Infinity;

    markers.forEach((m, idx) => {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= hitRadius && d < nearestDist) {
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
        radius: Math.max(7, imgData.width / 120),
        rx: Math.max(8, imgData.width / 110),
        ry: Math.max(5, imgData.width / 160),
        angle: -Math.PI / 2,
        score: 1,
        source: 'manual'
      };
      setMarkers((prev) => [...prev, newMarker]);
    }
  };

  const handleLimparFoto = () => {
    imageDataRef.current = null;
    baseCanvasRef.current = null;
    contornoRef.current = null;
    fonteIARef.current = null;
    pontosIARef.current = null;
    setFotoDataUrl(null);
    setPhotoSize({ width: 0, height: 0 });
    setMarkers([]);
    setWarning('');
    setAuditoria(null);
    setErroIA(null);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galeriaInputRef.current) galeriaInputRef.current.value = '';
  };

  // Baixa a folha (palheta em branco com os ovos numerados) com um
  // cabecalho de total e data, pronta para imprimir ou anexar.
  const handleSalvarFolha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const faixa = Math.round(canvas.width * 0.07);
    const saida = document.createElement('canvas');
    saida.width = canvas.width;
    saida.height = canvas.height + faixa;
    const ctx = saida.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, saida.width, saida.height);
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 ${Math.round(faixa * 0.42)}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    const data = new Date().toLocaleDateString('pt-BR');
    ctx.fillText(`Palheta · ${markers.length} ovos · ${data}`, faixa * 0.35, faixa / 2);
    ctx.drawImage(canvas, 0, faixa);
    const link = document.createElement('a');
    link.download = `palheta_${markers.length}_ovos_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = saida.toDataURL('image/png');
    link.click();
  };

  // O total salvo e SEMPRE o que esta marcado na foto. Antes, depois de
  // "Conferir com IA", o numero da IA substituia a contagem e as correcoes
  // feitas a mao pelo tecnico eram descartadas sem aviso.
  const handleAplicar = () => {
    const totalFinal = markers.length;
    const laudo = {
      metodo: auditoria ? 'app+ia' : 'app',
      final: totalFinal,
      automaticos: markers.filter((m) => m.source === 'automatic').length,
      manuais: contagem.manuais,
      sensibilidade: sensitivity,
      ia: auditoria
        ? {
            modelo: auditoria.modelo,
            quadros: auditoria.quadros,
            ovosIA: auditoria.ovosIA,
            concordancia: auditoria.concordancia,
            concordamNaConferencia: auditoria.concordam,
            soAppRestantes: contagem.soApp,
            soIARestantes: contagem.soIA
          }
        : null
    };
    if (onConfirmar) {
      onConfirmar(totalFinal, fotoDataUrl, markers, laudo);
    }
  };

  const listaRevisar = contagem.revisar.slice(0, 40);
  const restoRevisar = contagem.revisar.length - listaRevisar.length;

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
                Toque num ovo para apagar · toque no vazio para marcar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fotoDataUrl && (
              <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-xs">
                {markers.length} ovos
              </span>
            )}
            <button
              type="button"
              onClick={() => setMostrarModalChave(true)}
              className="w-8 h-8 rounded-full bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white flex items-center justify-center transition-colors"
              title="Configurar Chave da IA Google Gemini"
            >
              <Key className="w-4 h-4" />
            </button>
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
          <input
            ref={galeriaInputRef}
            type="file"
            accept="image/*"
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
                  Tire uma foto bem aproximada e focada dos ovos na palheta para a leitura automática e conferência por IA.
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
                  onClick={() => galeriaInputRef.current?.click()}
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
                    <h4 className="text-sm font-black">Conferindo com a IA do Google</h4>
                    <p className="text-xs text-indigo-200">
                      {progressoIA.total
                        ? `Quadro ${progressoIA.feitos} de ${progressoIA.total} da palheta...`
                        : 'Dividindo a palheta em quadros...'}
                    </p>
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
                  onClick={() => setZoom((z) => Math.max(1, z - (z > 3 ? 1 : 0.5)))}
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
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAXIMO, z + (z >= 3 ? 1 : 0.5)))}
                  disabled={zoom >= ZOOM_MAXIMO}
                  className="p-1.5 hover:bg-slate-800 disabled:opacity-30 rounded-xl transition-colors"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* SENSIBILIDADE E MODO DE EXIBIÇÃO */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
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
                  <span>{sensitivity}%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoExibicao((m) => MODOS[m].proximo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold backdrop-blur-md border shadow-lg bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80"
                  title="Alternar números / círculos / folha"
                >
                  {modoExibicao === 'numeros' && <Hash className="w-3.5 h-3.5" />}
                  {modoExibicao === 'circulos' && <Circle className="w-3.5 h-3.5" />}
                  {modoExibicao === 'folha' && <FileText className="w-3.5 h-3.5" />}
                  <span>{MODOS[modoExibicao].rotulo}</span>
                </button>
                {modoExibicao === 'folha' && (
                  <button
                    type="button"
                    onClick={handleSalvarFolha}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold backdrop-blur-md border shadow-lg bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80"
                    title="Salvar a folha como imagem"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
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
                    Sensibilidade do Filtro
                  </span>
                  <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                    {sensitivity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={sensitivity}
                  onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            {/* RESULTADO DA CONFERÊNCIA COM IA */}
            {auditoria && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl p-3 shadow-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-indigo-600" />
                    Conferência IA · {auditoria.quadros} quadros
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-indigo-800 border border-indigo-200">
                    {auditoria.concordancia}% de acordo
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  A IA marcou <b>{auditoria.ovosIA}</b> ovos. Os dois concordam em <b>{auditoria.concordam}</b>.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-sky-700">● app e IA</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-orange-600">● só o app: {contagem.soApp}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-fuchsia-600">● só a IA: {contagem.soIA}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-emerald-600">● à mão: {contagem.manuais}</span>
                </div>
                {listaRevisar.length > 0 && (
                  <p className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-xl border border-indigo-100 leading-relaxed">
                    <b>Confira na foto</b> (laranja e roxo ficam na contagem até você apagar):{' '}
                    {listaRevisar.map((n) => String(n).padStart(2, '0')).join(', ')}
                    {restoRevisar > 0 ? ` e mais ${restoRevisar}` : ''}
                  </p>
                )}
                {auditoria.modelo && (
                  <p className="text-[10px] text-slate-400">Modelo: {auditoria.modelo}</p>
                )}
              </div>
            )}

            {/* ERRO DA IA SE HOUVER */}
            {erroIA && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl space-y-2 text-xs animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-semibold leading-relaxed">{erroIA}</span>
                </div>
                {(erroIA.includes('401') || erroIA.includes('403') || erroIA.includes('Chave') || erroIA.includes('configurada')) && (
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

            {/* AVISO DO DETECTOR LOCAL */}
            {warning && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{warning}</span>
              </div>
            )}

            {/* RESUMO E BOTÃO DE CONFERÊNCIA */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="text-base font-black text-slate-900 flex items-baseline gap-1">
                <span>{markers.length}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ovos marcados
                </span>
              </div>

              <button
                type="button"
                onClick={handleConferirComIA}
                disabled={auditandoIA || analyzing}
                className="bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all shrink-0"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{auditandoIA ? 'Conferindo...' : auditoria ? 'Conferir de novo' : 'Conferir com IA'}</span>
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
                disabled={analyzing || auditandoIA}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar ({markers.length} Ovos)</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* MODAL CONFIGURAÇÃO DA CHAVE GEMINI */}
      <ModalConfigChaveGemini
        aberto={mostrarModalChave}
        onFechar={() => setMostrarModalChave(false)}
        onSalvo={handleChaveSalva}
      />
    </div>
  );
}
