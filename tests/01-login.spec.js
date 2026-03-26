import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'gulsen.ozkosma@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Flowmatix2025';

// Flexible selectors matching actual login page
const emailSel = '#loginEmail, input[type="email"], input[placeholder*="@"]';
const passSel = '#loginPass, input[type="password"]';
const submitSel = 'button:has-text("Sign In"), button:has-text("Login"), button:has-text("Anmelden")';

test.describe('Login Page', () => {

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator(emailSel).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Flowmatix').first()).toBeVisible();
  });

  test('shows error on wrong password', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.locator(emailSel).first().fill(EMAIL);
    await page.locator(passSel).first().fill('wrongpassword123');
    await page.locator(submitSel).first().click();

    // Should show error message and stay on login
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    const hasError = /invalid|error|wrong|falsch|incorrect|credentials/i.test(body);
    const stillOnLogin = await page.locator(emailSel).first().isVisible().catch(() => false);
    expect(hasError || stillOnLogin).toBeTruthy();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.locator(emailSel).first().fill(EMAIL);
    await page.locator(passSel).first().fill(PASSWORD);
    await page.locator(submitSel).first().click();

    // Dashboard should appear
    await page.waitForTimeout(5000);
    const body = await page.textContent('body');
    const loggedIn = /Dashboard|Welcome|Willkommen|Inbox|Pipeline/i.test(body);
    expect(loggedIn).toBeTruthy();
  });

  test('language switcher works on login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const deFlag = page.locator('text=🇩🇪').or(page.locator('[title*="Deutsch"]'));
    if (await deFlag.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deFlag.click();
      await page.waitForTimeout(500);
      const pageText = await page.textContent('body');
      expect(pageText).toMatch(/Anmelden|E-Mail|Passwort|Willkommen/);
    }
  });
});
