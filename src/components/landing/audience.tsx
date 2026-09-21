"use client";

import { Baby, HeartHandshake, PersonStanding, Truck } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const AUDIENCES = [
  {
    icon: Baby,
    title: "Hijos",
    text: "Sabes que llegaron bien de la escuela: el aviso de llegada te confirma cada destino sin llamarlos cada rato.",
  },
  {
    icon: HeartHandshake,
    title: "Mamás y papás",
    text: "Tranquilidad al salir de noche o tomar un taxi: sus guardianes reciben la alerta al instante y con ubicación.",
  },
  {
    icon: PersonStanding,
    title: "Abuelitos",
    text: "Un botón rojo gigante y una palabra: «ayuda». Si dicen ayuda, toda la familia se entera al momento.",
  },
  {
    icon: Truck,
    title: "Trabajadores",
    text: "Repartidores, vendedores y personal de campo que andan solos: respaldo inmediato en cualquier ruta.",
  },
];

export function Audience() {
  return (
    <section id="para-quien" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="¿Para quién es?"
          title={
            <>
              Hecha para todos <span className="text-amber-400">los que quieres proteger</span>
            </>
          }
          sub="La misma app cuida a toda la familia: cada quien con sus propios guardianes, en su propio teléfono."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.09}>
              <article className="h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 text-center transition-colors hover:border-amber-400/30">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
                  <a.icon className="h-6 w-6 text-amber-400" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-100">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{a.text}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-12 text-center font-[family-name:var(--font-display)] text-2xl italic text-slate-300">
            «Proteger a los tuyos nunca fue tan sencillo.»
          </p>
        </Reveal>
      </div>
    </section>
  );
}
