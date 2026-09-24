/**
 * Escudo S.O.S v7.7 — App de la VÍCTIMA en el navegador ("/app").
 *
 * Aquí abre la versión web para la persona protegida: verificación de
 * licencia y, una vez activa, la app completa (palabra clave por voz con
 * Web Speech API en Android/Chrome, botón S.O.S, tiempos de bienestar,
 * ubicación y audio hacia la consola del guardián).
 *
 * Nota: la app APK (v11.3) es independiente de esta página; su detección
 * de voz es nativa de Android y no depende de ningún despliegue web.
 */

import AppRouter from "@/components/app/app-router";

export const metadata = {
  title: "Escudo S.O.S — App",
};

export default function AppPage() {
  return <AppRouter />;
}
