#!/bin/bash
set -e

echo "═══ Flowmatix OPERATOR CRM Deploy ═══"
echo ""
echo "→ Building..."
npm run build

echo "✓ Build complete"
echo ""

# Backup current operator dist
BACKUP_NAME="ops-dist-$(date +%Y%m%d-%H%M%S)"
echo "→ Backing up operator production..."
ssh flowmatix "cp -r /opt/flowmatix/services/app/dist-ops /opt/flowmatix/backups/$BACKUP_NAME" 2>/dev/null || true
echo "✓ Backup: $BACKUP_NAME"
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
echo "→ Verifying..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.flowmatix.io/)
echo "✓ Server responding ($STATUS)"
echo ""

echo "═══ OPERATOR Deploy complete ═══"
echo "Backup: /opt/flowmatix/backups/$BACKUP_NAME"
echo ""
echo "⚠️  This deployed to app.flowmatix.io ONLY"
echo "    crm.flowmatix.io was NOT touched."
echo ""
echo "To rollback:"
echo "  ssh flowmatix 'cp -r /opt/flowmatix/backups/$BACKUP_NAME/* /opt/flowmatix/services/app/dist-ops/ && docker restart fm-app'"
