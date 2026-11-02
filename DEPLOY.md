# Deploy — VPS self-hosted (Next.js + Supabase)

Topologia: **tudo na sua VPS**. Dois conjuntos de containers:

1. **Supabase self-hosted** (Postgres, Auth/GoTrue, Storage, Kong, Studio) — repositório oficial
2. **App Desincha Mãe** (Next.js standalone) + **Caddy** (TLS automático) — este repo, pasta `deploy/`

```
Internet ──▶ Caddy :443 ──▶ app:3000 (Next.js)
                 └────────▶ supabase.seudominio.com.br (Kong → Postgres/Auth/Storage)
```

---

## 0. Pré-requisitos

- VPS Linux (Ubuntu 22.04+), 2 GB RAM no mínimo (Supabase puxa memória)
- Docker + Docker Compose plugin: `curl -fsSL https://get.docker.com | sh`
- Dois subdomínios apontando (A record) para o IP da VPS:
  - `app.seudominio.com.br` → o app
  - `supabase.seudominio.com.br` → o Supabase (Kong)

---

## 1. Subir o Supabase self-hosted

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

Edite o `.env` do Supabase e **gere segredos fortes** (não use os de exemplo):

```bash
# senha do Postgres
openssl rand -hex 24      # → POSTGRES_PASSWORD
# JWT secret (mín. 32 chars)
openssl rand -hex 32      # → JWT_SECRET
```

Depois gere `ANON_KEY` e `SERVICE_ROLE_KEY` assinando com esse `JWT_SECRET`
(use o gerador oficial: https://supabase.com/docs/guides/self-hosting#api-keys).

Ajuste também:
- `SITE_URL=https://app.seudominio.com.br`
- `API_EXTERNAL_URL=https://supabase.seudominio.com.br`
- `SUPABASE_PUBLIC_URL=https://supabase.seudominio.com.br`
- **SMTP** (obrigatório pro magic link — o self-host não manda e-mail sozinho):
  ```
  SMTP_HOST=smtp.resend.com
  SMTP_PORT=465
  SMTP_USER=resend
  SMTP_PASS=<sua RESEND_API_KEY>
  SMTP_SENDER_NAME=Desincha Mãe
  SMTP_ADMIN_EMAIL=ola@seudominio.com.br
  ```
- `ADITIONAL_REDIRECT_URLS=https://app.seudominio.com.br/**`
- Troque `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` (login do Studio)

Suba:

```bash
docker compose up -d
```

> **Exponha o Kong com TLS** via seu Caddy (ou o reverse proxy que preferir)
> em `supabase.seudominio.com.br → kong:8000`. **Não** deixe o Studio (porta 3000
> do Supabase) nem o Postgres (5432) abertos pra internet — restrinja por firewall.

---

## 2. Rodar a migration + o seed

Pelo Studio (`https://supabase.seudominio.com.br` → SQL Editor) ou via psql:

```bash
# dentro de supabase/docker (rode as migrations EM ORDEM, depois o seed)
docker compose exec -T db psql -U postgres -d postgres < /caminho/desincha-mae/supabase/migrations/0001_init.sql
docker compose exec -T db psql -U postgres -d postgres < /caminho/desincha-mae/supabase/migrations/0002_sequencia.sql
docker compose exec -T db psql -U postgres -d postgres < /caminho/desincha-mae/supabase/seed.sql
```

Confere: deve criar 9 tabelas, policies de RLS, o trigger `on_auth_user_created`
e popular 30 atividades, 12 templates e 4 desafios.

---

## 3. Configurar o app

Na pasta do **este** repositório na VPS:

```bash
cp .env.production.example .env.production
nano .env.production
```

Preencha com:
- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.seudominio.com.br`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` = as chaves do passo 1
- `NEXT_PUBLIC_SITE_URL` e `APP_URL` = `https://app.seudominio.com.br`
- `CRON_SECRET` = `openssl rand -hex 32`
- `NEXT_PUBLIC_PERMITIR_AUTO_CADASTRO=false`

Ajuste o domínio no `deploy/Caddyfile`.

---

## 4. Build + subir o app

```bash
cd deploy
docker compose --env-file ../.env.production up -d --build
```

Caddy pega o certificado automaticamente. Acesse `https://app.seudominio.com.br`.

Pra atualizar depois de um `git pull`:

```bash
cd deploy
docker compose --env-file ../.env.production up -d --build
```

---

## 5. Cron semanal (domingo 20h BRT)

O endpoint `/api/cron/gerar-semanas` gera a semana de cada usuária ativa.
Use o crontab do host (VPS em UTC → 23h UTC = 20h BRT):

```bash
chmod +x /opt/desincha-mae/deploy/trigger-cron.sh
crontab -e
# adicione:
0 23 * * 0  /opt/desincha-mae/deploy/trigger-cron.sh >> /var/log/desincha-cron.log 2>&1
```

> Se a VPS já estiver no fuso de São Paulo, use `0 20 * * 0`.
> Teste manualmente a qualquer hora: `./deploy/trigger-cron.sh`

---

## 6. Webhook do Kiwify (Fase 5)

Quando a Fase 5 estiver pronta, aponte o webhook do Kiwify para:
`https://app.seudominio.com.br/api/webhooks/kiwify`
e coloque o token em `KIWIFY_WEBHOOK_TOKEN` no `.env.production`.

---

## 7. Backup do banco (IMPORTANTE — self-host é você quem cuida)

Dump diário do Postgres:

```bash
crontab -e
# todo dia 03h: dump comprimido, mantém 14 dias
0 3 * * *  docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db pg_dump -U postgres postgres | gzip > /opt/backups/db-$(date +\%F).sql.gz; find /opt/backups -name 'db-*.sql.gz' -mtime +14 -delete
```

Guarde cópias **fora da VPS** (S3/Backblaze/rsync). São dados de usuárias pagantes.

---

## Checklist de subida

- [ ] DNS dos 2 subdomínios apontando pra VPS
- [ ] Supabase up, segredos trocados, SMTP configurado, Studio/Postgres fechados no firewall
- [ ] Migration + seed rodados
- [ ] `.env.production` preenchido (chaves, CRON_SECRET, URLs)
- [ ] App + Caddy up, HTTPS funcionando
- [ ] Login por magic link chega no e-mail (teste real)
- [ ] Crontab semanal + backup diário ativos
- [ ] Backup replicado fora da VPS
