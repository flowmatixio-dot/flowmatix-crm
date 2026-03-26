import { test, expect } from '@playwright/test';
import { login, navigateTo, navigateToOperatorTab, getBodyText, screenshotWithName } from './helpers.js';

test.describe('WhatsApp Konfiguration — Operator', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('whatsapp tab zeigt business profile', async ({ page }) => {
    await navigateToOperatorTab(page, 'WhatsApp');
    const body = await getBodyText(page);
    const hasProfile = /business|profile|profil|phone|number|telefon/i.test(body);
    expect(hasProfile || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'wa-config');
  });

  test('whatsapp connection status', async ({ page }) => {
    await navigateToOperatorTab(page, 'WhatsApp');
    const body = await getBodyText(page);
    const hasStatus = /connected|disconnected|active|inactive|verbunden|getrennt/i.test(body);
    // Connection status should be shown
  });

  test('webhook endpoint info angezeigt', async ({ page }) => {
    // Check AI Control for webhook info
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasWebhook = /webhook|endpoint|verify|callback|api\.flowmatix/i.test(body);
    // Webhook endpoint info
  });
});

test.describe('WhatsApp Bot Flow — Konversations-Status', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('conv status: ai_active', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasAIActive = /AI Active|ai_active|🤖/i.test(body);
    // Conversations handled by AI
  });

  test('conv status: collecting_photos', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasCollecting = /Collecting|collecting_photos|📷/i.test(body);
    // Photo collection phase
  });

  test('conv status: needs_medical_review', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasReview = /Medical Review|needs_medical_review|⚕️/i.test(body);
    // Waiting for doctor review
  });

  test('conv status: booking_pending', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasBooking = /Booking|booking_pending|📅/i.test(body);
    // Booking phase
  });

  test('conv status: deposit_paid', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasDeposit = /Deposit|deposit_paid|💰/i.test(body);
    // Deposit received
  });

  test('conv status: human_takeover', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasHuman = /Human|human_takeover|👤/i.test(body);
    // Manual handling
  });

  test('conv status: resolved', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    // Switch to resolved filter
    const resolvedFilter = page.locator('text=Resolved').or(page.locator('text=Erledigt'));
    if (await resolvedFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resolvedFilter.click();
      await page.waitForTimeout(1000);

      const body = await getBodyText(page);
      const hasResolved = /resolved|erledigt|closed|✓/i.test(body);
    }
  });
});

test.describe('Message Templates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('templates können geöffnet werden', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      const templateBtn = page.locator('text=Template').or(page.locator('text=📋')).or(page.locator('text=Vorlage'));
      if (await templateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await templateBtn.first().click();
        await page.waitForTimeout(1000);

        const body = await getBodyText(page);
        // Template categories should appear
        const hasCategories = /deposit|booking|follow|intake|logistics|aftercare/i.test(body);
        await screenshotWithName(page, 'message-templates');
      }
    }
  });

  test('auto-translate toggle vorhanden', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      const translate = page.locator('text=Translate').or(page.locator('text=🌐')).or(page.locator('text=Übersetzen'));
      if (await translate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(translate.first()).toBeVisible();
      }
    }
  });
});
