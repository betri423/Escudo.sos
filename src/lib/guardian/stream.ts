/**
 * Escudo S.O.S v7.0 — Streaming de ntfy (nueva, no altera ntfy.ts).
 *
 * Suscripción en vivo al tema mediante el endpoint JSON en flujo
 * (una petición HTTP de larga vida, línea por línea). Sirve para:
 *  • La VÍCTIMA: recibir comandos del guardián (CMD:…).
 *  • La CONSOLA DEL GUARDIÁN: recibir alertas, ubicación y audio en vivo.
 *
 * Se reconecta automáticamente con retroceso exponencial.
 */

export const NTFY_BASE = "https://ntfy.sh";

export interface NtfyAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
  expires?: number;
}

export interface NtfyEvent {
  id?: string;
  time?: number; // unix segundos
  event: string; // "open" | "message" | "keepalive"
  topic?: string;
  title?: string;
  message?: string;
  priority?: number;
  tags?: string[];
  attachment?: NtfyAttachment;
}

export interface StreamHandle {
  abort: () => void;
}

interface StreamOpts {
  /** Desde cuándo pedir historial: "10m", "3h", unix ts… */
  since?: string;
  onEvent: (ev: NtfyEvent) => void;
  onState?: (state: "connecting" | "open" | "retrying") => void;
}

/** Abre el flujo JSON del tema y lo mantiene vivo (reconexión automática). */
export function streamTopic(topic: string, opts: StreamOpts): StreamHandle {
  const ac = new AbortController();
  let stopped = false;
  let retry = 0;

  const pump = async () => {
    while (!stopped) {
      try {
        opts.onState?.("connecting");
        const since = opts.since ?? "10m";
        const res = await fetch(`${NTFY_BASE}/${topic}/json?since=${since}`, {
          signal: ac.signal,
          headers: { Accept: "application/x-ndjson" },
        });
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        retry = 0;
        opts.onState?.("open");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const s = line.trim();
            if (!s) continue;
            try {
              const ev = JSON.parse(s) as NtfyEvent;
              if (ev && typeof ev.event === "string") opts.onEvent(ev);
            } catch {
              /* línea incompleta: se ignora */
            }
          }
        }
      } catch {
        if (stopped || ac.signal.aborted) return;
      }
      if (stopped) return;
      retry = Math.min(retry + 1, 5);
      opts.onState?.("retrying");
      await new Promise((r) => setTimeout(r, Math.min(2000 * retry, 15000)));
    }
  };

  pump();

  return {
    abort: () => {
      stopped = true;
      ac.abort();
    },
  };
}

/** v10.0 — GUARDIAN_CMDS (LISTEN_ON/LISTEN_OFF/PING) ELIMINADO: la consola
 *  ya no puede disparar nada a distancia (el canal de comandos del guardián
 *  fue retirado del APK — app transparente). */

/** Sube un clip de audio de la víctima como adjunto de ntfy (PUT binario). */
export async function ntfyUploadAudio(
  topic: string,
  blob: Blob,
  filename: string,
): Promise<Response> {
  return fetch(`${NTFY_BASE}/${topic}`, {
    method: "PUT",
    headers: {
      Filename: filename,
      "X-Title": "Audio en vivo",
      "X-Tags": "headphones",
      "X-Priority": "3",
    },
    body: blob,
  });
}
