import L from 'leaflet';
import { calcularSituacaoArmadilha } from '../lib/situacaoOvitrampa';

export const MAP_TILE_STANDARD = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
};

export const MAP_TILE_SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri'
};

/**
 * Marcador de Posição do Agente com anel pulsante
 */
export function youDotIcon(label = "Você (ACE)") {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
          <div style="position:absolute;width:24px;height:24px;border-radius:999px;background:rgba(16,185,129,0.35);animation:pulseLive 2s ease-out infinite;"></div>
          <div style="width:14px;height:14px;border-radius:999px;background:#10b981;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
        </div>
        <span style="margin-top:2px;background:#0f172a;color:#6ee7b7;font-size:9px;font-weight:800;padding:1px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4);border:1px solid #10b981;">
          ${label}
        </span>
      </div>
    `,
    iconSize: [40, 44],
    iconAnchor: [20, 12]
  });
}

/**
 * Marcador de Outro Agente em Campo (Colega ACE) com anel azul pulsante
 */
export function otherAgentDotIcon(label = "ACE 2", isRecent = true) {
  const pulseColor = isRecent ? 'rgba(59,130,246,0.35)' : 'rgba(100,116,139,0.2)';
  const dotColor = isRecent ? '#3b82f6' : '#64748b';
  const badgeBorder = isRecent ? '#3b82f6' : '#64748b';
  const textColor = isRecent ? '#93c5fd' : '#cbd5e1';

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
          \${isRecent ? \`<div style="position:absolute;width:24px;height:24px;border-radius:999px;background:\${pulseColor};animation:pulseLive 2s ease-out infinite;"></div>\` : ''}
          <div style="width:14px;height:14px;border-radius:999px;background:\${dotColor};border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
        </div>
        <span style="margin-top:2px;background:#0f172a;color:\${textColor};font-size:9px;font-weight:800;padding:1px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4);border:1px solid \${badgeBorder};">
          \${label}
        </span>
      </div>
    `,
    iconSize: [40, 44],
    iconAnchor: [20, 12]
  });
}

/**
 * Marcador de Armadilha Ovitrampa no Mapa com Situação em Tempo Real
 */
export function ovitrampaIcon(armadilha, semRotulo = false) {
  const situacao = calcularSituacaoArmadilha(armadilha);
  const bgColor = situacao.pinCor || '#10b981';

  // Modo discreto: apenas ponto circular colorido com aro branco, sem balão de texto (visão limpa das linhas)
  if (semRotulo) {
    const isLida = situacao.fase === 'lida';
    const dotInner = isLida && armadilha.ultimosOvos > 0
      ? '<div style="width:5px;height:5px;border-radius:999px;background:#ffffff;"></div>'
      : '';

    return L.divIcon({
      className: '',
      html: `
        <div style="display:flex;align-items:center;justify-content:center;cursor:pointer;width:18px;height:18px;">
          <div style="width:13px;height:13px;border-radius:999px;background:${bgColor};border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
            ${dotInner}
          </div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }
  const label = armadilha?.numero ? `ARM-${armadilha.numero}` : 'ARM';

  let emoji = '🪤';
  let infoBadge = '';

  if (situacao.fase === 'lida') {
    emoji = armadilha.ultimosOvos > 0 ? '🔴' : '⚪';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#0f172a;padding:0 5px;border-radius:4px;font-size:10px;font-weight:900;">${armadilha.ultimosOvos} ovos</span>`;
  } else if (situacao.fase === 'atrasada') {
    emoji = '⚠️';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#991b1b;padding:0 5px;border-radius:4px;font-size:10px;font-weight:900;">Atrasada</span>`;
  } else if (situacao.fase === 'hoje' || situacao.fase === 'vespera') {
    emoji = '⏳';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#b45309;padding:0 5px;border-radius:4px;font-size:10px;font-weight:900;">Recolher</span>`;
  } else {
    // Em campo normal
    infoBadge = `<span style="margin-left:4px;background:rgba(255,255,255,0.25);color:#ffffff;padding:0 4px;border-radius:4px;font-size:9px;font-weight:800;">${situacao.diasRestantes}d</span>`;
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px);cursor:pointer;">
        <div style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;background:${bgColor};border:2px solid #ffffff;color:#ffffff;font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,0.4);letter-spacing:0.02em;">
          <span>${emoji}</span>
          <span>${label}</span>
          ${infoBadge}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bgColor};margin-top:-1px"></div>
      </div>
    `,
    iconSize: [120, 36],
    iconAnchor: [60, 34]
  });
}
