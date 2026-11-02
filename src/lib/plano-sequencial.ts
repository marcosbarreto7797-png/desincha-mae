// =====================================================================
// Geração de semanas no modelo HÍBRIDO / sequencial.
//
// O conteúdo é uma sequência fixa de dias (ver sequencia.ts):
//   dias 1..21 = exercícios individuais; depois duplas; depois trios.
// Cada usuária tem um PONTEIRO (dia_inicial) na sequência global.
//
// A adesão controla o avanço do ponteiro (mantém "parte da progressão"):
//   - adesão >= 40%  → avança 7 dias (próxima semana da sequência)
//   - adesão <  40%  → repete os mesmos 7 dias (sem pressão)
//
// Ciclo e semana-do-ciclo são DERIVADOS do dia global (1 ciclo = 4 semanas).
// Gera user_plan_items normais → toda a UI (Hoje, calendário, progresso…)
// funciona sem mudanças.
// =====================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarSequencia } from "./sequencia";
import { calcularAdesaoPct, classificarFaixa } from "./plan-engine";
import { dataBrasilISO, somarDiasISO } from "./datas";
import type { Profile } from "@/types/database";

const TOTAL_EXERCICIOS = 21;
const DIAS_DE_DUPLAS = 21;
const DIAS_POR_SEMANA = 7;
const SEMANAS_POR_CICLO = 4;

export interface ResultadoGeracao {
  ok: boolean;
  erro?: string;
  jaExistia?: boolean;
}

/** Deriva nº do ciclo e semana-do-ciclo (1..4) a partir do dia global. */
function posicao(diaInicial: number): { numeroCiclo: number; semanaDoCiclo: number } {
  const idx = diaInicial - 1;
  const numeroCiclo = Math.floor(idx / (DIAS_POR_SEMANA * SEMANAS_POR_CICLO)) + 1;
  const semanaDoCiclo = (Math.floor(idx / DIAS_POR_SEMANA) % SEMANAS_POR_CICLO) + 1;
  return { numeroCiclo, semanaDoCiclo };
}

/** Os 7 dias da sequência a partir de `diaInicial` (cada um com 1..3 exercícios). */
function diasDaSemana(diaInicial: number) {
  const seq = gerarSequencia({
    totalExercicios: TOTAL_EXERCICIOS,
    diasDeDuplas: DIAS_DE_DUPLAS,
    horizonteDias: diaInicial + DIAS_POR_SEMANA - 1,
  });
  return seq.slice(diaInicial - 1, diaInicial - 1 + DIAS_POR_SEMANA);
}

function frase(
  faixa: "alta" | "media" | "baixa",
  feitas: number,
  total: number,
  fechaCiclo: boolean
): string {
  if (fechaCiclo)
    return `Você fez ${feitas} de ${total} e FECHOU o ciclo! Que orgulho. 🎉 Começando um ciclo novo com você.`;
  if (faixa === "baixa")
    return "Semana puxada, né? Sem pressão nenhuma — vamos de novo no seu tempo. 💛";
  return `Você fez ${feitas} de ${total} na semana passada. Montei a próxima pra você. 💪`;
}

/** Insere a user_week + os user_plan_items dos 7 dias a partir de diaInicial. */
async function inserirSemana(
  supabase: SupabaseClient,
  userId: string,
  cycleId: string,
  semanaDoCiclo: number,
  diaInicial: number,
  dataInicioISO: string,
  motivo: string
): Promise<ResultadoGeracao> {
  const { data: ativs } = await supabase
    .from("activities")
    .select("id, ordem")
    .not("ordem", "is", null);
  const porOrdem = new Map<number, string>();
  for (const a of ativs ?? []) porOrdem.set(a.ordem as number, a.id as string);
  if (porOrdem.size === 0)
    return { ok: false, erro: "Nenhum exercício com `ordem` (rode o seed)." };

  const dias = diasDaSemana(diaInicial);

  const { data: semana, error: erroSemana } = await supabase
    .from("user_weeks")
    .insert({
      user_id: userId,
      cycle_id: cycleId,
      semana_do_ciclo: semanaDoCiclo,
      data_inicio: dataInicioISO,
      dia_inicial: diaInicial,
      motivo_ajuste: motivo,
    })
    .select("id")
    .single();
  if (erroSemana || !semana) return { ok: false, erro: erroSemana?.message };

  const linhas: {
    user_week_id: string;
    activity_id: string;
    data_prevista: string;
  }[] = [];
  dias.forEach((d, i) => {
    const dataPrevista = somarDiasISO(dataInicioISO, i);
    for (const ordem of d.exercicios) {
      const aid = porOrdem.get(ordem);
      if (aid)
        linhas.push({
          user_week_id: semana.id,
          activity_id: aid,
          data_prevista: dataPrevista,
        });
    }
  });

  const { error: erroItens } = await supabase
    .from("user_plan_items")
    .insert(linhas);
  if (erroItens) return { ok: false, erro: erroItens.message };
  return { ok: true };
}

