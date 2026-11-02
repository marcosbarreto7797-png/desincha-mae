import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Raiz: decide para onde mandar a usuária.
 * - sem sessão → /login
 * - logada sem onboarding → /onboarding (Fase 2)
 * - logada → /hoje
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completo")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completo) redirect("/onboarding");
  redirect("/hoje");
}
