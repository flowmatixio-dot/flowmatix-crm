import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {

  test('API is reachable', async ({ request }) => {
    const res = await request.get('https://api.flowmatix.io/health');
    expect(res.ok() || res.status() === 404).toBeTruthy();
  });

  test('app loads without server errors', async ({ page }) => {
    const responses = [];
    page.on('response', res => {
      if (res.status() >= 500) {
        responses.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');

    // No 5xx errors
    expect(responses).toHaveLength(0);
  });

  test('static assets load correctly', async ({ page }) => {
    const failedAssets = [];
    page.on('response', res => {
      if (res.url().includes('/assets/') && !res.ok()) {
        failedAssets.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');

    expect(failedAssets).toHaveLength(0);
  });

  test('page has no critical JS errors', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => {
      jsErrors.push(err.message);
    });

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Filter out non-critical errors
    const critical = jsErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Script error') &&
      !e.includes('favicon')
    );

    expect(critical).toHaveLength(0);
  });

  test('HTTPS certificate is valid', async ({ page }) => {
    const res = await page.goto('https://app.flowmatix.io');
    expect(res.ok()).toBeTruthy();
    expect(res.url()).toContain('https://');
  });
});
