'use client';

/**
 * Escudo S.O.S v7.4 — CONSOLA DEL GUARDIÁN (FOTO SIEMPRE VISIBLE).
 *
 * Se abre con el ENLACE ÚNICO que comparte la víctima (misma URL de la app
 * + ?t=<tema privado de 192 bits>). No requiere licencia ni instalación:
 *  • Ubicación en TIEMPO REAL con mapa en vivo (se actualiza con cada envío).
 *  • NOTIFICACIONES en este navegador (y opción de push con la app ntfy).
 *  • AUDIO EN VIVO de la víctima — AUTOMÁTICO mientras su S.O.S esté
 *    activo (clips que se reproducen uno tras otro). Sin botones remotos:
 *    la consola ya no puede disparar nada a distancia (v10.0).
 *  • Aviso de S.O.S con vibración y fotos durante la alerta.
 *  • v7.4: ENLACES CLICKEABLES en los mensajes — cada foto de la app
 *    v10.2 llega con un mensaje «Foto (enlace directo)» cuya URL abre
 *    la foto; doble respaldo si la imagen del historial no carga.
 *  • Segundo plano: el audio invisible mantiene la pestaña activa.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, MapPin, Battery, BatteryLow, Bell, BellRing, Headphones,
  Volume2, VolumeX, Radio, Clock, ExternalLink, Wifi, WifiOff,
  AlertTriangle, Siren, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { startKeepAlive, stopKeepAlive } from "@/lib/guardian/audio";
import { NtfyAttachment, NtfyEvent, streamTopic } from "@/lib/guardian/stream";

const MAX_TIMELINE = 50;
const MAX_CLIPS = 12;

type ConnState = "connecting" | "open" | "retrying";

interface TimelineItem {
  id: string;
  ts: number;
  title: string;
  message: string;
  priority: number;
  kind: "sos" | "cancel" | "loc" | "status" | "audio" | "photo" | "listen" | "cmd" | "other";
  attachment?: NtfyAttachment;
}

interface AudioClipItem {
  id: string;
  url: string;
  ts: number;
}

interface LastPos {
  lat: number;
  lon: number;
  acc: number;
  ts: number;
}

function hhmm(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const RE_COORDS = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
const RE_BATTERY = /(\d{1,3})\s*%/;

/**
 * v7.4 — ENLACES CLICKEABLES en los mensajes: la app v10.2 manda cada foto
 * con un mensaje de texto «Foto (enlace directo) … https://ntfy.sh/file/x.jpg».
 * Aquí el enlace se vuelve clicable (en consolas viejas era texto plano y
 * el guardián no podía abrir la foto). También sirve para ubicaciones y
 * cualquier URL que llegue en un mensaje.
 */
