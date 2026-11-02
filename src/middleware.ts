import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, exceto:
     * - _next/static, _next/image
     * - favicon, manifest, service worker, ícones
     * - rotas de API (tratam auth por conta própria)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|api/).*)",
  ],
};
