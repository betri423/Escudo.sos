/**
 * Palabra clave por voz — Web Speech API con reinicio robusto.
 *
 * - Escucha continua en es-MX con normalización NFD (ayuda == aýuda).
 * - SE AUTOREPARA (v7.1): los móviles matan el reconocimiento al ocultar
 *   la pestaña o tras unos minutos. Antes el relanzamiento se bloqueaba si
 *   la pestaña estaba oculta y `rec` muerto nunca se limpiaba → la escucha
 *   quedaba muerta para siempre (la UI seguía diciendo "ESCUCHANDO").
 *   Ahora: onend limpia el estado, se relanza SIEMPRE que esté activada
 *   (también en segundo plano, si el SO lo permite) y un watchdog de 3 s
 *   repara cualquier muerte no detectada.
 * - iOS/Safari: no soporta SpeechRecognition → available=false (se avisa en UI).
 */

import { normalizeText } from "./ntfy";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      length: number;
      [j: number]: { transcript: string; confidence: number };
    };
  };
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function isSpeechAvailable(): boolean {
  const w = window as SpeechWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export class VoiceListener {
  private rec: SpeechRecognitionLike | null = null;
  private wantOn = false;
  private running = false;
  private restartDelay = 400;
  private lastStart = 0;
  private lastError = "";
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  onHeard?: (text: string, isFinal: boolean) => void;
  onKeyword?: (matched: string) => void;
  onState?: (state: "listening" | "stopped" | "error", detail?: string) => void;

  start(keyword: string): boolean {
    this.wantOn = true;
    this.keyword = normalizeText(keyword) || "ayuda";
    this.startWatchdog();
    return this.launch();
  }

  private keyword = "ayuda";

  stop(): void {
    this.wantOn = false;
    this.teardown();
  }

  isRunning(): boolean {
    return this.wantOn;
  }

  lastErr(): string {
    return this.lastError;
  }

  /** Vigila cada 3 s que el reconocimiento siga vivo; si murió, lo relanza. */
  private startWatchdog(): void {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (!this.wantOn) return;
      if (!this.running && Date.now() - this.lastStart > 2000) this.launch();
    }, 3000);
  }

  private teardown(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
    const r = this.rec;
    if (r) {
      r.onstart = null;
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try {
        r.abort();
      } catch {
        /* noop */
      }
    }
    this.rec = null;
    this.running = false;
    this.onState?.("stopped");
  }

  private launch(): boolean {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return false;
    // Abortar cualquier instancia anterior que haya quedado viva.
    const prev = this.rec;
    if (prev) {
      prev.onstart = null;
      prev.onresult = null;
      prev.onerror = null;
      prev.onend = null;
      try {
        prev.abort();
      } catch {
        /* noop */
      }
      this.rec = null;
    }
    const r = new Ctor();
    r.lang = "es-MX";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.onstart = () => {
      this.running = true;
      this.restartDelay = 400;
      this.onState?.("listening");
    };
    r.onresult = (e) => this.handleResult(e);
    r.onerror = (e) => {
      this.lastError = e.error;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.wantOn = false; // permiso denegado: no insistir
        this.teardown();
        this.onState?.("error", "Micrófono denegado");
      } else if (e.error === "audio-capture") {
        this.wantOn = false; // sin micrófono físico
        this.teardown();
        this.onState?.("error", "Sin micrófono");
      }
      // El resto (no-speech, network, aborted…) se recupera en onend/watchdog.
    };
    r.onend = () => {
      // El reconocimiento murió (móviles lo matan al ocultar la pestaña o
      // tras un rato). Limpiar SIEMPRE y reprogramar el relanzamiento aunque
      // la pestaña esté oculta: con la pestaña "reproduciendo audio"
      // (keep-alive), Chrome suele mantenerlo vivo en segundo plano.
      this.running = false;
      if (this.rec === r) this.rec = null;
      if (this.wantOn) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null;
          if (this.wantOn) this.launch();
        }, this.restartDelay);
        this.restartDelay = Math.min(this.restartDelay * 2, 5000);
      }
    };
    this.rec = r;
    try {
      r.start();
      this.lastStart = Date.now();
      this.running = true; // onstart lo confirma; optimista para el watchdog
      return true;
    } catch {
      // start() lanza si ya está iniciado; reintentar luego
      this.rec = null;
      this.running = false;
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (this.wantOn) this.launch();
      }, this.restartDelay);
      this.restartDelay = Math.min(this.restartDelay * 2, 5000);
      return false;
    }
  }

  private handleResult(e: SpeechRecognitionEventLike): void {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (!res || res.length === 0) continue;
      // Primera alternativa para mostrar; la palabra se busca en TODAS las
      // alternativas por separado (concatenarlas producía texto corrupto).
      this.onHeard?.(String(res[0].transcript).trim(), res.isFinal);
      for (let j = 0; j < res.length; j++) {
        const norm = normalizeText(String(res[j].transcript));
        if (norm && this.keyword && norm.includes(this.keyword)) {
          this.onKeyword?.(this.keyword);
          return; // dispara una sola vez por detección
        }
      }
    }
  }

  /** Reinicio manual al volver a primer plano (móviles la detienen). */
  resumeIfWanted(): void {
    if (this.wantOn && !this.running) this.launch();
  }
}