function renderMessage(message: string) {
  const parts = message.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-sky-400 underline decoration-sky-700 underline-offset-2 hover:text-sky-300"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function GuardianConsole({ topic }: { topic: string }) {
  /* ───── Estado ───── */
  const [conn, setConn] = useState<ConnState>("connecting");
  const [sosActive, setSosActive] = useState(false);
  const [victimName, setVictimName] = useState("La víctima");
  const [battery, setBattery] = useState<number | null>(null);
  const [lastPos, setLastPos] = useState<LastPos | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [clips, setClips] = useState<AudioClipItem[]>([]);
  const [autoplay, setAutoplay] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [notifState, setNotifState] = useState<string>("default");
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  const seenIds = useRef<Set<string>>(new Set());
  const playedIds = useRef<Set<string>>(new Set());
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const autoplayRef = useRef(true);

  useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);

  /* ───── Notificaciones locales + vibración ───── */
  const notify = useCallback((ev: NtfyEvent) => {
    if (ev.priority !== undefined && ev.priority >= 4) {
      try { navigator.vibrate?.([300, 150, 300]); } catch { /* noop */ }
    }
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      ev.priority !== undefined && ev.priority >= 4
    ) {
      try {
        new Notification(ev.title || "Escudo S.O.S", {
          body: (ev.message || "").slice(0, 180),
          tag: ev.id,
          icon: "/icon-192.png",
        });
      } catch { /* noop */ }
    }
  }, []);

  /* ───── Recepción y clasificación de eventos ───── */
  const onEvent = useCallback((ev: NtfyEvent) => {
    if (ev.event !== "message" || !ev.id) return;
    if (seenIds.current.has(ev.id)) return; // evita duplicados al reconectar
    seenIds.current.add(ev.id);

    const title = String(ev.title ?? "");
    const message = String(ev.message ?? "");
    const ts = Number(ev.time ?? Date.now() / 1000);
    notify(ev);

    // Coordenadas y batería (de cualquier mensaje que las incluya)
    const cm = RE_COORDS.exec(message);
    if (cm) {
      setLastPos({
        lat: Number(cm[1]),
        lon: Number(cm[2]),
        acc: 0,
        ts,
      });
    }
    const bm = RE_BATTERY.exec(message);
    if (bm) setBattery(Number(bm[1]));

    // Nombre de la víctima (título "… — Nombre")
    const dash = title.lastIndexOf(" — ");
    if (dash > 0 && !title.startsWith("CMD")) {
      setVictimName(title.slice(dash + 3).trim() || "La víctima");
    }

    let kind: TimelineItem["kind"] = "other";
    let priority = ev.priority ?? 3;

    if (title.startsWith("EMERGENCIA S.O.S")) {
      kind = "sos";
      setSosActive(true);
    } else if (title.startsWith("Falsa alarma")) {
      kind = "cancel";
      setSosActive(false);
    } else if (title.startsWith("Ubicacion en vivo")) {
      kind = "loc";
    } else if (title.includes("en linea") || title.startsWith("Check-in OK")) {
      kind = "status";
    } else if (ev.attachment && ev.attachment.name?.startsWith("foto-")) {
      // v9.5→v10.0: foto de la ALERTA S.O.S en curso (una inmediata + una
      // cada 30 s mientras dure — anunciadas en el teléfono de la víctima).
      kind = "photo";
    } else if (ev.attachment && ev.attachment.name?.startsWith("audio-")) {
      kind = "audio";
    }

    setTimeline((tl) => [
      { id: ev.id!, ts, title, message, priority, kind, attachment: ev.attachment },
      ...tl,
    ].slice(0, MAX_TIMELINE));

    // Clips de audio → cola de reproducción
    if (ev.attachment && ev.attachment.name?.startsWith("audio-") && ev.attachment.url) {
      setClips((c) => [
        { id: ev.id!, url: ev.attachment!.url, ts },
        ...c,
      ].slice(0, MAX_CLIPS));
    }
  }, [notify]);

  /* ───── Conexión (flujo en vivo con reconexión) ───── */
  useEffect(() => {
    const handle = streamTopic(topic, {
      since: "3h",
      onEvent,
      onState: (s) => setConn(s === "open" ? "open" : s === "retrying" ? "retrying" : "connecting"),
    });
    if (typeof Notification !== "undefined") setNotifState(Notification.permission);
    return () => {
      handle.abort();
      stopKeepAlive();
      audioElRef.current?.pause();
      audioElRef.current = null;
    };
  }, [topic, onEvent]);

  /* ───── v7.1: reanudar el audio invisible al volver de segundo plano ─────
   * El SO móvil puede pausar la reproducción al apagar la pantalla; con este
   * reintento la consola vuelve a quedar "reproduciendo audio" y sigue viva. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && unlockedRef.current) {
        startKeepAlive();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ───── Cola de audio: reproduce los clips en orden ───── */
  const playNext = useCallback(() => {
    if (!unlockedRef.current || !autoplayRef.current) return;
    const next = [...clips].reverse().find((c) => !playedIds.current.has(c.id));
    if (!next) {
      setNowPlaying(null);
      return;
    }
    playedIds.current.add(next.id);
    setNowPlaying(next.id);
    const el = new Audio(next.url);
    audioElRef.current = el;
    el.onended = () => { playNext(); };
    el.onerror = () => { playNext(); };
    el.play().catch(() => { playNext(); });
  }, [clips]);

  useEffect(() => {
    if (unlockedRef.current && autoplayRef.current && !nowPlaying) playNext();
  }, [clips, nowPlaying, playNext]);

  /* ───── Acciones del guardián ───── */
  const unlockAudio = useCallback(() => {
    unlockedRef.current = true;
    setAudioUnlocked(true);
    startKeepAlive(); // audio invisible: evita que el navegador congele la pestaña
    playNext();
  }, [playNext]);

  /* v10.0 — SIN ACCIONES REMOTAS: los botones de ESCUCHA y PING fueron
   * retirados junto al canal de comandos (CmdListener eliminado del APK).
   * El audio en vivo y la ubicación llegan solos mientras dure la alerta. */

  const requestNotif = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setNotifState(r);
  }, []);

  /* ───── Mapa ───── */
  const mapSrc = useMemo(() => {
    if (!lastPos) return "";
    const d = 0.008;
    const { lat, lon } = lastPos;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
  }, [lastPos]);

  const gmapsUrl = useMemo(
    () => (lastPos ? `https://maps.google.com/?q=${lastPos.lat.toFixed(6)},${lastPos.lon.toFixed(6)}` : ""),
    [lastPos],
  );

  const ntfyWebUrl = `https://ntfy.sh/${topic}`;

  const lastUpdateTxt = lastPos ? hhmm(lastPos.ts) : "—";

  /* ───────── Render ───────── */
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Encabezado */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-950">
              <Shield className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Consola del guardián</h1>
              <p className="text-[11px] text-slate-400">
                Protegiendo a <span className="font-semibold text-slate-200">{victimName}</span>
              </p>
            </div>
          </div>
          <Badge
            variant={sosActive ? "destructive" : "secondary"}
            className={sosActive ? "animate-pulse" : ""}
            data-testid="sos-badge"
          >
            {sosActive ? "🚨 S.O.S ACTIVO" : conn === "open" ? "EN VIVO" : "CONECTANDO…"}
          </Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-4" data-testid="guardian-console">
        {/* Banner de emergencia */}
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-800 bg-red-950/70 p-4"
          >
            <div className="flex items-start gap-3">
              <Siren className="mt-0.5 h-6 w-6 shrink-0 animate-pulse text-red-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-red-200">EMERGENCIA EN CURSO</p>
                <p className="text-xs text-red-100/80">
                  {victimName} activó el S.O.S. Recibirás su ubicación cada 20 s y
                  puedes escuchar su micrófono.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Conexión */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-[11px]">
          <span className="flex items-center gap-2 text-slate-400">
            {conn === "open" ? (
              <><Wifi className="h-3.5 w-3.5 text-emerald-400" aria-hidden />Conectado en tiempo real</>
            ) : (
              <><WifiOff className="h-3.5 w-3.5 text-amber-400" aria-hidden />Reconectando…</>
            )}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Última actualización: {lastUpdateTxt}
          </span>
        </div>

        {/* Ubicación en tiempo real */}
        <Card className="border-emerald-900/60 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <MapPin className="h-4 w-4" aria-hidden />
              UBICACIÓN EN TIEMPO REAL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastPos ? (
              <>
                <div className="overflow-hidden rounded-lg border border-slate-800">
                  <iframe
                    src={mapSrc}
                    title="Mapa de la última ubicación"
                    className="h-52 w-full"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-emerald-300">
                    {lastPos.lat.toFixed(5)}, {lastPos.lon.toFixed(5)}
                  </p>
                  <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-emerald-800 bg-slate-900 text-emerald-200 hover:bg-slate-800"
                    >
                      <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                      Google Maps
                    </Button>
                  </a>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">
                Esperando la primera ubicación… (aparecerá cuando la víctima
                active una alerta S.O.S)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Audio en vivo (automático durante la alerta) */}
        <Card className="border-violet-900/60 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-violet-300">
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4" aria-hidden />
                AUDIO EN VIVO DE LA ALERTA
              </span>
              <Badge
                variant="secondary"
                className={
                  sosActive ? "border border-violet-700 bg-violet-950 text-violet-200 animate-pulse" : ""
                }
              >
                {sosActive ? "TRANSMITIENDO" : "EN ESPERA"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Mientras el S.O.S esté activo, el micrófono se transmite
              automáticamente (y el teléfono de la víctima lo muestra en
              pantalla). Sin botón remoto: la escucha no se puede encender
              a distancia (v10.0).
            </p>
            {!audioUnlocked && (
              <Button
                variant="outline"
                className="h-11 w-full border-violet-800 bg-violet-950/40 text-violet-200 hover:bg-violet-950/70"
                onClick={unlockAudio}
                data-testid="unlock-audio"
              >
                <Volume2 className="mr-2 h-4 w-4" aria-hidden />
                Activar el audio y el segundo plano
              </Button>
            )}
            {audioUnlocked && (
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] text-slate-400">
                  {autoplay ? (
                    <><Volume2 className="h-3.5 w-3.5 text-violet-300" aria-hidden />Reproducción automática activa</>
                  ) : (
                    <><VolumeX className="h-3.5 w-3.5 text-slate-500" aria-hidden />Reproducción manual</>
                  )}
                </span>
                <Switch checked={autoplay} onCheckedChange={setAutoplay} aria-label="Reproducción automática" />
              </div>
            )}

            {/* Clips */}
            {clips.length > 0 && (
              <div className="space-y-1.5" data-testid="audio-clips">
                {clips.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                      nowPlaying === c.id
                        ? "border-violet-700 bg-violet-950/50"
                        : "border-slate-800 bg-slate-950/60"
                    }`}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-violet-300"
                      onClick={() => {
                        playedIds.current.add(c.id);
                        setNowPlaying(c.id);
                        audioElRef.current?.pause();
                        const el = new Audio(c.url);
                        audioElRef.current = el;
                        el.onended = () => setNowPlaying(null);
                        el.play().catch(() => setNowPlaying(null));
                      }}
                      aria-label={`Reproducir clip de las ${hhmm(c.ts)}`}
                    >
                      <Play className="h-4 w-4" aria-hidden />
                    </Button>
                    <span className="font-mono text-[11px] text-slate-400">{hhmm(c.ts)}</span>
                    {nowPlaying === c.id && (
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-violet-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" aria-hidden />
                        sonando
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-slate-500">
              Los clips llegan cada ~15 s durante la alerta y se reproducen en
              orden. Tuve que tocar "Activar el audio" una sola vez (política
              de los navegadores).
            </p>
          </CardContent>
        </Card>

        {/* Estado y acciones */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Radio className="h-4 w-4" aria-hidden />
              ESTADO Y ACCIONES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="h-10 w-full border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              onClick={requestNotif}
              disabled={notifState === "granted"}
            >
              {notifState === "granted" ? (
                <><BellRing className="mr-1.5 h-4 w-4 text-emerald-400" aria-hidden />Alertas listas</>
              ) : (
                <><Bell className="mr-1.5 h-4 w-4" aria-hidden />Activar alertas del navegador</>
              )}
            </Button>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-2">
                {battery != null && battery <= 20 ? (
                  <BatteryLow className="h-5 w-5 text-red-400" aria-hidden />
                ) : (
                  <Battery className="h-5 w-5 text-slate-400" aria-hidden />
                )}
                <p className="text-xs text-slate-400">
                  Batería de {victimName}:{" "}
                  <span className="font-bold text-slate-200">{battery != null ? `${battery}%` : "—"}</span>
                  {battery != null && battery <= 20 && " (baja)"}
                </p>
              </div>
            </div>
            <details className="group rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-400 group-open:text-slate-300">
                🔔 Notificaciones con la pantalla apagada (app ntfy)
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Para recibir avisos aunque cierres el navegador, instala la app
                gratuita <span className="font-semibold">ntfy</span> (Android/iPhone)
                y suscríbete al tema de este enlace:
              </p>
              <div className="mt-1.5 break-all rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
                {ntfyWebUrl}
              </div>
              <a href={ntfyWebUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 h-8 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  <ExternalLink className="mr-1.5 h-3 w-3" aria-hidden />
                  Abrir tema en ntfy
                </Button>
              </a>
            </details>
          </CardContent>
        </Card>

        {/* Historial en vivo */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Clock className="h-4 w-4" aria-hidden />
              EVENTOS EN VIVO
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">
                Sin eventos aún. Cuando {victimName} active una alerta, la verás aquí.
              </p>
            ) : (
              <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1" data-testid="guardian-timeline">
                {timeline.map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-md border px-2.5 py-1.5 ${
                      t.kind === "sos"
                        ? "border-red-900/70 bg-red-950/40"
                        : t.kind === "cancel"
                          ? "border-emerald-900/60 bg-emerald-950/30"
                          : t.priority >= 4
                            ? "border-amber-900/50 bg-amber-950/20"
                            : "border-slate-800/60 bg-slate-950/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-xs font-semibold text-slate-200">
                        {t.kind === "cmd" ? "Comando enviado a la víctima" : t.title || "(sin título)"}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">{hhmm(t.ts)}</span>
                    </div>
                    {t.message && t.kind !== "cmd" && (
                      <p className="mt-0.5 whitespace-pre-line break-words text-[11px] leading-relaxed text-slate-400">
                        {/* v7.4 — enlaces clickeables (el mensaje «Foto (enlace
                            directo)» de la app v10.2 trae la URL de la foto) */}
                        {renderMessage(t.message.slice(0, 300))}
                      </p>
                    )}
                    {t.kind === "photo" && t.attachment?.url && (
                      <a
                        href={t.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 block"
                        title="Ampliar foto"
                      >
                        {/* v7.3 — FOTO COMPLETA: object-contain (antes object-cover
                            + max-h-56: una foto VERTICAL se recortaba a una franja
                            — «solo se ve un pedazo de la foto»). Fondo oscuro para
                            que el encaje (letterbox) se vea limpio. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.attachment.url}
                          alt="Foto de la alerta S.O.S"
                          loading="eager"
                          className="max-h-80 w-full rounded-md border border-slate-700 bg-slate-950 object-contain"
                        />
                        {/* v7.4 — doble respaldo: si la imagen no carga (p. ej.
                            el adjunto expiró a las 3 h de ntfy), el mensaje
                            «Foto (enlace directo)» del historial también trae
                            la URL clicable. */}
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          Toca la foto para verla completa · Si no carga, abre el
                          mensaje «Foto (enlace directo)» de abajo
                        </p>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Separator className="bg-slate-800" />
        <p className="pb-1 text-center text-[11px] leading-relaxed text-slate-500">
          Mantén esta pestaña abierta (el audio invisible evita que se congele).
          Escudo S.O.S v7.4 · canal privado de 192 bits.
        </p>
      </main>

      <footer className="mt-auto border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-md px-4 py-3 text-center text-[11px] leading-relaxed text-slate-500">
          <AlertTriangle className="mx-auto mb-1 h-3.5 w-3.5 text-slate-600" aria-hidden />
          En una emergencia real, llama también a los servicios de emergencia
          de tu país (911).
        </div>
      </footer>
    </div>
  );
}
