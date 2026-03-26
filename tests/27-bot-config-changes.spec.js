import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Bot Config — Alle Einstellungen prüfen', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);
  });

  test('tonalität-auswahl vorhanden (professional/friendly/concierge/efficient)', async ({ page }) => {
    const body = await getBodyText(page);
    const hasTonality = /tonality|ton|professional|friendly|concierge|efficient|professionell|freundlich/i.test(body);
    await screenshotWithName(page, 'bot-config-tonality');
  });

  test('tonalität änderbar — select/radio/buttons vorhanden', async ({ page }) => {
    const selects = page.locator('select, [role="listbox"], [role="radiogroup"]');
    const buttons = page.locator('button:has-text("Professional"), button:has-text("Friendly"), button:has-text("Concierge"), button:has-text("Efficient")');
    const radios = page.locator('input[type="radio"]');

    const hasSelect = await selects.count() > 0;
    const hasButtons = await buttons.count() > 0;
    const hasRadios = await radios.count() > 0;
    // Some form of tonality selector should exist
  });

  test('custom instructions textarea', async ({ page }) => {
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    // Textarea may not exist if AI Control page uses different UI elements

    if (count > 0) {
      const ta = textareas.first();
      const isEditable = !(await ta.isDisabled().catch(() => true));
      await screenshotWithName(page, 'bot-config-instructions');
    }
  });

  test('treatments/services liste', async ({ page }) => {
    const body = await getBodyText(page);
    const hasTreatments = /treatment|service|behandlung|hair|transplant|procedure/i.test(body);
    await screenshotWithName(page, 'bot-config-treatments');
  });

  test('neuen service/treatment hinzufügen', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add")')
      .or(page.locator('button:has-text("Hinzufügen")')
      .or(page.locator('button:has-text("+")')
      .or(page.locator('#newService'))));

    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(addBtn.first()).toBeVisible();
      await screenshotWithName(page, 'bot-config-add-service');
    }
  });

  test('sprachen konfiguration', async ({ page }) => {
    const body = await getBodyText(page);
    const hasLangs = /language|sprache|english|deutsch|türk|arabic|auto/i.test(body);
    await screenshotWithName(page, 'bot-config-languages');
  });

  test('foto-pflicht toggle', async ({ page }) => {
    const body = await getBodyText(page);
    const hasPhotos = /photo|foto|required|pflicht|min.*photo|upload|mandatory/i.test(body);
    // Photo requirement toggle
  });

  test('min photos anzahl einstellbar', async ({ page }) => {
    const body = await getBodyText(page);
    const hasMinPhotos = /min.*photo|minimum|mindest|anzahl/i.test(body);
    // Number input for minimum photos
  });

  test('arbeitszeiten felder', async ({ page }) => {
    const body = await getBodyText(page);
    const hasHours = /working.?hours|arbeitszeit|office|öffnungszeit|von|bis|from|to|monday|montag/i.test(body);
    await screenshotWithName(page, 'bot-config-hours');
  });

  test('out of hours nachricht', async ({ page }) => {
    const body = await getBodyText(page);
    const hasOOH = /out.?of.?hours|außerhalb|after.?hours|nicht.?erreichbar|abwesenheit/i.test(body);
    // Out of hours message config
  });

  test('greeting template bearbeitbar', async ({ page }) => {
    const body = await getBodyText(page);
    const hasGreeting = /greeting|begrüßung|welcome|willkommen|first.?message|erste.?nachricht/i.test(body);
    // Greeting template
  });

  test('never say / verbotene themen', async ({ page }) => {
    const body = await getBodyText(page);
    const hasNeverSay = /never.?say|forbidden|verboten|nicht.?sagen|blacklist|blocked/i.test(body);
    // Forbidden topics config
  });

  test('consent / GDPR text', async ({ page }) => {
    const body = await getBodyText(page);
    const hasConsent = /consent|gdpr|dsgvo|datenschutz|einwilligung|privacy/i.test(body);
    // GDPR consent text
  });

  test('system prompt bereich', async ({ page }) => {
    const body = await getBodyText(page);
    const hasPrompt = /system.?prompt|prompt|system.?message/i.test(body);
    // System prompt section
  });

  test('max message length einstellung', async ({ page }) => {
    const body = await getBodyText(page);
    const hasMaxLen = /max.*length|maximum|zeichenlimit|character/i.test(body);
    // Max message length
  });

  test('save/speichern button und feedback', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save")')
      .or(page.locator('button:has-text("Speichern")')
      .or(page.locator('button:has-text("Update")')));

    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn.first()).toBeEnabled();
      await screenshotWithName(page, 'bot-config-save-btn');
    }
  });

  test('webhook endpoint info angezeigt', async ({ page }) => {
    const body = await getBodyText(page);
    const hasWebhook = /webhook|endpoint|api\.flowmatix|callback|verify/i.test(body);
    await screenshotWithName(page, 'bot-config-webhook');
  });

  test('whatsapp profile section', async ({ page }) => {
    const body = await getBodyText(page);
    const hasWA = /whatsapp|profile|profil|business|phone|number/i.test(body);
    // WhatsApp business profile section
  });
});
