# Escudo S.O.S (antes Guardián S.O.S) — App Web v7.6 (despliegue en Vercel)

Versión COMERCIAL de la app de alerta personal (Next.js + shadcn/ui, tema
oscuro). Cambios de la v7.6: (1) la app se RENOMBRÓ a «Escudo S.O.S»
(había apps con nombre parecido); (2) el NIP del administrador acepta
NÚMEROS, LETRAS Y SIGNOS (4-12 caracteres; antes solo 4-8 dígitos).

- **LICENCIA OBLIGATORIA**: la app no funciona sin una licencia activa.
- **Área de administrador OCULTA** (icono casi invisible abajo a la derecha)
  protegida con **NIP** — ahí se crean las licencias que vendes.
- **Enlace ÚNICO para compartir**: la víctima comparte el enlace de su
  CONSOLA DEL GUARDIÁN (tu-URL/?t=código-privado-de-192-bits).
- **Consola del guardián** (sin instalar nada, abre el enlace): ubicación en
  TIEMPO REAL con mapa, notificaciones, eventos en vivo y **escucha del
  micrófono** de la víctima (clips de audio que se reproducen solos).
- **Sin sirena** en la app de la víctima (retirada a petición del dueño).
- Botón S.O.S con cuenta regresiva + PIN, palabra clave por voz y tiempos de
  bienestar: **todo igual que en la v6.1**.
- Sin Bluetooth. Sin cuentas. Sin base de datos (las licencias viajan firmadas
  criptográficamente — HMAC-SHA256 — sin necesidad de servicios externos).

## Correcciones de la v7.1 (voz + segundo plano)

Reporte del dueño: "la alerta no se activa con voz, solo con SOS, y no
funciona en segundo plano con el teléfono cerrado". Causas y arreglos
(sin tocar nada más de lo que ya funcionaba):

1. **Voz que se moría para siempre**: Android/Chrome detiene el
   reconocimiento de voz al ocultar la pestaña; el código viejo no volvía a
   arrancarlo al regresar (quedaba muerto aunque la pantalla dijera
   "ESCUCHANDO"). Ahora se **autorepara**: cada muerte se detecta
   (`onend`), se limpia y se relanza — también con la pestaña en segundo
   plano — y un **watchdog de 3 s** repara cualquier caída no detectada.
   Cambiar la palabra clave ya no requiere apagar/encender la escucha.
2. **Segundo plano real (Android/Chrome)**: mientras la palabra clave está
   activa, la app "reproduce" un audio inaudible en bucle → el sistema
   mantiene la pestaña viva (temporizadores, red y micrófono) con la
   pantalla apagada. Verás una **notificación de medios** en el teléfono:
   es la señal de que la protección sigue activa. Antes solo había alerta
   o escucha; ahora también con la voz activa.
3. **Wake lock re-adquirido**: al volver a primer plano se vuelve a pedir
   el bloqueo de pantalla si la protección sigue activa.
4. La consola del guardián también reanuda su audio invisible al volver de
   segundo plano (mantiene la conexión y las notificaciones vivas).

Límites honestos del navegador (no de la app): iOS/Safari no soporta
reconocimiento de voz, y ningún navegador web puede escuchar el micrófono
con la pantalla bloqueada por completo; con esta corrección la voz sigue
activa con la app en segundo plano mientras el sistema no mate la pestaña
(recomendación: instalar como app "Añadir a pantalla de inicio" y eximir a
Chrome de la optimización de batería). Para avisos del guardián con
teleéfono apagado al 100%, la vía robusta sigue siendo la app ntfy.

## ⚠️ CONFIGURACIÓN ANTES DE VENDER (2 variables)

En Vercel: **Settings → Environment Variables**, agrégalas y haz **Redeploy**:

| Variable | Para qué | Ejemplo |
|---|---|---|
| `ADMIN_PIN` | NIP del área de administrador. **Por defecto: 2580** — CÁMBIALO. Acepta números, letras y signos (4-12 caracteres, sin espacios). Ej.: `M1#escudo`. | `M1#escudo` |
| `LICENSE_SECRET` | Secreto con el que se firman las licencias. **Por defecto hay uno de desarrollo** — genera uno propio aleatorio largo. Si lo cambias DESPUÉS de vender licencias, esas licencias dejarán de ser válidas. | `f9m2…(40+ caracteres)` |

Genera un secreto aleatorio, p. ej. con: `openssl rand -hex 32`.

Sin estas variables la app FUNCIONA (usa los valores por defecto), pero para
vender en producción es mucho más seguro definirlas.

## Cómo cambiar la CLAVE (NIP) vía Vercel — paso a paso

1. Entra a **vercel.com** e inicia sesión.
2. Abre tu proyecto de Escudo S.O.S → pestaña **Settings**.
3. Menú lateral **Environment Variables** (Variables de entorno).
4. Busca la variable **ADMIN_PIN** → edita su valor (o créala si no existe:
   Key = `ADMIN_PIN`, Value = tu nuevo NIP, Environment = Production).
5. Haz clic en **Save** y después **Deployments** → ⋮ del despliegue más
   reciente → **Redeploy** (sin marcar «Clear Build Cache» es suficiente).
