import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { gerarProximaSemana } from "@/lib/plano-sequencial";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron semanal (Vercel) — domingo 20h BRT (23h UTC).
 * Gera a próxima semana de cada usuária ativa.
 *
 * Segurança: a Vercel injeta "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();

  const { data: ativas, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("status_assinatura", "ativo")
    .eq("onboarding_completo", true);
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  let processadas = 0;
  const erros: { userId: string; erro: string }[] = [];

  for (const p of ativas ?? []) {
    try {
      const r = await gerarProximaSemana(supabase, p.id as string);
      if (r.ok) processadas += 1;
      else erros.push({ userId: p.id as string, erro: r.erro ?? "desconhecido" });
    } catch (e) {
      erros.push({
        userId: p.id as string,
        erro: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    totalAtivas: ativas?.length ?? 0,
    processadas,
    erros,
  });
}
