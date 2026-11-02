// =====================================================================
// plan-engine — NÚCLEO DO PRODUTO
// Funções PURAS (sem I/O). Toda decisão de progressão e montagem de
// semana mora aqui, para ser 100% testável. Cron/API apenas orquestram.
// =====================================================================

import type {
  Activity,
  AtividadeTipo,
  Nivel,
  TempoDisponivel,
} from "@/types/database";

// ---------------------------------------------------------------------
// Progressão (adesão → próxima semana)
// ---------------------------------------------------------------------

export type Faixa = "alta" | "media" | "baixa";
export type ModoProgressao = "avancar" | "manter_variar" | "repetir_curto";

export interface EntradaProgressao {
  concluidas: number;
  total: number;
  semanaAtual: number; // 1..4 (semana do ciclo que acabou)
  nivelAtual: Nivel;
}

export interface ResultadoProgressao {
  adesaoPct: number;
  faixa: Faixa;
  modo: ModoProgressao;
  proximaSemana: number; // 1..4
  proximoNivel: Nivel;
  fechaCiclo: boolean;
  motivoAjuste: string;
}

const LIMITE_ALTA = 70;
const LIMITE_MEDIA = 40;

export function calcularAdesaoPct(concluidas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((concluidas / total) * 100);
}

export function classificarFaixa(adesaoPct: number): Faixa {
  if (adesaoPct >= LIMITE_ALTA) return "alta";
  if (adesaoPct >= LIMITE_MEDIA) return "media";
  return "baixa";
}

function subirNivel(nivel: Nivel): Nivel {
  return Math.min(3, nivel + 1) as Nivel;
}

/**
 * Decide os parâmetros da PRÓXIMA semana a partir da adesão da anterior.
 *
 * - adesão >= 70%: avança a semana do ciclo (S1→S2→S3→S4).
 *   Ao passar da S4, FECHA o ciclo e sobe o nível (volta para S1).
 * - adesão 40–69%: mantém a mesma semana do ciclo, troca atividades (varia).
 * - adesão < 40%: repete a mesma semana com atividades mais curtas.
 */
export function decidirProgressao(e: EntradaProgressao): ResultadoProgressao {
  const adesaoPct = calcularAdesaoPct(e.concluidas, e.total);
  const faixa = classificarFaixa(adesaoPct);

  if (faixa === "alta") {
    if (e.semanaAtual >= 4) {
      // fecha o ciclo e começa um novo, mais forte
      return {
        adesaoPct,
        faixa,
        modo: "avancar",
        proximaSemana: 1,
        proximoNivel: subirNivel(e.nivelAtual),
        fechaCiclo: true,
        motivoAjuste: fraseFechamento(e.concluidas, e.total),
      };
    }
    return {
      adesaoPct,
      faixa,
      modo: "avancar",
      proximaSemana: e.semanaAtual + 1,
      proximoNivel: e.nivelAtual,
      fechaCiclo: false,
      motivoAjuste: frase("avancar", e.concluidas, e.total),
    };
  }

  if (faixa === "media") {
    return {
      adesaoPct,
      faixa,
      modo: "manter_variar",
      proximaSemana: e.semanaAtual,
      proximoNivel: e.nivelAtual,
      fechaCiclo: false,
      motivoAjuste: frase("manter_variar", e.concluidas, e.total),
    };
  }

  // baixa
  return {
    adesaoPct,
    faixa,
    modo: "repetir_curto",
    proximaSemana: e.semanaAtual,
    proximoNivel: e.nivelAtual,
    fechaCiclo: false,
    motivoAjuste: frase("repetir_curto", e.concluidas, e.total),
  };
}

// Frases acolhedoras — NUNCA culpar a usuária.
function frase(modo: ModoProgressao, feitas: number, total: number): string {
  const base = `Você fez ${feitas} de ${total} na semana passada.`;
  switch (modo) {
    case "avancar":
      return `${base} Montei uma semana um pouco mais forte pra você. 💪`;
    case "manter_variar":
      return `${base} Vou manter o ritmo e trazer atividades novas pra variar. 🌼`;
    case "repetir_curto":
      return `Semana puxada, né? Sem problema nenhum. Deixei atividades mais curtinhas pra ficar leve essa semana. 💛`;
  }
}

function fraseFechamento(feitas: number, total: number): string {
  return `Você fez ${feitas} de ${total} e FECHOU o ciclo! Que orgulho. 🎉 Começando um ciclo novo, mais forte com você.`;
}

// ---------------------------------------------------------------------
// Montagem da semana (template + biblioteca → itens distribuídos nos dias)
// ---------------------------------------------------------------------

export interface EntradaMontagem {
  distribuicao: Partial<Record<AtividadeTipo, number>>;
  nivel: Nivel;
  tempoDisponivel: TempoDisponivel;
  atividades: Activity[]; // biblioteca disponível
  modo: ModoProgressao;
  evitarIds?: string[]; // atividades da semana anterior (para variar)
  dataInicio: Date; // 1º dia da semana (ex. segunda)
}

export interface ItemGerado {
  activityId: string;
  tipo: AtividadeTipo;
  duracaoMin: number;
  diaIndex: number; // 0..6
  dataPrevista: string; // YYYY-MM-DD
}

const DIAS_NA_SEMANA = 7;

