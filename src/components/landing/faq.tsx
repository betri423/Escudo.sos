"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { SITE } from "./site";

const FAQS = [
  {
    q: "¿De verdad funciona sin internet?",
    a: "Sí. El corazón de la alerta no depende de datos ni wifi: al activarse, tu teléfono marca automáticamente al primer guardián y envía un SMS con tu ubicación a todos tus contactos, usando la línea telefónica normal. Si además tienes internet, se suman el audio en vivo, la foto y la ubicación continua en el mapa.",
  },
  {
    q: "¿Mis guardianes necesitan instalar la app?",
    a: "No. Ellos reciben una llamada y mensajes normales en su teléfono, sin instalar nada. Si quieren ver tu ubicación en vivo, el audio y las fotos, basta con abrir el enlace del guardián en su navegador.",
  },
  {
    q: "¿Funciona con la pantalla bloqueada o el teléfono guardado?",
    a: "Sí. Escudo S.O.S corre en segundo plano las 24 horas y detecta la palabra «ayuda» incluso con la pantalla apagada y el teléfono en el bolsillo. También se reinicia sola cuando enciendes el teléfono.",
  },
  {
    q: "¿Cómo se activa la alerta exactamente?",
    a: "De dos maneras: presionando el botón rojo S.O.S en la app, o diciendo «AYUDA» en voz alta. La activación por voz está pensada para emergencias reales, cuando no puedes ni desbloquear el teléfono.",
  },
  {
    q: "¿Qué recibe exactamente cada guardián?",
    a: "El primer contacto de tu lista recibe una llamada automática de tu teléfono (con grabación de la llamada si la marcas), y todos reciben un SMS con tu ubicación. Por el canal de internet —si hay— reciben además audio en vivo, foto y tu posición en el mapa en tiempo real, con sirena de alarma en su equipo.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: `La prueba completa es gratis durante ${SITE.trialHours} horas, con todas las funciones. Después eliges un plan de protección con tu distribuidor autorizado, por el periodo que tú decidas. No hay cargos automáticos ni permanencia.`,
  },
  {
    q: "¿Qué pasa con mi privacidad?",
    a: "La app no pide cuentas, ni correos, ni redes sociales. Tus alertas viajan de tu teléfono al de tus guardianes, y tu ubicación no se guarda en ningún servidor. Pesa solo 87 KB y solo usa los permisos estrictamente necesarios.",
  },
];

export function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Preguntas frecuentes"
          title={
            <>
              Lo que todos preguntan <span className="text-amber-400">antes de confiar</span>
            </>
          }
        />

        <Reveal delay={0.1} className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`} className="border-white/10">
                <AccordionTrigger className="text-left text-[15px] font-semibold text-slate-200 hover:text-amber-300 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-slate-400">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
