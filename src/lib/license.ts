/**
 * Escudo S.O.S v7.0 — Licencias (lado cliente).
 *
 * Ayudas para la activación obligatoria: ID de dispositivo, almacenamiento
 * del token de activación, normalización del código de licencia e historial
 * local del administrador.
 *
 * El formato del código se valida en el servidor con HMAC-SHA256
 * (secreto en variable de entorno), por lo que aquí solo se normaliza.
 */

import { safeLocalStorage } from "./guardian/storage";

export const LKEYS = {
  device: "gsos.device",
  activation: "gsos.activation",
  adminHistory: "gsos.admin.licenses",
} as const;

/** Tolerancia sin conexión: la app sigue funcionando 72 h sin verificar. */
export const OFFLINE_GRACE_MS = 72 * 3600 * 1000;

/** Genera/obtiene el ID único de este dispositivo (16 hex). */
export function getOrCreateDeviceId(): string {
  let d = safeLocalStorage.getItem(LKEYS.device);
  if (!d || !/^[0-9a-f]{16}$/.test(d)) {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    d = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    safeLocalStorage.setItem(LKEYS.device, d);
  }
  return d;
}

/** Limpia el código introducido: sin espacios/guiones, en mayúsculas. */
export function normalizeCode(raw: string): string {
  return (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Forma esperada: GSOS + 12 hex (id) + 1-10 dígitos (exp) + 16 hex (firma). */
export function isValidCodeShape(norm: string): boolean {
  return /^GSOS[0-9A-F]{12}\d{1,10}[0-9A-F]{16}$/.test(norm);
}

export interface Activation {
  /** Token firmado por el servidor (ACT-…) */
  token: string;
  /** Expiración unix en segundos (0 = permanente). */
  exp: number;
  /** Última verificación online correcta (ms). */
  lastOk: number;
}

export function readActivation(): Activation | null {
  try {
    const raw = safeLocalStorage.getItem(LKEYS.activation);
    if (!raw) return null;
    const a = JSON.parse(raw);
    if (typeof a?.token !== "string" || typeof a?.exp !== "number" || typeof a?.lastOk !== "number") {
      return null;
    }
    return a as Activation;
  } catch {
    return null;
  }
}

export function saveActivation(a: Activation): void {
  safeLocalStorage.setItem(LKEYS.activation, JSON.stringify(a));
}

export function clearActivation(): void {
  safeLocalStorage.removeItem(LKEYS.activation);
}

export function isLicenseExpired(exp: number): boolean {
  return exp > 0 && Date.now() / 1000 > exp;
}

/** Fecha legible de expiración ("Permanente" si exp=0). */
export function fmtExp(exp: number): string {
  if (!exp) return "Permanente";
  return new Date(exp * 1000).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ───────── Historial local de licencias generadas (área admin) ───────── */

export interface AdminLicense {
  code: string;
  exp: number;
  days: number;
  label: string;
  createdAt: number;
}

export function readLicenseHistory(): AdminLicense[] {
  try {
    const raw = safeLocalStorage.getItem(LKEYS.adminHistory);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as AdminLicense[]) : [];
  } catch {
    return [];
  }
}

export function saveLicenseHistory(list: AdminLicense[]): void {
  safeLocalStorage.setItem(LKEYS.adminHistory, JSON.stringify(list.slice(0, 60)));
}
