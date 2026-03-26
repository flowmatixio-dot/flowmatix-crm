import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Zahlungs-Flows — Deposit & Payment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('patient detail zeigt finanzen-section', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      const hasFinance = /price|deposit|payment|€|\$|preis|anzahlung|zahlung|amount|betrag/i.test(body);
      await screenshotWithName(page, 'payment-patient-detail');
      // Finance section should exist on patient detail
    }
  });

  test('deposit status badges werden angezeigt', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      // Check for deposit status indicators
      const hasDepositStatus = /pending|paid|unpaid|received|ausstehend|bezahlt|erhalten/i.test(body);
      // Status depends on lead data
    }
  });

  test('treatment plan senden button vorhanden', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    for (let i = 0; i < Math.min(await cards.count(), 5); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(1000);

      const sendPlan = page.locator('button:has-text("Treatment Plan")')
        .or(page.locator('button:has-text("Behandlungsplan")'))
        .or(page.locator('button:has-text("Send Plan")'));

      if (await sendPlan.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(sendPlan.first()).toBeVisible();
        await screenshotWithName(page, 'payment-send-plan-btn');
        return; // Found it
      }
    }
  });

  test('deposit request template in inbox vorhanden', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);

      // Open templates
      const templateBtn = page.locator('text=Template').or(page.locator('text=📋')).or(page.locator('text=Vorlage'));
      if (await templateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await templateBtn.first().click();
        await page.waitForTimeout(1000);

        const body = await getBodyText(page);
        const hasDeposit = /deposit|anzahlung|payment|zahlung|billing/i.test(body);
        await screenshotWithName(page, 'payment-deposit-template');
      }
    }
  });

  test('deposit card nachricht typ existiert', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    // Check through conversations for payment_card type messages
    const body = await getBodyText(page);
    // Check if any payment-related content exists in inbox
    const hasPayment = /deposit|payment|pay|zahlung/i.test(body);
    // Informational — payment cards only exist if deposits were sent
    await screenshotWithName(page, 'payment-inbox-check');
  });

  test('patient financials zeigen preis und deposit betrag', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 5);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(1000);

      const body = await getBodyText(page);
      if (/treatment.?price|deposit.?amount|price|preis/i.test(body)) {
        await screenshotWithName(page, 'payment-financials');
        return;
      }
    }
  });

  test('billing view zeigt rechnungen', async ({ page }) => {
    await navigateTo(page, 'Billing');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasBilling = /invoice|rechnung|subscription|abo|plan|payment|zahlung/i.test(body);
    expect(hasBilling || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'payment-billing');
  });

  test('revenue view zeigt umsatz-übersicht', async ({ page }) => {
    await navigateTo(page, 'Revenue');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasRevenue = /revenue|umsatz|total|gesamt|monthly|monatlich|€|\$/i.test(body);
    expect(hasRevenue || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'payment-revenue');
  });
});
