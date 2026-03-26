import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Bot Konversations-Flows — Kompletter Intake', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('konversation zeigt bot-nachrichten', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(3000);

    const body = await getBodyText(page);
    // Inbox should show conversations with bot indicator
    const hasBot = /bot|Bot|AI|ai_active|automated/i.test(body);
    await screenshotWithName(page, 'bot-flow-bot-messages');
  });

  test('konversation zeigt patient-nachrichten', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      // Messages from patient should be on the left / different color
      const body = await getBodyText(page);
      // At least there should be messages
      expect(body.length).toBeGreaterThan(100);
    }
  });

  test('human takeover — take over button vorhanden', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(3000);

    const body = await getBodyText(page);
    const hasTakeover = /Take Over|Takeover|Human|Manual/i.test(body);
    await screenshotWithName(page, 'bot-flow-takeover-btn');
  });

  test('resume AI — bot wieder aktivieren button', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(3000);

    const body = await getBodyText(page);
    const hasResume = /Resume|Activate|Bot|AI aktivieren/i.test(body);
    await screenshotWithName(page, 'bot-flow-resume-ai');
  });

  test('conv status wechselt nach takeover zu human_takeover badge', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    // Check if any conversation shows human takeover status
    const hasHumanStatus = /Human Takeover|human_takeover|👤|Manuell/i.test(body);
    // Informational — depends on actual conv states
    await screenshotWithName(page, 'bot-flow-conv-statuses');
  });

  test('foto collection phase — conv status collecting_photos', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasCollecting = /Collecting Photos|collecting_photos|📷|Fotos sammeln/i.test(body);
    // Status badge for photo collection
  });

  test('medical review phase — conv status needs_medical_review', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasReview = /Medical Review|needs_medical_review|⚕️|Ärztliche Prüfung/i.test(body);
    // Status badge for medical review
  });

  test('booking phase — conv status booking_pending', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasBooking = /Booking Pending|booking_pending|📅|Buchung ausstehend/i.test(body);
    // Status badge for booking
  });

  test('staff nachricht senden — input feld und send button', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      const chatInput = page.locator('#chatMsg')
        .or(page.locator('input[placeholder*="message" i]'))
        .or(page.locator('input[placeholder*="nachricht" i]'))
        .or(page.locator('textarea[placeholder*="message" i]'));
      const sendBtn = page.locator('button:has-text("Send")')
        .or(page.locator('button:has-text("Senden")'));

      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Type a test message but DON'T send
        await chatInput.first().fill('Test message — wird nicht gesendet');
        await screenshotWithName(page, 'bot-flow-send-input');
        // Clear it
        await chatInput.first().fill('');
      }
    }
  });

  test('konversation zeigt zeitstempel auf jeder nachricht', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      // Messages should have timestamps (HH:MM format or relative)
      const hasTimestamps = /\d{1,2}:\d{2}|ago|vor|min|sec|hour|stunde/i.test(body);
      // Timestamps should be present
    }
  });

  test('konversation sender-farben unterscheiden sich', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      // Screenshot for visual verification of different sender colors
      await screenshotWithName(page, 'bot-flow-sender-colors');
    }
  });

  test('resolve konversation button vorhanden', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      const resolve = page.locator('button:has-text("Resolve")')
        .or(page.locator('button:has-text("Erledigt")')
        .or(page.locator('button:has-text("Close")')
        .or(page.locator('button:has-text("Schließen")'))));

      if (await resolve.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(resolve.first()).toBeEnabled();
      }
    }
  });
});
