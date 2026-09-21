"use client";

import { Mic, PhoneOutgoing, UserPlus } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    num: "01",
    icon: UserPlus,
    title: "Configura tus guardianes",
    text: "Agrega hasta 5 números de confianza — mamá, papá, tu pareja o tu mejor amigo — y haz una llamada y un SMS de prueba para comprobar que todo llega.",
  },
  {
    num: "02",
    icon: Mic,
    title: "Pide ayuda",
    text: "Di «AYUDA» en voz alta con el teléfono en el bolsillo, o presiona el botón rojo S.O.S. La alerta se dispara incluso con la pantalla bloqueada y sin datos móviles.",
  },
  {
    num: "03",
    icon: PhoneOutgoing,
    title: "Ellos actúan de inmediato",
    text: "El primer guardián recibe una llamada automática y todos un SMS con tu ubicación. Si hay internet, además escuchan el audio en vivo y ven dónde estás en el mapa.",
  },
];

export function Steps() {
  return (
    <section id="como-funciona" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Cómo funciona"
          title={
            <>
              Tres pasos entre ti y <span className="text-amber-400">el respaldo</span>
            </>
          }
          sub="Sin registros, sin configuraciones complicadas, sin contratos: la instalas, la enciendes y queda velando por ti todo el día."
        />

        <div className="relative mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.12}>
              <article className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-amber-400/30">
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
                    <step.icon className="h-5 w-5 text-amber-400" aria-hidden />
                  </span>
                  <span
                    aria-hidden
                    className="font-[family-name:var(--font-display)] text-4xl font-semibold text-white/10 transition-colors group-hover:text-amber-400/25"
                  >
                    {step.num}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
