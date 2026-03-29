#!/usr/bin/env python3
"""Patch 1: Revert 24h window check in tasks.ts"""
import re

FILE = '/opt/flowmatix/services/api/src/routes/clinic/tasks.ts'

with open(FILE, 'r') as f:
    content = f.read()

# --- Replace 1: Remove 24h canSendFreeform check block, replace with simple if (_tplName) ---
old1 = """          // Check if 24h window is open — prefer freetext over template
          const { canSendFreeform } = await import('../../lib/wa-session.js');
          const _canFreeform = await canSendFreeform(patPhone, user.orgId);

          if (_canFreeform) {
            // 24h window open — send as freetext (more reliable, no template approval needed)
            await enqueueJob(QUEUE_NAMES.MESSAGE_SEND, 'send-whatsapp', {
              orgId: user.orgId,
              patientId: task.patient_id,
              phoneNumberId: pat.phone_number_id,
              accessToken: pat.access_token_encrypted,
              recipientPhone: patPhone,
              messageType: 'text',
              text: msg,
            }, { orgId: user.orgId });
          } else if (_tplName) {
            // 24h window closed + template configured — send as template"""

new1 = """          if (_tplName) {
            // Send as WhatsApp template with variables"""

if old1 not in content:
    print("ERROR: Could not find first replacement block in tasks.ts")
    exit(1)

content = content.replace(old1, new1)

# --- Replace 2: Revert the else comment ---
old2 = """          } else {
            // 24h window closed + no template — send with reactivation flag"""

new2 = """          } else {
            // No template configured — send as free-form text (works within 24h window)"""

if old2 not in content:
    print("ERROR: Could not find second replacement block in tasks.ts")
    exit(1)

content = content.replace(old2, new2)

with open(FILE, 'w') as f:
    f.write(content)

print("OK: tasks.ts patched successfully (reverted 24h check)")
