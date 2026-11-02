"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Marca uma atividade do plano como concluída (RLS garante que é da própria usuária). */
export async function marcarConcluida(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("user_plan_items")
    .update({ concluido_em: new Date().toISOString() })
    .eq("id", id)
    .is("concluido_em", null); // idempotente: só marca se ainda não estava
  revalidatePath("/hoje");
}

/** Desfaz a conclusão (caso tenha marcado sem querer). */
export async function desfazerConclusao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("user_plan_items")
    .update({ concluido_em: null })
    .eq("id", id);
  revalidatePath("/hoje");
}
