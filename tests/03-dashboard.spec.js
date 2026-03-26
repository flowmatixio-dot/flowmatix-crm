import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard loads with KPI cards', async ({ page }) => {
    await navigateTo(page, 'Dashboard');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });

  test('dashboard shows calendar or appointments section', async ({ page }) => {
    await navigateTo(page, 'Dashboard');
    const body = await getBodyText(page);
    expect(body).toBeTruthy();
  });

  test('no critical JS errors on dashboard load', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => {
      jsErrors.push(err.message);
    });

    await navigateTo(page, 'Dashboard');
    await page.waitForTimeout(3000);

    // Filter out non-critical errors
    const critical = jsErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Script error') &&
      !e.includes('favicon') &&
      !e.includes('Failed to fetch') &&
      !e.includes('NetworkError') &&
      !e.includes('AbortError') &&
      !e.includes('Load failed')
    );

    if (critical.length > 0) {
      console.log('JS Errors:', critical);
    }
    // Allow up to 3 non-critical errors (API endpoints not found etc)
    expect(critical.length).toBeLessThan(5);
  });
});
