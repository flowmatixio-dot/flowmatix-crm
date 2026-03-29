#!/usr/bin/env python3
"""Patch 3: Restore new lead email notification in webhook-processing.processor.ts"""

FILE = '/opt/flowmatix/services/api/src/workers/webhook-processing.processor.ts'

with open(FILE, 'r') as f:
    content = f.read()

old = """      // New lead email notification removed — CRM shows leads in real-time"""

new = """      // ── Send new lead email notification ──
      try {
        const { rows: orgMeta } = await query(
          `SELECT email, name, metadata FROM organizations WHERE id = $1 LIMIT 1`,
          [orgId]
        );
        if (orgMeta[0]) {
          const meta = orgMeta[0].metadata || {};
          if (meta.notif_email !== false && orgMeta[0].email) {
            const { sendEmailDirect: sendLeadEmail } = await import('../lib/email.js');
            await sendLeadEmail(orgMeta[0].email, {
              type: 'new_lead',
              clinicName: orgMeta[0].name || 'Klinik',
              patientName: profileName || 'Unbekannt',
              patientPhone: from,
              locale: 'de',
            });
          }
        }
      } catch (emailErr) {
        console.warn('[webhook] Failed to send new_lead email:', (emailErr as Error).message);
      }"""

if old not in content:
    print("ERROR: Could not find replacement block in webhook-processing.processor.ts")
    exit(1)

content = content.replace(old, new)

with open(FILE, 'w') as f:
    f.write(content)

print("OK: webhook-processing.processor.ts patched successfully (restored lead email)")
