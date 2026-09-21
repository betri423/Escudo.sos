'use client';

/**
 * Escudo S.O.S v7.0 — Web (app de la VÍCTIMA)
 *
 * La lógica v6 se conserva INTACTA (regla de oro: solo cambios pedidos):
 *  • Botón S.O.S con cuenta regresiva y cancelación por PIN.
 *  • Palabra clave por voz (Web Speech API, tolerante a acentos).
 *  • Tiempos de bienestar (check-in) con S.O.S automático.
 *
 * Cambios v7 (versión comercial):
 *  • SIN SIRENA (retirada a petición del dueño).
 *  • Enlace ÚNICO para compartir → CONSOLA DEL GUARDIÁN (misma URL + ?t=).
 *  • El guardián puede ESCUCHAR el micrófono (clips de audio en vivo vía
 *    ntfy) y pedir estado/ubicación con comandos CMD:.
 *  • Segundo plano: wake-lock + keep-alive mientras hay alerta o escucha.
 *  • LICENCIA obligatoria: se activa dentro de LicenseGate (page.tsx).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Siren, MapPin, Mic, MicOff, Copy, Check, Bell, BellRing,
  Battery, BatteryLow, Link2, RefreshCw, Send, Share2,
  Clock, HeartHandshake, History, Lock, AlertTriangle, ExternalLink,
  Trash2, User, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CountdownOverlay, CheckInOverlay, PinDialog } from "@/components/guardian/overlays";
import {
  generateTopic, guardianUrl, isTopicValid, mapsUrl, ntfyPublish, formatCoords,
} from "@/lib/guardian/ntfy";
import { NtfyEvent, ntfyUploadAudio, streamTopic } from "@/lib/guardian/stream";
import { startKeepAlive, stopKeepAlive } from "@/lib/guardian/audio";
import { VoiceListener, isSpeechAvailable } from "@/lib/guardian/speech";
import { safeLocalStorage, LS_KEYS } from "@/lib/guardian/storage";

const SOS_COUNTDOWN_S = 10;
const VOICE_CANCEL_S = 15;
const LIVE_LOC_MS = 20000;

type SosPhase = "idle" | "countdown";
type VoiceStatus = "off" | "listening" | "error" | "unsupported";

interface LocState { lat: number; lon: number; acc: number; ts: number }
interface HistItem { at: string; text: string; ok: boolean }

function hhmmss(d = new Date()): string {
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function VictimApp() {
  const { toast } = useToast();

  /* ───────── Config persistente ───────── */
  const [hydrated, setHydrated] = useState(false);
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("1234");
  const [keyword, setKeyword] = useState("ayuda");
  const [voiceOn, setVoiceOn] = useState(false);
  const [ciOn, setCiOn] = useState(false);
  const [ciIntervalMin, setCiIntervalMin] = useState(30);
  const [ciGraceSec, setCiGraceSec] = useState(60);

  /* ───────── Estado en vivo ───────── */
  const [sosPhase, setSosPhase] = useState<SosPhase>("idle");
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownTotal, setCountdownTotal] = useState(SOS_COUNTDOWN_S);
  const [countdownReason, setCountdownReason] = useState("");
  const [ciPrompt, setCiPrompt] = useState(false);
  const [ciCountdown, setCiCountdown] = useState(0);
  const [ciNextIn, setCiNextIn] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("off");
  const [voiceDetail, setVoiceDetail] = useState("");
  const [lastHeard, setLastHeard] = useState("");
  const [voiceTestLeft, setVoiceTestLeft] = useState(0);
  const [loc, setLoc] = useState<LocState | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [hist, setHist] = useState<HistItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [pinMode, setPinMode] = useState<"cancel" | "stop">("cancel");
  const [pinOpen, setPinOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [notifState, setNotifState] = useState<string>("default");
  /* ── v7: escucha del micrófono solicitada por el guardián ── */
  const [listening, setListening] = useState(false);

  /* ───────── Refs ───────── */
  const topicRef = useRef("");
  const nameRef = useRef("");
  const sosSourceRef = useRef<"button" | "voice">("button");
  const countdownDeadline = useRef(0);
  const ciNextAt = useRef(0);
  const ciGraceDeadline = useRef(0);
  const liveLocTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchId = useRef<number | null>(null);
  const voice = useRef<VoiceListener | null>(null);
  const voiceTestRef = useRef<VoiceListener | null>(null);
  const voiceTestUntil = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void>; released: boolean } | null>(null);
  const sosActiveRef = useRef(false);
  const ciOnRef = useRef(false);
  const locRef = useRef<LocState | null>(null);
  const batteryRef = useRef<number | null>(null);
  /* ── v7: refs de escucha de audio ── */
  const listeningRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const listenCooldownRef = useRef(0);
  const startListenRef = useRef<() => void>(() => {});
  const stopListenRef = useRef<() => void>(() => {});
  /* ── v7.1: segundo plano de la escucha de voz ── */
  const voiceOnRef = useRef(false);
  const acquireWakelockRef = useRef<() => void>(() => {});

  const pushHist = useCallback((text: string, ok: boolean) => {
    setHist((h) => [{ at: hhmmss(), text, ok }, ...h].slice(0, 10));
  }, []);

  const stopLiveLocation = useCallback(() => {
    if (liveLocTimer.current) { clearInterval(liveLocTimer.current); liveLocTimer.current = null; }
    if (watchId.current != null) {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  /* ───────── Init ───────── */
  useEffect(() => {
    let t = safeLocalStorage.getItem(LS_KEYS.topic);
    if (!t || !isTopicValid(t)) {
      t = generateTopic();
      safeLocalStorage.setItem(LS_KEYS.topic, t);
    }
    topicRef.current = t;
    setTopic(t);
    const n = safeLocalStorage.getItem(LS_KEYS.name) || "";
    nameRef.current = n;
    setName(n);
    const p = safeLocalStorage.getItem(LS_KEYS.pin) || "1234";
    setPin(p);
    setKeyword(safeLocalStorage.getItem(LS_KEYS.keyword) || "ayuda");
    setVoiceOn(safeLocalStorage.getItem(LS_KEYS.voiceOn) === "1");
    setCiOn(safeLocalStorage.getItem(LS_KEYS.ciOn) === "1");
    setCiIntervalMin(Number(safeLocalStorage.getItem(LS_KEYS.ciIntervalMin) || 30));
    setCiGraceSec(Number(safeLocalStorage.getItem(LS_KEYS.ciGraceMin) || 60));
    setHydrated(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (t: string, f: () => void) => void }>;
    };
    nav.getBattery?.().then((b) => {
      const upd = () => {
        setBattery(Math.round(b.level * 100));
        batteryRef.current = Math.round(b.level * 100);
      };
      upd();
      b.addEventListener("levelchange", upd);
    }).catch(() => {});
    if (typeof Notification !== "undefined") setNotifState(Notification.permission);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        voice.current?.resumeIfWanted();
        // v7.1: el SO suelta el wake lock al ocultar la pestaña; volver a
        // pedirlo si la protección sigue activa (voz / alerta / escucha).
        if (voiceOnRef.current || sosActiveRef.current || listeningRef.current) {
          acquireWakelockRef.current();
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stopLiveLocation();
      stopKeepAlive();
      voice.current?.stop();
      wakeLock.current?.release?.().catch(() => {});
      stopListenRef.current();
    };
  }, []);

  /* ───────── Persistencia ───────── */
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.name, name); }, [name, hydrated]);
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.pin, pin); }, [pin, hydrated]);
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.keyword, keyword); }, [keyword, hydrated]);
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.voiceOn, voiceOn ? "1" : "0"); }, [voiceOn, hydrated]);
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.ciOn, ciOn ? "1" : "0"); }, [ciOn, hydrated]);
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.ciIntervalMin, String(ciIntervalMin)); }, [ciIntervalMin, hydrated]);
  useEffect(() => { if (hydrated) safeLocalStorage.setItem(LS_KEYS.ciGraceMin, String(ciGraceSec)); }, [ciGraceSec, hydrated]);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { ciOnRef.current = ciOn; }, [ciOn]);
  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);

  /* ───────── Ubicación ───────── */
  const refreshLocation = useCallback((silent = false) => {
    if (!navigator.geolocation) return;
    if (!silent) setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const l: LocState = {
          lat: p.coords.latitude, lon: p.coords.longitude,
          acc: p.coords.accuracy ?? 0, ts: Date.now(),
        };
        locRef.current = l;
        setLoc(l);
        setGpsBusy(false);
      },
      () => { setGpsBusy(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );
  }, []);

  const startWatch = useCallback(() => {
    if (watchId.current != null || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const l: LocState = {
          lat: p.coords.latitude, lon: p.coords.longitude,
          acc: p.coords.accuracy ?? 0, ts: Date.now(),
        };
        locRef.current = l;
        setLoc(l);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
  }, []);

  /* ───────── Wake lock ───────── */
  const acquireWakelock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void>; released: boolean }> };
      };
      if (nav.wakeLock) wakeLock.current = await nav.wakeLock.request("screen");
    } catch { /* noop */ }
  }, []);
  useEffect(() => { acquireWakelockRef.current = acquireWakelock; }, [acquireWakelock]);

  /* ───────── Envío de alertas ───────── */
  const sendNow = useCallback(async (
    source: "button" | "voice" | "checkin" | "checkin-help",
  ) => {
    if (sosActiveRef.current) return; // guard de re-entrada (el tick late cada 250 ms)
    const t = topicRef.current;
    if (!t) return;
    // Marcar ANTES del await: evita doble envío mientras la red responde.
    sosActiveRef.current = true;
    setSosActive(true);
    setSosPhase("idle");
    const n = nameRef.current || "Usuario";
    const srcLabel =
      source === "button" ? "botón S.O.S" :
      source === "voice" ? "palabra clave" :
      source === "checkin" ? "sin confirmar bienestar" :
      "pidió ayuda (check-in)";
    const l = locRef.current;
    const bat = batteryRef.current;
    const lines = [
      `🚨 ${n} activó el S.O.S (${srcLabel}).`,
      "",
      l ? `📍 Ubicación: ${mapsUrl(l.lat, l.lon)} (±${Math.round(l.acc)} m)` : "📍 Ubicación: GPS no disponible aún",
      bat != null ? `🔋 Batería: ${bat}%` : null,
      `🕐 ${hhmmss()} — ${new Date().toLocaleDateString("es-MX")}`,
    ].filter(Boolean);
    try {
      await ntfyPublish(t, {
        title: `EMERGENCIA S.O.S — ${n}`,
        message: lines.join("\n"),
        priority: 5,
        tags: ["rotating_light", "sos"],
      });
      pushHist(`S.O.S enviado (${srcLabel})`, true);
      toast({ title: "🚨 S.O.S enviado", description: "Tu guardián ya recibió la alerta urgente." });
    } catch {
      pushHist(`FALLO al enviar S.O.S (${srcLabel})`, false);
      toast({ title: "Error de red", description: "No se pudo enviar el S.O.S. Revisa tu conexión.", variant: "destructive" });
    }
    startKeepAlive();
    acquireWakelock();
    startWatch();
    if (liveLocTimer.current) clearInterval(liveLocTimer.current);
    liveLocTimer.current = setInterval(async () => {
      if (!sosActiveRef.current) return;
      const ll = locRef.current;
      if (!ll || Date.now() - ll.ts > 90000) return;
      try {
        await ntfyPublish(t, {
          title: `Ubicación en vivo — ${n}`,
          message: `📍 ${mapsUrl(ll.lat, ll.lon)}\n🔋 ${batteryRef.current ?? "?"}% · 🕐 ${hhmmss()}`,
          priority: 3,
          tags: ["round_pushpin"],
        });
      } catch { /* noop */ }
    }, LIVE_LOC_MS);

    // v7: durante la emergencia el guardián podrá escuchar el micrófono.
    // Solo se enciende solo si el permiso YA fue concedido antes
    // (nunca interrumpimos una emergencia con un diálogo de permisos).
    try {
      navigator.permissions
        ?.query({ name: "microphone" as PermissionName })
        .then((p) => {
          if (p.state === "granted") startListenRef.current();
        })
        .catch(() => {});
    } catch { /* noop */ }
  }, [pushHist, toast, acquireWakelock, startWatch]);

  const stopAlert = useCallback(async () => {
    const t = topicRef.current;
    const n = nameRef.current || "Usuario";
    sosActiveRef.current = false;
    setSosActive(false);
    stopLiveLocation();
    if (!ciOnRef.current && !listeningRef.current && !voiceOnRef.current) stopKeepAlive();
    if (!listeningRef.current && !voiceOnRef.current) {
      wakeLock.current?.release?.().catch(() => {});
      wakeLock.current = null;
    }
    if (!t) return;
    try {
      await ntfyPublish(t, {
        title: `Falsa alarma — ${n}`,
        message: `✅ ${n} está bien. La alerta fue cancelada (${hhmmss()}).`,
        priority: 4,
        tags: ["white_check_mark"],
      });
      pushHist("Alerta cancelada — aviso enviado", true);
    } catch {
      pushHist("Alerta detenida (sin aviso, sin red)", false);
    }
  }, [pushHist]);

  const armSos = useCallback((source: "button" | "voice") => {
    if (sosActiveRef.current) return;
    const secs = source === "voice" ? VOICE_CANCEL_S : SOS_COUNTDOWN_S;
    sosSourceRef.current = source;
    countdownDeadline.current = Date.now() + secs * 1000;
    setCountdownTotal(secs);
    setCountdown(secs);
    setCountdownReason(
      source === "voice"
        ? `PALABRA CLAVE DETECTADA`
        : "ENVIANDO S.O.S…",
    );
    setSosPhase("countdown");
  }, []);

  /* ───────── Escucha de voz ───────── */
  useEffect(() => {
    if (!hydrated) return;
    if (voiceOn) {
      if (!isSpeechAvailable()) { setVoiceStatus("unsupported"); return; }
      const v = voice.current ?? new VoiceListener();
      voice.current = v;
      v.onHeard = (text) => setLastHeard(text);
      v.onKeyword = () => {
        if (sosActiveRef.current) return;
        if (Date.now() < voiceTestUntil.current) return;
        armSos("voice");
      };
      v.onState = (st, detail) => {
        if (st === "listening") setVoiceStatus("listening");
        else if (st === "error") setVoiceStatus("error");
        else if (st === "stopped") setVoiceStatus((prev) => (prev === "error" ? "error" : "off"));
        if (detail) setVoiceDetail(detail);
      };
      v.start(keyword);
    } else {
      voice.current?.stop();
      voice.current = null;
      setVoiceStatus("off");
    }
    return () => {
      voice.current?.stop();
    };
  }, [voiceOn, hydrated]);

  /* v7.1: aplicar cambios de la palabra clave SIN apagar la escucha. */
  useEffect(() => {
    if (hydrated && voiceOn && voice.current) {
      voice.current.start(keyword);
    }
  }, [keyword, hydrated, voiceOn]);

  /* ───────── v7.1: segundo plano de la escucha de voz ─────────
   * Mientras la palabra clave esté activa, la pestaña "reproduce audio"
   * (inaudible) y la pantalla no se apaga sola: el reconocimiento de voz
   * sobrevive con la app en segundo plano o el teléfono cerrado
   * (Android/Chrome). Solo se libera si nada más lo necesita. */
  useEffect(() => {
    if (!hydrated || !voiceOn) return;
    startKeepAlive();
    acquireWakelock();
    return () => {
      if (!sosActiveRef.current && !ciOnRef.current && !listeningRef.current) {
        stopKeepAlive();
        wakeLock.current?.release?.().catch(() => {});
        wakeLock.current = null;
      }
    };
  }, [voiceOn, hydrated, acquireWakelock]);

  const testVoice = useCallback(() => {
    if (!isSpeechAvailable()) {
      toast({ title: "No disponible", description: "Este navegador no soporta reconocimiento de voz (iOS/Safari).", variant: "destructive" });
      return;
    }
    voiceTestUntil.current = Date.now() + 10000;
    setVoiceTestLeft(10);
    setLastHeard("");
    if (!voice.current) {
      const v = new VoiceListener();
      v.onHeard = (text) => setLastHeard(text);
      v.start(keyword);
      voiceTestRef.current = v;
      setTimeout(() => { v.stop(); voiceTestRef.current = null; }, 10800);
    }
  }, [keyword, toast]);

  /* ───────── v7: escucha del micrófono (para el guardián) ───────── */
  const uploadClip = useCallback(async (blob: Blob, ext: string) => {
    const t = topicRef.current;
    if (!t || blob.size < 800) return;
    if (Date.now() < listenCooldownRef.current) return; // pausa por límite de ritmo de ntfy
    try {
      const res = await ntfyUploadAudio(t, blob, `audio-${Date.now()}.${ext}`);
      if (res.status === 429) listenCooldownRef.current = Date.now() + 60000;
    } catch { /* noop */ }
  }, []);

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;
    const t = topicRef.current;
    const n = nameRef.current || "Usuario";
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-media");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const MR: typeof MediaRecorder | undefined =
        typeof MediaRecorder !== "undefined" ? MediaRecorder : undefined;
      if (!MR) throw new Error("no-recorder");
      const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
        .find((m) => MR.isTypeSupported?.(m)) || "";
      const rec = new MR(stream, mime ? { mimeType: mime } : undefined);
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      micStreamRef.current = stream;
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) void uploadClip(e.data, ext);
      };
      rec.onerror = () => stopListenRef.current();
      rec.start(12000); // un clip cada 12 s
      listeningRef.current = true;
      setListening(true);
      startKeepAlive();
      acquireWakelock();
      if (t) {
        void ntfyPublish(t, {
          title: `Escucha activada — ${n}`,
          message: "🎙️ El guardián está escuchando el micrófono de la víctima.",
          priority: 4,
          tags: ["headphones"],
        }).catch(() => {});
      }
    } catch {
      if (t) {
        void ntfyPublish(t, {
          title: `Micrófono no disponible — ${n}`,
          message: "No se pudo activar la escucha (permiso denegado o navegador sin soporte).",
          priority: 4,
          tags: ["x"],
        }).catch(() => {});
      }
    }
  }, [uploadClip, acquireWakelock]);

  const stopListening = useCallback(() => {
    const t = topicRef.current;
    const n = nameRef.current || "Usuario";
    const was = listeningRef.current;
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.stop();
      }
    } catch { /* noop */ }
    recorderRef.current = null;
    micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    micStreamRef.current = null;
    listeningRef.current = false;
    setListening(false);
    if (!ciOnRef.current && !sosActiveRef.current && !voiceOnRef.current) stopKeepAlive();
    if (!sosActiveRef.current && !voiceOnRef.current) {
      wakeLock.current?.release?.().catch(() => {});
      wakeLock.current = null;
    }
    if (was && t) {
      void ntfyPublish(t, {
        title: `Escucha detenida — ${n}`,
        message: "🎙️ El micrófono dejó de transmitirse.",
        priority: 3,
        tags: ["x"],
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { startListenRef.current = startListening; }, [startListening]);
  useEffect(() => { stopListenRef.current = stopListening; }, [stopListening]);

  /* ───────── v7: comandos del guardián (LISTEN_ON / LISTEN_OFF / PING) ───────── */
  useEffect(() => {
    if (!hydrated) return;
    const respondPing = () => {
      refreshLocation(true);
      window.setTimeout(async () => {
        const t = topicRef.current;
        const n = nameRef.current || "Usuario";
        const l = locRef.current;
        if (!t) return;
        try {
          await ntfyPublish(t, {
            title: `${n} en línea`,
            message: [
              l ? `📍 ${mapsUrl(l.lat, l.lon)} (±${Math.round(l.acc)} m)` : "📍 GPS no disponible",
              `🔋 Batería: ${batteryRef.current ?? "?"}%`,
              `🆘 S.O.S: ${sosActiveRef.current ? "ACTIVO" : "inactivo"} · 🎙️ Escucha: ${listeningRef.current ? "activa" : "inactiva"}`,
              `🕐 ${hhmmss()}`,
            ].join("\n"),
            priority: 4,
            tags: ["signal_strength"],
          });
        } catch { /* noop */ }
      }, 1500);
    };
    const onEvent = (ev: NtfyEvent) => {
      if (ev.event !== "message") return;
      const msg = String(ev.message ?? "");
      if (!msg.startsWith("CMD:")) return; // ignora mensajes propios y otros
      const cmd = msg.slice(4);
      if (cmd === "LISTEN_ON") startListenRef.current();
      else if (cmd === "LISTEN_OFF") stopListenRef.current();
      else if (cmd === "PING") respondPing();
    };
    const handle = streamTopic(topicRef.current, { since: "10m", onEvent });
    return () => handle.abort();
  }, [hydrated, refreshLocation]);

  /* ───────── Check-in (tiempos de bienestar) ───────── */
  const scheduleNextCheck = useCallback(() => {
    ciNextAt.current = Date.now() + ciIntervalMin * 60000;
  }, [ciIntervalMin]);

  useEffect(() => {
    if (!hydrated || !ciOn) return;
    scheduleNextCheck();
    startKeepAlive();
    return () => {
      // v7.1: no matar el keep-alive si la voz o una alerta lo siguen usando.
      if (!voiceOnRef.current && !sosActiveRef.current && !listeningRef.current) {
        stopKeepAlive();
      }
    };
  }, [ciOn, ciIntervalMin, hydrated]);

  useEffect(() => {
    if (hydrated && ciOn) scheduleNextCheck();
  }, [ciOn, ciIntervalMin, hydrated]);

  const startCiPrompt = useCallback(() => {
    ciGraceDeadline.current = Date.now() + ciGraceSec * 1000;
    setCiCountdown(ciGraceSec);
    setCiPrompt(true);
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      try {
        new Notification("Escudo S.O.S — ¿Estás bien?", {
          body: `Tienes ${ciGraceSec} s para confirmar o se enviará un S.O.S a tu guardián.`,
          icon: "/icon-192.png",
          tag: "gsos-ci",
        });
      } catch { /* noop */ }
    }
  }, [ciGraceSec]);

  const answerCi = useCallback(async (fine: boolean) => {
    setCiPrompt(false);
    scheduleNextCheck();
    if (fine) {
      const t = topicRef.current;
      const n = nameRef.current || "Usuario";
      if (t) {
        try {
          await ntfyPublish(t, {
            title: `Check-in OK — ${n}`,
            message: `✅ ${n} confirmó que está bien (${hhmmss()}).`,
            priority: 3,
            tags: ["white_check_mark"],
          });
          pushHist("Check-in confirmado", true);
        } catch { /* noop */ }
      }
    } else {
      sendNow("checkin-help");
    }
  }, [scheduleNextCheck, sendNow, pushHist]);

  /* ───────── Reloj maestro (250 ms) ───────── */
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (sosPhase === "countdown") {
        const left = Math.ceil((countdownDeadline.current - now) / 1000);
        setCountdown(Math.max(0, left));
        if (now >= countdownDeadline.current) sendNow(sosSourceRef.current);
      }
      if (ciOn && !ciPrompt && !sosActive && now >= ciNextAt.current) {
        startCiPrompt();
      }
      if (ciPrompt) {
        const left = Math.ceil((ciGraceDeadline.current - now) / 1000);
        setCiCountdown(Math.max(0, left));
        if (now >= ciGraceDeadline.current) {
          setCiPrompt(false);
          scheduleNextCheck();
          sendNow("checkin");
        }
      } else if (ciOn && !sosActive) {
        setCiNextIn(Math.max(0, Math.ceil((ciNextAt.current - now) / 1000)));
      }
      if (voiceTestUntil.current > now) {
        setVoiceTestLeft(Math.ceil((voiceTestUntil.current - now) / 1000));
      } else if (voiceTestLeft > 0) {
        setVoiceTestLeft(0);
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [sosPhase, ciOn, ciPrompt, sosActive, sendNow, startCiPrompt, scheduleNextCheck, voiceTestLeft]);

  /* ───────── Guardián: enlace ÚNICO (consola) ───────── */
  const gUrl = useMemo(
    () => (typeof window !== "undefined" && topic ? `${window.location.origin}/?t=${topic}` : ""),
    [topic],
  );
  const ntfyUrl = useMemo(() => guardianUrl(topic), [topic]);

  const shareWhatsApp = useCallback(() => {
    const n = nameRef.current || "Alguien";
    const text = `🛡️ ${n} te ha designado su GUARDIÁN en Escudo S.O.S.\n\n` +
      `Abre este enlace en tu navegador (no instalas nada):\n${gUrl}\n\n` +
      `Verás la ubicación en tiempo real, recibirás alertas y podrás escuchar` +
      ` el micrófono en una emergencia. Es un enlace ÚNICO y privado.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [gUrl]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia el enlace manualmente.", variant: "destructive" });
    }
  }, [gUrl, toast]);

  const sendTest = useCallback(async () => {
    const n = nameRef.current || "Usuario";
    try {
      await ntfyPublish(topicRef.current, {
        title: `Prueba de enlace — ${n}`,
        message: `🔔 Si ves esto, el enlace del guardián funciona correctamente.\n🕐 ${hhmmss()}`,
        priority: 4,
        tags: ["bell"],
      });
      pushHist("Prueba enviada al guardián", true);
      toast({ title: "Prueba enviada", description: "Pídele a tu guardián que confirme si la recibió." });
    } catch {
      pushHist("FALLO al enviar prueba", false);
      toast({ title: "Error de red", description: "No se pudo enviar la prueba.", variant: "destructive" });
    }
  }, [pushHist, toast]);

  const regenerate = useCallback(() => {
    const t = generateTopic();
    topicRef.current = t;
    setTopic(t);
    safeLocalStorage.setItem(LS_KEYS.topic, t);
    pushHist("Enlace regenerado (el anterior queda inválido)", true);
    toast({ title: "Enlace nuevo generado", description: "Vuelve a compartirlo con tu guardián." });
  }, [pushHist, toast]);

  const requestNotif = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setNotifState(r);
    if (r === "granted") {
      try {
        new Notification("Notificaciones activadas", {
          body: "Recibirás los avisos de bienestar cuando la app esté en segundo plano.",
          icon: "/icon-192.png",
        });
      } catch { /* noop */ }
    }
  }, []);

  /* ───────── Render ───────── */
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-12 w-12 animate-pulse text-red-500" aria-hidden />
          <p className="text-sm text-slate-400">Cargando Escudo S.O.S…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* ───── Encabezado ───── */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-950">
              <Shield className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Escudo S.O.S</h1>
              <p className="text-[11px] text-slate-400">Sistema de alerta personal</p>
            </div>
          </div>
          <Badge
            variant={sosActive ? "destructive" : "secondary"}
            className={sosActive ? "animate-pulse" : ""}
          >
            {sosActive ? "ALERTA ACTIVA" : sosPhase === "countdown" ? "ENVIANDO…" : "LISTA"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-4">
        {/* ───── Alerta activa ───── */}
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-800 bg-red-950/60 p-4"
          >
            <div className="flex items-start gap-3">
              <Siren className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-red-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-red-200">S.O.S EN CURSO</p>
                <p className="text-xs text-red-100/80">
                  Enviando ubicación en vivo cada 20 s hasta que la detengas.
                  {listening ? " El guardián puede escuchar el micrófono." : ""}
                </p>
              </div>
            </div>
            <Button
              className="mt-3 w-full border-red-700 bg-slate-900 text-red-200 hover:bg-slate-800"
              variant="outline"
              onClick={() => { setPinMode("stop"); setPinOpen(true); }}
            >
              <Lock className="mr-2 h-4 w-4" aria-hidden />
              DETENER ALERTA (PIN)
            </Button>
          </motion.div>
        )}

        {/* ───── v7: escucha activa (aviso a la víctima) ───── */}
        {listening && !sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-violet-800/60 bg-violet-950/40 p-3"
            data-testid="listening-banner"
          >
            <div className="flex items-center gap-2.5">
              <Headphones className="h-5 w-5 shrink-0 animate-pulse text-violet-300" aria-hidden />
              <p className="text-xs leading-relaxed text-violet-100">
                <span className="font-bold">🎧 ESCUCHA ACTIVA</span> — tu guardián está
                escuchando el micrófono de este teléfono.
              </p>
            </div>
          </motion.div>
        )}

        {/* ───── Enlace del guardián ───── */}
        <Card className="border-emerald-900/60 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Link2 className="h-4 w-4" aria-hidden />
              TU GUARDIÁN — ENLACE (no instala nada)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="break-all rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] leading-relaxed text-emerald-300" data-testid="guardian-link">
              {gUrl}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="col-span-2 h-11 bg-emerald-600 font-bold text-white hover:bg-emerald-500"
                onClick={shareWhatsApp}
              >
                <Share2 className="mr-2 h-4 w-4" aria-hidden />
                Compartir por WhatsApp
              </Button>
              <Button
                variant="outline"
                className="h-10 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                onClick={copyLink}
              >
                {copied ? (
                  <><Check className="mr-1.5 h-4 w-4 text-emerald-400" aria-hidden />Copiado</>
                ) : (
                  <><Copy className="mr-1.5 h-4 w-4" aria-hidden />Copiar</>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-10 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                onClick={sendTest}
              >
                <Send className="mr-1.5 h-4 w-4" aria-hidden />
                Probar enlace
              </Button>
              <Button
                variant="ghost"
                className="col-span-2 h-9 text-xs text-slate-400 hover:text-slate-200"
                onClick={() => setRegenOpen(true)}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Regenerar enlace (invalida el actual)
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Enlace ÚNICO de tu instalación: el guardián lo abre en su navegador
              (Android, iPhone o PC) sin instalar nada. Verá tu ubicación en el mapa
              en vivo, recibirá tus alertas y podrá escuchar tu micrófono. Puedes
              dárselo a varios guardianes.
            </p>
            <details className="group rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-400 group-open:text-slate-300">
                🔔 Opción avanzada: notificaciones push con la app ntfy
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Para que a tu guardián le lleguen avisos con la pantalla apagada, puede
                instalar la app gratuita <span className="font-semibold">ntfy</span> y
                suscribirse a este tema (funciona igual que el enlace):
              </p>
              <div className="mt-1.5 break-all rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
                {ntfyUrl}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5 h-8 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(ntfyUrl);
                    toast({ title: "Tema ntfy copiado" });
                  } catch { /* noop */ }
                }}
              >
                <Copy className="mr-1.5 h-3 w-3" aria-hidden />
                Copiar tema ntfy
              </Button>
            </details>
          </CardContent>
        </Card>

        {/* ───── S.O.S ───── */}
        <Card className="border-red-900/60 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <Siren className="h-4 w-4" aria-hidden />
              BOTÓN DE PÁNICO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sosActive ? (
              <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-center">
                <p className="text-sm font-bold text-red-200">ALERTA ENVIADA</p>
                <p className="text-xs text-red-100/70">
                  Ubicación en vivo cada 20 s hasta que la detengas.
                </p>
              </div>
            ) : sosPhase === "countdown" ? (
              <Button
                variant="outline"
                className="h-14 w-full border-red-700 bg-red-950/40 text-base font-bold text-red-200 hover:bg-red-950/70"
                onClick={() => { setPinMode("cancel"); setPinOpen(true); }}
              >
                <Lock className="mr-2 h-5 w-5" aria-hidden />
                CANCELAR ENVÍO (PIN)
              </Button>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-950/50 transition hover:bg-red-500"
                  onClick={() => armSos("button")}
                  aria-label="Activar alerta S.O.S"
                >
                  <span className="text-2xl font-black tracking-widest">S.O.S</span>
                  <span className="text-[11px] font-medium text-red-100">
                    Mantén pulsado el dedo: 10 s para cancelar
                  </span>
                </motion.button>
                <p className="text-center text-[11px] text-slate-500">
                  Se envía con ubicación, batería y hora. Cancelable con PIN.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ───── Perfil ───── */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <User className="h-4 w-4" aria-hidden />
              TU PERFIL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="victim-name" className="text-xs text-slate-400">
                Tu nombre (aparece en las alertas)
              </label>
              <Input
                id="victim-name"
                value={name}
                maxLength={24}
                placeholder="Ej. María"
                className="border-slate-700 bg-slate-950"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="victim-pin" className="text-xs text-slate-400">
                PIN de cancelación (4-8 dígitos)
              </label>
              <Input
                id="victim-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                maxLength={8}
                className="border-slate-700 bg-slate-950"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-[11px] text-slate-500">
                Se pide para cancelar un S.O.S o detener la alerta (evita cancelaciones falsas).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ───── Palabra clave ───── */}
        <Card className="border-violet-900/60 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-violet-300">
              <span className="flex items-center gap-2">
                <Mic className="h-4 w-4" aria-hidden />
                PALABRA CLAVE POR VOZ
              </span>
              <Switch checked={voiceOn} onCheckedChange={setVoiceOn} aria-label="Activar escucha" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {voiceStatus === "unsupported" && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <MicOff className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                Este navegador no soporta escucha de voz (iOS/Safari). Disponible en Android/Chrome.
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="keyword" className="text-xs text-slate-400">
                Palabra que dispara el S.O.S
              </label>
              <Input
                id="keyword"
                value={keyword}
                maxLength={20}
                placeholder="ayuda"
                className="border-slate-700 bg-slate-950"
                onChange={(e) => setKeyword(e.target.value.trim())}
              />
              <p className="text-[11px] text-slate-500">
                Funciona con acentos y mayúsculas ("AYUDA", "aýuda", "ayuda!!").
                Al detectarla tendrás 15 s para cancelar con PIN.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  voiceStatus === "listening" ? "border border-emerald-800 bg-emerald-950 text-emerald-300" :
                  voiceStatus === "error" ? "border border-red-900 bg-red-950 text-red-300" : ""
                }
              >
                {voiceStatus === "listening" ? "ESCUCHANDO" :
                 voiceStatus === "error" ? (voiceDetail || "ERROR DE MICRÓFONO") :
                 voiceStatus === "unsupported" ? "NO SOPORTADO" : "APAGADO"}
              </Badge>
              {voiceOn && voiceStatus === "listening" && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                  activo (funciona en 2.º plano)
                </span>
              )}
            </div>
            {voiceTestLeft > 0 && (
              <div className="rounded-lg border border-violet-900 bg-violet-950/40 p-2.5">
                <p className="text-[11px] font-semibold text-violet-300">
                  PRUEBA DE ESCUCHA ({voiceTestLeft} s) — di "{keyword}" en voz alta:
                </p>
                <p className="mt-1 font-mono text-xs text-violet-100" data-testid="voice-heard">
                  {lastHeard || "(esperando…)"}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="h-10 w-full border-violet-800 bg-violet-950/40 text-violet-200 hover:bg-violet-950/70"
              onClick={testVoice}
            >
              <Mic className="mr-2 h-4 w-4" aria-hidden />
              Probar escucha 10 s
            </Button>
          </CardContent>
        </Card>

        {/* ───── Tiempos de bienestar ───── */}
        <Card className="border-amber-900/60 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-amber-300">
              <span className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" aria-hidden />
                TIEMPOS DE BIENESTAR
              </span>
              <Switch checked={ciOn} onCheckedChange={setCiOn} aria-label="Activar check-in" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="ci-int" className="text-xs text-slate-400">Verificar cada</label>
                <Select value={String(ciIntervalMin)} onValueChange={(v) => setCiIntervalMin(Number(v))}>
                  <SelectTrigger id="ci-int" className="h-10 border-slate-700 bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    {[5, 10, 15, 30, 60, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m >= 60 ? `${m / 60} h` : `${m} min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="ci-grace" className="text-xs text-slate-400">Tolerancia</label>
                <Select value={String(ciGraceSec)} onValueChange={(v) => setCiGraceSec(Number(v))}>
                  <SelectTrigger id="ci-grace" className="h-10 border-slate-700 bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                    {[30, 60, 120, 300].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s < 60 ? `${s} s` : `${s / 60} min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {ciOn && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 p-2.5">
                <Clock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <p className="text-xs text-amber-100">
                  Próxima verificación en{" "}
                  <span className="font-mono font-bold">
                    {String(Math.floor(ciNextIn / 60)).padStart(2, "0")}:{String(ciNextIn % 60).padStart(2, "0")}
                  </span>{" "}
                  — si no confirmas, se envía S.O.S automático.
                </p>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-slate-500">
              Mantén la pestaña abierta (el audio invisible evita que el navegador la
              congele) y activa las notificaciones para responder desde el aviso.
            </p>
          </CardContent>
        </Card>

        {/* ───── Estado y permisos ───── */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <MapPin className="h-4 w-4" aria-hidden />
              UBICACIÓN, BATERÍA Y PERMISOS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">GPS</p>
                {loc ? (
                  <a
                    href={mapsUrl(loc.lat, loc.lon)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 flex items-center gap-1 text-sm font-mono text-emerald-300 underline-offset-2 hover:underline"
                  >
                    {formatCoords(loc.lat, loc.lon)}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-500">sin obtener aún</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 h-9 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                disabled={gpsBusy}
                onClick={() => refreshLocation()}
              >
                <RefreshCw className={gpsBusy ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} aria-hidden />
                {gpsBusy ? "Buscando…" : "Actualizar"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2">
                {battery != null && battery <= 20 ? (
                  <BatteryLow className="h-5 w-5 text-red-400" aria-hidden />
                ) : (
                  <Battery className="h-5 w-5 text-slate-400" aria-hidden />
                )}
                <p className="text-xs text-slate-400">
                  Batería: <span className="font-bold text-slate-200">{battery != null ? `${battery}%` : "—"}</span>
                  {battery != null && battery <= 20 && " (baja: el guardián la verá en la alerta)"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2">
                {notifState === "granted" ? (
                  <BellRing className="h-5 w-5 text-emerald-400" aria-hidden />
                ) : (
                  <Bell className="h-5 w-5 text-slate-400" aria-hidden />
                )}
                <p className="text-xs text-slate-400">
                  Notificaciones:{" "}
                  <span className="font-bold text-slate-200">
                    {notifState === "granted" ? "activadas" : notifState === "denied" ? "bloqueadas" : "sin decidir"}
                  </span>
                </p>
              </div>
              {notifState !== "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  onClick={requestNotif}
                >
                  Activar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ───── Historial ───── */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-300">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" aria-hidden />
                HISTORIAL DE ESTA SESIÓN
              </span>
              {hist.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-300"
                  onClick={() => setHist([])}
                  aria-label="Borrar historial"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hist.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-500">Sin eventos aún.</p>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1" data-testid="history-list">
                {hist.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border border-slate-800/60 bg-slate-950/60 px-2.5 py-1.5">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${h.ok ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden />
                    <span className="text-xs text-slate-300">
                      <span className="font-mono text-slate-500">{h.at}</span> — {h.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Separator className="bg-slate-800" />
        <p className="pb-1 text-center text-[11px] leading-relaxed text-slate-500">
          Instálala en tu pantalla de inicio: menú del navegador → "Añadir a pantalla
          de inicio". Funciona en Android e iPhone.
        </p>
      </main>

      {/* ───── Pie ───── */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-md px-4 py-3 text-center text-[11px] leading-relaxed text-slate-500">
          Escudo S.O.S v7.1 · Sin Bluetooth · Sin cuentas · Alertas por ntfy.sh
          (canal privado de 192 bits, imposible de adivinar)
        </div>
      </footer>

      {/* ───── Overlays ───── */}
      <CountdownOverlay
        open={sosPhase === "countdown"}
        secondsLeft={countdown}
        total={countdownTotal}
        reason={countdownReason}
        onCancel={() => { setPinMode("cancel"); setPinOpen(true); }}
      />
      <CheckInOverlay
        open={ciPrompt}
        secondsLeft={ciCountdown}
        onFine={() => answerCi(true)}
        onHelp={() => answerCi(false)}
      />
      <PinDialog
        open={pinOpen}
        title={pinMode === "cancel" ? "Cancelar envío del S.O.S" : "Detener alerta activa"}
        description={
          pinMode === "cancel"
            ? "Introduce tu PIN para cancelar el envío de esta alerta."
            : "Introduce tu PIN para detener la alerta y avisar a tu guardián de falsa alarma."
        }
        expectedPin={pin}
        onOpenChange={setPinOpen}
        onConfirm={() => {
          if (pinMode === "cancel") setSosPhase("idle");
          else stopAlert();
        }}
      />

      {/* ───── Confirmación regenerar enlace ───── */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-400" aria-hidden />
              ¿Regenerar el enlace?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El enlace actual dejará de recibir alertas de inmediato. Deberás volver a
              compartir el nuevo enlace con tu guardián (o guardianes).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() => { regenerate(); setRegenOpen(false); }}
            >
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
