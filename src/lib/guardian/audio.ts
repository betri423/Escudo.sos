/**
 * Audio: sirena disuasiva (wee-woo de dos tonos) + keep-alive silencioso.
 *
 * El keep-alive reproduce un oscilador imperceptible para que el navegador
 * móvil NO congele la pestaña (truco de la app original) mientras hay una
 * alerta activa o el check-in está armado. Se detiene al desactivar.
 */

let sirenCtx: AudioContext | null = null;
let sirenTimer: ReturnType<typeof setInterval> | null = null;
let sirenStopTimer: ReturnType<typeof setTimeout> | null = null;
let sirenOnStop: (() => void) | null = null;

type AnyWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function getCtx(): AudioContext | null {
  const w = window as AnyWindow;
  const Ctx = w.AudioContext || w.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

/**
 * Sirena wee-woo: alterna 650 ↔ 950 Hz con rampas (más potente que un
 * beep simple). autoStopMs = 0 → hasta stopSiren().
 */
export function startSiren(autoStopMs = 0, onStop?: () => void): boolean {
  stopSiren();
  const ctx = getCtx();
  if (!ctx) return false;
  sirenCtx = ctx;
  sirenOnStop = onStop ?? null;
  const high = 950;
  const low = 650;
  const seg = 480; // ms por tono
  let up = true;
  const beep = () => {
    if (!sirenCtx) return;
    const t = sirenCtx.currentTime;
    const osc = sirenCtx.createOscillator();
    const osc2 = sirenCtx.createOscillator();
    const gain = sirenCtx.createGain();
    osc.type = "sawtooth";
    osc2.type = "square";
    const f = up ? high : low;
    const fNext = up ? low : high;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.linearRampToValueAtTime(fNext, t + seg / 1000);
    osc2.frequency.setValueAtTime(f / 2, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.55, t + 0.03);
    gain.gain.setValueAtTime(0.55, t + seg / 1000 - 0.05);
    gain.gain.linearRampToValueAtTime(0.0001, t + seg / 1000);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(sirenCtx.destination);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + seg / 1000 + 0.05);
    osc2.stop(t + seg / 1000 + 0.05);
    up = !up;
  };
  beep();
  sirenTimer = setInterval(beep, seg);
  if (autoStopMs > 0) {
    sirenStopTimer = setTimeout(() => stopSiren(), autoStopMs);
  }
  return true;
}

export function stopSiren(): void {
  if (sirenTimer) {
    clearInterval(sirenTimer);
    sirenTimer = null;
  }
  if (sirenStopTimer) {
    clearTimeout(sirenStopTimer);
    sirenStopTimer = null;
  }
  if (sirenCtx) {
    try {
      sirenCtx.close();
    } catch {
      /* noop */
    }
    sirenCtx = null;
  }
  if (sirenOnStop) {
    sirenOnStop();
    sirenOnStop = null;
  }
}

export function isSirenActive(): boolean {
  return sirenTimer !== null;
}

/* ───────────────── Keep-alive silencioso (v7.1) ───────────────── */

let kaCtx: AudioContext | null = null;
let kaOsc: OscillatorNode | null = null;
let kaAudio: HTMLAudioElement | null = null;
let kaUrl: string | null = null;
let kaWanted = false;
let kaRetry: ReturnType<typeof setInterval> | null = null;

/**
 * WAV de 1 s casi silencioso: un "tic" de 1 muestra de amplitud cada
 * 100 ms (-90 dB, imperceptible). Se construye en memoria (sin red).
 * Con un elemento <audio> en loop, Chrome/Android considera que la pestaña
 * ESTÁ REPRODUCIENDO MEDIOS: la mantiene viva en segundo plano (temporización
 * normal, red y micrófono activos) y muestra una notificación de medios
 * (para el usuario: señal de que la protección sigue activa). Un mero
 * AudioContext (implementación anterior) no recibe ese trato en móviles.
 */
function makeSilentWavUrl(): string {
  const rate = 8000;
  const n = rate; // 1 segundo
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, i % 800 === 0 ? 1 : 0, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/** Activa el audio invisible: evita que el navegador congele la pestaña. */
export function startKeepAlive(): void {
  kaWanted = true;
  ensureKeepAlive();
  // Reintento periódico: el SO puede pausar el audio al apagar la pantalla
  // o el autoplay puede haber fallado antes del primer gesto del usuario.
  if (!kaRetry) {
    kaRetry = setInterval(() => {
      if (!kaWanted) return;
      ensureKeepAlive();
    }, 15000);
  }
}

function ensureKeepAlive(): void {
  // 1) <audio> en loop: el marcador de "reproduciendo" para el SO móvil.
  try {
    if (!kaAudio) {
      kaUrl = makeSilentWavUrl();
      const a = new Audio(kaUrl);
      a.loop = true;
      a.preload = "auto";
      kaAudio = a;
    }
    if (kaAudio.paused) {
      void kaAudio.play().catch(() => {
        /* autoplay bloqueado: el reintento de 15 s lo logra tras un gesto */
      });
    }
  } catch {
    /* noop */
  }
  // 2) Oscilador Web Audio de respaldo (mantiene el AudioContext activo).
  try {
    if (!kaCtx) {
      const ctx = getCtx();
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.type = "sine";
        osc.frequency.value = 1; // 1 Hz — imperceptible
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        kaCtx = ctx;
        kaOsc = osc;
      }
    } else if (kaCtx.state === "suspended") {
      void kaCtx.resume().catch(() => {});
    }
  } catch {
    /* noop */
  }
}

export function stopKeepAlive(): void {
  kaWanted = false;
  if (kaRetry) {
    clearInterval(kaRetry);
    kaRetry = null;
  }
  try {
    if (kaAudio) {
      kaAudio.pause();
      kaAudio = null;
    }
    if (kaUrl) {
      URL.revokeObjectURL(kaUrl);
      kaUrl = null;
    }
  } catch {
    /* noop */
  }
  try {
    if (kaOsc) {
      kaOsc.stop();
      kaOsc = null;
    }
    if (kaCtx) {
      kaCtx.close();
      kaCtx = null;
    }
  } catch {
    /* noop */
  }
}
