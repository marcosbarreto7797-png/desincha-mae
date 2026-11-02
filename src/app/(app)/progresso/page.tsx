import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dataBrasilISO } from "@/lib/datas";
import { calcularSequencia } from "@/lib/progresso";

export const dynamic = "force-dynamic";

function Stat({ valor, label }: { valor: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-5 text-center">
      <div className="text-3xl font-bold text-marca-600">{valor}</div>
      <div className="mt-1 text-sm text-neutral-500">{label}</div>
    </div>
  );
}

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // semanas da usuária
  const { data: semanas } = await supabase
    .from("user_weeks")
    .select("id, semana_do_ciclo, data_inicio")
    .eq("user_id", user.id);

  // itens (RLS restringe à usuária)
  const { data: itens } = await supabase
    .from("user_plan_items")
    .select("user_week_id, concluido_em, data_prevista");

  const todos = itens ?? [];
  const atividadesConcluidas = todos.filter((i) => i.concluido_em).length;

  // agrega por semana para contar semanas completas
  const porSemana = new Map<string, { total: number; feito: number }>();
  for (const i of todos) {
    const k = i.user_week_id as string;
    const e = porSemana.get(k) ?? { total: 0, feito: 0 };
    e.total += 1;
    if (i.concluido_em) e.feito += 1;
    porSemana.set(k, e);
  }
  let semanasCompletas = 0;
  for (const { total, feito } of porSemana.values()) {
    if (total > 0 && feito >= total) semanasCompletas += 1;
  }

  const datasConcluidas = Array.from(
    new Set(todos.filter((i) => i.concluido_em).map((i) => i.data_prevista as string))
  );
  const sequencia = calcularSequencia(datasConcluidas, dataBrasilISO());

  // ciclo atual
  const { data: ciclos } = await supabase
    .from("cycles")
    .select("numero, status")
    .eq("user_id", user.id)
    .order("numero", { ascending: false });
  const cicloAtual = ciclos?.find((c) => c.status === "ativo")?.numero ?? ciclos?.[0]?.numero ?? 1;

  // semana do ciclo atual (mais recente)
  const semanaAtual = (semanas ?? [])
    .slice()
    .sort((a, b) => (a.data_inicio < b.data_inicio ? 1 : -1))[0]?.semana_do_ciclo;

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <h1 className="text-2xl font-bold text-marca-700">Seu progresso</h1>
      <p className="mt-1 text-neutral-600">
        Aqui a gente mede consistência, não o corpo. 💛
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat valor={`🔥 ${sequencia}`} label={sequencia === 1 ? "dia seguido" : "dias seguidos"} />
        <Stat valor={atividadesConcluidas} label="atividades concluídas" />
        <Stat valor={semanasCompletas} label={semanasCompletas === 1 ? "semana completa" : "semanas completas"} />
        <Stat valor={cicloAtual} label="ciclo atual" />
      </div>

      {semanaAtual && (
        <div className="mt-4 rounded-2xl bg-marca-50 p-4 text-center text-neutral-700">
          Você está na <strong>semana {semanaAtual} de 4</strong> do ciclo {cicloAtual}.
        </div>
      )}

      <Link
        href="/historico"
        className="btn-secundario mt-8 inline-block text-center"
      >
        Ver meu histórico
      </Link>
    </main>
  );
}
