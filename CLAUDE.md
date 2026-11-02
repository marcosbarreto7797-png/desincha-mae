# Desincha Mãe — Guia do Projeto

App web (PWA) de acompanhamento para mães no pós-parto. A usuária paga assinatura
mensal e recebe, toda semana, o próximo plano montado conforme o que conseguiu
fazer na semana anterior. **Sem peso, medidas, fotos ou comparações corporais.**
Progresso = consistência (atividades concluídas, sequência, semanas e ciclos).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v3
- Supabase (Postgres, Auth via magic link, Storage) — **self-hosted na VPS** (Docker)
- E-mail: Resend | Deploy: **VPS própria** (Docker Compose + Caddy TLS); cron via crontab
- PWA instalável (manifest + service worker) — Fase 6

> **Deploy**: full self-host numa VPS. Guia completo em `DEPLOY.md`. App em
> `Dockerfile` (standalone) + `deploy/docker-compose.yml` (app + Caddy). Cron semanal
> pelo crontab do host chamando `deploy/trigger-cron.sh`. O `vercel.json` é vestígio
> e não é usado neste deploy.

## Comandos

```bash
npm install            # dependências
npm run dev            # dev server (http://localhost:3000)
npm run build          # build de produção
npm run lint           # eslint (next)
npm run test           # testes do plan-engine (Fase 2+)
npm run simular        # simula 4 semanas de uma usuária (Fase 2+)
```

> Não deixar o dev server rodando ocioso — encerrar quando não estiver usando.

## Setup do banco (Supabase)

1. Criar projeto no Supabase, copiar URL + chaves para `.env.local` (ver `.env.local.example`).
2. Rodar as migrations em ordem: `0001_init.sql` e depois `0002_sequencia.sql`.
3. Rodar o seed: `supabase/seed.sql` (21 exercícios Dia 01–21 + desafios).
4. Auth → Email → habilitar magic link. Em dev, pode setar
   `NEXT_PUBLIC_PERMITIR_AUTO_CADASTRO=true` para logar sem o webhook Kiwify.

## Convenções

- **Idioma do produto**: PT-BR, tom informal e acolhedor. Nunca culpar a usuária.
- **Mobile-first**: alvos de toque grandes; concluir atividade em ≤ 2 toques.
- **RLS sempre ligado**. Cliente usa chave `anon`; cron/webhook usam `service_role`.
- `plan-engine.ts` é **puro** (sem I/O) → 100% testável. Cron/API só o orquestram.
- Webhook: **salvar payload bruto primeiro**, processar depois; idempotente por `event_id`.
- Nomes de domínio em PT (tabelas, colunas); código TS em PT quando for domínio.

## Arquitetura de clients Supabase

| Arquivo | Uso | Chave |
|---|---|---|
| `src/lib/supabase/client.ts` | componentes client | anon |
| `src/lib/supabase/server.ts` | server components / actions / routes | anon + cookies |
| `src/lib/supabase/service.ts` | cron + webhook | service_role (bypassa RLS) |

## Regra de progressão (núcleo — CONFIRMADA)

Volume base por semana do ciclo: S1=7, S2=11, S3=14, S4=14 + desafio de fechamento.
Conteúdo = sequência de dias (`src/lib/sequencia.ts`); orquestração em
`src/lib/plano-sequencial.ts`. (O motor por tipo em `plan-engine.ts` segue testado,
mas o app usa o modelo sequencial híbrido.)
1 ciclo = 4 semanas. Matriz adesão × ação da próxima semana:

| Adesão | Modo | Efeito |
|--------|------|--------|
| ≥ 70% | `avancar` | avança a semana do ciclo (S1→S4); ao passar da S4 fecha o ciclo e sobe o nível (cap 3) |
| 40–69% | `manter_variar` | mantém a semana, troca atividades (evita as da anterior) |
| < 40% | `repetir_curto` | repete a semana priorizando atividades mais curtas |

Montagem respeita `tempo_disponivel`, distribui nos 7 dias e nunca repete a mesma
atividade em dias seguidos. Fronteiras testadas (70/69/40/39). Cron semanal = Fase 4.

### Modelo de conteúdo ATUAL — híbrido/sequencial (o app usa este)

Conteúdo = 21 vídeos (Dia 01–21) numa **sequência fixa** (`src/lib/sequencia.ts`):
dias 1–21 individuais → dias 22–42 duplas → dia 43+ trios. Nenhuma combinação se
repete e o mesmo exercício nunca cai em dias seguidos. `npm run sequencia` gera
`content/sequencia-dias.md` pra revisão.

Cada usuária tem um ponteiro `dia_inicial` na sequência (`user_weeks.dia_inicial`).
A adesão controla o avanço (`src/lib/plano-sequencial.ts`): **≥40% avança 7 dias**,
**<40% repete a semana** (sem pressão). Ciclo (4 semanas) e semana-do-ciclo são
**derivados** do dia global. Gera `user_plan_items` normais → toda a UI reaproveitada.
Vídeos entram sem tipo/duração (nulos); `video_url` é preenchido após upload/admin.

## Fases

- [x] **Fase 1** — setup, auth (magic link), schema + migration, seed (30 atividades, templates, 4 desafios)
- [x] **Fase 2** — onboarding + plan-engine (22 testes) + 1ª semana + tela Hoje + concluir atividade + script de simulação
- [x] **Fase 3** — calendário (semana+mês), progresso, histórico, biblioteca (filtro + detalhe) + navegação inferior
- [x] **Fase 4** — cron semanal (`/api/cron/gerar-semanas`, dom 23h UTC) + ciclos + desafios concluíveis + card de nova semana
- [x] **Fase 5** — webhook Kiwify (`/api/webhook/kiwify`, assinatura HMAC-SHA1 + salva bruto + idempotente por `event_id`) + controle de acesso por assinatura no `src/middleware.ts` (inativo → `/reativar`; bypass em dev via flag) + tela `/reativar`
- [ ] **Fase 6** — PWA, notificações (push + e-mail), admin

## Fora do escopo

Pagamento no app, chat, comunidade, IA generativa, app nativo, gamificação complexa,
qualquer métrica corporal.

## Modelo de dados

Ver `supabase/migrations/0001_init.sql` e os tipos em `src/types/database.ts`.
