import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Exercicio } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("activities")
    .select("id, titulo, descricao, tipo, duracao_min, nivel, video_url, instrucoes, ativo, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  const exercicios = (data ?? []) as Exercicio[];

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <h1 className="text-2xl font-bold text-marca-700">Exercícios</h1>
      <p className="mt-1 text-neutral-600">Todos os exercícios do programa.</p>

      <div className="mt-6 flex flex-col gap-3">
        {exercicios.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-marca-200 p-6 text-center text-neutral-600">
            Nenhum exercício cadastrado ainda.
          </p>
        ) : (
          exercicios.map((e) => (
            <Link
              key={e.id}
              href={`/biblioteca/${e.id}`}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 active:bg-marca-50"
            >
              {e.ordem != null && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-50 text-sm font-semibold text-marca-600">
                  {String(e.ordem).padStart(2, "0")}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-800">{e.titulo}</p>
                {e.duracao_min != null && (
                  <p className="text-sm text-neutral-500">{e.duracao_min} min</p>
                )}
              </div>
              <span className="text-neutral-300">›</span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
