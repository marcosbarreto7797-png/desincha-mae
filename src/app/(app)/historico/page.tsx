import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcularAdesaoPct } from "@/lib/plan-engine";

export const dynamic = "force-dynamic";

type SemanaRow = {
  id: string;
  semana_do_ciclo: number;
  data_inicio: string;
  adesao_pct: number | null;
  motivo_ajuste: string | null;
  cycles: { numero: number } | null;
};

export default async function HistoricoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: semanasRaw } = await supabase
    .from("user_weeks")
    .select("id, semana_do_ciclo, data_inicio, adesao_pct, motivo_ajuste, cycles(numero)")
    .eq("user_id", user.id)
    .order("data_inicio", { ascending: false });
  const semanas = (semanasRaw ?? []) as unknown as SemanaRow[];

  const { data: itens } = await supabase
    .from("user_plan_items")
    .select("user_week_id, concluido_em");
  const porSemana = new Map<string, { total: number; feito: number }>();
  for (const i of itens ?? []) {
    const k = i.user_week_id as string;
    const e = porSemana.get(k) ?? { total: 0, feito: 0 };
    e.total += 1;
    if (i.concluido_em) e.feito += 1;
    porSemana.set(k, e);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/progresso" className="text-marca-600">‹</Link>
        <h1 className="text-2xl font-bold text-marca-700">Histórico</h1>
      </div>

      {semanas.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-marca-200 p-6 text-center text-neutral-600">
          Seu histórico aparece aqui conforme você vai completando semanas. 💛
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {semanas.map((s) => {
            const agg = porSemana.get(s.id) ?? { total: 0, feito: 0 };
            const adesao = s.adesao_pct ?? calcularAdesaoPct(agg.feito, agg.total);
            const data = new Date(`${s.data_inicio}T12:00:00`).toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "short" }
            );
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">
                    Ciclo {s.cycles?.numero ?? "–"} · Semana {s.semana_do_ciclo}
                  </span>
                  <span className="text-sm text-neutral-400">{data}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-marca-500"
                      style={{ width: `${Math.min(100, adesao)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-marca-700">
                    {adesao}%
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {agg.feito} de {agg.total} atividades
                </p>
                {s.motivo_ajuste && (
                  <p className="mt-2 text-sm text-neutral-600">{s.motivo_ajuste}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
