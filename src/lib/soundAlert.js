/**
 * Sintetizador Web Audio com suporte a Alarme Contínuo e Chime
 * para o painel de despacho da escada.
 * Funciona offline, sem necessidade de carregar arquivos MP3 externos.
 */

let audioCtx = null;
let alarmInterval = null;
let isMuted = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setMuted(muted) {
  isMuted = muted;
  if (muted) {
    stopAlarmLoop();
  }
}

export function isAlarmMuted() {
  return isMuted;
}

/**
 * Toca um bipe urgente de chamado de escada
 */
export function playNewRequestSound() {
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tom 1: Tom agudo de atenção (880 Hz - Lá 5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // Ré 6

    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tom 2: Segundo acorde ainda mais forte (1318.51 Hz - Mi 6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.5); // Lá 6

    gain2.gain.setValueAtTime(0.5, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.65);

    // Vibração tátil no smartphone
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }
  } catch (err) {
    console.warn("Falha no áudio do alarme:", err);
  }
}

/**
 * Inicia o loop de alarme sonoro (repete a cada 3,5 segundos)
 * até que o chamado seja atendido ou silenciado.
 */
export function startAlarmLoop() {
  if (isMuted) return;
  stopAlarmLoop();
  playNewRequestSound();
  alarmInterval = setInterval(() => {
    if (!isMuted) {
      playNewRequestSound();
    }
  }, 3500);
}

/**
 * Para o loop de alarme sonoro
 */
export function stopAlarmLoop() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

/**
 * Som suave de confirmação (ex: Escada entregue, status alterado)
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // Dó 5
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // Dó 6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn("Som não reproduzido:", err);
  }
}
