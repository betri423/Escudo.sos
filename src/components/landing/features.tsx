"use client";

import {
  AudioLines,
  Camera,
  MapPinned,
  MapPin,
  Mic,
  Users,
  Volume2,
  WifiOff,
} from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { SITE } from "./site";

const FEATURES = [
  {
    icon: Mic,
    title: "Activación por voz",
    text: "Di «ayuda» y la alerta se dispara. Ideal cuando no puedes alcanzar el teléfono ni desbloquearlo.",
  },
  {
    icon: WifiOff,
    title: "Funciona sin internet",
    text: "La llamada automática y los SMS van por la línea telefónica: sin datos, sin wifi, sin excusas.",
  },
  {
    icon: MapPin,
    title: "Ubicación en vivo",
    text: "Tus guardianes ven en el mapa dónde estás y hacia dónde te mueves, en tiempo real.",
  },
  {
    icon: AudioLines,
    title: "Audio en vivo",
    text: "El micrófono se abre para que tus guardianes escuchen lo que está pasando a tu alrededor.",
  },
  {
    icon: Camera,
    title: "Foto del momento",
    text: "Al activarse la alerta, el teléfono captura una foto del instante y la envía a tus guardianes.",
  },
  {
    icon: MapPinned,
    title: "Aviso de llegada",
    text: "«Ya llegué bien»: tus contactos reciben un aviso cuando llegas a tu destino, sin llamarlos.",
  },
  {
    icon: Users,
    title: `Guardianes sin app (${SITE.maxGuardians})`,
    text: "Hasta 5 contactos reciben llamada y SMS sin instalar nada; si quieren, abren un enlace y ven tu ubicación.",
  },
  {
    icon: Volume2,
    title: "Sirena disuasiva",
    text: "Un sonido fuerte llama la atención de quien está cerca y desanima al agresor.",
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

        <Reveal delay={0.15}>
          <p className="mt-10 text-center text-sm text-slate-500">
            Además: se reinicia sola al encender el teléfono · corre en segundo plano ·{" "}
            {SITE.apkSize} de descarga · verificación interna con 29 pruebas automatizadas.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
