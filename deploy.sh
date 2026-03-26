#!/bin/bash
set -e

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
echo ""

# 4. Deploy
echo "→ Deploying to server..."
scp -r dist/* flowmatix:/opt/flowmatix/services/app/dist/
echo "✓ Files uploaded"
echo ""

# 5. Restart nginx
echo "→ Restarting CRM container..."
ssh flowmatix "docker restart fm-app"
echo "✓ fm-app restarted"
echo ""

# 6. Verify
echo "→ Verifying..."
STATUS=$(ssh flowmatix "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
  echo "✓ Server responding ($STATUS)"
else
  echo "⚠ Server returned $STATUS — check manually!"
fi

echo ""
echo "═══ Deploy complete ═══"
echo "Backup: /opt/flowmatix/backups/app-dist-$TIMESTAMP"
echo ""
echo "To rollback:"
echo "  ssh flowmatix 'cp -r /opt/flowmatix/backups/app-dist-$TIMESTAMP/* /opt/flowmatix/services/app/dist/ && docker restart fm-web'"
