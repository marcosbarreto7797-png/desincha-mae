import { describe, it, expect } from "vitest";
import { calcularSequencia } from "@/lib/progresso";

describe("calcularSequencia", () => {
  it("conta dias consecutivos terminando hoje", () => {
    const seq = calcularSequencia(
      ["2026-10-01", "2026-09-30", "2026-09-29"],
      "2026-10-01"
    );
    expect(seq).toBe(3);
  });

  it("não quebra se hoje ainda não tem atividade (conta a partir de ontem)", () => {
    const seq = calcularSequencia(["2026-09-30", "2026-09-29"], "2026-10-01");
    expect(seq).toBe(2);
  });

  it("um buraco quebra a sequência", () => {
    const seq = calcularSequencia(
      ["2026-10-01", "2026-09-29", "2026-09-28"],
      "2026-10-01"
    );
    expect(seq).toBe(1);
  });

  it("sem atividades = 0", () => {
    expect(calcularSequencia([], "2026-10-01")).toBe(0);
  });

  it("nem hoje nem ontem = 0", () => {
    expect(calcularSequencia(["2026-09-20"], "2026-10-01")).toBe(0);
  });
});
