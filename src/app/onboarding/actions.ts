"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gerarSemanaInicial } from "@/lib/plano-sequencial";
import { dataBrasilISO } from "@/lib/datas";
import type { Profile } from "@/types/database";

export type OnboardingState = { erro?: string };

export async function concluirOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const fase = String(formData.get("fase") ?? "");
  const tempo = Number(formData.get("tempo"));
  const nivel = Number(formData.get("nivel"));
  const horario = String(formData.get("horario") ?? "");
  const liberacao = formData.get("liberacao") === "on";

  if (!fase || ![5, 10, 15].includes(tempo) || ![1, 2, 3].includes(nivel)) {
    return { erro: "Responde as perguntinhas pra eu montar sua semana, tá? 💛" };
  }
  if (!liberacao) {
    return {
      erro: "Precisamos da sua confirmação de liberação médica pra continuar com segurança.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      fase_pos_parto: fase,
      tempo_disponivel: tempo,
      nivel,
      horario_lembrete: horario || null,
      liberacao_medica_confirmada: true,
      onboarding_completo: true,
      data_inicio: dataBrasilISO(),
    })
    .eq("id", user.id);
  if (error) return { erro: "Não consegui salvar agora. Tenta de novo em um minutinho." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (profile) {
    const r = await gerarSemanaInicial(supabase, profile);
    if (!r.ok) {
      return {
        erro: "Salvei seu perfil, mas não consegui montar a semana. Abre o app que eu tento de novo.",
      };
    }
  }

  redirect("/hoje");
}
