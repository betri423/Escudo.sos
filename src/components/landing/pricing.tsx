"use client";

import { BadgeCheck, Clock3, Download, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { SITE, whatsappLink } from "./site";

export function Pricing() {
  return (
    <section id="prueba" className="scroll-mt-20 border-y border-white/5 bg-white/[0.015] py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Empieza sin riesgo"
          title={
            <>
              Pruébala gratis <span className="text-amber-400">24 horas</span>
            </>
          }
          sub="Primero compruébalo tú: activa una licencia de prueba y usa la app completa. Si te convence, continúas con un plan de protección."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Tarjeta: prueba 24 h */}
          <Reveal>
            <article className="relative h-full overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.08] to-transparent p-8 shadow-2xl shadow-amber-500/10">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1A1206]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Gratis
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-50">
                Prueba de {SITE.trialHours} horas
              </h3>
              <p className="mt-1 text-3xl font-bold text-amber-400">
                $0 <span className="text-base font-medium text-slate-400">MXN</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Todas las funciones desbloqueadas",
                  "Voz, ubicación, audio, foto, SMS y llamada",
                  `Hasta ${SITE.maxGuardians} guardianes configurables`,
                  "Sin tarjeta y sin permanencia",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href={SITE.apkUrl}
                download
                className="mt-8 flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-sm font-bold text-[#1A1206] shadow-lg shadow-amber-500/25 transition-transform hover:scale-[1.02] active:scale-95"
              >
                <Download className="h-4 w-4" aria-hidden />
                Descargar y probar
              </a>
            </article>
          </Reveal>

          {/* Tarjeta: plan de protección */}
          <Reveal delay={0.12}>
            <article className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                <Clock3 className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                Después de la prueba
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-50">
                Plan de protección continua
              </h3>
              <p className="mt-1 text-3xl font-bold text-slate-100">
                A tu medida
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Mantén la app activa mes con mes o por año",
                  "Tú eliges cuándo renovar: sin cargos automáticos",
                  "Soporte directo de instalación y configuración",
                  "Actualizaciones incluidas",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              {SITE.whatsapp ? (
                <div className="mt-8">
                  <a
                    href={whatsappLink("Hola, quiero información sobre los planes de Escudo S.O.S")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-6 py-3 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Consultar planes por WhatsApp
                  </a>
                  <p className="mt-3 text-center text-xs tracking-wide text-slate-500">
                    WhatsApp: <span className="font-semibold text-slate-400">{SITE.whatsappDisplay}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center text-sm leading-relaxed text-slate-400">
                  Consulta planes y disponibilidad con tu{" "}
                  <strong className="font-semibold text-slate-200">distribuidor autorizado</strong>{" "}
                  de Escudo S.O.S.
                </p>
              )}
            </article>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
            Sin tarjetas, sin suscripciones automáticas, sin letras chiquitas: la app avisa cuando
            tu licencia está por terminar y tú decides si la renuevas.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
