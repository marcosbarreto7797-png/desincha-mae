import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dataBrasilISO } from "@/lib/datas";

export const dynamic = "force-dynamic";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const pad = (n: number) => String(n).padStart(2, "0");

type Agg = { total: number; feito: number };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hojeISO = dataBrasilISO();
  const [anoHoje, mesHoje] = hojeISO.split("-").map(Number);

  let ano = anoHoje;
  let m = mesHoje;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [a, b] = mes.split("-").map(Number);
    ano = a;
    m = b;
  }

  const diasNoMes = new Date(ano, m, 0).getDate();
  const offset = new Date(ano, m - 1, 1).getDay(); // 0 = domingo
  const inicio = `${ano}-${pad(m)}-01`;
  const fim = `${ano}-${pad(m)}-${pad(diasNoMes)}`;

  // itens do mês
  const { data: itensMes } = await supabase
    .from("user_plan_items")
    .select("data_prevista, concluido_em")
    .gte("data_prevista", inicio)
    .lte("data_prevista", fim);

  const mapa = new Map<string, Agg>();
  for (const i of itensMes ?? []) {
    const k = i.data_prevista as string;
    const e = mapa.get(k) ?? { total: 0, feito: 0 };
    e.total += 1;
    if (i.concluido_em) e.feito += 1;
    mapa.set(k, e);
  }

  // resumo "esta semana" (semana corrente da usuária)
  const { data: semana } = await supabase
    .from("user_weeks")
    .select("id")
    .eq("user_id", user.id)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  let semTotal = 0;
  let semFeito = 0;
  if (semana) {
    const { data: itensSem } = await supabase
      .from("user_plan_items")
      .select("concluido_em")
      .eq("user_week_id", semana.id);
    semTotal = itensSem?.length ?? 0;
    semFeito = (itensSem ?? []).filter((i) => i.concluido_em).length;
  }

  const prev = m === 1 ? `${ano - 1}-12` : `${ano}-${pad(m - 1)}`;
  const next = m === 12 ? `${ano + 1}-01` : `${ano}-${pad(m + 1)}`;

  function classesDia(iso: string, dentroDoMes: boolean): string {
    if (!dentroDoMes) return "text-transparent";
    const agg = mapa.get(iso);
    const ehHoje = iso === hojeISO;
    const anel = ehHoje ? " ring-2 ring-marca-400" : "";
    if (!agg || agg.total === 0) return `text-neutral-300${anel}`;
    if (agg.feito >= agg.total) return `bg-marca-500 text-white font-semibold${anel}`;
    if (agg.feito > 0) return `bg-marca-200 text-marca-800 font-medium${anel}`;
    return `border border-marca-200 text-neutral-500${anel}`;
  }

  // monta células (offset vazio + dias)
  const celulas: { d: number | null; iso: string }[] = [];
  for (let i = 0; i < offset; i++) celulas.push({ d: null, iso: "" });
  for (let d = 1; d <= diasNoMes; d++)
    celulas.push({ d, iso: `${ano}-${pad(m)}-${pad(d)}` });

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <h1 className="text-2xl font-bold text-marca-700">Calendário</h1>

      <div className="mt-4 rounded-2xl bg-marca-50 p-4">
        <p className="text-sm text-neutral-500">Esta semana</p>
        <p className="text-lg font-semibold text-marca-700">
          {semFeito} de {semTotal} atividades
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/calendario?mes=${prev}`}
          className="rounded-full px-3 py-1 text-marca-600 active:bg-marca-50"
        >
          ‹
        </Link>
        <span className="text-lg font-semibold capitalize text-neutral-800">
          {MESES[m - 1]} {ano}
        </span>
        <Link
          href={`/calendario?mes=${next}`}
          className="rounded-full px-3 py-1 text-marca-600 active:bg-marca-50"
        >
          ›
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="py-1 text-xs font-medium text-neutral-400">
            {d}
          </div>
        ))}
        {celulas.map((c, i) => (
          <div key={i} className="flex aspect-square items-center justify-center">
            {c.d !== null && (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${classesDia(
                  c.iso,
                  true
                )}`}
              >
                {c.d}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full bg-marca-500" /> Tudo feito
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full bg-marca-200" /> Em parte
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full border border-marca-200" /> Planejado
        </span>
      </div>
    </main>
  );
}
