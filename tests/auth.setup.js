/**
 * Auth helper — logs in and saves session state for reuse across tests.
 */
import { test as setup, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'bastian@flowmatix.io';
const PASSWORD = process.env.TEST_PASSWORD || '';

setup('authenticate', async ({ page }) => {
  if (!PASSWORD) throw new Error('Set TEST_PASSWORD env var to run tests');

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Switch to password mode if needed
  const passBtn = page.locator('text=Password Login').or(page.locator('text=Passwort Login')).or(page.locator('text=Mit Passwort'));
  if (await passBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passBtn.click();
  }

  // Fill credentials
  await page.fill('#loginEmail', EMAIL);
  await page.fill('#loginPass', PASSWORD);
  await page.click('button:has-text("Login"), button:has-text("Anmelden"), button:has-text("Sign in")');

  // Wait for dashboard to load (sidebar or main content)
  await expect(page.locator('[data-view="dashboard"], text=Dashboard, text=Welcome')).toBeVisible({ timeout: 15000 });

  // Save auth state
  await page.context().storageState({ path: './tests/.auth/state.json' });
});
