import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText } from './helpers.js';

test.describe('Patients / Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('pipeline view loads', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });

  test('can open patient detail', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(100);
    }
  });

  test('appointments view loads', async ({ page }) => {
    const found = await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine') || await navigateTo(page, 'Calendar');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });
});
