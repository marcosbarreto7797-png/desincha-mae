"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Marca um desafio como concluído (idempotente via unique user_id+challenge_id). */
export async function concluirDesafio(formData: FormData) {
  const challengeId = String(formData.get("challengeId") ?? "");
  if (!challengeId) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_challenges").upsert(
    {
      user_id: user.id,
      challenge_id: challengeId,
      concluido_em: new Date().toISOString(),
    },
    { onConflict: "user_id,challenge_id" }
  );
  revalidatePath("/desafios");
  revalidatePath("/hoje");
}
