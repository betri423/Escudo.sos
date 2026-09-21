'use client';

/**
 * Overlays de Escudo S.O.S: cuenta regresiva del S.O.S, aviso de
 * bienestar (check-in) a pantalla completa y diálogo de PIN.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Siren, XCircle, HeartHandshake, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

/* ───────────── Cuenta regresiva del S.O.S ───────────── */

export function CountdownOverlay({
  open,
  secondsLeft,
  total,
  reason,
  onCancel,
}: {
  open: boolean;
  secondsLeft: number;
  total: number;
  reason: string;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-950/95 px-6 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1 }}
            className="flex flex-col items-center"
          >
            <Siren className="h-16 w-16 text-red-400" aria-hidden />
            <p className="mt-4 text-lg font-semibold uppercase tracking-widest text-red-200">
              {reason}
            </p>
            <motion.p
              key={secondsLeft}
              initial={{ scale: 1.4, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-2 text-8xl font-black tabular-nums text-white"
            >
              {secondsLeft}
            </motion.p>
            <p className="mt-1 text-sm text-red-200/80">
              Se enviará el S.O.S a tu guardián en {secondsLeft} segundo
              {secondsLeft === 1 ? "" : "s"}
            </p>
          </motion.div>
          <Button
            variant="outline"
            size="lg"
            className="mt-10 border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={onCancel}
            aria-label="Cancelar alerta"
          >
            <XCircle className="mr-2 h-5 w-5" aria-hidden />
            CANCELAR CON PIN
          </Button>
          <div
            className="absolute bottom-0 left-0 h-1 bg-red-500"
            style={{
              width: `${100 - (secondsLeft / total) * 100}%`,
              transition: "width 0.25s linear",
            }}
            aria-hidden
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Overlay de check-in (¿estás bien?) ───────────── */

export function CheckInOverlay({
  open,
  secondsLeft,
  onFine,
  onHelp,
}: {
  open: boolean;
  secondsLeft: number;
  onFine: () => void;
  onHelp: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-amber-950/95 px-6 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2 }}
            className="flex flex-col items-center"
          >
            <HeartHandshake className="h-16 w-16 text-amber-300" aria-hidden />
            <h2 className="mt-4 text-3xl font-black text-white">¿ESTÁS BIEN?</h2>
            <p className="mt-2 max-w-xs text-sm text-amber-100/90">
              Si no respondes en {secondsLeft} segundo
              {secondsLeft === 1 ? "" : "s"}, tu guardián recibirá un S.O.S
              automático.
            </p>
          </motion.div>
          <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
            <Button
              size="lg"
              className="h-14 bg-emerald-600 text-lg font-bold text-white hover:bg-emerald-500"
              onClick={onFine}
            >
              ESTOY BIEN
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 text-lg font-bold"
              onClick={onHelp}
            >
              <AlertTriangle className="mr-2 h-5 w-5" aria-hidden />
              NECESITO AYUDA
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Diálogo de PIN ───────────── */

export function PinDialog({
  open,
  title,
  description,
  expectedPin,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  expectedPin: string;
  onConfirm: () => void;
  onOpenChange: (o: boolean) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin === (expectedPin || "1234")) {
      onConfirm();
      onOpenChange(false);
    } else {
      setError(true);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* Montaje condicional: al abrir se crea fresco (PIN vacío, sin error). */}
      {open && (
      <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" aria-hidden />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN"
          value={pin}
          maxLength={8}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className={
            error
              ? "border-red-600 focus-visible:ring-red-600"
              : "border-slate-700 bg-slate-950"
          }
          aria-label="PIN de cancelación"
        />
        {error && (
          <p className="text-sm text-red-400" role="alert">
            PIN incorrecto — inténtalo de nuevo.
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
          <Button className="bg-red-600 text-white hover:bg-red-500" onClick={submit}>
            Confirmar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
