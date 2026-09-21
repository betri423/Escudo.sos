/**
 * Escudo S.O.S — Configuración central de la landing promocional.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ WHATSAPP ACTIVO ✅                                           │
 * │ Número: 55 7745 5943 (CDMX) → "525577455943"                │
 * │ (código de país 52 + 10 dígitos, sin espacios ni «+»).      │
 * │ Para cambiarlo o desactivarlo: edita `whatsapp` (con cadena │
 * │ vacía los botones de contacto se ocultan solos).            │
 * └─────────────────────────────────────────────────────────────┘
 */
export const SITE = {
  name: "Escudo S.O.S",
  version: "v11.3",
  apkUrl: "/EscudoSOS-v11.3.apk",
  apkSize: "87 KB",
  whatsapp: "525577455943",
  whatsappDisplay: "55 7745 5943",
  trialHours: 24,
  maxGuardians: 5,
} as const;

export function whatsappLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const DOWNLOAD_CTA = "Descargar la app";
