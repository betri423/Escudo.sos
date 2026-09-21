'use client';

/**
 * Escudo S.O.S v7.0 — Enrutador de modos (única página "/").
 *
 *  • SIN parámetro        → app de la VÍCTIMA (requiere licencia activa).
 *  • Con ?t=gsos-<48hex>  → CONSOLA DEL GUARDIÁN (enlace único compartido
 *    por la víctima; no requiere licencia ni instalación).
 */

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { isTopicValid } from "@/lib/guardian/ntfy";
import { LicenseGate } from "@/components/app/license-gate";
import { VictimApp } from "@/components/app/victim-app";
import { GuardianConsole } from "@/components/guardian/console";

type Mode = "loading" | "victim" | "guardian";

export default function Home() {
  const [mode, setMode] = useState<Mode>("loading");
  const [guardianTopic, setGuardianTopic] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t") || "";
    if (t && isTopicValid(t)) {
      setGuardianTopic(t);
      setMode("guardian");
    } else {
      setMode("victim");
    }
  }, []);

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-12 w-12 animate-pulse text-red-500" aria-hidden />
          <p className="text-sm text-slate-400">Abriendo Escudo S.O.S…</p>
        </div>
      </div>
    );
  }

  if (mode === "guardian") {
    return <GuardianConsole topic={guardianTopic} />;
  }

  return (
    <LicenseGate>
      <VictimApp />
    </LicenseGate>
  );
}
