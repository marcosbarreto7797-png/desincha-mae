// Helpers de data no fuso de Brasília (o deploy roda em UTC na Vercel).

const TZ = "America/Sao_Paulo";

/** Data de "hoje" em São Paulo, no formato YYYY-MM-DD. */
export function dataBrasilISO(d: Date = new Date()): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Converte uma string ISO (YYYY-MM-DD) em Date ao meio-dia local (evita borda de fuso). */
export function dateDeISO(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function formatar(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Dia anterior de uma data ISO (YYYY-MM-DD). */
export function diaAnteriorISO(iso: string): string {
  const d = dateDeISO(iso);
  d.setDate(d.getDate() - 1);
  return formatar(d);
}

/** Soma `n` dias a uma data ISO (YYYY-MM-DD). Aceita n negativo. */
export function somarDiasISO(iso: string, n: number): string {
  const d = dateDeISO(iso);
  d.setDate(d.getDate() + n);
  return formatar(d);
}
