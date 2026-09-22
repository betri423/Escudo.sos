"use client";

import { Download, MessageCircle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "./reveal";
import { SITE, whatsappLink } from "./site";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 py-20 lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_50%_40%,rgba(245,158,11,0.10),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <Shield className="mx-auto h-10 w-10 text-amber-400" aria-hidden />
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl font-[family-name:var(--font-display)]">
            Que la ayuda llegue <span className="text-amber-400">antes</span> de que sea urgente.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-400">
            Instala Escudo S.O.S hoy, configura a tus guardianes en minutos y déjala velando en
            silencio. Ojalá nunca la necesites — pero si la necesitas, estará lista.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={SITE.apkUrl}
              download
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-8 py-3.5 text-base font-bold text-[#1A1206] shadow-xl shadow-amber-500/30 transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
            >
              <Download className="h-5 w-5" aria-hidden />
              Descargar el APK ({SITE.apkSize})
            </a>
            {SITE.whatsapp ? (
              <a
                href={whatsappLink("Hola, quiero activar mi prueba gratis de Escudo S.O.S")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-8 py-3.5 text-base font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Activar mi prueba gratis
              </a>
            ) : null}
          </div>
          <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-slate-500">
            Instalación: al abrir el archivo APK, Android pedirá permitir «instalar apps de fuentes
            desconocidas» — es normal para apps fuera de Google Play. Compatible con Android 8 o
            superior.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-black/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-amber-300 to-amber-600">
            <Shield className="h-4 w-4 text-[#1A1206]" strokeWidth={2.4} aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold tracking-widest text-slate-200">
              ESCUDO <span className="text-amber-400">S.O.S</span>
            </p>
            <p className="text-[11px] text-slate-500">Protección personal · {SITE.version}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Escudo S.O.S · Hecho en México · Uso responsable: esta app
          es un apoyo, no un sustituto de los servicios de emergencia oficiales.
        </p>
      </div>
    </footer>
  );
}

/** Botón flotante de WhatsApp — solo aparece si hay número configurado. */
export function WhatsAppFloat() {
  if (!SITE.whatsapp) return null;
  return (
    <motion.a
      href={whatsappLink("Hola, vengo de la página y quiero saber más de Escudo S.O.S")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 18 }}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-2xl shadow-emerald-500/40 transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle className="h-7 w-7 text-white" aria-hidden />
    </motion.a>
  );
}
