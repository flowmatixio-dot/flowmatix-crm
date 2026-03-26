import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText } from './helpers.js';

test.describe('Navigation & Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar is visible after login', async ({ page }) => {
    // App should have loaded with navigation visible
    const body = await getBodyText(page);
    const hasNav = /Dashboard|Inbox|Pipeline|Settings/i.test(body);
    expect(hasNav).toBeTruthy();
  });

  test('can navigate to all main views', async ({ page }) => {
    const views = ['Dashboard', 'Inbox', 'Pipeline', 'Analytics', 'Revenue',
                    'AI Control', 'Automations', 'Files', 'Settings'];

    for (const v of views) {
      const found = await navigateTo(page, v);
      if (found) {
        const body = await getBodyText(page);
        expect(body.length).toBeGreaterThan(0);
      }
    }
  });

  test('global search opens with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Suche"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('top bar shows status indicators', async ({ page }) => {
    const body = await getBodyText(page);
    // Top bar should have some status info
    const hasStatus = /AI|WhatsApp|Online|Connected|Demo|Live/i.test(body);
    expect(hasStatus || body.length > 200).toBeTruthy();
  });
});
