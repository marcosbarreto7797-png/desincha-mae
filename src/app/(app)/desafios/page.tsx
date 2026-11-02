import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { concluirDesafio } from "./acoes";
import type { Challenge } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DesafiosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nivel")
    .eq("id", user.id)
    .single();
  const nivel = profile?.nivel ?? 1;

  // semana do ciclo atual
  const { data: semana } = await supabase
    .from("user_weeks")
    .select("semana_do_ciclo")
    .eq("user_id", user.id)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  const semanaAtual = semana?.semana_do_ciclo ?? 1;

  const { data: desafiosRaw } = await supabase
    .from("challenges")
    .select("*")
    .eq("ativo", true)
    .order("semana_do_ciclo")
    .order("nivel");
  const desafios = (desafiosRaw ?? []) as Challenge[];

  const { data: feitosRaw } = await supabase
    .from("user_challenges")
    .select("challenge_id, concluido_em")
    .not("concluido_em", "is", null);
  const feitos = new Set((feitosRaw ?? []).map((f) => f.challenge_id as string));

  const concluidos = desafios.filter((d) => feitos.has(d.id));
  const ativos = desafios.filter(
    (d) =>
      !feitos.has(d.id) && d.semana_do_ciclo <= semanaAtual && d.nivel <= nivel
  );
  const bloqueados = desafios.filter(
    (d) =>
      !feitos.has(d.id) && (d.semana_do_ciclo > semanaAtual || d.nivel > nivel)
  );

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <h1 className="text-2xl font-bold text-marca-700">Desafios</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Pra fazer agora
        </h2>
        {ativos.length === 0 ? (
          <p className="mt-2 text-neutral-500">Nenhum desafio ativo no momento. 💛</p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {ativos.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-marca-200 bg-white p-4"
              >
                <p className="text-lg font-semibold text-marca-700">🏆 {d.titulo}</p>
                {d.descricao && (
                  <p className="mt-1 text-neutral-600">{d.descricao}</p>
                )}
                <form action={concluirDesafio} className="mt-3">
                  <input type="hidden" name="challengeId" value={d.id} />
                  <button type="submit" className="btn-primario">
                    Concluí o desafio
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {concluidos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Conquistados 🎉
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {concluidos.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl bg-marca-50 p-4 text-marca-800"
              >
                ✓ {d.titulo}
              </div>
            ))}
          </div>
        </section>
      )}

      {bloqueados.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Em breve
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {bloqueados.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded-2xl border border-dashed border-neutral-200 p-4 text-neutral-400"
              >
                🔒 {d.titulo}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
