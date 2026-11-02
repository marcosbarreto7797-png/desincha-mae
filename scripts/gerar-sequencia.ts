// Gera a sequência de dias num arquivo revisável (content/sequencia-dias.md).
//   npm run sequencia
import { writeFileSync, mkdirSync } from "node:fs";
import { gerarSequencia } from "../src/lib/sequencia";

const HORIZONTE = 84; // 12 semanas
const dias = gerarSequencia({
  totalExercicios: 21,
  diasDeDuplas: 21,
  horizonteDias: HORIZONTE,
});

const nome = (n: number) => `Dia ${String(n).padStart(2, "0")}`;

let md = `# Sequência de dias — Desincha Mãe\n\n`;
md += `> 21 vídeos (Dia 01–21) como exercícios individuais; a partir do dia 22, `;
md += `permutação progressiva: duplas (dias 22–42) e depois trios. Nenhuma combinação `;
md += `se repete e o mesmo exercício nunca cai em dias seguidos.\n\n`;
md += `Total gerado: ${dias.length} dias.\n\n`;
md += `| Dia | Qtd | Exercícios |\n|----:|:---:|---|\n`;
for (const d of dias) {
  md += `| ${d.dia} | ${d.exercicios.length} | ${d.exercicios.map(nome).join(" + ")} |\n`;
}

mkdirSync("content", { recursive: true });
writeFileSync("content/sequencia-dias.md", md, "utf8");
console.log(`✅ ${dias.length} dias gerados → content/sequencia-dias.md`);
