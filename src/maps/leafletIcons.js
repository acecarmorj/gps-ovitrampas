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

  if (situacao.fase === 'recolhida') {
    emoji = '📦';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#4338ca;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">Recolhida</span>`;
  } else if (situacao.fase === 'lida') {
    emoji = armadilha.ultimosOvos > 0 ? '🔴' : '⚪';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#0f172a;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">${armadilha.ultimosOvos} ovos</span>`;
  } else if (situacao.fase === 'atrasada') {
    emoji = '⚠️';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#991b1b;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">Atraso >7d</span>`;
  } else if (situacao.fase === 'tolerancia') {
    emoji = '⏰';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#b45309;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">Janela Limite (${situacao.diasCorridos}d)</span>`;
  } else if (situacao.fase === 'hoje') {
    emoji = '⏳';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#047857;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">Coletar Hoje</span>`;
  } else if (situacao.fase === 'vespera') {
    emoji = '⏳';
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#b45309;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">Falta 1d</span>`;
  } else {
    // Em campo normal (dias 0 a 3 restantes)
    infoBadge = `<span style="margin-left:4px;background:#ffffff;color:#0369a1;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:900;">Faltam ${situacao.diasRestantes}d</span>`;
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

/**
 * Marcador do Ponto Ideal de Ovitrampa (Cenário de Planejamento Geoespacial)
 */
export function pontoIdealIcon(ponto, semRotulo = false, selecionado = false) {
  const bgCor = selecionado ? '#4c1d95' : '#7c3aed'; // Roxo vibrante institucional
  const cod = ponto?.codigo || 'P-00';

  if (semRotulo) {
    return L.divIcon({
      className: '',
      html: `
        <div style="display:flex;align-items:center;justify-content:center;cursor:pointer;width:20px;height:20px;">
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;">
            <div style="position:absolute;width:18px;height:18px;border-radius:999px;background:rgba(124,58,237,0.3);animation:pulseLive 2.5s ease-out infinite;"></div>
            <div style="width:13px;height:13px;border-radius:999px;background:${bgCor};border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
              <div style="width:4px;height:4px;border-radius:999px;background:#ffffff;"></div>
            </div>
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px);cursor:pointer;">
        <div style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:${bgCor};border:2px solid #ffffff;color:#ffffff;font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:900;box-shadow:0 4px 14px rgba(124,58,237,0.45);letter-spacing:0.02em;">
          <span>🎯</span>
          <span>${cod}</span>
          <span style="font-size:9px;background:rgba(255,255,255,0.25);padding:1px 4px;border-radius:4px;">${ponto?.quarteirao || ''}</span>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bgCor};margin-top:-1px"></div>
      </div>
    `,
    iconSize: [110, 36],
    iconAnchor: [55, 34]
  });
}

