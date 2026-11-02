import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase com a chave SERVICE_ROLE — ignora RLS.
 * USO EXCLUSIVO server-side em contextos de confiança: cron e webhook.
 * NUNCA importar em componentes client.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
