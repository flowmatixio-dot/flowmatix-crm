import { test, expect } from '@playwright/test';

test.describe('Responsive / Mobile', () => {

  test('loads on iPhone viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');

    // Should load without crash
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);

    // Take screenshot for visual inspection
    await page.screenshot({ path: './tests/screenshots/mobile-login.png', fullPage: true });
    await context.close();
  });

  test('loads on iPad viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 1366 },
    });
    const page = await context.newPage();

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: './tests/screenshots/tablet-login.png', fullPage: true });
    await context.close();
  });

  test('loads on wide screen', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 2560, height: 1440 },
    });
    const page = await context.newPage();

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);

    await page.screenshot({ path: './tests/screenshots/widescreen-login.png', fullPage: true });
    await context.close();
  });
});
