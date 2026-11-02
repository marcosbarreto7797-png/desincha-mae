import crypto from "node:crypto";
import type { AssinaturaStatus } from "@/types/database";

/**
 * Helpers puros (sem I/O) para o webhook da Kiwify → 100% testáveis.
 * A rota em src/app/api/webhook/kiwify/route.ts só orquestra.
 */

/** O que importa de um evento da Kiwify, já normalizado. */
export interface EventoKiwify {
  /** id estável do evento → idempotência. null = não deu pra derivar. */
  eventId: string | null;
  email: string | null;
  nome: string | null;
  /** Para onde o status da assinatura deve ir. null = evento sem efeito. */
  statusAlvo: AssinaturaStatus | null;
}

/**
 * Confere a assinatura do webhook da Kiwify.
 * A Kiwify envia `?signature=<hmac_sha1_hex>` = HMAC-SHA1(corpo_bruto, token).
 */
export function assinaturaValida(
  corpoBruto: string,
  assinaturaRecebida: string | null,
  token: string | undefined
): boolean {
  if (!token || !assinaturaRecebida) return false;
  const esperada = crypto
    .createHmac("sha1", token)
    .update(corpoBruto, "utf8")
    .digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(assinaturaRecebida);
  // timingSafeEqual exige buffers do mesmo tamanho
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Status/eventos da Kiwify que ATIVAM a assinatura.
const ATIVA_STATUS = new Set(["paid", "approved", "active"]);
const ATIVA_EVENTOS = new Set([
  "order_approved",
  "order_paid",
  "subscription_renewed",
]);
// ...e os que INATIVAM.
const INATIVA_STATUS = new Set([
  "refunded",
  "chargedback",
  "chargeback",
  "canceled",
  "cancelled",
]);
const INATIVA_EVENTOS = new Set([
  "order_refunded",
  "chargeback",
  "subscription_canceled",
  "subscription_cancelled",
  "subscription_late",
]);

function texto(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function objeto(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Lê o payload bruto da Kiwify e normaliza o que a gente usa. */
export function lerEvento(payload: unknown): EventoKiwify {
  const p = objeto(payload);
  const customer = objeto(p.Customer ?? p.customer);

  const email = texto(customer.email ?? p.email).trim().toLowerCase() || null;
  const nome =
    texto(customer.full_name ?? customer.name ?? p.nome).trim() || null;

  const orderStatus = texto(p.order_status).toLowerCase();
  const evento = texto(p.webhook_event_type ?? p.event).toLowerCase();

  let statusAlvo: AssinaturaStatus | null = null;
  if (ATIVA_STATUS.has(orderStatus) || ATIVA_EVENTOS.has(evento)) {
    statusAlvo = "ativo";
  }
  // Inativação tem prioridade: estorno/cancelamento sempre tira o acesso.
  if (INATIVA_STATUS.has(orderStatus) || INATIVA_EVENTOS.has(evento)) {
    statusAlvo = "inativo";
  }

  const idBruto =
    p.webhook_event_id ??
    p.id ??
    (p.order_id != null
      ? `${texto(p.order_id)}:${evento || orderStatus || "x"}`
      : null);

  return {
    eventId: idBruto != null ? texto(idBruto) : null,
    email,
    nome,
    statusAlvo,
  };
}
