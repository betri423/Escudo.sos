import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const DESCRIPTION =
  "Escudo S.O.S: pide ayuda diciendo «ayuda» o presionando un botón. Llamada automática y SMS con tu ubicación a tus contactos de confianza, sin internet. Prueba gratis 24 horas.";

export const metadata: Metadata = {
  title: "Escudo S.O.S — Protección personal que funciona sin internet",
  description: DESCRIPTION,
  applicationName: "Escudo S.O.S",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Escudo S.O.S — Tu seguridad a un grito de distancia",
    description: DESCRIPTION,
    type: "website",
    locale: "es_MX",
    siteName: "Escudo S.O.S",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Escudo S.O.S — Protección personal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Escudo S.O.S — Tu seguridad a un grito de distancia",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#05070D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-[#05070D] text-slate-100`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
