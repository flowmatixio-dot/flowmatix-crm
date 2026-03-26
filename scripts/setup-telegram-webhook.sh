#!/usr/bin/env bash
# ============================================================
# Set Telegram Bot Webhook to point to the production bridge
# (NOT the standalone telegram-patient-test flow)
#
# Usage:
#   TELEGRAM_BOT_TOKEN=xxx ./scripts/setup-telegram-webhook.sh
# ============================================================

set -euo pipefail

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN env var}"
WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-https://n8n.flowmatix.io/webhook/telegram-bridge}"

echo "Setting Telegram webhook to: $WEBHOOK_URL"

RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${WEBHOOK_URL}" \
  -d "allowed_updates=[\"message\",\"callback_query\"]" \
  -d "drop_pending_updates=false")

echo "Response: $RESPONSE"

# Verify
echo ""
echo "Current webhook info:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