/** Primeira semana logo após o onboarding (dia 1 da sequência). Idempotente. */
export async function gerarSemanaInicial(
  supabase: SupabaseClient,
  profile: Profile
): Promise<ResultadoGeracao> {
  const { data: ciclos } = await supabase
    .from("cycles")
    .select("id")
    .eq("user_id", profile.id)
    .limit(1);
  if (ciclos && ciclos.length > 0) return { ok: true, jaExistia: true };

  const isoHoje = dataBrasilISO();
  const { data: ciclo, error } = await supabase
    .from("cycles")
    .insert({ user_id: profile.id, numero: 1, data_inicio: isoHoje, status: "ativo" })
    .select("id")
    .single();
  if (error || !ciclo) return { ok: false, erro: error?.message };

  return inserirSemana(
    supabase,
    profile.id,
    ciclo.id,
    1,
    1,
    isoHoje,
    "Sua primeira semana começa agora, no seu ritmo. 💛"
  );
}

/** Próxima semana (cron de domingo). Avança/repete o ponteiro conforme a adesão. */
export async function gerarProximaSemana(
  supabase: SupabaseClient,
  userId: string
): Promise<ResultadoGeracao> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status_assinatura, onboarding_completo")
    .eq("id", userId)
    .single();
  if (!profile) return { ok: false, erro: "Perfil não encontrado." };
  if (profile.status_assinatura !== "ativo" || !profile.onboarding_completo)
    return { ok: true, jaExistia: true };

  const { data: semana } = await supabase
    .from("user_weeks")
    .select("id, cycle_id, dia_inicial")
    .eq("user_id", userId)
    .order("data_inicio", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; cycle_id: string; dia_inicial: number | null }>();
  if (!semana) return { ok: false, erro: "Sem semana anterior." };

  const diaInicial = semana.dia_inicial ?? 1;

  // adesão da semana que fechou
  const { data: itens } = await supabase
    .from("user_plan_items")
    .select("concluido_em")
    .eq("user_week_id", semana.id);
  const total = itens?.length ?? 0;
  const feitas = (itens ?? []).filter((i) => i.concluido_em).length;
  const adesao = calcularAdesaoPct(feitas, total);
  await supabase.from("user_weeks").update({ adesao_pct: adesao }).eq("id", semana.id);

  const faixa = classificarFaixa(adesao);
  const avanca = faixa !== "baixa";
  const novoDia = avanca ? diaInicial + DIAS_POR_SEMANA : diaInicial;

  const proximaInicioISO = somarDiasISO(dataBrasilISO(), 1); // segunda

  // idempotência: já gerou para essa data?
  const { data: jaTem } = await supabase
    .from("user_weeks")
    .select("id")
    .eq("user_id", userId)
    .eq("data_inicio", proximaInicioISO)
    .maybeSingle();
  if (jaTem) return { ok: true, jaExistia: true };

  const posAtual = posicao(diaInicial);
  const posNova = posicao(novoDia);
  const fechaCiclo = posNova.numeroCiclo > posAtual.numeroCiclo;

  let cycleId = semana.cycle_id;
  if (fechaCiclo) {
    await supabase
      .from("cycles")
      .update({ status: "concluido" })
      .eq("id", semana.cycle_id);
    const { data: ultimo } = await supabase
      .from("cycles")
      .select("numero")
      .eq("user_id", userId)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle<{ numero: number }>();
    const { data: novoCiclo, error: erroCiclo } = await supabase
      .from("cycles")
      .insert({
        user_id: userId,
        numero: (ultimo?.numero ?? 1) + 1,
        data_inicio: proximaInicioISO,
        status: "ativo",
      })
      .select("id")
      .single();
    if (erroCiclo || !novoCiclo) return { ok: false, erro: erroCiclo?.message };
    cycleId = novoCiclo.id;
  }

  return inserirSemana(
    supabase,
    userId,
    cycleId,
    posNova.semanaDoCiclo,
    novoDia,
    proximaInicioISO,
    frase(faixa, feitas, total, fechaCiclo)
  );
}
