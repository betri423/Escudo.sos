'use client';

/**
 * Escudo S.O.S v7.0 — Compuerta de licencia (obligatoria).
 *
 * SIN licencia activa la app NO funciona (requisito comercial). El token de
 * activación se verifica contra /api/license/verify en cada arranque, con
 * tolerancia de 72 h sin conexión (app de emergencia: no debe fallar offline).
 *
 * También vive aquí el ICONO OCULTO de administrador (esquina inferior
 * derecha, casi invisible) → NIP → área de creación de licencias.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, Loader2, Lock, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AdminArea } from "@/components/app/admin-area";
import {
  Activation, clearActivation, fmtExp, getOrCreateDeviceId,
  isLicenseExpired, isValidCodeShape, normalizeCode, readActivation, saveActivation,
} from "@/lib/license";

type Phase = "checking" | "locked" | "unlocked";

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("checking");
  const [lockedReason, setLockedReason] = useState<"" | "expired" | "offline">("");
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState("");
  const devIdRef = useRef("");

  /* ───── Icono oculto / NIP admin ───── */
  const [adminOpen, setAdminOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState(false);
  const verifiedPinRef = useRef("");

  /* ───── Arranque: dispositivo + verificación ───── */
  const runCheck = useCallback(async () => {
    const devId = getOrCreateDeviceId();
    devIdRef.current = devId;
    const act = readActivation();
    if (!act) {
      setPhase("locked");
      setLockedReason("");
      return;
    }
    if (isLicenseExpired(act.exp)) {
      clearActivation();
      setPhase("locked");
      setLockedReason("expired");
      return;
    }
    setPhase("checking");
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: act.token }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok) {
        saveActivation({ ...act, lastOk: Date.now() });
        setPhase("unlocked");
      } else if (data && data.error === "expired") {
        clearActivation();
        setPhase("locked");
        setLockedReason("expired");
      } else {
        // Firma inválida → licencia ilegítima
        clearActivation();
        setPhase("locked");
        setLockedReason("");
      }
    } catch {
      // Sin red: tolerancia de 72 h desde la última verificación OK
      if (Date.now() - act.lastOk < 72 * 3600 * 1000) {
        setPhase("unlocked");
        setLockedReason("offline");
      } else {
        setPhase("locked");
        setLockedReason("offline");
      }
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  /* ───── Activación ───── */
  const activate = useCallback(async () => {
    const norm = normalizeCode(code);
    setActivateError("");
    if (!isValidCodeShape(norm)) {
      setActivateError("El código no tiene el formato correcto (GSOS-…). Verifícalo con tu proveedor.");
      return;
    }
    setActivating(true);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: norm, deviceId: devIdRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok) {
        const act: Activation = {
          token: String(data.token),
          exp: Number(data.exp) || 0,
          lastOk: Date.now(),
        };
        saveActivation(act);
        setPhase("unlocked");
        toast({
          title: "Licencia activada",
          description: `Vigencia: ${fmtExp(act.exp)}. ¡Gracias por proteger a los tuyos!`,
        });
      } else if (data && data.error === "expired") {
        setActivateError("Esa licencia ya expiró. Pide una nueva a tu proveedor.");
      } else {
        setActivateError("Licencia inválida. Verifica el código con tu proveedor.");
      }
    } catch {
      setActivateError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      setActivating(false);
    }
  }, [code, toast]);

  /* ───── NIP del administrador (verificado en el servidor) ───── */
  const submitAdminPin = useCallback(async () => {
    if (!/^[\x21-\x7E]{4,12}$/.test(pinEntry)) { // v11.3: números, letras y signos
      setPinError(true);
      return;
    }
    setPinVerifying(true);
    setPinError(false);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinEntry }),
      });
      if (res.ok) {
        verifiedPinRef.current = pinEntry;
        setPinOpen(false); // cierra el diálogo para que el área admin quede visible
        setAdminOpen(true);
        setPinVerifying(false);
        setPinEntry("");
        return;
      }
      setPinError(true);
    } catch {
      setPinError(true);
    }
    setPinVerifying(false);
  }, [pinEntry]);

  /* ───────── Render ───────── */

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-12 w-12 animate-pulse text-red-500" aria-hidden />
          <p className="text-sm text-slate-400">Verificando licencia…</p>
        </div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-950">
              <Shield className="h-9 w-9 text-white" aria-hidden />
            </div>
            <h1 className="mt-4 text-2xl font-black">Escudo S.O.S</h1>
            <p className="mt-1 text-sm text-slate-400">Sistema de alerta personal</p>
          </div>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" aria-hidden />
              <p className="text-sm font-semibold text-amber-300">Activa tu licencia</p>
            </div>

            {lockedReason === "expired" && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-2.5 text-[11px] leading-relaxed text-red-200" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Tu licencia expiró. Introduce una nueva para volver a usar la app.
              </div>
            )}
            {lockedReason === "offline" && (
              <div className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/30 p-2.5 text-[11px] leading-relaxed text-amber-100/90">
                Llevas más de 72 h sin conexión para verificar tu licencia. Conéctate
                a internet e inténtalo de nuevo.
              </div>
            )}

            <div className="mt-3 space-y-1.5">
              <label htmlFor="license-code" className="text-xs text-slate-400">
                Código de licencia (GSOS-…)
              </label>
              <Input
                id="license-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setActivateError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") activate();
                }}
                placeholder="GSOS-XXXX-…"
                autoComplete="off"
                spellCheck={false}
                className="border-slate-700 bg-slate-950 font-mono text-sm uppercase tracking-wide"
                data-testid="license-input"
              />
            </div>

            <Button
              className="mt-3 h-11 w-full bg-red-600 font-bold text-white hover:bg-red-500"
              disabled={activating}
              onClick={activate}
            >
              {activating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Activando…</>
              ) : (
                <><KeyRound className="mr-2 h-4 w-4" aria-hidden />Activar licencia</>
              )}
            </Button>

            {activateError && (
              <p className="mt-2 text-sm text-red-400" role="alert" data-testid="license-error">
                {activateError}
              </p>
            )}

            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              ¿No tienes licencia? Solicítala a quien te vendió la app.<br />
              Sin licencia activa, la aplicación no funciona.
            </p>
          </div>
        </main>

        <HiddenAdminIcon onClick={() => { setPinEntry(""); setPinError(false); setPinOpen(true); }} />
        <AdminPinDialog
          open={pinOpen}
          onOpenChange={setPinOpen}
          value={pinEntry}
          onChange={(v) => { setPinEntry(v); setPinError(false); }}
          verifying={pinVerifying}
          error={pinError}
          onSubmit={submitAdminPin}
        />
        {adminOpen && <AdminArea adminPin={verifiedPinRef.current} onClose={() => setAdminOpen(false)} />}
      </div>
    );
  }

  /* phase === "unlocked" */
  return (
    <>
      {children}
      <HiddenAdminIcon onClick={() => { setPinEntry(""); setPinError(false); setPinOpen(true); }} />
      <AdminPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        value={pinEntry}
        onChange={(v) => { setPinEntry(v); setPinError(false); }}
        verifying={pinVerifying}
        error={pinError}
        onSubmit={submitAdminPin}
      />
      {adminOpen && <AdminArea adminPin={verifiedPinRef.current} onClose={() => setAdminOpen(false)} />}
    </>
  );
}