/**
 * Seleciona e distribui as atividades da semana respeitando:
 * - a contagem por tipo da `distribuicao`;
 * - o `tempoDisponivel` (duração <= tempo da usuária);
 * - variedade (evita as da semana anterior quando possível);
 * - no modo `repetir_curto`, prioriza as atividades mais curtas;
 * - nunca repete a MESMA atividade em dias seguidos.
 */
export function montarSemana(e: EntradaMontagem): ItemGerado[] {
  // 1) Seleciona atividades por tipo (lista achatada, agrupada por tipo)
  const porTipo: { tipo: AtividadeTipo; atividades: Activity[] }[] = [];

  for (const [tipoStr, qtd] of Object.entries(e.distribuicao)) {
    const tipo = tipoStr as AtividadeTipo;
    const n = qtd ?? 0;
    if (n <= 0) continue;
    porTipo.push({ tipo, atividades: selecionarPorTipo(tipo, n, e) });
  }

  // 2) Intercala os tipos em round-robin para espalhar os tipos ao longo da semana
  const sequencia: Activity[] = intercalar(porTipo.map((g) => g.atividades));

  // 3) Distribui nos 7 dias, evitando a mesma atividade em dias seguidos
  return distribuirNosDias(sequencia, e.dataInicio);
}

function selecionarPorTipo(
  tipo: AtividadeTipo,
  n: number,
  e: EntradaMontagem
): Activity[] {
  const evitar = new Set(e.evitarIds ?? []);

  // candidatos que cabem no tempo e no nível
  let candidatos = e.atividades.filter(
    (a) =>
      a.ativo &&
      a.tipo === tipo &&
      a.nivel <= e.nivel &&
      a.duracao_min <= e.tempoDisponivel
  );

  // se nada couber no tempo, relaxa a restrição de tempo (melhor ter plano do que vazio)
  if (candidatos.length === 0) {
    candidatos = e.atividades.filter(
      (a) => a.ativo && a.tipo === tipo && a.nivel <= e.nivel
    );
  }
  if (candidatos.length === 0) return [];

  // ordenação determinística conforme o modo
  const ordenados = [...candidatos].sort((a, b) => {
    if (e.modo === "repetir_curto") {
      if (a.duracao_min !== b.duracao_min) return a.duracao_min - b.duracao_min;
      return a.id.localeCompare(b.id);
    }
    // avancar / manter_variar: prioriza quem NÃO está na lista a evitar
    const ea = evitar.has(a.id) ? 1 : 0;
    const eb = evitar.has(b.id) ? 1 : 0;
    if (ea !== eb) return ea - eb;
    return a.id.localeCompare(b.id);
  });

  // pega n itens; se precisar de mais do que existe, cicla (gera repetições controladas)
  const escolhidos: Activity[] = [];
  for (let i = 0; i < n; i++) {
    escolhidos.push(ordenados[i % ordenados.length]);
  }
  return escolhidos;
}

// Intercala N listas em round-robin: [a1,b1,c1,a2,b2,...]
function intercalar<T>(listas: T[][]): T[] {
  const resultado: T[] = [];
  const maxLen = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const lista of listas) {
      if (i < lista.length) resultado.push(lista[i]);
    }
  }
  return resultado;
}

function distribuirNosDias(
  sequencia: Activity[],
  dataInicio: Date
): ItemGerado[] {
  const total = sequencia.length;
  // capacidade por dia: o mais uniforme possível (ex. 11 → 2,2,2,2,1,1,1)
  const base = Math.floor(total / DIAS_NA_SEMANA);
  const resto = total % DIAS_NA_SEMANA;
  const capacidade = Array.from({ length: DIAS_NA_SEMANA }, (_, d) =>
    d < resto ? base + 1 : base
  );

  const dias: Activity[][] = Array.from({ length: DIAS_NA_SEMANA }, () => []);

  for (const atividade of sequencia) {
    const dia = escolherDia(dias, capacidade, atividade.id);
    dias[dia].push(atividade);
  }

  // achata para itens com data
  const itens: ItemGerado[] = [];
  for (let d = 0; d < DIAS_NA_SEMANA; d++) {
    for (const a of dias[d]) {
      itens.push({
        activityId: a.id,
        tipo: a.tipo,
        duracaoMin: a.duracao_min,
        diaIndex: d,
        dataPrevista: somarDias(dataInicio, d),
      });
    }
  }
  return itens;
}

// Escolhe o dia com vaga que não gere a mesma atividade em dias vizinhos.
// Se for impossível evitar, usa o dia com vaga mais vazio.
function escolherDia(
  dias: Activity[][],
  capacidade: number[],
  activityId: string
): number {
  const temVaga = (d: number) => dias[d].length < capacidade[d];
  const vizinhoTem = (d: number) =>
    (d > 0 && dias[d - 1].some((a) => a.id === activityId)) ||
    (d < dias.length - 1 && dias[d + 1].some((a) => a.id === activityId));
  const jaTem = (d: number) => dias[d].some((a) => a.id === activityId);

  const candidatos = dias
    .map((_, d) => d)
    .filter((d) => temVaga(d));

  // 1ª escolha: tem vaga, não repete no próprio dia nem em dia vizinho
  const ideais = candidatos.filter((d) => !jaTem(d) && !vizinhoTem(d));
  const pool = ideais.length > 0 ? ideais : candidatos;

  // dentre o pool, pega o dia mais vazio (e mais cedo em empate)
  pool.sort((a, b) => dias[a].length - dias[b].length || a - b);
  return pool[0] ?? 0;
}

function somarDias(data: Date, dias: number): string {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
