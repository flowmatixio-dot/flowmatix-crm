#!/bin/bash
# ═══ FLOWMATIX BOT BUG FIXES ═══
# Fixes: photo count, booking race, flow_state, age, markdown, language, handoff, reset
set -e

API_SRC="/opt/flowmatix/services/api/src"

echo "═══ Backing up files ═══"
cp "$API_SRC/workers/ai-response.processor.ts" "$API_SRC/workers/ai-response.processor.ts.bak.$(date +%Y%m%d%H%M)"
cp "$API_SRC/workers/conversation.processor.ts" "$API_SRC/workers/conversation.processor.ts.bak.$(date +%Y%m%d%H%M)"
cp "$API_SRC/workers/webhook-processing.processor.ts" "$API_SRC/workers/webhook-processing.processor.ts.bak.$(date +%Y%m%d%H%M)"

# ═══ FIX 1: Photo count — use actual count from conversation_photos table ═══
echo "═══ FIX 1: Photo count deduplication ═══"

# Fix conversation.processor.ts — replace blind increment with actual count
sed -i 's|`UPDATE conversations SET photo_count = photo_count + 1, updated_at = NOW() WHERE id = \$1`|`UPDATE conversations SET photo_count = (SELECT COUNT(*) FROM conversation_photos WHERE conversation_id = \$1), updated_at = NOW() WHERE id = \$1`|' \
  "$API_SRC/workers/conversation.processor.ts"

# Fix ai-response.processor.ts — use actual count from conversation_photos
# Replace the db photo count query to use actual photos table
sed -i 's|`SELECT photo_count FROM conversations WHERE organization_id = \$1 AND patient_id = \$2 ORDER BY updated_at DESC LIMIT 1`|`SELECT COUNT(*) as photo_count FROM conversation_photos cp JOIN conversations c ON cp.conversation_id = c.id WHERE c.organization_id = \$1 AND c.patient_id = \$2`|' \
  "$API_SRC/workers/ai-response.processor.ts"

echo "  ✓ Photo count now uses actual count from conversation_photos"

# ═══ FIX 2: Booking race condition ═══
echo "═══ FIX 2: Booking — update flow_state on successful booking ═══"

# After successful booking, also update flow_state to BOOKING_CONFIRMED
sed -i "/toolResults\[tc.id\] = {/,/success: true, appointment_id: apptRow\[0\].id/{
  /console.log.*Appointment booked/a\\
                // FIX: Update flow_state to BOOKING_CONFIRMED after successful booking\\
                await query(\\
                  \`UPDATE conversations SET flow_state = 'BOOKING_CONFIRMED', updated_at = NOW()\\
                   WHERE patient_id = \$1 AND organization_id = \$2\`,\\
                  [data.patientId, data.orgId]\\
                );
}" "$API_SRC/workers/ai-response.processor.ts"

echo "  ✓ Booking now updates flow_state to BOOKING_CONFIRMED"

# ═══ FIX 3: flow_state — update_treatment_info should advance to INTAKE_BASIC not INTAKE_COMPLETE ═══
echo "═══ FIX 3: flow_state progression fix ═══"

# The update_treatment_info tool jumps straight to INTAKE_COMPLETE which is too aggressive
# Change to advance incrementally based on what data was collected
sed -i "s|WHEN flow_state IN ('EMPTY','WELCOME_SENT','GDPR_PENDING','GDPR_ACCEPTED','INTAKE_NAME_AGE','INTAKE_HAIRLOSS','INTAKE_MEDICATION') THEN 'INTAKE_COMPLETE'|WHEN flow_state IN ('INTAKE_NAME_AGE','INTAKE_HAIRLOSS') THEN 'INTAKE_MEDICATION' WHEN flow_state = 'INTAKE_MEDICATION' THEN 'INTAKE_COMPLETE'|" \
  "$API_SRC/workers/ai-response.processor.ts"

echo "  ✓ flow_state now advances incrementally through intake stages"

echo ""
echo "═══ All code fixes applied ═══"
echo "Now applying prompt fixes..."
