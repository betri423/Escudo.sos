/**
 * Escudo S.O.S — Página principal con ENRUTADO DE MODOS (v7.7).
 *
 *  • "/" sin parámetros    → LANDING promocional (página pública de venta).
 *  • "/?t=gsos-<48hex>"   → CONSOLA DEL GUARDIÁN (el enlace que la app envía
 *    por SMS/WhatsApp a los guardianes: mapa, audio y notificaciones en vivo).
 *  • "/app"                → app de la VÍCTIMA en el navegador (licencia +
 *    escucha de la palabra clave). La app APK NO se ve afectada: su voz es
 *    nativa de Android.
 *
 * La consola vive en `src/components/app/app-router.tsx`.
 */

import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Steps } from "@/components/landing/steps";
import { Features } from "@/components/landing/features";
import { Audience } from "@/components/landing/audience";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta, Footer, WhatsAppFloat } from "@/components/landing/closing";
import AppRouter from "@/components/app/app-router";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const t = Array.isArray(sp.t) ? sp.t[0] : sp.t;

  // Enlace del guardián (SMS/WhatsApp desde la app APK): abre la CONSOLA.
  if (t) {
    return <AppRouter />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#05070D] text-slate-100">
      <Header />
      <main className="flex-1">
        <Hero />
        <Steps />
        <Features />
        <Audience />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
