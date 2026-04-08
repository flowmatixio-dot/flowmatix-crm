#!/usr/bin/env bash
# ============================================================
# Set Telegram Bot Webhook to point to the fm-api telegram endpoint.
#
# As of 2026-04-08 the inbound Telegram bridge runs entirely in fm-api
# (src/routes/webhooks/telegram.ts), NOT in n8n. The old n8n bridge
# workflows have been deactivated.
#
# fm-api requires the secret_token to match TELEGRAM_WEBHOOK_SECRET — set
# the same value in /opt/flowmatix/.env on the server.
#
# Usage:
#   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_WEBHOOK_SECRET=yyy ./scripts/setup-telegram-webhook.sh
# ============================================================

set -euo pipefail

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN env var}"
WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:?Set TELEGRAM_WEBHOOK_SECRET env var (must match fm-api .env)}"
WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-https://api.flowmatix.io/webhooks/telegram}"

echo "Setting Telegram webhook to: $WEBHOOK_URL"

RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${WEBHOOK_URL}" \
  --data-urlencode "secret_token=${WEBHOOK_SECRET}" \
  --data-urlencode "allowed_updates=[\"message\",\"callback_query\"]" \
  --data-urlencode "drop_pending_updates=false")

echo "Response: $RESPONSE"

# Verify
echo ""
echo "Current webhook info:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
