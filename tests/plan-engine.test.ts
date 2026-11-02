import { describe, it, expect } from "vitest";
import {
  calcularAdesaoPct,
  classificarFaixa,
  decidirProgressao,
  montarSemana,
  type EntradaMontagem,
} from "@/lib/plan-engine";
import type { Activity, AtividadeTipo, Nivel } from "@/types/database";

// ---------- fábrica de atividades para os testes ----------
let seq = 0;
function atv(
  tipo: AtividadeTipo,
  nivel: Nivel,
  duracao: number,
  id?: string
): Activity {
  seq += 1;
  return {
    id: id ?? `${tipo}-${nivel}-${duracao}-${seq}`,
    titulo: `${tipo} ${nivel} ${duracao}min`,
    descricao: null,
    tipo,
    duracao_min: duracao,
    nivel,
    video_url: null,
    instrucoes: null,
    ativo: true,
    created_at: "2026-01-01T00:00:00Z",
  };
}

// biblioteca ampla: 4 atividades por tipo, em durações e níveis variados
function biblioteca(): Activity[] {
  const tipos: AtividadeTipo[] = [
    "respiracao",
    "mobilidade",
    "fortalecimento",
    "caminhada",
    "autocuidado",
  ];
  const lib: Activity[] = [];
  for (const t of tipos) {
    lib.push(atv(t, 1, 5, `${t}-a`));
    lib.push(atv(t, 1, 10, `${t}-b`));
    lib.push(atv(t, 2, 10, `${t}-c`));
    lib.push(atv(t, 3, 15, `${t}-d`));
  }
  return lib;
}

describe("calcularAdesaoPct", () => {
  it("arredonda e trata total zero", () => {
    expect(calcularAdesaoPct(9, 11)).toBe(82);
    expect(calcularAdesaoPct(0, 0)).toBe(0);
    expect(calcularAdesaoPct(7, 7)).toBe(100);
  });
});

describe("classificarFaixa (fronteiras)", () => {
  it("70 = alta, 69 = media, 40 = media, 39 = baixa", () => {
    expect(classificarFaixa(70)).toBe("alta");
    expect(classificarFaixa(69)).toBe("media");
    expect(classificarFaixa(40)).toBe("media");
    expect(classificarFaixa(39)).toBe("baixa");
    expect(classificarFaixa(0)).toBe("baixa");
  });
});

describe("decidirProgressao", () => {
  it("ALTA: avança a semana do ciclo, mantém o nível", () => {
    const r = decidirProgressao({
      concluidas: 10,
      total: 11,
      semanaAtual: 2,
      nivelAtual: 1,
    });
    expect(r.faixa).toBe("alta");
    expect(r.modo).toBe("avancar");
    expect(r.proximaSemana).toBe(3);
    expect(r.proximoNivel).toBe(1);
    expect(r.fechaCiclo).toBe(false);
  });

  it("ALTA na S4: fecha o ciclo, sobe o nível, volta pra S1", () => {
    const r = decidirProgressao({
      concluidas: 13,
      total: 14,
      semanaAtual: 4,
      nivelAtual: 1,
    });
    expect(r.fechaCiclo).toBe(true);
    expect(r.proximaSemana).toBe(1);
    expect(r.proximoNivel).toBe(2);
  });

  it("ALTA na S4 com nível 3: nível não passa de 3", () => {
    const r = decidirProgressao({
      concluidas: 14,
      total: 14,
      semanaAtual: 4,
      nivelAtual: 3,
    });
    expect(r.fechaCiclo).toBe(true);
    expect(r.proximoNivel).toBe(3);
  });

  it("MEDIA: mantém a semana e varia", () => {
    const r = decidirProgressao({
      concluidas: 6,
      total: 11,
      semanaAtual: 2,
      nivelAtual: 1,
    });
    expect(r.faixa).toBe("media");
    expect(r.modo).toBe("manter_variar");
    expect(r.proximaSemana).toBe(2);
    expect(r.proximoNivel).toBe(1);
    expect(r.fechaCiclo).toBe(false);
  });

  it("BAIXA: repete a semana com atividades mais curtas", () => {
    const r = decidirProgressao({
      concluidas: 2,
      total: 11,
      semanaAtual: 3,
      nivelAtual: 2,
    });
    expect(r.faixa).toBe("baixa");
    expect(r.modo).toBe("repetir_curto");
    expect(r.proximaSemana).toBe(3);
    expect(r.proximoNivel).toBe(2);
  });

  it("MEDIA na S4 NÃO fecha o ciclo (precisa de >=70%)", () => {
    const r = decidirProgressao({
      concluidas: 7,
      total: 14,
      semanaAtual: 4,
      nivelAtual: 1,
    });
    expect(r.fechaCiclo).toBe(false);
    expect(r.proximaSemana).toBe(4);
  });

  it("motivoAjuste nunca é vazio e cita o progresso quando avança", () => {
    const r = decidirProgressao({
      concluidas: 9,
      total: 11,
      semanaAtual: 1,
      nivelAtual: 1,
    });
    expect(r.motivoAjuste).toContain("9 de 11");
  });
});

