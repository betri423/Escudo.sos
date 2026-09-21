"use client";

import { Shield } from "lucide-react";
import { SITE } from "./site";

const NAV = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funciones", label: "Funciones" },
  { href: "#para-quien", label: "¿Para quién?" },
  { href: "#prueba", label: "Prueba gratis" },
  { href: "#preguntas", label: "Preguntas" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#05070D]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#inicio" className="flex items-center gap-2.5" aria-label="Escudo S.O.S — inicio">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-amber-300 to-amber-600 shadow-lg shadow-amber-500/20">
            <Shield className="h-5 w-5 text-[#1A1206]" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="text-sm font-bold tracking-widest text-slate-100">
            GUARDIÁN <span className="text-amber-400">S.O.S</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-slate-400 transition-colors hover:text-amber-300"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href={SITE.apkUrl}
          download
          className="rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2 text-sm font-semibold text-[#1A1206] shadow-lg shadow-amber-500/25 transition-transform hover:scale-[1.03] active:scale-95"
        >
          Descargar
        </a>
      </div>
    </header>
  );
}
