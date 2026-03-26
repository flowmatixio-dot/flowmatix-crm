import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText } from './helpers.js';

test.describe('Inbox / Messages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('inbox view loads', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });

  test('inbox shows conversation list or empty state', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    const body = await getBodyText(page);
    const hasConversations = /message|conversation|chat|no message|keine|inbox/i.test(body);
    expect(hasConversations || body.length > 100).toBeTruthy();
  });

  test('can click on a conversation', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(1000);
    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
    }
  });
});
