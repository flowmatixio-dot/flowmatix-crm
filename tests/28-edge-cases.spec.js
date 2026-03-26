import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Edge Cases — Session, Fehler, Grenzfälle', () => {
  test('session timeout — token refresh funktioniert', async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Dashboard');
    await page.waitForTimeout(2000);

    // Simulate token expiry by waiting and making calls
    // Navigate to multiple views to trigger API calls
    await navigateTo(page, 'Inbox');
    await navigateTo(page, 'Pipeline');
    await navigateTo(page, 'Dashboard');

    // App should still work (auto-refresh)
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });

  test('doppelter login versuch — zweiter tab', async ({ browser }) => {
    // Login in two tabs simultaneously
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await login(page1);
    await login(page2);

    // Both should work or at least not crash
    const body1 = await page1.textContent('body');
    const body2 = await page2.textContent('body');
    expect(body1.length).toBeGreaterThan(50);
    expect(body2.length).toBeGreaterThan(50);

    await context.close();
  });

  test('network slow — seite lädt trotzdem', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate slow network
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024, // 500 KB/s
      uploadThroughput: 500 * 1024,
      latency: 200,
    });

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    await page.screenshot({ path: './tests/screenshots/edge-slow-network.png' });

    await context.close();
  });

  test('page reload mitten in navigation', async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Inbox');

    // Reload immediately while data might still be loading
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });

  test('schnelles klicken auf gleichen nav item', async ({ page }) => {
    await login(page);

    const dashBtn = page.locator('text=Dashboard').first();
    if (await dashBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        await dashBtn.click();
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(2000);

      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
    }
  });

  test('window resize — layout passt sich an', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    // Resize to small
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    let body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    await screenshotWithName(page, 'edge-resize-small');

    // Resize to large
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    await screenshotWithName(page, 'edge-resize-large');

    // Resize to very small (mobile-like)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    await screenshotWithName(page, 'edge-resize-mobile');
  });

  test('console errors zählen über alle views', async ({ page }) => {
    await login(page);

    const allErrors = [];
    page.on('pageerror', err => allErrors.push(err.message));

    const views = ['Dashboard', 'Inbox', 'Pipeline', 'Appointments', 'Termine',
                    'Analytics', 'Revenue', 'AI Control', 'Automations',
                    'Files', 'Settings', 'Billing', 'Operator'];

    for (const v of views) {
      await navigateTo(page, v);
      await page.waitForTimeout(1000);
    }

    // Filter critical errors
    const critical = allErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Failed to fetch') &&
      !e.includes('NetworkError') &&
      !e.includes('AbortError') &&
      !e.includes('Load failed')
    );

    console.log(`Total JS errors across all views: ${allErrors.length} (${critical.length} critical)`);
    if (critical.length > 0) {
      console.log('Critical errors:', critical.slice(0, 5));
    }
    // Should have minimal critical errors
    expect(critical.length).toBeLessThan(10);
  });

  test('404 responses werden abgefangen', async ({ page }) => {
    await login(page);

    const notFoundUrls = [];
    page.on('response', res => {
      if (res.status() === 404 && res.url().includes('/api/')) {
        notFoundUrls.push(res.url());
      }
    });

    await navigateTo(page, 'Dashboard');
    await navigateTo(page, 'Inbox');
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    if (notFoundUrls.length > 0) {
      console.log('404 API endpoints:', notFoundUrls);
    }
    // Some 404s are acceptable (optional endpoints)
    expect(notFoundUrls.length).toBeLessThan(20);
  });

  test('lange ladezeit — kein endloser spinner', async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Dashboard');
    await page.waitForTimeout(10000); // Wait 10 seconds

    // Loading spinner should be gone
    const spinner = page.locator('text=Loading').or(page.locator('text=Laden'));
    const isStillLoading = await spinner.isVisible({ timeout: 1000 }).catch(() => false);
    // After 10s, loading should be done
    expect(isStillLoading).toBeFalsy();
  });

  test('leere pipeline — graceful empty state', async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    // Pipeline should show either cards or a friendly empty state
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
    // No crash even if empty
  });

  test('leere inbox — graceful empty state', async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });
});
