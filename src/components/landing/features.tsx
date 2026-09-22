"use client";

import {
  AudioLines,
  KeyRound,
  MapPin,
  Mic,
  PhoneCall,
  ShieldCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { SITE } from "./site";

const FEATURES = [
  {
    icon: Mic,
    title: "Activación por voz",
    text: "Di «ayuda» en voz alta y la alerta se dispara. Ideal cuando no puedes alcanzar el teléfono ni desbloquearlo.",
  },
  {
    icon: KeyRound,
    title: "Palabra clave personalizable",
    text: "Tú eliges la palabra secreta que la activa: «ayuda» o la que prefieras. Solo tú y los tuyos la conocen.",
  },
  {
    icon: WifiOff,
    title: "Funciona sin internet",
    text: "La llamada automática y los SMS van por la línea telefónica: sin datos, sin wifi, sin excusas.",
  },
  {
    icon: PhoneCall,
    title: "Llamada + SMS automáticos",
    text: "Tu teléfono marca solo al primer guardián y envía un SMS con tu ubicación a todos los demás. Directo y sin Apps.",
  },
  {
    icon: MapPin,
    title: "Ubicación en vivo",
    text: "Tus guardianes ven en el mapa dónde estás y hacia dónde te mueves, en tiempo real.",
  },
  {
    icon: AudioLines,
    title: "Manda audios en vivo",
    text: "El micrófono se abre y a tus guardianes les llegan audios de lo que está pasando, en tiempo real.",
  },
  {
    icon: Users,
    title: `Tus guardianes no descargan NADA`,
    text: `Hasta ${SITE.maxGuardians} contactos reciben la llamada y el SMS en su teléfono normal, sin instalar ninguna App. Quien quiera más, abre un enlace en su navegador.`,
  },
  {
    icon: ShieldCheck,
    title: "Vigila 24/7 en segundo plano",
    text: "Corre siempre en segundo plano, escucha con la pantalla apagada y se reinicia sola al encender el teléfono.",
  },
];

export function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 border-y border-white/5 bg-white/[0.015] py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Funciones"
          title={
            <>
              Una guardia que <span className="text-amber-400">nunca duerme</span>
            </>
          }
          sub="Cada función existe por una razón: que tus seres queridos se enteren a tiempo, aunque tú no puedas marcar un número."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 4) * 0.08}>
              <article className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-xl hover:shadow-amber-500/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400/20 to-amber-600/10 ring-1 ring-amber-400/25">
                  <feature.icon className="h-5 w-5 text-amber-400" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.text}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12} className="mt-12">
          <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-400/10 via-amber-400/[0.06] to-red-500/[0.06] p-6 sm:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              No existe otra igual
            </p>
            <p className="mx-auto mt-3 max-w-3xl text-center text-base leading-relaxed text-slate-300 sm:text-lg">
              Detección <span className="font-semibold text-amber-300">por voz</span> · alerta{" "}
              <span className="font-semibold text-amber-300">sin internet</span> · guardianes{" "}
              <span className="font-semibold text-amber-300">sin instalar nada</span> · palabra clave{" "}
              <span className="font-semibold text-amber-300">a tu elección</span> ·{" "}
              <span className="font-semibold text-amber-300">audios en vivo</span> — todo en {SITE.apkSize}.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-8 text-center text-sm text-slate-500">
            Sin Apps para tus guardianes · corre en segundo plano · se reinicia sola ·{" "}
            {SITE.apkSize} de descarga · verificación interna con 29 pruebas automatizadas.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