// ---------- montagem ----------
const DISTRIB_S2: Partial<Record<AtividadeTipo, number>> = {
  respiracao: 2,
  mobilidade: 3,
  fortalecimento: 2,
  caminhada: 2,
  autocuidado: 2,
};

function montar(extra?: Partial<EntradaMontagem>) {
  const base: EntradaMontagem = {
    distribuicao: DISTRIB_S2,
    nivel: 2,
    tempoDisponivel: 10,
    atividades: biblioteca(),
    modo: "manter_variar",
    dataInicio: new Date(2026, 9, 5), // segunda, 05/10/2026
  };
  return montarSemana({ ...base, ...extra });
}

describe("montarSemana", () => {
  it("gera o total exato da distribuição (2+3+2+2+2 = 11)", () => {
    const itens = montar();
    expect(itens).toHaveLength(11);
  });

  it("respeita a contagem por tipo", () => {
    const itens = montar();
    const cont: Record<string, number> = {};
    for (const i of itens) cont[i.tipo] = (cont[i.tipo] ?? 0) + 1;
    expect(cont).toEqual({
      respiracao: 2,
      mobilidade: 3,
      fortalecimento: 2,
      caminhada: 2,
      autocuidado: 2,
    });
  });

  it("respeita o tempo disponível (toda duração <= tempo)", () => {
    const itens = montar({ tempoDisponivel: 5 });
    for (const i of itens) expect(i.duracaoMin).toBeLessThanOrEqual(5);
  });

  it("nunca repete a mesma atividade em dias seguidos", () => {
    const itens = montar();
    const porDia = new Map<number, Set<string>>();
    for (const i of itens) {
      if (!porDia.has(i.diaIndex)) porDia.set(i.diaIndex, new Set());
      porDia.get(i.diaIndex)!.add(i.activityId);
    }
    for (let d = 0; d < 6; d++) {
      const hoje = porDia.get(d) ?? new Set();
      const amanha = porDia.get(d + 1) ?? new Set();
      for (const id of hoje) expect(amanha.has(id)).toBe(false);
    }
  });

  it("distribui ao longo de no máximo 7 dias com datas corretas", () => {
    const itens = montar();
    const dias = new Set(itens.map((i) => i.diaIndex));
    expect(Math.max(...dias)).toBeLessThanOrEqual(6);
    const dia0 = itens.find((i) => i.diaIndex === 0)!;
    expect(dia0.dataPrevista).toBe("2026-10-05");
    const dia2 = itens.find((i) => i.diaIndex === 2);
    if (dia2) expect(dia2.dataPrevista).toBe("2026-10-07");
  });

  it("modo repetir_curto nunca soma mais duração que o modo avancar", () => {
    const soma = (xs: { duracaoMin: number }[]) =>
      xs.reduce((s, i) => s + i.duracaoMin, 0);
    const avancar = montar({ modo: "avancar", tempoDisponivel: 15 });
    const curto = montar({ modo: "repetir_curto", tempoDisponivel: 15 });
    expect(soma(curto)).toBeLessThanOrEqual(soma(avancar));
  });

  it("modo repetir_curto escolhe a atividade mais curta quando há opção", () => {
    // biblioteca com 2 respirações curtas (5) e 1 longa (15), tempo 15
    const lib: Activity[] = [
      atv("respiracao", 1, 5, "r-curta-1"),
      atv("respiracao", 1, 5, "r-curta-2"),
      atv("respiracao", 1, 15, "r-longa"),
    ];
    const itens = montarSemana({
      distribuicao: { respiracao: 2 },
      nivel: 1,
      tempoDisponivel: 15,
      atividades: lib,
      modo: "repetir_curto",
      dataInicio: new Date(2026, 9, 5),
    });
    for (const i of itens) expect(i.duracaoMin).toBe(5);
  });

  it("modo manter_variar evita as atividades da semana anterior", () => {
    const anterior = montar({ modo: "manter_variar" });
    const evitarIds = anterior.map((i) => i.activityId);
    const nova = montar({ modo: "manter_variar", evitarIds });
    // pelo menos parte das atividades deve mudar quando há alternativas
    const novas = nova.filter((i) => !evitarIds.includes(i.activityId));
    expect(novas.length).toBeGreaterThan(0);
  });
});
