'use client';

/**
 * Escudo S.O.S v7.0 — Área de administrador.
 *
 * Accesible SOLO desde el icono oculto + NIP. Aquí se crean las licencias
 * que se entregan a los compradores de la app (24 h de prueba, 30/90/365 días
 * o permanente). El historial se guarda localmente en el dispositivo del
 * administrador.
 *
 * OJO con las de 24 h: el tiempo corre desde que se CREAN (no desde que el
 * cliente las activa) — créalas justo antes de enviarlas.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shield, KeyRound, Copy, Check, Trash2, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AdminLicense, fmtExp, readLicenseHistory, saveLicenseHistory,
} from "@/lib/license";

const DURATIONS = [
  { days: 1, label: "24 horas" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 365, label: "1 año" },
  { days: 0, label: "Permanente" },
];

function daysLabel(days: number): string {
  if (days === 0) return "Permanente";
  if (days === 1) return "24 horas";
  return `${days} días`;
}

export function AdminArea({ adminPin, onClose }: { adminPin: string; onClose: () => void }) {
  const [days, setDays] = useState<number>(90);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ code: string; exp: number; days: number } | null>(null);
  const [history, setHistory] = useState<AdminLicense[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  useEffect(() => {
    setHistory(readLicenseHistory());
  }, []);

  const persist = useCallback((list: AdminLicense[]) => {
    setHistory(list);
    saveLicenseHistory(list);
  }, []);

  const generate = useCallback(async () => {
    setCreating(true);
    setError("");
    setCreated(null);
    try {
      const res = await fetch("/api/license/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin, days, label: label.trim().slice(0, 24) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(
          res.status === 403 ? "NIP rechazado (puede haber caducado la sesión)."
            : res.status === 429 ? "Demasiados intentos. Espera unos minutos."
              : "No se pudo crear la licencia.",
        );
        return;
      }
      const item: AdminLicense = {
        code: data.code,
        exp: data.exp,
        days: data.days,
        label: label.trim().slice(0, 24),
        createdAt: Date.now(),
      };
      setCreated(item);
      persist([item, ...readLicenseHistory()]);
    } catch {
      setError("Sin conexión con el servidor de licencias.");
    } finally {
      setCreating(false);
    }
  }, [adminPin, days, label, persist]);

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIdx(code);
      setTimeout(() => setCopiedIdx((c) => (c === code ? null : c)), 2000);
    } catch {
      setError("No se pudo copiar — selecciónalo manualmente.");
    }
  }, []);

  const expiryText = useMemo(() => {
    if (days === 0) return "nunca caduca";
    const d = new Date(Date.now() + days * 86400000);
    return `caduca el ${d.toLocaleDateString("es-MX")}`;
  }, [days]);

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-md px-4 py-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 shadow-lg shadow-slate-950">
              <KeyRound className="h-5 w-5 text-amber-300" aria-hidden />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Área de administrador</h1>
              <p className="text-[11px] text-slate-400">Creador de licencias — uso privado</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-slate-400 hover:text-slate-100"
            onClick={onClose}
            aria-label="Salir del área de administrador"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div className="space-y-4 pt-4">
          {/* Generador */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-amber-300">Nueva licencia</p>

            <p className="mt-3 text-xs text-slate-400">Duración</p>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDays(d.days)}
                  aria-pressed={days === d.days}
                  className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                    days === d.days
                      ? "border-amber-500 bg-amber-950/60 text-amber-200"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-1.5">
              <label htmlFor="lic-label" className="text-xs text-slate-400">
                Etiqueta (opcional — p. ej. nombre del cliente)
              </label>
              <Input
                id="lic-label"
                value={label}
                maxLength={24}
                placeholder="Ej. María — pago de enero"
                className="border-slate-700 bg-slate-950"
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <Button
              className="mt-4 h-11 w-full bg-amber-600 font-bold text-white hover:bg-amber-500"
              disabled={creating}
              onClick={generate}
            >
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Creando…</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" aria-hidden />Crear licencia ({expiryText})</>
              )}
            </Button>

            {error && (
              <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>
            )}

            {created && (
              <div className="mt-4 rounded-lg border border-emerald-800/70 bg-emerald-950/30 p-3" data-testid="license-created">
                <p className="text-xs font-semibold text-emerald-300">
                  Licencia creada — {fmtExp(created.exp)}
                </p>
                <div className="mt-2 break-all rounded-md border border-slate-800 bg-slate-950 p-2.5 font-mono text-[12px] leading-relaxed text-emerald-300">
                  {created.code}
                </div>
                <Button
                  variant="outline"
                  className="mt-2 h-9 w-full border-emerald-800 bg-slate-900 text-emerald-200 hover:bg-slate-800"
                  onClick={() => copyCode(created.code)}
                >
                  {copiedIdx === created.code ? (
                    <><Check className="mr-1.5 h-4 w-4 text-emerald-400" aria-hidden />Copiada</>
                  ) : (
                    <><Copy className="mr-1.5 h-4 w-4" aria-hidden />Copiar código</>
                  )}
                </Button>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  Entrégala al comprador. La activará al abrir la app por primera vez
                  (queda ligada a su teléfono).
                </p>
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">
                Licencias generadas ({history.length})
              </p>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-500 hover:text-red-300"
                  onClick={() => persist([])}
                  aria-label="Borrar historial"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">
                Aún no generas licencias en este dispositivo.
              </p>
            ) : (
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1" data-testid="license-history">
                {history.map((h, i) => (
                  <li key={i} className="rounded-md border border-slate-800/70 bg-slate-950/60 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {daysLabel(h.days)}
                      </Badge>
                      <span className="min-w-0 truncate text-[11px] text-slate-400">
                        {h.label || "sin etiqueta"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">
                        {new Date(h.createdAt).toLocaleDateString("es-MX")}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-1.5 block w-full break-all text-left font-mono text-[11px] text-emerald-300 underline-offset-2 hover:underline"
                      onClick={() => copyCode(h.code)}
                      title="Toca para copiar"
                    >
                      {h.code}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="pb-2 text-center text-[11px] leading-relaxed text-slate-500">
            El NIP acepta números, letras y signos (4-12). Se cambia con la variable <span className="font-mono">ADMIN_PIN</span> en
            Vercel. Las licencias caducan según su duración; el comprador podrá
            activar una nueva al vencer.
          </p>
        </div>
      </div>
    </div>
  );
}
