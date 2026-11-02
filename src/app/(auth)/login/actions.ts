"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { ok: boolean; mensagem: string };

/**
 * Envia o link mágico por e-mail.
 * shouldCreateUser: false → só entra quem já é usuária (criada pelo webhook Kiwify).
 * Em dev, pode ligar para true para testar sem webhook.
 */
export async function enviarMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { ok: false, mensagem: "Escreve um e-mail válido, tá?" };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      // Em produção, usuárias são criadas pelo webhook. Em dev, defina
      // NEXT_PUBLIC_PERMITIR_AUTO_CADASTRO=true para criar na hora.
      shouldCreateUser:
        process.env.NEXT_PUBLIC_PERMITIR_AUTO_CADASTRO === "true",
    },
  });

  if (error) {
    return {
      ok: false,
      mensagem: "Não consegui enviar agora. Tenta de novo em um minutinho.",
    };
  }

  return {
    ok: true,
    mensagem: "Pronto! Te mandei um link no e-mail. É só tocar nele pra entrar 💛",
  };
}
