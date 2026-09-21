/**
 * ntfy.sh — publicación de alertas desde el navegador.
 *
 * ntfy.sh permite CORS abierto (Access-Control-Allow-Origin: *,
 * Access-Control-Allow-Headers: *), verificado en vivo: el navegador
 * publica directamente sin backend ni base de datos.
 *
 * Cabeceras HTTP solo aceptan ASCII/Latín-1 → los títulos con acentos
 * se transliteran (NFD + eliminación de marcas diacríticas).
 */

const NTFY_BASE = "https://ntfy.sh";

/** Normaliza texto para comparación de palabra clave (ayuda == aýuda). */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zñ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Translitera acentos para cabeceras HTTP (á→a, é→e…). */
function asciiHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, 180);
}

/** Genera un tema de 192 bits aleatorios (48 hex) — imposible de adivinar. */
export function generateTopic(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `gsos-${hex}`;
}

export function isTopicValid(topic: string): boolean {
  return /^gsos-[0-9a-f]{48}$/.test(topic || "");
}

export interface NtfyMessage {
  title: string;
  message: string;
  /** 1..5 (4=alta, 5=urgente) */
  priority?: number;
  /** emojis cortos de ntfy, p.ej. ["rotating_light","sos"] */
  tags?: string[];
}

/** Publica un mensaje en el tema. Lanza error si falla la red. */
export async function ntfyPublish(topic: string, msg: NtfyMessage): Promise<void> {
  const headers: Record<string, string> = {
    "X-Title": asciiHeader(msg.title),
    "X-Priority": String(msg.priority ?? 3),
  };
  if (msg.tags && msg.tags.length > 0) {
    headers["X-Tags"] = msg.tags.join(",");
  }
  const res = await fetch(`${NTFY_BASE}/${topic}`, {
    method: "POST",
    headers,
    body: msg.message,
  });
  if (!res.ok) {
    throw new Error(`ntfy respondió ${res.status}`);
  }
}

/** Enlace público del guardián (abre la vista web de ntfy, sin instalar nada). */
export function guardianUrl(topic: string): string {
  return `${NTFY_BASE}/${topic}`;
}

/** Enlace de Google Maps con coordenadas. */
export function mapsUrl(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

export function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
