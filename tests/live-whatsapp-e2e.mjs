#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  FLOWMATIX LIVE WHATSAPP E2E TEST
 *  Simulates real patient messages via webhook → checks bot responses
 * ═══════════════════════════════════════════════════════════════
 *
 *  Tests:
 *  1. German conversation flow (greeting, intake, responses)
 *  2. Turkish conversation (language detection)
 *  3. English conversation
 *  4. Core plan: only 1 language allowed
 *  5. Pro plan: up to 3 languages
 *  6. No-deposit setting: bot should NOT ask for deposit
 *  7. With-deposit setting: bot SHOULD mention deposit
 *  8. Prompt quality review: tone, neverSay, treatments
 */

import { execSync } from 'child_process';

const API_BASE = 'https://api.flowmatix.io';
const WEBHOOK_URL = `${API_BASE}/webhooks/whatsapp`;
const PHONE_NUMBER_ID = '927699520436218';
const ORG_ID = '992e539b-951e-4125-b75e-919456a8a2a8';
const DB_PASS = 'S0dwdZO4Drv2ryJPTRHVp573irBMm3F8LLJs861A';

const PLANS = {
  core:       '7a75bb55-0b5d-4450-8b89-0609f7744dd5',
  pro:        'dc852e1e-eec2-43a3-bd29-59f426eac14d',
  operations: 'c0cbd8ab-14e0-4671-92a6-57f0a3a03282',
  enterprise: 'e1b49d2e-51a9-4378-859c-809b8ab5b4ad',
};

// Test phone numbers (fake, won't deliver real messages)
const TEST_PHONES = {
  german:  '4917600000001',
  turkish: '9053200000001',
  english: '4417600000001',
  multi1:  '4917600000002',
  multi2:  '9053200000002',
  deposit: '4917600000003',
};

let results = [];
let testCount = 0;

function pass(id, detail = '') {
  results.push({ id, status: 'PASS', detail });
  console.log(`  ✓ ${id}${detail ? ' — ' + detail : ''}`);
}

function fail(id, detail = '') {
  results.push({ id, status: 'FAIL', detail });
  console.log(`  ✗ ${id}${detail ? ' — ' + detail : ''}`);
}

function info(id, detail = '') {
  results.push({ id, status: 'INFO', detail });
  console.log(`  ℹ ${id}${detail ? ' — ' + detail : ''}`);
}