/* ───────── Icono oculto de administrador ───────── */

function HiddenAdminIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Acceso de administrador"
      className="fixed bottom-3 right-3 z-[70] flex h-10 w-10 items-center justify-center text-slate-400 opacity-[0.07] transition-opacity hover:opacity-40 focus:opacity-40"
    >
      <Shield className="h-4 w-4" aria-hidden />
    </button>
  );
}

/* ───────── Diálogo del NIP del administrador ───────── */

function AdminPinDialog({
  open, onOpenChange, value, onChange, verifying, error, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: string;
  onChange: (v: string) => void;
  verifying: boolean;
  error: boolean;
  onSubmit: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" aria-hidden />
              Acceso de administrador
            </AlertDialogTitle>
            <AlertDialogDescription>
              Introduce el NIP de administrador (números, letras y signos, 4-12).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            inputMode="text"
            autoComplete="off"
            placeholder="NIP"
            value={value}
            maxLength={12}
            autoFocus
            onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            className={error ? "border-red-600 focus-visible:ring-red-600" : "border-slate-700 bg-slate-950"}
            aria-label="NIP de administrador"
            data-testid="admin-pin-input"
          />
          {error && (
            <p className="text-sm text-red-400" role="alert">
              NIP incorrecto — inténtalo de nuevo.
            </p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              onClick={() => onOpenChange(false)}
            >
              Volver
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-500"
              disabled={verifying}
              onClick={onSubmit}
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Entrar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
