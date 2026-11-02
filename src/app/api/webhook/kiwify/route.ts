import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { assinaturaValida, lerEvento, type EventoKiwify } from "@/lib/kiwify";

// Usa service_role + crypto → precisa do runtime Node (não edge).
export const runtime = "nodejs";

/**
 * Webhook da Kiwify. Fluxo (convenção do projeto):
 *   1. confere a assinatura (HMAC-SHA1 com KIWIFY_WEBHOOK_TOKEN)
 *   2. SALVA O PAYLOAD BRUTO primeiro (idempotente por origem+event_id)
 *   3. processa depois: paga → cria/ativa usuária; estorno/cancelamento → inativa
 * Sempre responde 200 quando o evento foi recebido (erros ficam no log),
 * pra Kiwify não ficar reenviando em loop.
 */
export async function POST(request: NextRequest) {
  const corpoBruto = await request.text();
  const token = process.env.KIWIFY_WEBHOOK_TOKEN;

  if (!token) {
    console.error("[webhook kiwify] KIWIFY_WEBHOOK_TOKEN não configurado");
    return NextResponse.json({ erro: "config" }, { status: 500 });
  }

  const assinatura = request.nextUrl.searchParams.get("signature");
  if (!assinaturaValida(corpoBruto, assinatura, token)) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ erro: "json inválido" }, { status: 400 });
  }

  const evento = lerEvento(payload);
  const service = createServiceClient();

  // 1) idempotência: já recebemos esse evento antes?
  if (evento.eventId) {
    const { data: existente } = await service
      .from("webhook_logs")
      .select("id")
      .eq("origem", "kiwify")
      .eq("event_id", evento.eventId)
      .maybeSingle();
    if (existente) {
      return NextResponse.json({ ok: true, duplicado: true });
    }
  }

  // 2) salva o bruto PRIMEIRO
  const { data: log, error: erroInsert } = await service
    .from("webhook_logs")
    .insert({
      origem: "kiwify",
      event_id: evento.eventId,
      payload_bruto: payload,
    })
    .select("id")
    .single();

  if (erroInsert) {
    // corrida com outro request do mesmo evento (índice único) → trata como duplicado
    if (erroInsert.code === "23505") {
      return NextResponse.json({ ok: true, duplicado: true });
    }
    console.error("[webhook kiwify] erro ao salvar log", erroInsert);
    return NextResponse.json({ erro: "log" }, { status: 500 });
  }

  // 3) processa
  try {
    await processar(service, evento);
    await service.from("webhook_logs").update({ processado: true }).eq("id", log.id);
    return NextResponse.json({ ok: true, status: evento.statusAlvo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[webhook kiwify] erro ao processar", msg);
    await service.from("webhook_logs").update({ erro: msg }).eq("id", log.id);
    // 200 de propósito: o evento está salvo, o erro registrado, sem reenvio em loop.
    return NextResponse.json({ ok: false, erro: msg });
  }
}

/** Aplica o efeito do evento no banco (service_role → bypassa RLS). */
async function processar(
  service: SupabaseClient,
  evento: EventoKiwify
): Promise<void> {
  if (!evento.statusAlvo) return; // ex: waiting_payment → sem efeito
  if (!evento.email) throw new Error("evento sem e-mail");

  // profiles.email é único → acha a usuária sem listar todo mundo
  const { data: perfil } = await service
    .from("profiles")
    .select("id")
    .eq("email", evento.email)
    .maybeSingle();

  if (evento.statusAlvo === "ativo") {
    let userId: string | undefined = perfil?.id;

    if (!userId) {
      // cria o usuário de auth → o trigger handle_new_user cria o profile
      const { data, error } = await service.auth.admin.createUser({
        email: evento.email,
        email_confirm: true,
      });
      if (error || !data?.user) {
        throw new Error(`falha ao criar usuária: ${error?.message ?? "?"}`);
      }
      userId = data.user.id;
    }

    await service
      .from("profiles")
      .update({
        status_assinatura: "ativo",
        ...(evento.nome ? { nome: evento.nome } : {}),
      })
      .eq("id", userId);
  } else {
    // inativa só se a usuária existir (não cria ninguém num cancelamento)
    if (perfil?.id) {
      await service
        .from("profiles")
        .update({ status_assinatura: "inativo" })
        .eq("id", perfil.id);
    }
  }
}
