import { describe, it, expect } from "vitest";
import { gerarSequencia } from "@/lib/sequencia";

const chave = (ex: number[]) => [...ex].sort((a, b) => a - b).join("-");

describe("gerarSequencia", () => {
  it("dias 1..21 são exercícios individuais em ordem", () => {
    const dias = gerarSequencia({ totalExercicios: 21, horizonteDias: 84 });
    for (let i = 0; i < 21; i++) {
      expect(dias[i].dia).toBe(i + 1);
      expect(dias[i].exercicios).toEqual([i + 1]);
    }
  });

  it("depois dos 21, vem a fase de duplas e depois trios", () => {
    const dias = gerarSequencia({
      totalExercicios: 21,
      diasDeDuplas: 21,
      horizonteDias: 84,
    });
    // dias 22..42 = duplas
    for (let i = 21; i < 42; i++) expect(dias[i].exercicios).toHaveLength(2);
    // dias 43..84 = trios
    for (let i = 42; i < 84; i++) expect(dias[i].exercicios).toHaveLength(3);
  });

  it("nenhuma combinação de dia se repete", () => {
    const dias = gerarSequencia({ totalExercicios: 21, horizonteDias: 200 });
    const vistos = new Set<string>();
    for (const d of dias) {
      const k = chave(d.exercicios);
      expect(vistos.has(k)).toBe(false);
      vistos.add(k);
    }
  });

  it("nunca repete o mesmo exercício em dias seguidos (horizonte inicial)", () => {
    const dias = gerarSequencia({ totalExercicios: 21, horizonteDias: 84 });
    for (let i = 0; i < dias.length - 1; i++) {
      const hoje = new Set(dias[i].exercicios);
      for (const x of dias[i + 1].exercicios) {
        expect(hoje.has(x)).toBe(false);
      }
    }
  });

  it("todo dia tem de 1 a 3 exercícios, todos no intervalo 1..N", () => {
    const dias = gerarSequencia({ totalExercicios: 21, horizonteDias: 150 });
    for (const d of dias) {
      expect(d.exercicios.length).toBeGreaterThanOrEqual(1);
      expect(d.exercicios.length).toBeLessThanOrEqual(3);
      for (const x of d.exercicios) {
        expect(x).toBeGreaterThanOrEqual(1);
        expect(x).toBeLessThanOrEqual(21);
      }
    }
  });

  it("é determinístico", () => {
    const a = gerarSequencia({ totalExercicios: 21, horizonteDias: 84 });
    const b = gerarSequencia({ totalExercicios: 21, horizonteDias: 84 });
    expect(a).toEqual(b);
  });
});
