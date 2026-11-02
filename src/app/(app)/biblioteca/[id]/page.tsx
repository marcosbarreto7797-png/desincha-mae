import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Exercicio } from "@/types/database";
import { VideoPlayer } from "@/components/VideoPlayer";

export const dynamic = "force-dynamic";

export default async function ExercicioDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("activities")
    .select("id, titulo, descricao, tipo, duracao_min, nivel, video_url, instrucoes, ativo, ordem")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle<Exercicio>();
  if (!data) notFound();

  const meta: string[] = [];
  if (data.ordem != null) meta.push(`Dia ${String(data.ordem).padStart(2, "0")}`);
  if (data.duracao_min != null) meta.push(`${data.duracao_min} min`);

  return (
    <main className="mx-auto max-w-md px-5 py-8 pb-24">
      <Link href="/biblioteca" className="text-marca-600">
        ‹ Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-neutral-800">{data.titulo}</h1>
      {meta.length > 0 && (
        <p className="mt-1 text-neutral-500">{meta.join(" · ")}</p>
      )}

      {data.descricao && (
        <p className="mt-5 text-lg text-neutral-700">{data.descricao}</p>
      )}

      {data.video_url ? (
        <VideoPlayer url={data.video_url} titulo={data.titulo} />
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-neutral-200 p-4 text-center text-neutral-400">
          Vídeo em breve.
        </p>
      )}

      {data.instrucoes && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Como fazer
          </h2>
          <p className="mt-2 rounded-2xl bg-marca-50 p-4 text-neutral-700">
            {data.instrucoes}
          </p>
        </section>
      )}
    </main>
  );
}
