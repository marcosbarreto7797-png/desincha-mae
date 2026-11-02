import { dataBrasilISO, diaAnteriorISO } from "./datas";

/**
 * Sequência (streak) = nº de dias consecutivos, terminando em hoje, com pelo
 * menos uma atividade concluída. Se hoje ainda não tem nada, não quebra a
 * sequência — conta a partir de ontem (o dia ainda não acabou).
 *
 * Função PURA e testável.
 */
export function calcularSequencia(
  datasConcluidas: string[],
  hojeISO: string = dataBrasilISO()
): number {
  const dias = new Set(datasConcluidas);
  let cursor = hojeISO;
  if (!dias.has(cursor)) cursor = diaAnteriorISO(hojeISO);

  let sequencia = 0;
  while (dias.has(cursor)) {
    sequencia += 1;
    cursor = diaAnteriorISO(cursor);
  }
  return sequencia;
}
