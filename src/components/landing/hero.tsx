"use client";

import { motion } from "framer-motion";
import {
  AudioLines,
  BatteryFull,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  Shield,
  ShieldCheck,
  Signal,
} from "lucide-react";
import { SITE } from "./site";

/* ─────────────────────────── Mockup del teléfono ─────────────────────────── */

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[270px] select-none sm:w-[300px]">
      {/* Resplandor dorado detrás del teléfono */}
      <div aria-hidden className="absolute -inset-16 rounded-full bg-amber-500/[0.07] blur-3xl" />

      <div className="relative rounded-[2.6rem] border border-white/15 bg-gradient-to-b from-slate-700/70 to-slate-950 p-2 shadow-2xl shadow-black/70">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-[#0B1220]">
          {/* Notch */}
          <div
            aria-hidden
            className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black"
          />

          {/* Barra de estado */}
          <div className="flex items-center justify-between px-7 pt-3 text-slate-400">
            <span className="text-[10px] font-medium tracking-wide">12:40</span>
            <span className="flex items-center gap-1.5" aria-hidden>
              <Signal className="h-3 w-3" />
              <BatteryFull className="h-3 w-3" />
            </span>
          </div>

          {/* Título de la app */}
          <div className="mt-4 flex items-center justify-center gap-2 px-5">
            <Shield className="h-4 w-4 text-amber-400" aria-hidden />
            <span className="text-[11px] font-bold tracking-[0.18em] text-slate-200">
              ESCUDO S.O.S
            </span>
          </div>
          <p className="mt-1 text-center text-[9px] text-slate-500">
            {SITE.version} · teléfonos en la app · licencia
          </p>

          {/* Estado de protección */}
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            <p className="text-[10px] leading-snug text-emerald-300">
              Protección activa · escuchando en segundo plano
            </p>
          </div>

          {/* Botón S.O.S con pulso */}
          <div className="relative flex flex-col items-center pb-2 pt-7">
            <span
              aria-hidden
              className="absolute top-7 h-28 w-28 animate-ping rounded-full bg-red-500/25"
            />
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-800 shadow-[0_0_35px_rgba(220,38,38,0.45)] ring-4 ring-red-500/20">
              <span className="text-xl font-black tracking-wider text-white">S.O.S</span>
              <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-red-100/90">
                Emergencia
              </span>
            </div>
            <p className="mt-3 text-center text-[9px] text-slate-400">
              o di <span className="font-bold text-amber-300">«AYUDA»</span> en voz alta
            </p>
          </div>

          {/* Panel de teléfonos del guardián */}
          <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-amber-400" aria-hidden />
              <p className="text-[9px] font-bold tracking-wide text-slate-200">
                TELÉFONOS DEL GUARDIÁN
              </p>
            </div>
            <p className="mt-1.5 text-[9px] leading-relaxed text-slate-400">
              2 contactos · llamada al 1.º + SMS a todos
            </p>
            <div className="mt-2 space-y-1">
              <p className="rounded-md bg-white/[0.04] px-2 py-1 text-[9px] text-slate-300">
                +52 55 1234 5678 · Mamá
              </p>
              <p className="rounded-md bg-white/[0.04] px-2 py-1 text-[9px] text-slate-300">
                +52 55 8765 4321 · Papá
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chips flotantes (solo pantallas grandes; geometría sin solapamiento) */}
      <FloatingChip
        className="-right-[9.5rem] top-6"
        icon={<Phone className="h-3.5 w-3.5 text-emerald-400" aria-hidden />}
        text="Llamada automática"
        delay={0}
      />
      <FloatingChip
        className="-left-[9.5rem] top-16"
        icon={<MessageSquare className="h-3.5 w-3.5 text-emerald-400" aria-hidden />}
        text="SMS a todos"
        delay={1.4}
      />
      <FloatingChip
        className="-right-[9.5rem] bottom-28"
        icon={<MapPin className="h-3.5 w-3.5 text-amber-400" aria-hidden />}
        text="Ubicación en vivo"
        delay={0.7}
      />
      <FloatingChip
        className="-left-[9.5rem] bottom-10"
        icon={<AudioLines className="h-3.5 w-3.5 text-amber-400" aria-hidden />}
        text="Audio en vivo"
        delay={2.1}
      />
    </div>
  );
}

