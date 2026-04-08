#!/bin/bash
set -eo pipefail
trap 'echo "❌ Deploy FAILED at line $LINENO"; exit 1' ERR

echo "═══ Flowmatix CRM Deploy ═══"
echo ""

# 1. Check we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo "ERROR: Run from CRM project root"
  exit 1
fi

# 2. Build
echo "→ Building..."
npm run build
echo "✓ Build complete"
echo ""

# 3. Backup current production
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
echo "→ Backing up production..."
ssh flowmatix "cp -r /opt/flowmatix/services/app/dist /opt/flowmatix/backups/app-dist-$TIMESTAMP"
echo "✓ Backup: app-dist-$TIMESTAMP"

BACKUP_CHECK=$(ssh flowmatix "[ -d /opt/flowmatix/backups/app-dist-$TIMESTAMP ] && echo 'ok' || echo 'fail'" 2>/dev/null)
if [ "$BACKUP_CHECK" != "ok" ]; then
  echo "❌ ERROR: Backup creation failed — aborting deploy"
  exit 1
fi
echo ""

# 4. Deploy
# Use rsync --delete so old hashed asset files (index-XXXXX.js etc.) are
# removed instead of accumulating. Without --delete the dist/assets folder
# grew to 1645 files / 920MB before being noticed.
#
# --exclude protects manually-placed files on the server that aren't part
# of the Vite build (PWA install pages, debug pages, the ASMED PDF that
# was uploaded directly to the server). If you ever need to actually
# remove one of these, do it manually on the server.
echo "→ Deploying to server..."
rsync -az --delete \
  --exclude='app-install.html' \
  --exclude='clear-cache.html' \
  --exclude='index-backup.html' \
  --exclude='install.html' \
  --exclude='Flowmatix_Anschreiben_ASMED.pdf' \
  --exclude='.DS_Store' \
  dist/ flowmatix:/opt/flowmatix/services/app/dist/
echo "✓ Files uploaded"
echo ""

# 5. Restart nginx
echo "→ Restarting CRM container..."
ssh flowmatix "docker restart fm-app"
echo "✓ fm-app restarted"
echo ""

# 6. Verify
echo "→ Verifying health..."
HEALTHY=false
for i in 1 2 3 4 5; do
  sleep 3
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://crm.flowmatix.io/ 2>/dev/null || echo 'FAIL')
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
    echo "✓ CRM healthy ($STATUS) — attempt $i"
    HEALTHY=true
    break
  fi
  echo "  Attempt $i: $STATUS — retrying..."
done
if [ "$HEALTHY" != "true" ]; then
  echo "⚠ CRM health check failed after 5 attempts"
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
echo "═══ Deploy complete ═══"
echo "Backup: /opt/flowmatix/backups/app-dist-$TIMESTAMP"
echo ""
echo "To rollback:"
echo "  ssh flowmatix 'cp -r /opt/flowmatix/backups/app-dist-$TIMESTAMP/* /opt/flowmatix/services/app/dist/ && docker restart fm-web'"
