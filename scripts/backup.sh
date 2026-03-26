#!/usr/bin/env bash
# ============================================================
# Flowmatix Database Backup Script
# Runs pg_dump, compresses, rotates (keep last 30).
#
# Usage:
#   ./scripts/backup.sh
#
# Cron (daily at 03:00):
#   0 3 * * * /opt/flowmatix/scripts/backup.sh >> /var/log/flowmatix-backup.log 2>&1
#
# Environment variables (set in .env or export):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_DIR (default: /backups)
#   BACKUP_KEEP (default: 30)
# ============================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${PGDATABASE:-flowmatix}"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ── Load .env if present ─────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# ── Ensure backup directory exists ───────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup of database: $DB_NAME"

# ── Run pg_dump with compression ─────────────────────────────
if pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  "$DB_NAME" | gzip > "$BACKUP_FILE"; then

  FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date -Iseconds)] Backup complete: $BACKUP_FILE ($FILESIZE)"
else
  echo "[$(date -Iseconds)] ERROR: pg_dump failed!" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ── Verify backup is not empty ───────────────────────────────
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[$(date -Iseconds)] ERROR: Backup file is empty!" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ── Rotate: delete backups older than BACKUP_KEEP ────────────
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l | tr -d ' ')
echo "[$(date -Iseconds)] Total backups: $BACKUP_COUNT (keeping last $BACKUP_KEEP)"

if [ "$BACKUP_COUNT" -gt "$BACKUP_KEEP" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - BACKUP_KEEP))
  # Sort by name (timestamp-based) and delete oldest
  find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f \
    | sort \
    | head -n "$DELETE_COUNT" \
    | while read -r OLD_BACKUP; do
        echo "[$(date -Iseconds)] Deleting old backup: $(basename "$OLD_BACKUP")"
        rm -f "$OLD_BACKUP"
      done
fi

echo "[$(date -Iseconds)] Backup rotation complete."
