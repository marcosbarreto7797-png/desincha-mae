import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link mágico enviado por e-mail.
 * Verifica o token e redireciona para o app (ou onboarding).
 *
 * Os redirects são construídos a partir de NEXT_PUBLIC_SITE_URL (domínio
 * público) em vez de request.url/nextUrl: atrás de um proxy/Caddy, o host
 * da requisição chega como interno (0.0.0.0:3000) e quebraria o redirect.
 */
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next") ?? "/hoje";

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, base));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=link_invalido", base));
}
