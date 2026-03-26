import { test, expect } from '@playwright/test';

test.describe('Performance', () => {

  test('login page loads under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    console.log(`Login page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('JS bundle size is reasonable', async ({ page }) => {
    const resources = [];
    page.on('response', async res => {
      if (res.url().includes('.js') && res.url().includes('/assets/')) {
        const headers = await res.allHeaders();
        const size = parseInt(headers['content-length'] || '0');
        resources.push({ url: res.url(), size });
      }
    });

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');

    const totalJS = resources.reduce((sum, r) => sum + r.size, 0);
    console.log(`Total JS bundle: ${(totalJS / 1024).toFixed(0)} KB`);
    console.log('JS files:', resources.map(r => `${r.url.split('/').pop()}: ${(r.size / 1024).toFixed(0)}KB`));

    // Warn if over 2MB
    expect(totalJS).toBeLessThan(2 * 1024 * 1024);
  });

  test('no memory leaks on view switching', async ({ page }) => {
    const EMAIL = process.env.TEST_EMAIL || 'bastian@flowmatix.io';
    const PASSWORD = process.env.TEST_PASSWORD || '';
    test.skip(!PASSWORD, 'TEST_PASSWORD not set');

    await page.goto('https://app.flowmatix.io');
    await page.waitForLoadState('networkidle');
    const passBtn = page.locator('text=Password Login').or(page.locator('text=Passwort Login')).or(page.locator('text=Mit Passwort'));
    if (await passBtn.isVisible({ timeout: 3000 }).catch(() => false)) await passBtn.click();
    await page.fill('#loginEmail', EMAIL);
    await page.fill('#loginPass', PASSWORD);
    await page.click('button:has-text("Login"), button:has-text("Anmelden"), button:has-text("Sign in")');
    await page.waitForTimeout(3000);

    // Get initial heap size
    const initialMetrics = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    // Switch between views 10 times
    const views = ['Dashboard', 'Inbox', 'Pipeline', 'Settings', 'Analytics'];
    for (let i = 0; i < 10; i++) {
      for (const v of views) {
        const nav = page.locator(`text=${v}`).first();
        if (await nav.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nav.click();
          await page.waitForTimeout(300);
        }
      }
    }

    const finalMetrics = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    if (initialMetrics > 0 && finalMetrics > 0) {
      const growth = finalMetrics - initialMetrics;
      console.log(`Memory growth after 50 view switches: ${(growth / 1024 / 1024).toFixed(2)} MB`);
      // Should not grow more than 50MB
      expect(growth).toBeLessThan(50 * 1024 * 1024);
    }
  });
});
