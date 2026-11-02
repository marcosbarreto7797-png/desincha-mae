import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/(auth)/actions";
import { dataBrasilISO, somarDiasISO } from "@/lib/datas";
import { calcularSequencia } from "@/lib/progresso";
import { marcarConcluida, desfazerConclusao } from "./acoes";
import { concluirDesafio } from "@/app/(app)/desafios/acoes";

export const dynamic = "force-dynamic";

const EMOJI_TIPO: Record<string, string> = {
  respiracao: "🫁",
  mobilidade: "🤸",
  fortalecimento: "💪",
  caminhada: "🚶",
  autocuidado: "🌸",
};

type ItemHoje = {
  id: string;
  concluido_em: string | null;
  activities: {
    titulo: string;
    tipo: string | null;
    duracao_min: number | null;
    instrucoes: string | null;
  } | null;
};

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, nivel, onboarding_completo")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_completo) redirect("/onboarding");

  const hoje = dataBrasilISO();

  // semana mais recente
  const { data: semana } = await supabase
    .from("user_weeks")
    .select("id, semana_do_ciclo, motivo_ajuste, data_inicio")
    .eq("user_id", user.id)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  // "nova semana" = começou hoje ou ontem (card de domingo/segunda)
  const semanaNova =
    !!semana?.data_inicio &&
    semana.data_inicio >= somarDiasISO(hoje, -1);

  // atividades de hoje
  let itens: ItemHoje[] = [];
  if (semana) {
    const { data } = await supabase
      .from("user_plan_items")
      .select("id, concluido_em, activities(titulo, tipo, duracao_min, instrucoes)")
      .eq("user_week_id", semana.id)
      .eq("data_prevista", hoje)
      .order("id");
    itens = (data ?? []) as unknown as ItemHoje[];
  }

  // sequência (todas as datas concluídas da usuária; RLS já restringe)
  const { data: concluidos } = await supabase
    .from("user_plan_items")
    .select("data_prevista")
    .not("concluido_em", "is", null);
  const datasConcluidas = Array.from(
    new Set((concluidos ?? []).map((r) => r.data_prevista as string))
  );
  const sequencia = calcularSequencia(datasConcluidas, hoje);

  // desafio ativo
  let desafio: { id: string; titulo: string; descricao: string | null } | null =
    null;
  let desafioFeito = false;
  if (semana) {
    const { data } = await supabase
      .from("challenges")
      .select("id, titulo, descricao")
      .eq("semana_do_ciclo", semana.semana_do_ciclo)
      .lte("nivel", profile.nivel)
      .eq("ativo", true)
      .order("nivel", { ascending: false })
      .limit(1)
      .maybeSingle();
    desafio = data;
    if (desafio) {
      const { data: uc } = await supabase
        .from("user_challenges")
        .select("concluido_em")
        .eq("challenge_id", desafio.id)
        .not("concluido_em", "is", null)
        .maybeSingle();
      desafioFeito = !!uc;
    }
  }

  const feitasHoje = itens.filter((i) => i.concluido_em).length;
  const primeiroNome = profile.nome?.split(" ")[0];

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-marca-700">
            Oi{primeiroNome ? `, ${primeiroNome}` : ""} 💛
          </h1>
          <p className="text-neutral-600">Seu plano de hoje</p>
        </div>
        <div className="rounded-2xl bg-marca-50 px-4 py-2 text-center">
          <div className="text-2xl font-bold text-marca-600">🔥 {sequencia}</div>
          <div className="text-xs text-neutral-500">
            {sequencia === 1 ? "dia seguido" : "dias seguidos"}
          </div>
        </div>
      </header>

      {semanaNova ? (
        <div className="mt-5 rounded-2xl border border-marca-300 bg-marca-50 p-4">
          <p className="font-semibold text-marca-700">✨ Sua nova semana chegou!</p>
          {semana?.motivo_ajuste && (
            <p className="mt-1 text-neutral-700">{semana.motivo_ajuste}</p>
          )}
        </div>
      ) : (
        semana?.motivo_ajuste && (
          <p className="mt-5 rounded-2xl bg-marca-50 p-4 text-neutral-700">
            {semana.motivo_ajuste}
          </p>
        )
      )}

      <section className="mt-6 flex flex-col gap-3">
        {itens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-marca-200 p-6 text-center text-neutral-600">
            Hoje é dia de descanso. Aproveita pra respirar fundo. 💛
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              {feitasHoje} de {itens.length} de hoje
            </p>
            {itens.map((item) => {
              const a = item.activities;
              const feito = Boolean(item.concluido_em);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    feito
                      ? "border-marca-200 bg-marca-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{EMOJI_TIPO[a?.tipo ?? ""] ?? "✨"}</span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-lg font-semibold ${
                          feito ? "text-marca-700 line-through" : "text-neutral-800"
                        }`}
                      >
                        {a?.titulo}
                      </p>
                      {a?.duracao_min != null && (
                        <p className="text-sm text-neutral-500">{a.duracao_min} min</p>
                      )}
                    </div>
                  </div>
                  {!feito && a?.instrucoes && (
                    <p className="mt-2 text-sm text-neutral-600">{a.instrucoes}</p>
                  )}
                  <form action={feito ? desfazerConclusao : marcarConcluida} className="mt-3">
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className={feito ? "btn-secundario" : "btn-primario"}
                    >
                      {feito ? "✓ Feito — desfazer" : "Concluí"}
                    </button>
                  </form>
                </div>
              );
            })}
          </>
        )}
      </section>

      {desafio && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Desafio da semana
            </h2>
            <Link href="/desafios" className="text-sm text-marca-600">
              ver todos ›
            </Link>
          </div>
          <div
            className={`mt-2 rounded-2xl border p-4 ${
              desafioFeito
                ? "border-marca-200 bg-marca-50"
                : "border-marca-200 bg-white"
            }`}
          >
            <p className="text-lg font-semibold text-marca-700">
              {desafioFeito ? "✓" : "🏆"} {desafio.titulo}
            </p>
            {desafio.descricao && (
              <p className="mt-1 text-neutral-600">{desafio.descricao}</p>
            )}
            {!desafioFeito && (
              <form action={concluirDesafio} className="mt-3">
                <input type="hidden" name="challengeId" value={desafio.id} />
                <button type="submit" className="btn-secundario">
                  Concluí o desafio
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      <form action={sair} className="mt-10">
        <button type="submit" className="text-sm text-neutral-400 underline">
          Sair
        </button>
      </form>
    </main>
  );
}
