import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autossuficiente para Docker/VPS (gera .next/standalone com server.js).
  output: "standalone",
  // Supabase Storage (vídeos/thumbs das atividades) será adicionado aqui quando o bucket existir.
  // images: { remotePatterns: [{ protocol: "https", hostname: "supabase.seudominio.com.br" }] },
};

export default nextConfig;
