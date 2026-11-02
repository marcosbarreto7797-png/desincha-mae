#!/bin/sh
# Dispara a geração semanal de planos. Chamado pelo crontab do host.
# Uso no crontab (domingo 23h UTC = 20h BRT):
#   0 23 * * 0  /opt/desincha-mae/deploy/trigger-cron.sh >> /var/log/desincha-cron.log 2>&1
set -eu

# Carrega CRON_SECRET e APP_URL do .env.production (mesmo diretório do app)
ENV_FILE="$(dirname "$0")/../.env.production"
if [ -f "$ENV_FILE" ]; then
  # exporta só as linhas VAR=valor, ignorando comentários
  set -a
  . "$ENV_FILE"
  set +a
fi

APP_URL="${APP_URL:-${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}}"

curl -fsS -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/cron/gerar-semanas"
echo ""
