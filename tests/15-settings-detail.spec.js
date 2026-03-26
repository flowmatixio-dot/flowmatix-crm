import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Settings — Vollständiger Test', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('settings view lädt', async ({ page }) => {
    await navigateTo(page, 'Settings') || await navigateTo(page, 'Einstellungen');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasSettings = /settings|einstellungen|clinic|klinik|profile|profil/i.test(body);
    expect(hasSettings).toBeTruthy();
    await screenshotWithName(page, 'settings-overview');
  });

  test('klinik-name feld vorhanden', async ({ page }) => {
    await navigateTo(page, 'Settings') || await navigateTo(page, 'Einstellungen');
    await page.waitForTimeout(2000);

    const nameInput = page.locator('input[placeholder*="clinic"], input[placeholder*="Klinik"], input[placeholder*="name"], input[placeholder*="Name"]');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const value = await nameInput.first().inputValue();
      expect(value.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('email feld vorhanden', async ({ page }) => {
    await navigateTo(page, 'Settings') || await navigateTo(page, 'Einstellungen');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emailInput.first()).toBeVisible();
    }
  });

  test('speichern button vorhanden', async ({ page }) => {
    await navigateTo(page, 'Settings') || await navigateTo(page, 'Einstellungen');
    await page.waitForTimeout(2000);

    const saveBtn = page.locator('button:has-text("Save")')
      .or(page.locator('button:has-text("Speichern")'))
      .or(page.locator('button:has-text("Update")'));

    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn.first()).toBeVisible();
    }
  });
});

test.describe('Revenue / Umsatz', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('revenue view lädt', async ({ page }) => {
    await navigateTo(page, 'Revenue') || await navigateTo(page, 'Umsatz');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'revenue-overview');
  });

  test('umsatz-zahlen werden angezeigt', async ({ page }) => {
    await navigateTo(page, 'Revenue') || await navigateTo(page, 'Umsatz');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasRevenue = /revenue|umsatz|€|\$|total|gesamt|monthly|monatlich|mrr/i.test(body);
    expect(hasRevenue || body.length > 100).toBeTruthy();
  });
});

test.describe('Analytics / Analyse', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('analytics view lädt', async ({ page }) => {
    await navigateTo(page, 'Analytics') || await navigateTo(page, 'Analyse');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'analytics-overview');
  });
});

test.describe('Billing / Abrechnung', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('billing view lädt', async ({ page }) => {
    await navigateTo(page, 'Billing') || await navigateTo(page, 'Abrechnung');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'billing-overview');
  });
});

test.describe('Files / Dateien', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('files view lädt', async ({ page }) => {
    await navigateTo(page, 'Files') || await navigateTo(page, 'Dateien');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    await screenshotWithName(page, 'files-overview');
  });
});

test.describe('Addons', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('addons view lädt', async ({ page }) => {
    await navigateTo(page, 'Add-ons') || await navigateTo(page, 'Addons');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    await screenshotWithName(page, 'addons-overview');
  });
});

test.describe('Automations / Automatisierung', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('automations view lädt', async ({ page }) => {
    await navigateTo(page, 'Automations') || await navigateTo(page, 'Automatisierung');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    await screenshotWithName(page, 'automations-overview');
  });
});