function FloatingChip({
  className,
  icon,
  text,
  delay,
}: {
  className?: string;
  icon: React.ReactNode;
  text: string;
  delay: number;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
      transition={{
        opacity: { delay: 0.9 + delay * 0.3, duration: 0.5 },
        scale: { delay: 0.9 + delay * 0.3, duration: 0.5 },
        y: { delay: 1.4 + delay * 0.3, duration: 3.4, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`absolute z-20 hidden w-36 items-center gap-2 rounded-xl border border-amber-400/20 bg-[#0B1120]/90 px-3 py-2 shadow-xl shadow-black/50 backdrop-blur lg:flex ${className ?? ""}`}
    >
      {icon}
      <span className="text-[10px] font-medium leading-tight text-slate-200">{text}</span>
    </motion.div>
  );
}

/* ──────────────────────────────── Hero ──────────────────────────────── */

const STATS: Array<{ icon: React.ElementType; value: string; label: string }> = [
  { icon: Mic, value: "1 palabra", label: "di «ayuda» y se activa" },
  { icon: ShieldCheck, value: "24/7", label: "vigilando en segundo plano" },
  { icon: Phone, value: `${SITE.maxGuardians} guardianes`, label: "reciben la alerta a la vez" },
  { icon: BatteryFull, value: SITE.apkSize, label: "app ultraligera y discreta" },
];

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* Fondo: resplandores dorados */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_20%,rgba(245,158,11,0.09),transparent_70%),radial-gradient(50%_40%_at_20%_85%,rgba(220,38,38,0.06),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24 lg:pt-20">
        {/* Columna de texto */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Prueba gratis {SITE.trialHours} horas
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 text-balance text-4xl font-semibold leading-[1.08] text-slate-50 sm:text-5xl lg:text-[3.4rem] font-[family-name:var(--font-display)]"
          >
            Tu seguridad, a un <span className="text-amber-400">grito</span> de distancia.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg lg:mx-0"
          >
            Escudo S.O.S avisa a tus contactos de confianza con una{" "}
            <strong className="font-semibold text-slate-200">llamada automática</strong> y un{" "}
            <strong className="font-semibold text-slate-200">SMS con tu ubicación</strong> — solo
            con decir <span className="font-semibold text-amber-300">«ayuda»</span> o presionar un
            botón. <strong className="font-semibold text-slate-200">Funciona sin internet</strong>{" "}
            y con el teléfono en el bolsillo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <a
              href={SITE.apkUrl}
              download
              className="w-full rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-8 py-3.5 text-center text-base font-bold text-[#1A1206] shadow-xl shadow-amber-500/30 transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
            >
              Descargar gratis para Android
            </a>
            <a
              href="#como-funciona"
              className="w-full rounded-full border border-white/15 bg-white/[0.03] px-8 py-3.5 text-center text-base font-semibold text-slate-200 transition-colors hover:border-amber-400/40 hover:text-amber-300 sm:w-auto"
            >
              Ver cómo funciona
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-4 text-xs text-slate-500"
          >
            APK {SITE.version} · {SITE.apkSize} · Android · Sin cuentas · Sin permanencia
          </motion.p>
        </div>

        {/* Columna del teléfono */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="lg:pl-6"
        >
          <PhoneMockup />
        </motion.div>
      </div>

      {/* Franja de datos clave */}
      <div className="relative border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10">
                <stat.icon className="h-4 w-4 text-amber-400" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-bold text-slate-100">{stat.value}</p>
                <p className="text-xs leading-snug text-slate-500">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
