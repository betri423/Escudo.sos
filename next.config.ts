import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // v7.9: rutas con URL propia SIN carpetas nuevas en el repositorio
  // (subir carpetas por la web de GitHub desde el teléfono no funciona):
  //  · "/promo" → landing de venta (URL aparte para compartir).
  //  · "/app"   → app web de la víctima (manifiesto PWA y pie de la landing).
  // La dirección principal "/" queda para la APP, como siempre fue.
  async rewrites() {
    return [
      { source: "/promo", destination: "/?p=1" },
      { source: "/app", destination: "/?v=1" },
    ];
  },
};

export default nextConfig;
