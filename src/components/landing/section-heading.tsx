"use client";

import { Reveal } from "./reveal";

/** Encabezado de sección: antetítulo dorado + título serif premium. */
export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400/90">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-slate-50 sm:text-4xl font-[family-name:var(--font-display)]">
        {title}
      </h2>
      {sub ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400">{sub}</p>
      ) : null}
    </Reveal>
  );
}
