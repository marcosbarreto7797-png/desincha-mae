import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Atualiza a sessão Supabase a cada request e protege rotas.
 * Rotas públicas: /login, /auth/*, /reativar, assets.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: não colocar lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/reativar");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Controle de acesso por assinatura: quem está logada mas não é 'ativo'
  // (nem admin) vai pro /reativar. Em dev, a flag de auto-cadastro libera.
  const bypassAssinatura =
    process.env.NEXT_PUBLIC_PERMITIR_AUTO_CADASTRO === "true";

  if (user && !isPublic && !bypassAssinatura) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("status_assinatura, role")
      .eq("id", user.id)
      .maybeSingle();

    const liberada =
      perfil?.status_assinatura === "ativo" || perfil?.role === "admin";

    if (!liberada) {
      const url = request.nextUrl.clone();
      url.pathname = "/reativar";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
