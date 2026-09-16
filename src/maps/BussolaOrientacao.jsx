import React, { useState, useEffect } from 'react';
import { Compass, Navigation, ArrowUp, X, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react';
import { calculateNavigationGuidance } from '../lib/geoBearing';

export function BussolaOrientacao({
  userPos,
  armadilhas = [],
  compacto = false,
  onFechar = null
}) {
  const [dispositivoAngulo, setDispositivoAngulo] = useState(0);
  const [temSensor, setTemSensor] = useState(false);

  // Leitura do giroscopio/bussola do celular se disponivel
  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.webkitCompassHeading != null) {
        setDispositivoAngulo(e.webkitCompassHeading);
        setTemSensor(true);
      } else if (e.alpha != null) {
        setDispositivoAngulo(360 - e.alpha);
        setTemSensor(true);
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  const guia = React.useMemo(() => {
    return calculateNavigationGuidance(userPos, armadilhas);
  }, [
    userPos?.latitude ? Math.round(userPos.latitude * 50000) : 0,
    userPos?.longitude ? Math.round(userPos.longitude * 50000) : 0,
    armadilhas
  ]);

  // Modo Compacto (exibido como pílula / badge discreto na tela de campo)
  if (compacto) {
    return (
      <div
        className="backdrop-blur-md px-3 py-1.5 rounded-2xl border shadow-lg flex items-center gap-2 text-xs font-black transition-all"
        style={{
          backgroundColor: guia.corBg || '#ffffff',
          borderColor: guia.corBorder || '#e2e8f0',
          color: guia.cor || '#0f172a'
        }}
      >
        <div
          className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs text-xs font-black border border-slate-200 shrink-0"
          style={{ transform: `rotate(${guia.rumoSugeridoGraus || 0}deg)` }}
        >
          <ArrowUp className="w-3.5 h-3.5" style={{ color: guia.cor }} />
        </div>
        <div className="min-w-0 flex-1 leading-tight text-[11px]">
          <span className="block truncate font-black">{guia.orientacao}</span>
          <span className="block text-[10px] opacity-90 truncate font-semibold">{guia.acao}</span>
        </div>
      </div>
    );
  }

  // Modo Completo (Rosa dos ventos animada + orientação tática)
  const anguloSeta = (guia.rumoSugeridoGraus || 0) - (temSensor ? dispositivoAngulo : 0);

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-3.5 shadow-2xl space-y-3 select-none text-slate-800 animate-in fade-in duration-200">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Bússola Tática de Campo
            </h3>
            <p className="text-[10px] text-slate-500">
              {temSensor ? 'Orientação em tempo real (Norte magnético)' : 'Orientação cardeal fixa'}
            </p>
          </div>
        </div>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ÁREA DA BÚSSOLA CIRCULAR E RUMO */}
      <div className="flex items-center gap-3.5">
        {/* ROSA DOS VENTOS SVG */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-md transition-transform duration-300"
            style={{ transform: temSensor ? `rotate(${-dispositivoAngulo}deg)` : 'none' }}
          >
            {/* Círculo externo */}
            <circle cx="50" cy="50" r="46" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="50" cy="50" r="38" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

            {/* Pontos Cardeais */}
            <text x="50" y="16" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="900">N</text>
            <text x="50" y="92" textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="900">S</text>
            <text x="89" y="53.5" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="900">L</text>
            <text x="11" y="53.5" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="900">O</text>

            {/* Linhas de quadrante */}
            <line x1="50" y1="20" x2="50" y2="80" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="20" y1="50" x2="80" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
          </svg>

          {/* SETA DIRECIONAL SUGERIDA */}
          {guia.rumoSugeridoGraus != null && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-500 pointer-events-none"
              style={{ transform: `rotate(${anguloSeta}deg)` }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg text-white animate-pulse border-2 border-white"
                style={{ backgroundColor: guia.cor, transform: 'translateY(-24px)' }}
              >
                <ArrowUp className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          )}

          {/* Ponto central */}
          <div className="absolute w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow-xs" />
        </div>

        {/* INFORMAÇÕES DE NAVEGAÇÃO E METROS */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0"
              style={{
                backgroundColor: guia.corBg || '#f1f5f9',
                borderColor: guia.corBorder || '#cbd5e1',
                color: guia.cor || '#334155'
              }}
            >
              {guia.status === 'ideal' ? '🟢 PONTO IDEAL'
                : guia.status === 'afastar' ? '⚠️ MUITO PRÓXIMO (< 300m)'
                : guia.status === 'amplo' ? '🔵 ÁREA LIVRE'
                : '🎯 NOVO PONTO'}
            </span>
          </div>

          <p className="text-xs font-black text-slate-900 leading-snug">
            {guia.orientacao}
          </p>

          <p
            className="text-[11px] font-bold leading-tight"
            style={{ color: guia.cor }}
          >
            {guia.acao}
          </p>
        </div>
      </div>
    </div>
  );
}
