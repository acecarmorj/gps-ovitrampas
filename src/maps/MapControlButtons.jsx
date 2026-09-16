import React from 'react';
import { LocateFixed, Satellite, Ruler, Tag, Eye, EyeOff, Radio } from 'lucide-react';

/**
 * Botões flutuantes para controle de mapa adaptados do MOTOJAGEMINI.
 */
export function MapControlButtons({
  onRecenter,
  satellite,
  onToggleSatellite,
  showDistances = true,
  onToggleDistances,
  showCircles = false,
  onToggleCircles,
  showLabels = true,
  onToggleLabels,
  showPanel = true,
  onTogglePanel,
  top = 64,
  right = 12
}) {
  const btnStyle = (active, activeBg = '#0f172a', activeColor = '#ffffff') => ({
    width: 44,
    height: 44,
    borderRadius: 999,
    border: active ? `2px solid ${activeBg}` : '1.5px solid rgba(255, 255, 255, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: active ? activeBg : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
    transition: 'transform 0.15s ease, background-color 0.2s ease',
    color: active ? activeColor : '#0f172a'
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
      {/* 1. Centralizar GPS */}
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

      {/* 2. Linhas de Distância (300m) */}
      {onToggleDistances && (
        <button
          type="button"
          onClick={onToggleDistances}
          aria-label={showDistances ? "Ocultar linhas de distância" : "Mostrar linhas de distância (300m - 400m)"}
          style={btnStyle(showDistances, '#059669', '#ffffff')}
          className="active:scale-90"
          title={showDistances ? "Ocultar linhas de distância (300m-400m)" : "Mostrar linhas de distância entre armadilhas"}
        >
          <Ruler size={19} color={showDistances ? "#ffffff" : "#0f172a"} />
        </button>
      )}

      {/* 2.1. Círculos de Raio de Cobertura (175m) */}
      {onToggleCircles && (
        <button
          type="button"
          onClick={onToggleCircles}
          aria-label={showCircles ? "Ocultar círculos de raio 175m" : "Mostrar círculos de raio 175m"}
          style={btnStyle(showCircles, '#7c3aed', '#ffffff')}
          className="active:scale-90"
          title={showCircles ? "Ocultar círculos de raio 175m" : "Mostrar círculos de raio de atração (175m)"}
        >
          <Radio size={19} color={showCircles ? "#ffffff" : "#0f172a"} />
        </button>
      )}

      {/* 3. Rótulos das Armadilhas (Balões ARM-xx vs Pontos limpos) */}
      {onToggleLabels && (
        <button
          type="button"
          onClick={onToggleLabels}
          aria-label={showLabels ? "Remover rótulos (deixar só pontos e linhas)" : "Mostrar rótulos das armadilhas"}
          style={btnStyle(showLabels, '#d97706', '#ffffff')}
          className="active:scale-90"
          title={showLabels ? "Remover rótulos (deixar apenas pontos e linhas limpos)" : "Mostrar balões e rótulos das armadilhas"}
        >
          <Tag size={19} color={showLabels ? "#ffffff" : "#0f172a"} />
        </button>
      )}

      {/* 4. Janela / Painel Flutuante de Dados */}
      {onTogglePanel && (
        <button
          type="button"
          onClick={onTogglePanel}
          aria-label={showPanel ? "Ocultar janela flutuante de dados" : "Mostrar janela flutuante de dados"}
          style={btnStyle(showPanel, '#475569', '#ffffff')}
          className="active:scale-90"
          title={showPanel ? "Ocultar janela de dados superior" : "Mostrar janela de dados superior"}
        >
          {showPanel ? <EyeOff size={19} color="#ffffff" /> : <Eye size={19} color="#0f172a" />}
        </button>
      )}

      {/* 5. Alternar Satélite */}
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
