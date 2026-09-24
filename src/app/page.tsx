/**
 * Escudo S.O.S — Página principal (v7.9 · ARQUITECTURA ORIGINAL RESTAURADA).
 *
 * La APP vuelve a vivir en la dirección principal, exactamente como cuando
 * todo funcionaba (antes de la página de venta), y la LANDING de venta
 * tiene su PROPIA URL aparte para compartir:
 *
 *  • "/" sin parámetros    → APP (licencia + palabra clave; la de siempre).
 *  • "/?t=gsos-<48hex>"   → CONSOLA DEL GUARDIÁN (el enlace que la app APK
 *    envía por SMS/WhatsApp: mapa, audio y notificaciones en vivo).
 *  • "/promo"              → LANDING de venta (URL APARTE para compartir;
 *    llega aquí por el rewrite de next.config.ts).
 *  • "/app"                → APP WEB DE LA VÍCTIMA (alias bonito; rewrite).
 *
 * Los rewrites viven en next.config.ts: "/promo" → "/?p=1" y "/app" →
 * "/?v=1". Así las rutas nuevas NO dependen de carpetas nuevas en el
 * repositorio (subir carpetas por la web de GitHub no siempre funciona).
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

function Landing() {
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

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const p = Array.isArray(sp.p) ? sp.p[0] : sp.p;

  // Página de venta en su URL aparte ("/promo" llega aquí con ?p=1).
  if (p) {
    return <Landing />;
  }

  // En todo lo demás: la APP, como siempre —
  // "/?t=…" → consola del guardián · sin parámetros → app de la víctima.
  // (El enrutado fino t/v lo hace AppRouter en el navegador.)
  return <AppRouter />;
}
