/**
 * Rastreamento em Tempo Real de Múltiplos Agentes em Campo (Carmo - RJ)
 * Permite que todos os Agentes de Combate a Endemias (ACE 1, ACE 2...)
 * vejam a localização uns dos outros no mapa e saibam a distância exata até o colega.
 */

import { calcDistanceMeters } from './geoDistance';

const API_BASE = 'https://ovitrampas-api.acecarmorj.workers.dev';

export const AGENTES_DISPONIVEIS = [
  { id: 'ace1', label: 'ACE 1' },
  { id: 'ace2', label: 'ACE 2' },
  { id: 'ace3', label: 'ACE 3' },
  { id: 'ace4', label: 'ACE 4' },
  { id: 'ace5', label: 'ACE 5' },
  { id: 'ace6', label: 'ACE 6' },
  { id: 'ace7', label: 'ACE 7' },
  { id: 'ace8', label: 'ACE 8' },
  { id: 'coord', label: 'Coordenação' }
];

export function getDeviceId() {
  let devId = localStorage.getItem('ovitrampas_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('ovitrampas_device_id', devId);
  }
  return devId;
}

export function getMeuAgente() {
  const salvo = localStorage.getItem('ovitrampas_meu_agente');
  if (salvo) {
    try {
      const parsed = JSON.parse(salvo);
      if (parsed?.id && parsed?.label) return parsed;
    } catch (e) {}
  }
  return { id: 'ace1', label: 'ACE 1' };
}

export function setMeuAgente(agentId, label) {
  const dados = { id: agentId, label: label || agentId.toUpperCase() };
  localStorage.setItem('ovitrampas_meu_agente', JSON.stringify(dados));
  window.dispatchEvent(new CustomEvent('ovitrampas_agente_alterado', { detail: dados }));
  return dados;
}

/**
 * Envia batimento cardíaco da posição atual deste dispositivo para a nuvem
 */
export async function enviarHeartbeatAgente(userPos, bairro = null) {
  if (!userPos || !userPos.latitude || !userPos.longitude) return false;

  const meuAgente = getMeuAgente();
  const deviceId = getDeviceId();

  const payload = {
    agentId: meuAgente.id,
    deviceId: deviceId,
    label: meuAgente.label,
    latitude: Number(userPos.latitude),
    longitude: Number(userPos.longitude),
    accuracy: userPos.accuracy ? Number(userPos.accuracy) : null,
    bairro: bairro || null
  };

  try {
    const res = await fetch(`${API_BASE}/api/agents/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn('[Agentes] Falha ao enviar heartbeat de localização:', err);
    return false;
  }
}

/**
 * Busca a localização dos outros agentes ativos em Carmo-RJ
 */
export async function buscarOutrosAgentes(userPos = null) {
  const meuAgente = getMeuAgente();
  const deviceId = getDeviceId();

  try {
    const res = await fetch(`${API_BASE}/api/agents/locations`);
    if (!res.ok) return [];

    const data = await res.json();
    const listaBruta = Array.isArray(data.agents) ? data.agents : [];

    const agora = Date.now();

    // Filtra o próprio aparelho e calcula distâncias
    return listaBruta
      .filter((ag) => ag.agentId !== meuAgente.id && ag.deviceId !== deviceId)
      .map((ag) => {
        const timestamp = ag.updatedAt ? new Date(ag.updatedAt + 'Z').getTime() : agora;
        const segundosAtras = Math.max(0, Math.round((agora - timestamp) / 1000));

        let distanciaMetros = null;
        if (userPos?.latitude && userPos?.longitude) {
          distanciaMetros = calcDistanceMeters(
            userPos.latitude,
            userPos.longitude,
            ag.latitude,
            ag.longitude
          );
        }

        return {
          agentId: ag.agentId,
          deviceId: ag.deviceId,
          label: ag.label || ag.agentId.toUpperCase(),
          latitude: Number(ag.latitude),
          longitude: Number(ag.longitude),
          accuracy: ag.accuracy ? Number(ag.accuracy) : null,
          bairro: ag.bairro || 'Carmo',
          updatedAt: ag.updatedAt,
          segundosAtras,
          distanciaMetros
        };
      })
      .sort((a, b) => {
        if (a.distanciaMetros != null && b.distanciaMetros != null) {
          return a.distanciaMetros - b.distanciaMetros;
        }
        return a.label.localeCompare(b.label);
      });
  } catch (err) {
    console.warn('[Agentes] Falha ao buscar lista de outros agentes:', err);
    return [];
  }
}

/**
 * Hook/Listener para manter a lista de agentes atualizada continuamente
 */
export function iniciarMonitoramentoOutrosAgentes(userPosRef, onAtualizar) {
  let timerId = null;
  let ativo = true;

  const ciclo = async () => {
    if (!ativo) return;

    const pos = typeof userPosRef === 'function' ? userPosRef() : userPosRef;

    // 1. Envia heartbeat deste aparelho se tiver posição válida
    if (pos?.latitude && pos?.longitude) {
      await enviarHeartbeatAgente(pos);
    }

    // 2. Busca colegas ativos
    const outros = await buscarOutrosAgentes(pos);
    if (ativo && onAtualizar) {
      onAtualizar(outros);
    }

    if (ativo) {
      timerId = setTimeout(ciclo, 7000); // Consulta a cada 7 segundos
    }
  };

  ciclo();

  return () => {
    ativo = false;
    if (timerId) clearTimeout(timerId);
  };
}
