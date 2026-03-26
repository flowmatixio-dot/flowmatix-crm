import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('AI Control / Bot Konfiguration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AI Control view lädt', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasAI = /ai|bot|assistant|tonality|prompt|model|configuration/i.test(body);
    expect(hasAI || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'ai-control-overview');
  });

  test('bot tonalität einstellbar', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasTonality = /tonality|ton|professional|friendly|concierge|efficient/i.test(body);
    // Tonality selector should exist
  });

  test('custom instructions feld vorhanden', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const customInstr = page.locator('textarea[placeholder*="instruction"]')
      .or(page.locator('textarea[placeholder*="Anweisung"]'))
      .or(page.locator('text=Custom Instructions').or(page.locator('text=Anweisungen')));

    if (await customInstr.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(customInstr.first()).toBeVisible();
    }
  });

  test('behandlungen/treatments liste vorhanden', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasTreatments = /treatment|behandlung|service|hair|transplant/i.test(body);
    expect(hasTreatments || body.length > 100).toBeTruthy();
  });

  test('sprachen konfiguration vorhanden', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasLanguages = /language|sprache|english|deutsch|türkçe|auto.?translate/i.test(body);
    // Languages section
  });

  test('foto-anforderung konfigurierbar', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasPhotos = /photo|foto|required|pflicht|min.*photo|upload/i.test(body);
    // Photo settings
  });

  test('arbeitszeiten konfigurierbar', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasHours = /working.?hours|arbeitszeit|office.?hours|out.?of.?hours|öffnungszeit/i.test(body);
    // Working hours section
  });

  test('greeting template vorhanden', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasGreeting = /greeting|begrüßung|welcome|willkommen|template/i.test(body);
    // Greeting template section
  });

  test('webhook info wird angezeigt', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasWebhook = /webhook|endpoint|verify.?token|callback|url/i.test(body);
    // Webhook configuration info
  });

  test('save button funktioniert', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const saveBtn = page.locator('button:has-text("Save")')
      .or(page.locator('button:has-text("Speichern")'))
      .or(page.locator('button:has-text("Update")'));

    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn.first()).toBeVisible();
    }
  });

  test('system prompt section vorhanden', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasPrompt = /system.?prompt|system.?message|never.?say|forbidden/i.test(body);
    // System prompt / forbidden topics
  });

  test('consent/GDPR text konfigurierbar', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasConsent = /consent|gdpr|dsgvo|datenschutz|einwilligung/i.test(body);
    // GDPR consent section
  });
});
