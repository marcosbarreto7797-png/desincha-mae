import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase para uso no NAVEGADOR (componentes client).
 * Usa a chave anon → RLS garante que a usuária só vê os próprios dados.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
