/**
 * Escudo S.O.S — Landing promocional (página pública de venta).
 *
 * La consola de la app (víctima/guardián) que antes vivía aquí está
 * preservada en `src/components/app/app-router.tsx` para restaurarla
 * cuando se necesite; la fuente oficial de la consola sigue intacta
 * en `guardian-src/guardian-sos-vercel/`.
 */

import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Steps } from "@/components/landing/steps";
import { Features } from "@/components/landing/features";
import { Audience } from "@/components/landing/audience";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta, Footer, WhatsAppFloat } from "@/components/landing/closing";

export default function LandingPage() {
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
