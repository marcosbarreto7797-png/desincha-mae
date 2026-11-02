// =====================================================================
// Gerador de SEQUÊNCIA DE DIAS (conteúdo do app — modelo híbrido)
// Função PURA e testável.
//
// - Dias 1..N (N = total de vídeos, ex. 21): um exercício por dia, em ordem.
// - Depois: fase de DUPLAS (2 exercícios/dia) por `diasDeDuplas` dias.
// - Depois: fase de TRIOS (3 exercícios/dia) até o horizonte.
//
// Garante: nenhuma combinação se repete; evita o mesmo exercício em dias
// seguidos (escolha gulosa por menor sobreposição + uso mais equilibrado).
// Exercícios são identificados por número 1..N (1 = "Dia 01", etc.).
// =====================================================================

export interface DiaSequencia {
  dia: number; // índice global do dia (1-based)
  exercicios: number[]; // ids 1..N, tamanho 1 a 3
}

export interface OpcoesSequencia {
  totalExercicios?: number; // default 21
  diasDeDuplas?: number; // quantos dias de duplas antes dos trios (default 21)
  horizonteDias: number; // total de dias a gerar
}

function combinacoes(n: number, k: number): number[][] {
  const res: number[][] = [];
  const atual: number[] = [];
  (function rec(inicio: number) {
    if (atual.length === k) {
      res.push([...atual]);
      return;
    }
    for (let i = inicio; i <= n; i++) {
      atual.push(i);
      rec(i + 1);
      atual.pop();
    }
  })(1);
  return res;
}

function sobreposicao(combo: number[], anterior: Set<number>): number {
  let c = 0;
  for (const x of combo) if (anterior.has(x)) c += 1;
  return c;
}

type Chave = [number, number, string];
function comparaChave(a: Chave, b: Chave): number {
  if (a[0] !== b[0]) return a[0] - b[0]; // menor sobreposição com o dia anterior
  if (a[1] !== b[1]) return a[1] - b[1]; // exercícios menos usados
  return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0; // determinístico (lexicográfico)
}

// Ordena combinações de forma gulosa, pegando até `limite` itens.
function ordenarGuloso(
  pool: number[][],
  anteriorInicial: Set<number>,
  uso: Map<number, number>,
  limite: number
): { escolhidos: number[][]; anterior: Set<number> } {
  const restante = pool.map((c) => c);
  const escolhidos: number[][] = [];
  let anterior = anteriorInicial;

  while (escolhidos.length < limite && restante.length > 0) {
    let melhorIdx = 0;
    let melhorChave: Chave | null = null;
    for (let j = 0; j < restante.length; j++) {
      const c = restante[j];
      const chave: Chave = [
        sobreposicao(c, anterior),
        c.reduce((s, x) => s + (uso.get(x) ?? 0), 0),
        c.join(","),
      ];
      if (melhorChave === null || comparaChave(chave, melhorChave) < 0) {
        melhorChave = chave;
        melhorIdx = j;
      }
    }
    const [escolhido] = restante.splice(melhorIdx, 1);
    escolhidos.push(escolhido);
    anterior = new Set(escolhido);
    for (const x of escolhido) uso.set(x, (uso.get(x) ?? 0) + 1);
  }

  return { escolhidos, anterior };
}

export function gerarSequencia(opts: OpcoesSequencia): DiaSequencia[] {
  const total = opts.totalExercicios ?? 21;
  const diasDeDuplas = opts.diasDeDuplas ?? total;
  const horizonte = opts.horizonteDias;

  const dias: number[][] = [];
  const uso = new Map<number, number>();

  // fase 1 — individuais (1..total)
  for (let i = 1; i <= total && dias.length < horizonte; i++) {
    dias.push([i]);
    uso.set(i, (uso.get(i) ?? 0) + 1);
  }
  let anterior = new Set<number>(dias.length ? dias[dias.length - 1] : []);

  // fase 2 — duplas
  if (dias.length < horizonte) {
    const limite = Math.min(diasDeDuplas, horizonte - dias.length);
    const r = ordenarGuloso(combinacoes(total, 2), anterior, uso, limite);
    for (const c of r.escolhidos) dias.push(c);
    anterior = r.anterior;
  }

  // fase 3 — trios (até o horizonte)
  if (dias.length < horizonte) {
    const r = ordenarGuloso(
      combinacoes(total, 3),
      anterior,
      uso,
      horizonte - dias.length
    );
    for (const c of r.escolhidos) dias.push(c);
  }

  return dias.map((exercicios, idx) => ({ dia: idx + 1, exercicios }));
}
