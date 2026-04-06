#!/bin/bash
set -eo pipefail
trap 'echo "❌ Deploy FAILED at line $LINENO"; exit 1' ERR

echo "═══ Flowmatix OPERATOR CRM Deploy ═══"
echo ""
echo "→ Building..."
npm run build

echo "✓ Build complete"
echo ""

# Backup current operator dist
BACKUP_NAME="ops-dist-$(date +%Y%m%d-%H%M%S)"
echo "→ Backing up operator production..."
ssh flowmatix "cp -r /opt/flowmatix/services/app/dist-ops /opt/flowmatix/backups/$BACKUP_NAME"
echo "✓ Backup: $BACKUP_NAME"

BACKUP_CHECK=$(ssh flowmatix "[ -d /opt/flowmatix/backups/$BACKUP_NAME ] && echo 'ok' || echo 'fail'" 2>/dev/null)
if [ "$BACKUP_CHECK" != "ok" ]; then
  echo "❌ ERROR: Backup creation failed — aborting deploy"
  exit 1
fi
echo ""

# Upload to OPERATOR dist (dist-ops), NOT customer dist
echo "→ Deploying to OPERATOR server (dist-ops)..."
rsync -az --delete dist/ flowmatix:/opt/flowmatix/services/app/dist-ops/
echo "✓ Files uploaded to dist-ops"
echo ""

# Restart nginx
echo "→ Restarting CRM container..."
ssh flowmatix "docker restart fm-app"
echo "✓ fm-app restarted"
echo ""

# Verify
echo "→ Verifying health..."
HEALTHY=false
for i in 1 2 3 4 5; do
  sleep 3
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://app.flowmatix.io/ 2>/dev/null || echo 'FAIL')
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
    echo "✓ Operator CRM healthy ($STATUS) — attempt $i"
    HEALTHY=true
    break
  fi
  echo "  Attempt $i: $STATUS — retrying..."
done
if [ "$HEALTHY" != "true" ]; then
  echo "⚠ Operator CRM health check failed after 5 attempts"
  echo "  Check logs: ssh flowmatix 'docker logs fm-app --tail 20'"
fi
echo ""

echo "→ Purging Cloudflare cache..."
CF_RESULT=$(ssh flowmatix 'source /opt/flowmatix/.env 2>/dev/null; if [ -n "$CLOUDFLARE_ZONE_ID" ] && [ -n "$CLOUDFLARE_API_TOKEN" ]; then curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" -d "{\"purge_everything\":true}" | grep -o "\"success\":[a-z]*"; else echo "SKIP"; fi' 2>/dev/null || echo "SKIP")
if [ "$CF_RESULT" = "SKIP" ]; then
  echo "⚠ Cloudflare credentials not found — skipping cache purge"
else
  echo " ✓ Cache purged ($CF_RESULT)"
fi

echo ""
echo "═══ OPERATOR Deploy complete ═══"
echo "Backup: /opt/flowmatix/backups/$BACKUP_NAME"
echo ""
echo "⚠️  This deployed to app.flowmatix.io ONLY"
echo "    crm.flowmatix.io was NOT touched."
echo ""
echo "To rollback:"
echo "  ssh flowmatix 'cp -r /opt/flowmatix/backups/$BACKUP_NAME/* /opt/flowmatix/services/app/dist-ops/ && docker restart fm-app'"