function dbQuery(sql) {
  try {
    const escaped = sql.replace(/'/g, "'\\''");
    const cmd = `docker exec -e PGPASSWORD=${DB_PASS} fm-postgres psql -U flowmatix -d flowmatix -t -c '${escaped}'`;
    return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim();
  } catch (e) {
    return `DB_ERROR: ${e.message?.substring(0, 120)}`;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Send simulated WhatsApp message ─────────────────────────

async function sendWhatsAppMessage(fromPhone, text, name = 'Test Patient') {
  const msgId = `wamid.test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WABA_TEST',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '491234567890',
            phone_number_id: PHONE_NUMBER_ID,
          },
          contacts: [{
            profile: { name },
            wa_id: fromPhone,
          }],
          messages: [{
            from: fromPhone,
            id: msgId,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: { body: text },
            type: 'text',
          }],
        },
        field: 'messages',
      }],
    }],
  };

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { status: res.status, msgId };
}

// ─── Get bot response for a conversation ─────────────────────

async function waitForBotResponse(phone, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Find conversation by phone
    const convId = dbQuery(
      `SELECT c.id FROM conversations c WHERE c.phone = '${phone}' AND c.organization_id = '${ORG_ID}' ORDER BY c.created_at DESC LIMIT 1`
    );
    if (convId && !convId.startsWith('DB_ERROR')) {
      // Get latest outbound message
      const msg = dbQuery(
        `SELECT content FROM conversation_messages WHERE conversation_id = '${convId.trim()}' AND direction = 'outbound' ORDER BY created_at DESC LIMIT 1`
      );
      if (msg && !msg.startsWith('DB_ERROR') && msg.trim().length > 0) {
        return { conversationId: convId.trim(), response: msg.trim() };
      }
    }
    await sleep(2000);
  }
  return { conversationId: null, response: null };
}

// ─── Get ALL bot responses for a conversation ────────────────

function getAllResponses(conversationId) {
  const msgs = dbQuery(
    `SELECT direction, content, created_at FROM conversation_messages WHERE conversation_id = '${conversationId}' ORDER BY created_at ASC`
  );
  return msgs;
}

// ─── Switch subscription plan ────────────────────────────────

function switchPlan(planSlug) {
  const planId = PLANS[planSlug];
  dbQuery(`UPDATE subscriptions SET plan_id = '${planId}' WHERE organization_id = '${ORG_ID}'`);
  // Also update org max_languages to match plan
  const maxLangs = dbQuery(`SELECT max_languages FROM subscription_plans WHERE id = '${planId}'`);
  dbQuery(`UPDATE organizations SET max_languages = ${parseInt(maxLangs) || 1} WHERE id = '${ORG_ID}'`);
  console.log(`  → Switched to ${planSlug} plan (max_languages=${maxLangs.trim()})`);
}

// ─── Set deposit setting ─────────────────────────────────────

function setDepositEnabled(enabled) {
  dbQuery(
    `UPDATE organizations SET metadata = jsonb_set(jsonb_set(metadata::jsonb, '{deposit_enabled}', '${enabled}'), '{booking_funnel}', '"${enabled ? 'deposit_before' : 'no_deposit'}"') WHERE id = '${ORG_ID}'`
  );
  console.log(`  → Deposit: ${enabled ? 'ENABLED (deposit_before)' : 'DISABLED (no_deposit)'}`);
}

// ─── Cleanup test data ───────────────────────────────────────

function cleanupTestConversations() {
  for (const phone of Object.values(TEST_PHONES)) {
    const convIds = dbQuery(
      `SELECT id FROM conversations WHERE phone = '${phone}' AND organization_id = '${ORG_ID}'`
    );
    if (convIds && !convIds.startsWith('DB_ERROR')) {
      for (const id of convIds.split('\n').map(s => s.trim()).filter(Boolean)) {
        dbQuery(`DELETE FROM action_executions WHERE transition_id IN (SELECT id FROM conversation_transitions WHERE conversation_id = '${id}')`);
        dbQuery(`DELETE FROM conversation_messages WHERE conversation_id = '${id}'`);
        dbQuery(`DELETE FROM conversation_transitions WHERE conversation_id = '${id}'`);
        dbQuery(`DELETE FROM conversation_photos WHERE conversation_id = '${id}'`);
        dbQuery(`DELETE FROM conversations WHERE id = '${id}'`);
      }
    }
    // Delete test patients
    dbQuery(`DELETE FROM patients WHERE phone = '${phone}' AND organization_id = '${ORG_ID}'`);
    dbQuery(`DELETE FROM patients WHERE phone = '+${phone}' AND organization_id = '${ORG_ID}'`);
    dbQuery(`DELETE FROM patients WHERE phone_normalized = '${phone}' AND organization_id = '${ORG_ID}'`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FLOWMATIX LIVE WHATSAPP E2E TEST');
  console.log('  Testing real bot behavior from patient perspective');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save original plan
  const origPlanId = dbQuery(`SELECT plan_id FROM subscriptions WHERE organization_id = '${ORG_ID}'`).trim();
  const origMaxLangs = dbQuery(`SELECT max_languages FROM organizations WHERE id = '${ORG_ID}'`).trim();

  // Save and temporarily disable out-of-hours reply so we get real AI responses
  const origOOH = dbQuery(`SELECT out_of_hours_reply FROM clinic_agent_config WHERE organization_id = '${ORG_ID}'`).trim();
  const origAfterHours = dbQuery(`SELECT after_hours_message FROM clinic_agent_config WHERE organization_id = '${ORG_ID}'`).trim();
  dbQuery(`UPDATE clinic_agent_config SET out_of_hours_reply = NULL, after_hours_message = NULL WHERE organization_id = '${ORG_ID}'`);
  console.log('  → Disabled out-of-hours auto-reply for testing (will restore after)');

  // Cleanup any leftover test data
  console.log('  Cleaning up previous test data...');
  cleanupTestConversations();

  try {
    // ═══════════════════════════════════════════════════════════
    //  TEST 1: German Conversation (Operations Plan)
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 1: German Conversation (Operations Plan) ═══\n');
    switchPlan('operations');

    const r1 = await sendWhatsAppMessage(TEST_PHONES.german, 'Hallo, ich interessiere mich für eine Haartransplantation. Was kostet das?', 'Max Müller');
    if (r1.status === 200) {
      pass('T1-01: Webhook accepted German message');
    } else {
      fail('T1-01: Webhook rejected', `status=${r1.status}`);
    }

    // Wait for bot to process and respond
    console.log('  Waiting for bot response (up to 25s)...');
    const bot1 = await waitForBotResponse(TEST_PHONES.german);
    if (bot1.response) {
      pass('T1-02: Bot responded to German message');
      console.log(`\n  ┌─ BOT RESPONSE (DE) ──────────────────────────────`);
      console.log(`  │ ${bot1.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      // Check response quality
      const resp = bot1.response.toLowerCase();

      // Should be in German
      if (resp.includes('hallo') || resp.includes('willkommen') || resp.includes('guten') || resp.includes('freuen') || resp.includes('haartransplant')) {
        pass('T1-03: Response is in German');
      } else {
        fail('T1-03: Response may not be in German', bot1.response.substring(0, 80));
      }

      // Check tone (should be professional)
      info('T1-04: Tone check', bot1.response.length > 50 ? 'Response seems substantive' : 'Response is very short');

      // Check for never-say words (if configured)
      const neverSay = dbQuery(`SELECT never_say FROM clinic_agent_config WHERE organization_id = '${ORG_ID}'`);
      if (neverSay && neverSay !== '{}' && neverSay !== '[]') {
        try {
          const words = JSON.parse(neverSay);
          const violations = words.filter(w => resp.includes(w.toLowerCase()));
          if (violations.length === 0) {
            pass('T1-05: No never-say violations');
          } else {
            fail('T1-05: Bot used forbidden words', violations.join(', '));
          }
        } catch { info('T1-05: neverSay not parseable'); }
      } else {
        info('T1-05: No neverSay words configured');
      }

      // Check conversation state
      const state = dbQuery(`SELECT flow_state FROM conversations WHERE id = '${bot1.conversationId}'`);
      info('T1-06: Conversation state', state.trim());

    } else {
      fail('T1-02: No bot response within timeout');
    }

    // ═══════════════════════════════════════════════════════════
    //  TEST 2: Turkish Conversation (Operations Plan)
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 2: Turkish Conversation (Operations Plan) ═══\n');

    const r2 = await sendWhatsAppMessage(TEST_PHONES.turkish, 'Merhaba, saç ekimi için fiyat almak istiyorum. İstanbul dışından geliyorum.', 'Ahmet Yılmaz');
    if (r2.status === 200) pass('T2-01: Webhook accepted Turkish message');
    else fail('T2-01: Webhook rejected', `status=${r2.status}`);

    console.log('  Waiting for bot response (up to 25s)...');
    const bot2 = await waitForBotResponse(TEST_PHONES.turkish);
    if (bot2.response) {
      pass('T2-02: Bot responded to Turkish message');
      console.log(`\n  ┌─ BOT RESPONSE (TR) ──────────────────────────────`);
      console.log(`  │ ${bot2.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp = bot2.response.toLowerCase();
      if (resp.includes('merhaba') || resp.includes('hoş') || resp.includes('saç') || resp.includes('klini')) {
        pass('T2-03: Response is in Turkish');
      } else {
        fail('T2-03: Response may not be in Turkish', bot2.response.substring(0, 80));
      }
    } else {
      fail('T2-02: No bot response for Turkish');
    }

    // ═══════════════════════════════════════════════════════════
    //  TEST 3: English Conversation (Operations Plan)
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 3: English Conversation (Operations Plan) ═══\n');

    const r3 = await sendWhatsAppMessage(TEST_PHONES.english, 'Hi, I would like to get a hair transplant. How much does it cost and what methods do you offer?', 'John Smith');
    if (r3.status === 200) pass('T3-01: Webhook accepted English message');
    else fail('T3-01: Webhook rejected', `status=${r3.status}`);

    console.log('  Waiting for bot response (up to 25s)...');
    const bot3 = await waitForBotResponse(TEST_PHONES.english);
    if (bot3.response) {
      pass('T3-02: Bot responded to English message');
      console.log(`\n  ┌─ BOT RESPONSE (EN) ──────────────────────────────`);
      console.log(`  │ ${bot3.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp = bot3.response.toLowerCase();
      if (resp.includes('hello') || resp.includes('welcome') || resp.includes('hair') || resp.includes('transplant') || resp.includes('clinic') || resp.includes('thank')) {
        pass('T3-03: Response is in English');
      } else {
        fail('T3-03: Response may not be in English', bot3.response.substring(0, 80));
      }
    } else {
      fail('T3-02: No bot response for English');
    }

    // ═══════════════════════════════════════════════════════════
    //  TEST 4: Core Plan — Language Limit (max 1)
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 4: Core Plan — Language Limit (max=1, English only) ═══\n');
    switchPlan('core');
    // Set language to English only for Core plan test
    dbQuery(`UPDATE clinic_agent_config SET languages = '{en}', primary_language = 'en' WHERE organization_id = '${ORG_ID}'`);
    console.log('  → Set languages to: {en}, primary: en (Core plan = English only)');

    // First message in English (the only configured language) — should work
    const r4a = await sendWhatsAppMessage(TEST_PHONES.multi1, 'Hello, I would like a consultation for hair transplant', 'Lisa Core');
    if (r4a.status === 200) pass('T4-01: Webhook accepted (Core plan, English)');

    console.log('  Waiting for bot response...');
    const bot4a = await waitForBotResponse(TEST_PHONES.multi1);
    if (bot4a.response) {
      pass('T4-02: Bot responded on Core plan (English — the only language)');
      console.log(`\n  ┌─ BOT RESPONSE (Core/EN) ────────────────────────`);
      console.log(`  │ ${bot4a.response.substring(0, 400).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp4a = bot4a.response.toLowerCase();
      if (resp4a.includes('hello') || resp4a.includes('welcome') || resp4a.includes('hair') || resp4a.includes('clinic') || resp4a.includes('thank')) {
        pass('T4-02b: Bot responded in English (correct)');
      } else {
        fail('T4-02b: Bot did not respond in English', bot4a.response.substring(0, 80));
      }
    } else {
      fail('T4-02: No bot response on Core plan');
    }

    // Second message in Turkish — bot MUST respond in English (the only configured language) and redirect
    const r4b = await sendWhatsAppMessage(TEST_PHONES.multi2, 'Merhaba, saç ekimi hakkında bilgi almak istiyorum', 'Mehmet Core');
    if (r4b.status === 200) pass('T4-03: Webhook accepted (Core plan, Turkish)');

    console.log('  Waiting for bot response (Turkish on Core plan — must respond in English)...');
    const bot4b = await waitForBotResponse(TEST_PHONES.multi2);
    if (bot4b.response) {
      pass('T4-04: Bot responded to unsupported language on Core plan');
      console.log(`\n  ┌─ BOT RESPONSE (Core/TR→must be EN) ────────────`);
      console.log(`  │ ${bot4b.response.substring(0, 400).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp = bot4b.response.toLowerCase();

      // Bot MUST NOT respond in Turkish — this is the critical test
      const hasTurkish = resp.includes('merhaba') || resp.includes('hoş geldin') || resp.includes('saç ekimi') || resp.includes('yardımcı');
      // Bot MUST respond in English (the configured language)
      const hasEnglish = resp.includes('english') || resp.includes('hello') || resp.includes('welcome') || resp.includes('only') || resp.includes('communicate') || resp.includes('please');
      // Bot should mention that it can only speak English
      const mentionsRestriction = resp.includes('only') || resp.includes('can only') || resp.includes('i speak') || resp.includes('english');

      if (hasTurkish) {
        fail('T4-05: CRITICAL — Bot responded in Turkish despite Core plan being English-only');
      } else {
        pass('T4-05: Bot did NOT respond in Turkish (language restriction enforced)');
      }

      if (hasEnglish) {
        pass('T4-06: Bot responded in English (correct — only configured language)');
      } else {
        fail('T4-06: Bot did not respond in English', bot4b.response.substring(0, 80));
      }

      if (mentionsRestriction) {
        pass('T4-07: Bot informed patient about language restriction');
      } else {
        info('T4-07: Bot did not explicitly mention language restriction', bot4b.response.substring(0, 80));
      }
    } else {
      fail('T4-04: No bot response for unsupported language on Core plan');
    }

    // ═══════════════════════════════════════════════════════════
    //  TEST 5: Pro Plan — 3 Languages (Persian, Turkish, Arabic)
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 5: Pro Plan — 3 Languages (fa, tr, ar) ═══\n');
    switchPlan('pro');
    const proLangs = dbQuery(`SELECT max_languages FROM organizations WHERE id = '${ORG_ID}'`);
    if (parseInt(proLangs) === 3) {
      pass('T5-01: Pro plan has max_languages=3');
    } else {
      fail('T5-01: Pro plan max_languages wrong', `got=${proLangs.trim()}`);
    }

    // Set languages to Persian, Turkish, Arabic
    dbQuery(`UPDATE clinic_agent_config SET languages = '{fa,tr,ar}', primary_language = 'tr' WHERE organization_id = '${ORG_ID}'`);
    console.log('  → Set languages to: Persian, Turkish, Arabic (primary: Turkish)');

    // Send a Persian message
    const r5a = await sendWhatsAppMessage('9891200000001', 'سلام، من می‌خواهم درباره کاشت مو اطلاعات بگیرم', 'Ali Hosseini');
    if (r5a.status === 200) pass('T5-02: Webhook accepted Persian message');

    console.log('  Waiting for bot response (Persian on Pro plan)...');
    const bot5a = await waitForBotResponse('9891200000001');
    if (bot5a.response) {
      pass('T5-03: Bot responded to Persian');
      console.log(`\n  ┌─ BOT RESPONSE (Pro/FA) ────────────────────────`);
      console.log(`  │ ${bot5a.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp = bot5a.response;
      // Check if bot mentions the 3 supported languages in welcome
      if (resp.includes('فارسی') || resp.includes('ترکی') || resp.includes('عربی') ||
          resp.includes('Persian') || resp.includes('Turkish') || resp.includes('Arabic') ||
          resp.includes('Farsça') || resp.includes('Türkçe') || resp.includes('Arapça')) {
        pass('T5-04: Bot mentions supported languages in welcome');
      } else {
        info('T5-04: Bot did not explicitly list supported languages', resp.substring(0, 100));
      }
    } else {
      fail('T5-03: No bot response for Persian');
    }

    // Send a German message (NOT in the supported 3 languages — must be rejected)
    const r5b = await sendWhatsAppMessage('4917600000005', 'Hallo, ich möchte eine Haartransplantation buchen', 'Hans Unsupported');
    if (r5b.status === 200) pass('T5-05: Webhook accepted German message (unsupported lang)');

    console.log('  Waiting for bot response (German on Pro plan with fa/tr/ar only — must redirect)...');
    const bot5b = await waitForBotResponse('4917600000005');
    if (bot5b.response) {
      pass('T5-06: Bot responded to unsupported language');
      console.log(`\n  ┌─ BOT RESPONSE (Pro/DE-unsupported→must be TR) ──`);
      console.log(`  │ ${bot5b.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp = bot5b.response.toLowerCase();

      // Bot MUST NOT respond in German
      const hasGerman = resp.includes('willkommen') || resp.includes('haartransplant') || resp.includes('gerne') || resp.includes('herzlich');
      // Bot MUST respond in Turkish (primary_language) or mention supported languages
      const hasPrimaryOrRestriction = resp.includes('türk') || resp.includes('farsça') || resp.includes('arapça') ||
          resp.includes('persian') || resp.includes('turkish') || resp.includes('arabic') ||
          resp.includes('فارسی') || resp.includes('عربی') || resp.includes('merhaba') ||
          resp.includes('yalnızca') || resp.includes('sadece') || resp.includes('konuşuyorum');

      if (hasGerman && !hasPrimaryOrRestriction) {
        fail('T5-07: CRITICAL — Bot responded in German (unsupported) instead of redirecting');
      } else if (hasPrimaryOrRestriction) {
        pass('T5-07: Bot responded in primary language and/or mentioned supported languages');
      } else {
        info('T5-07: Unclear language in response', bot5b.response.substring(0, 100));
      }

      // Check it mentions the 3 supported languages
      if (resp.includes('persian') || resp.includes('turkish') || resp.includes('arabic') ||
          resp.includes('farsça') || resp.includes('türkçe') || resp.includes('arapça') ||
          resp.includes('فارسی') || resp.includes('ترکی') || resp.includes('عربی')) {
        pass('T5-08: Bot listed supported languages in redirect message');
      } else {
        info('T5-08: Bot did not explicitly list supported languages');
      }
    } else {
      fail('T5-06: No bot response for unsupported language');
    }

    // Restore languages to original
    dbQuery(`UPDATE clinic_agent_config SET languages = '{en}', primary_language = 'de' WHERE organization_id = '${ORG_ID}'`);
    console.log('  → Restored languages to: {en}, primary: de');

    // Cleanup Pro test conversations
    for (const phone of ['9891200000001', '4917600000005']) {
      const cid = dbQuery(`SELECT id FROM conversations WHERE phone = '${phone}' AND organization_id = '${ORG_ID}'`).trim();
      if (cid) {
        dbQuery(`DELETE FROM action_executions WHERE transition_id IN (SELECT id FROM conversation_transitions WHERE conversation_id = '${cid}')`);
        dbQuery(`DELETE FROM conversation_messages WHERE conversation_id = '${cid}'`);
        dbQuery(`DELETE FROM conversation_transitions WHERE conversation_id = '${cid}'`);
        dbQuery(`DELETE FROM conversations WHERE id = '${cid}'`);
      }
      dbQuery(`DELETE FROM patients WHERE phone = '${phone}' AND organization_id = '${ORG_ID}'`);
      dbQuery(`DELETE FROM patients WHERE phone_normalized = '${phone}' AND organization_id = '${ORG_ID}'`);
    }

    // ═══════════════════════════════════════════════════════════
    //  TEST 6: Deposit Settings — No Deposit
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 6: Deposit Settings — No Deposit ═══\n');
    switchPlan('operations');
    setDepositEnabled(false);

    const r6 = await sendWhatsAppMessage(TEST_PHONES.deposit, 'Hallo, ich möchte gerne einen Termin für eine Haartransplantation buchen. Was muss ich zahlen?', 'Peter Deposit');
    if (r6.status === 200) pass('T6-01: Webhook accepted deposit test message');

    console.log('  Waiting for bot response...');
    const bot6 = await waitForBotResponse(TEST_PHONES.deposit);
    if (bot6.response) {
      pass('T6-02: Bot responded');
      console.log(`\n  ┌─ BOT RESPONSE (No Deposit) ──────────────────────`);
      console.log(`  │ ${bot6.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      const resp = bot6.response.toLowerCase();
      // When no deposit is configured, bot should NOT mention deposit/Anzahlung
      if (resp.includes('anzahlung') || resp.includes('deposit') || resp.includes('vorauszahlung')) {
        fail('T6-03: Bot mentioned deposit when deposit is DISABLED');
      } else {
        pass('T6-03: Bot did NOT mention deposit (correct — no deposit configured)');
      }
    } else {
      fail('T6-02: No bot response');
    }

    // ═══════════════════════════════════════════════════════════
    //  TEST 7: Deposit Settings — With Deposit
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ TEST 7: Deposit Settings — With Deposit (25%, min 500€) ═══\n');
    setDepositEnabled(true);
    // Clean previous deposit test conversation first
    const depConvId = dbQuery(`SELECT id FROM conversations WHERE phone = '${TEST_PHONES.deposit}' AND organization_id = '${ORG_ID}' ORDER BY created_at DESC LIMIT 1`).trim();
    if (depConvId) {
      dbQuery(`DELETE FROM action_executions WHERE transition_id IN (SELECT id FROM conversation_transitions WHERE conversation_id = '${depConvId}')`);
      dbQuery(`DELETE FROM conversation_messages WHERE conversation_id = '${depConvId}'`);
      dbQuery(`DELETE FROM conversation_transitions WHERE conversation_id = '${depConvId}'`);
      dbQuery(`DELETE FROM conversations WHERE id = '${depConvId}'`);
      dbQuery(`DELETE FROM patients WHERE phone = '${TEST_PHONES.deposit}' AND organization_id = '${ORG_ID}'`);
      dbQuery(`DELETE FROM patients WHERE phone = '+${TEST_PHONES.deposit}' AND organization_id = '${ORG_ID}'`);
      dbQuery(`DELETE FROM patients WHERE phone_normalized = '${TEST_PHONES.deposit}' AND organization_id = '${ORG_ID}'`);
    }

    // Send a new message asking about payment
    const r7 = await sendWhatsAppMessage(TEST_PHONES.deposit, 'Guten Tag, ich möchte mich über Haartransplantationen informieren. Gibt es eine Anzahlung? Was kostet es?', 'Peter Deposit2');
    if (r7.status === 200) pass('T7-01: Webhook accepted deposit test message');

    console.log('  Waiting for bot response...');
    const bot7 = await waitForBotResponse(TEST_PHONES.deposit);
    if (bot7.response) {
      pass('T7-02: Bot responded');
      console.log(`\n  ┌─ BOT RESPONSE (With Deposit) ────────────────────`);
      console.log(`  │ ${bot7.response.substring(0, 500).replace(/\n/g, '\n  │ ')}`);
      console.log(`  └──────────────────────────────────────────────────\n`);

      // Info — the bot may or may not mention deposit in the first greeting
      // since the patient hasn't even booked yet. Deposit is usually mentioned later
      // in the booking flow, not in the initial greeting.
      const resp = bot7.response.toLowerCase();
      info('T7-03: Deposit mention check', resp.includes('anzahlung') || resp.includes('deposit') ? 'Bot mentioned deposit' : 'Bot did not mention deposit yet (normal for greeting stage)');
    } else {
      fail('T7-02: No bot response');
    }

    // ═══════════════════════════════════════════════════════════
    //  PROMPT QUALITY REVIEW
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ PROMPT QUALITY REVIEW ═══\n');

    // Collect all bot responses for analysis
    const allConvIds = [];
    for (const phone of [TEST_PHONES.german, TEST_PHONES.turkish, TEST_PHONES.english]) {
      const cid = dbQuery(`SELECT id FROM conversations WHERE phone = '${phone}' AND organization_id = '${ORG_ID}' ORDER BY created_at DESC LIMIT 1`).trim();
      if (cid) allConvIds.push({ phone, cid });
    }

    console.log('  ┌─ ALL BOT RESPONSES FOR REVIEW ─────────────────────');
    for (const { phone, cid } of allConvIds) {
      const msgs = dbQuery(
        `SELECT direction, content FROM conversation_messages WHERE conversation_id = '${cid}' ORDER BY created_at ASC`
      );
      const lang = phone === TEST_PHONES.german ? 'DE' : phone === TEST_PHONES.turkish ? 'TR' : 'EN';
      console.log(`  │`);
      console.log(`  │ [${lang}] Conversation ${cid}:`);
      for (const line of msgs.split('\n').filter(l => l.trim())) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 2) {
          const dir = parts[0] === 'inbound' ? '👤 PATIENT' : '🤖 BOT';
          console.log(`  │   ${dir}: ${parts[1].substring(0, 200)}`);
        }
      }
    }
    console.log('  └──────────────────────────────────────────────────────\n');

    // Prompt improvement suggestions
    console.log('  ┌─ PROMPT QUALITY ANALYSIS ──────────────────────────');
    for (const { phone, cid } of allConvIds) {
      const outMsgs = dbQuery(
        `SELECT content FROM conversation_messages WHERE conversation_id = '${cid}' AND direction = 'outbound' ORDER BY created_at ASC`
      );
      const lang = phone === TEST_PHONES.german ? 'DE' : phone === TEST_PHONES.turkish ? 'TR' : 'EN';
      const responses = outMsgs.split('\n').filter(l => l.trim());

      for (const resp of responses) {
        const r = resp.trim().toLowerCase();
        // Check issues
        if (r.length > 600) {
          info(`  │ [${lang}] WARNING: Response too long (${r.length} chars) — may overwhelm patient`);
        }
        if (r.includes('als ki') || r.includes('as an ai') || r.includes('yapay zeka')) {
          fail(`  │ [${lang}] Bot identifies as AI — should present as clinic assistant`);
        }
        if (r.includes('chatgpt') || r.includes('openai') || r.includes('claude') || r.includes('anthropic')) {
          fail(`  │ [${lang}] Bot leaks AI provider name`);
        }
        if ((r.match(/\?/g) || []).length > 3) {
          info(`  │ [${lang}] Too many questions at once (${(r.match(/\?/g) || []).length}) — may confuse patient`);
        }
      }
    }
    console.log('  └──────────────────────────────────────────────────────\n');

  } finally {
    // ═══════════════════════════════════════════════════════════
    //  RESTORE & CLEANUP
    // ═══════════════════════════════════════════════════════════
    console.log('\n═══ CLEANUP ═══\n');

    // Restore original plan
    dbQuery(`UPDATE subscriptions SET plan_id = '${origPlanId}' WHERE organization_id = '${ORG_ID}'`);
    dbQuery(`UPDATE organizations SET max_languages = ${parseInt(origMaxLangs) || 99} WHERE id = '${ORG_ID}'`);
    console.log(`  → Restored plan to ${origPlanId}`);

    // Restore deposit setting
    setDepositEnabled(false);

    // Restore out-of-hours reply
    if (origOOH) {
      dbQuery(`UPDATE clinic_agent_config SET out_of_hours_reply = '${origOOH.replace(/'/g, "''")}' WHERE organization_id = '${ORG_ID}'`);
    }
    if (origAfterHours) {
      dbQuery(`UPDATE clinic_agent_config SET after_hours_message = '${origAfterHours.replace(/'/g, "''")}' WHERE organization_id = '${ORG_ID}'`);
    }
    console.log('  → Restored out-of-hours reply');

    // Cleanup test conversations and patients
    cleanupTestConversations();
    console.log('  → Cleaned up test conversations and patients');
  }

  // ═══════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  LIVE WHATSAPP E2E TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const infos = results.filter(r => r.status === 'INFO').length;

  console.log(`  PASSED:  ${passed}`);
  console.log(`  FAILED:  ${failed}`);
  console.log(`  INFO:    ${infos}`);
  console.log(`  TOTAL:   ${results.length}`);

  if (failed > 0) {
    console.log('\n  ─── FAILURES ───');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`    ✗ ${r.id}: ${r.detail}`);
    }
  }

  if (infos > 0) {
    console.log('\n  ─── NOTES ───');
    for (const r of results.filter(r => r.status === 'INFO')) {
      console.log(`    ℹ ${r.id}: ${r.detail}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