6. Abre tu URL y prueba el NIP nuevo en el icono oculto de admin.

OJO: el NIP de la CONSOLA WEB (esta variable) y el NIP del ÁREA DE ADMIN de
la APK son INDEPENDIENTES — cada uno se cambia en su lado (la APK: botón
«CAMBIAR NIP DE ADMIN» dentro del área de administrador del teléfono).

## Desplegar en Vercel (5 minutos)

1. Entra a **vercel.com** e inicia sesión (cuenta gratuita).
2. "Add New" → "Project".
3. Sube este proyecto:
   - Opción A: sube la carpeta a un repositorio de GitHub e impórtalo.
   - Opción B: usa `npx vercel` desde tu computadora en esta carpeta.
4. Framework: Next.js (se detecta solo). Todo lo demás por defecto.
5. Agrega las 2 variables de entorno de la sección anterior y Deploy.
6. Obtienes tu URL (p. ej. `guardian-sos.vercel.app`).

No hay conflicto con tu otra app de Vercel: son proyectos independientes.

## Si tu build falla con `ENOENT .next/next-server.js.nft.json`

Es un problema conocido de Vercel + Next 16.3 + `output: "standalone"` (la
v6.0 lo traía). Esta versión ya está corregida y verificada:

- Sin `output: "standalone"`; build 100% estándar (`next build`).
- Next.js FIJADO en 16.1.3 + `package-lock.json` incluido (instalación
  exactamente igual a la verificada).
- 14 dependencias nada más.

Pasos: reemplaza POR COMPLETO los archivos viejos por estos (sin mezclar),
sube de nuevo y si reusas el proyecto en Vercel → **Redeploy** con
**"Clear Build Cache"** activado. Node.js 22.x (por defecto).

## Flujo de venta (licencias)

1. **Tú (administrador)**: abre tu app en cualquier teléfono/navegador y toca
   el **icono oculto** de la esquina inferior derecha (casi invisible).
2. Introduce tu **NIP** (2580 por defecto o el que configuraste).
3. En "Área de administrador" elige duración (30 días / 90 días / 1 año /
   permanente), pon una etiqueta opcional y pulsa **Crear licencia**.
4. Copia el código `GSOS-…` y entrégaselo a tu cliente (WhatsApp, etc.).
   El historial de licencias queda guardado en TU dispositivo.
5. **Tu cliente (víctima)**: abre la URL, pega el código y pulsa Activar.
   La licencia queda **ligada a su teléfono** y la app se desbloquea.
6. Al vencer, la app vuelve a pedir licencia — le vendes una nueva.

## Uso tras desplegar

**Víctima** (teléfono Android recomendado):
1. Abre la URL en Chrome, activa su licencia y pulsa "Añadir a pantalla de
   inicio" (se vuelve app instalable).
2. Escribe su nombre y comparte el **enlace único** con su guardián.
3. Concede permisos de ubicación, micrófono y notificaciones (el micrófono
   se pide la primera vez que el guardián activa la escucha; recomiendo
   probarlo antes).
4. La app sigue funcionando 72 h sin internet (verificación de licencia con
   tolerancia offline).
5. Para que la voz y el segundo plano duren: mantén la app "reproduciendo"
   (verás la notificación de medios) y en Ajustes del teléfono exime a
   Chrome de la optimización de batería (Ajustes → Batería → Sin
   restricciones para Chrome).

**Guardián** (cualquier dispositivo, incluso iPhone):
1. Abre el enlace único → consola en vivo (no instala nada, no requiere
   licencia).
2. Toca "Activar alertas" para notificaciones y "Activar el audio y el
   segundo plano" para escuchar.
3. Ve el mapa de ubicación, la batería, los eventos y puede pulsar
   **🎧 ESCUCHAR AHORA** o **Pedir ubicación** en cualquier momento.
4. Para avisos con la pantalla apagada: instalar la app gratuita **ntfy**
   y suscribirse al tema (la consola muestra el enlace exacto).

## Notas técnicas

- Licencias firmadas con HMAC-SHA256 (`src/lib/server/licenses.ts`);
  verificación en `/api/license/*` + `/api/admin/verify` (Node runtime).
- Comandos guardián→víctima por el mismo canal ntfy (`CMD:LISTEN_ON`,
  `CMD:LISTEN_OFF`, `CMD:PING`); audio en clips de 12 s (adjuntos ntfy,
  disponibles ~3 h).
- La escucha de voz usa Web Speech API (Android/Chrome; iOS no la soporta);
  autoreparable (v7.1) con watchdog de 3 s y relanzamiento en segundo plano.
- Segundo plano (v7.1): `<audio>` con WAV casi silencioso generado en
  memoria (sin red) + oscilador Web Audio de respaldo + reintentos de 15 s
  (`src/lib/guardian/audio.ts`).
- Configuración y activación se guardan en el almacenamiento local del
  navegador del teléfono.
- Probado de punta a punta (build limpio + servidor de producción +
  flujo real de licencias/alertas/escucha por ntfy.sh; v7.1 además probada
  con reconocimiento de voz simulado: muerte/reinicio/segundo plano y
  disparo real de S.O.S por palabra clave).
