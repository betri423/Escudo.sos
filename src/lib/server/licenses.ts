/**
 * Escudo S.O.S v7.0 — Licencias (lado servidor).
 *
 * Esquema SIN base de datos (Vercel sigue sin requerir servicios externos):
 *  • Licencia  = GSOS-<id12hex>-<exp>-<firma16hex>
 *    firma = HMAC-SHA256(LICENSE_SECRET, "LIC|<id>|<exp>") truncada a 16 hex.
 *  • Activación = ACT-<id>-<exp>-<deviceId>-<firma16hex>
 *    firma = HMAC-SHA256(LICENSE_SECRET, "ACT|<id>|<exp>|<deviceId>").
 *
 * Producción: definir LICENSE_SECRET (aleatorio, privado) y ADMIN_PIN en
 * Vercel → Environment Variables. Sin ellas se usan valores de desarrollo.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.LICENSE_SECRET || "gsos-dev-secret-CHANGE-ME";
const ADMIN_PIN = process.env.ADMIN_PIN || "2580";

/** Duraciones permitidas al crear licencias (0 = permanente; 1 = prueba de 24 h). */
export const ALLOWED_DAYS = [0, 1, 30, 90, 365] as const;

function hmac16(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
}

/** Comparación en tiempo constante (evita ataques de temporización). */
export function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function isAdminPin(pin: unknown): boolean {
  return safeEq(String(pin ?? ""), ADMIN_PIN);
}

export interface License {
  code: string;
  id: string;
  exp: number; // segundos unix; 0 = permanente
  days: number;
}

export function createLicense(days: number): License {
  const id = randomBytes(6).toString("hex");
  const exp = days === 0 ? 0 : Math.floor(Date.now() / 1000) + days * 86400;
  const sig = hmac16(`LIC|${id}|${exp}`);
  return { code: `GSOS-${id}-${exp}-${sig}`, id, exp, days };
}

export interface ParsedLicense {
  id: string;
  exp: number;
}

export function parseLicenseCode(raw: string): ParsedLicense | null {
  const norm = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^GSOS([0-9A-F]{12})(\d{1,10})([0-9A-F]{16})$/.exec(norm);
  if (!m) return null;
  // El cliente puede introducir el código en mayúsculas o minúsculas:
  // normalizamos id y firma a minúsculas antes del HMAC (hex canónico).
  const id = m[1].toLowerCase();
  const exp = Number(m[2]);
  const sig = m[3].toLowerCase();
  const expected = hmac16(`LIC|${id}|${exp}`);
  if (!safeEq(sig, expected)) return null;
  return { id, exp };
}

export interface ParsedActivation {
  id: string;
  exp: number;
  deviceId: string;
}

export function issueActivationToken(id: string, exp: number, deviceId: string): string {
  const sig = hmac16(`ACT|${id}|${exp}|${deviceId}`);
  return `ACT-${id}-${exp}-${deviceId}-${sig}`;
}

export function parseActivationToken(raw: string): ParsedActivation | null {
  const norm = String(raw ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const m = /^act-([0-9a-f]{12})-(\d{1,10})-([0-9a-f]{6,24})-([0-9a-f]{16})$/.exec(norm);
  if (!m) return null;
  const [, id, expStr, deviceId, sig] = m;
  const exp = Number(expStr);
  const expected = hmac16(`ACT|${id}|${exp}|${deviceId}`);
  if (!safeEq(sig, expected)) return null;
  return { id, exp, deviceId };
}

/** ¿Vigencia caducada? (exp=0 → nunca). */
export function isExpired(exp: number): boolean {
  return exp > 0 && Date.now() / 1000 > exp;
}

/** Sanitiza el deviceId recibido del cliente. */
export function sanitizeDeviceId(raw: unknown): string | null {
  const s = String(raw ?? "").toLowerCase();
  return /^[0-9a-f]{6,24}$/.test(s) ? s : null;
}

/* ───────── Limitador simple de intentos de PIN (mejor esfuerzo) ───────── */

const attempts = new Map<string, { count: number; resetAt: number }>();

/** true si se permite el intento; false si excede 15 intentos / 10 min. */
export function rateLimitPin(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= 15;
}
