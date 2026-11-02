// Simula a jornada de uma usuária ao longo de várias semanas, com adesões
// diferentes, e valida a progressão. NÃO usa banco — só o plan-engine puro.
//
//   npm run simular
//
import {
  decidirProgressao,
  montarSemana,
  calcularAdesaoPct,
  type ModoProgressao,
} from "../src/lib/plan-engine";
import type { Activity, AtividadeTipo, Nivel } from "../src/types/database";

// ---- biblioteca fake (parecida com o seed) ----
function lib(): Activity[] {
  const tipos: AtividadeTipo[] = [
    "respiracao",
    "mobilidade",
    "fortalecimento",
    "caminhada",
    "autocuidado",
  ];
  const out: Activity[] = [];
  for (const t of tipos) {
    for (const [nivel, dur] of [
      [1, 5],
      [1, 10],
      [2, 10],
      [3, 15],
    ] as const) {
      out.push({
        id: `${t}-${nivel}-${dur}`,
        titulo: `${t} ${dur}min`,
        descricao: null,
        tipo: t,
        duracao_min: dur,
        nivel: nivel as Nivel,
        video_url: null,
        instrucoes: null,
        ativo: true,
        created_at: "2026-01-01",
      });
    }
  }
  return out;
}

// volume por semana do ciclo (igual ao seed)
const DISTRIB: Record<number, Partial<Record<AtividadeTipo, number>>> = {
  1: { respiracao: 2, mobilidade: 2, autocuidado: 2, caminhada: 1 },
  2: { respiracao: 2, mobilidade: 3, fortalecimento: 2, caminhada: 2, autocuidado: 2 },
  3: { respiracao: 2, mobilidade: 3, fortalecimento: 4, caminhada: 3, autocuidado: 2 },
  4: { respiracao: 2, mobilidade: 3, fortalecimento: 4, caminhada: 3, autocuidado: 2 },
};
const volume = (s: number) =>
  Object.values(DISTRIB[s]).reduce((a, b) => a + (b ?? 0), 0);

// adesões simuladas, semana a semana (fração do volume concluída)
const ADESOES = [1.0, 0.82, 0.5, 0.2, 0.9, 1.0];

function barra(pct: number) {
  const n = Math.round(pct / 10);
  return "█".repeat(n) + "░".repeat(10 - n);
}

console.log("\n=== Simulação da jornada de uma usuária ===\n");

let semanaCiclo = 1;
let nivel: Nivel = 1;
let ciclo = 1;
let evitarIds: string[] = [];
let modo: ModoProgressao = "avancar";

for (let semana = 1; semana <= ADESOES.length; semana++) {
  const total = volume(semanaCiclo);
  const itens = montarSemana({
    distribuicao: DISTRIB[semanaCiclo],
    nivel,
    tempoDisponivel: 10,
    atividades: lib(),
    modo,
    evitarIds,
    dataInicio: new Date(2026, 0, 1 + (semana - 1) * 7),
  });

  // "conclui" uma fração conforme a adesão simulada
  const fracao = ADESOES[semana - 1];
  const concluidas = Math.round(itens.length * fracao);
  const adesao = calcularAdesaoPct(concluidas, itens.length);

  // valida invariantes básicos da montagem
  const assert = (c: boolean, msg: string) => {
    if (!c) {
      console.error("❌ FALHA DE INVARIANTE:", msg);
      process.exit(1);
    }
  };
  assert(itens.length === total, `volume esperado ${total}, veio ${itens.length}`);
  for (const i of itens) assert(i.duracaoMin <= 10, "respeitar tempo disponível");

  console.log(
    `Semana ${semana}  (Ciclo ${ciclo} · S${semanaCiclo} · nível ${nivel})`
  );
  console.log(`  volume: ${itens.length} atividades  |  modo: ${modo}`);
  console.log(`  adesão: ${barra(adesao)} ${adesao}% (${concluidas}/${itens.length})`);

  const prox = decidirProgressao({
    concluidas,
    total: itens.length,
    semanaAtual: semanaCiclo,
    nivelAtual: nivel,
  });

  console.log(`  → ${prox.motivoAjuste}`);
  console.log("");

  // avança o estado para a próxima semana
  if (prox.fechaCiclo) ciclo += 1;
  semanaCiclo = prox.proximaSemana;
  nivel = prox.proximoNivel;
  modo = prox.modo;
  evitarIds = itens.map((i) => i.activityId);
}

console.log("✅ Simulação concluída — todos os invariantes de montagem passaram.\n");
