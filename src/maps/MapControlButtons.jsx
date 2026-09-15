import React from 'react';
import { LocateFixed, Satellite } from 'lucide-react';

/**
 * Botões flutuantes para controle de mapa adaptados do MOTOJAGEMINI.
 */
export function MapControlButtons({ onRecenter, satellite, onToggleSatellite, top = 64, right = 12 }) {
  const btnStyle = (active) => ({
    width: 44,
    height: 44,
    borderRadius: 999,
    border: active ? '2px solid #0f172a' : '1.5px solid rgba(255, 255, 255, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: active ? '#0f172a' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
    transition: 'transform 0.15s ease, background-color 0.2s ease'
  });

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'auto'
      }}
    >
      <button
        type="button"
        onClick={onRecenter}
        aria-label="Centralizar no mapa"
        style={btnStyle(false)}
        className="active:scale-90"
        title="Centralizar no meu local"
      >
        <LocateFixed size={20} color="#0f172a" />
      </button>

      <button
        type="button"
        onClick={onToggleSatellite}
        aria-label={satellite ? "Ver mapa padrão" : "Ver satélite"}
        style={btnStyle(satellite)}
        className="active:scale-90"
        title={satellite ? "Voltar ao mapa de ruas" : "Alternar para imagem de satélite"}
      >
        <Satellite size={20} color={satellite ? "#ffffff" : "#0f172a"} />
      </button>
    </div>
  );
}
