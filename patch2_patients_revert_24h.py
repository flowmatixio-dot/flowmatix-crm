#!/usr/bin/env python3
"""Patch 2: Restore deposit_confirmed WhatsApp template sending in patients.ts
The entire block was removed - restore the original template-based version from backup."""

FILE = '/opt/flowmatix/services/api/src/routes/crm/patients.ts'

with open(FILE, 'r') as f:
    content = f.read()

# The deposit WA sending block was entirely removed.
# Restore it after the writeAudit line in the deposit-status route.
anchor = """  await writeAudit({ organizationId: user.orgId, userId: user.userId, action: 'deposit_status_update', resourceType: "patient", resourceId: id, details: { newStatus, updatedBy: user.email } });
  return reply.send({ success: true, depositStatus: newStatus });
});
}"""

replacement = """  await writeAudit({ organizationId: user.orgId, userId: user.userId, action: 'deposit_status_update', resourceType: "patient", resourceId: id, details: { newStatus, updatedBy: user.email } });

  // ── Send deposit_confirmed WhatsApp template when deposit is confirmed ──
  if (newStatus === 'confirmed') {
    try {
      const { rows: [ptData] } = await query(
        `SELECT p.first_name, p.last_name, p.phone, p.locale, p.metadata,
                o.name AS clinic_name, o.metadata AS org_metadata
         FROM patients p JOIN organizations o ON p.organization_id = o.id
         WHERE p.id = $1 AND p.organization_id = $2`,
        [id, user.orgId]
      );
      if (ptData?.phone) {
        const { rows: waConf } = await query(
          `SELECT phone_number_id, access_token_encrypted FROM whatsapp_configs
           WHERE organization_id = $1 AND is_active = true LIMIT 1`,
          [user.orgId]
        );
        if (waConf[0]) {
          const locale = (ptData.locale || 'de').substring(0, 2);
          const amount = ptData.metadata?.depositAmount || ptData.metadata?.price_estimate || '—';
          const clinicName = ptData.clinic_name || 'Clinic';

          // Determine next step text based on whether an appointment already exists
          const appointmentDate = ptData.metadata?.appointment_date || ptData.metadata?.appointmentDate;
          let nextStepText: string;
          if (appointmentDate) {
            const nextStepTexts: Record<string, string> = {
              de: `Dein Termin am ${appointmentDate} ist damit bestaetigt.`,
              en: `Your appointment on ${appointmentDate} is now confirmed.`,
              tr: `${appointmentDate} tarihindeki randevunuz onaylandi.`,
            };
            nextStepText = nextStepTexts[locale] || nextStepTexts['de'];
          } else {
            const nextStepTexts: Record<string, string> = {
              de: 'Wir planen jetzt deinen Termin und melden uns in Kuerze.',
              en: 'We will now plan your appointment and get back to you shortly.',
              tr: 'Randevunuzu simdi planliyoruz ve en kisa surede size donecegiz.',
            };
            nextStepText = nextStepTexts[locale] || nextStepTexts['de'];
          }

          await enqueueJob(QUEUE_NAMES.MESSAGE_SEND, 'send-whatsapp', {
            orgId: user.orgId,
            patientId: id,
            phoneNumberId: waConf[0].phone_number_id,
            accessToken: waConf[0].access_token_encrypted,
            recipientPhone: ptData.phone,
            messageType: 'template',
            templateName: 'deposit_confirmed',
            templateLanguage: locale === 'tr' ? 'tr' : locale === 'de' ? 'de' : 'en',
            templateComponents: [{
              type: 'body',
              parameters: [
                { type: 'text', text: ptData.first_name || 'Patient' },
                { type: 'text', text: String(amount) },
                { type: 'text', text: clinicName },
                { type: 'text', text: nextStepText },
              ]
            }],
          }, { orgId: user.orgId });
          console.log(`[patients] Deposit confirmed WA template sent to ${ptData.first_name} (${id})`);
        }
      }
    } catch (e: any) {
      console.warn('[patients] Deposit confirmed WA notification failed:', e.message);
    }
  }

  return reply.send({ success: true, depositStatus: newStatus });
});
}"""

if anchor not in content:
    print("ERROR: Could not find anchor block in patients.ts")
    print("Looking for:")
    print(repr(anchor[:100]))
    exit(1)

content = content.replace(anchor, replacement)

with open(FILE, 'w') as f:
    f.write(content)

print("OK: patients.ts patched successfully (restored deposit_confirmed WA template)")
