/**
 * Shared test helpers — login, navigation, selectors
 */

export const CREDS = {
  email: process.env.TEST_EMAIL || 'gulsen.ozkosma@gmail.com',
  password: process.env.TEST_PASSWORD || 'Flowmatix2025',
};

export async function login(page, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Use flexible selectors
    const emailInput = page.locator('#loginEmail')
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[placeholder*="@"]'))
      .or(page.locator('input[placeholder*="email" i]'));
    const passInput = page.locator('#loginPass')
      .or(page.locator('input[type="password"]'));
    const submitBtn = page.locator('button:has-text("Sign In")')
      .or(page.locator('button:has-text("Login")'))
      .or(page.locator('button:has-text("Anmelden")'));

    await emailInput.first().fill(CREDS.email);
    await passInput.first().fill(CREDS.password);
    await submitBtn.first().click();

    // Wait for app to load
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    // Check if we're still on login page (failed login)
    const body = await page.textContent('body');
    const loginFailed = /Invalid credentials|invalid|Sign In →/i.test(body) &&
                        !/Dashboard|Inbox|Pipeline|Welcome back, /i.test(body);

    if (!loginFailed) return; // Success

    // Wait before retry to avoid rate limiting
    if (attempt < retries) {
      await page.waitForTimeout(3000 * attempt);
    }
  }
}

export async function navigateTo(page, viewName) {
  const nav = page.locator(`text=${viewName}`).first();
  if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nav.click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

export async function navigateToOperatorTab(page, tabName) {
  await navigateTo(page, 'Operator');
  await page.waitForTimeout(1000);
  const tab = page.locator(`text=${tabName}`).first();
  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

export async function getBodyText(page) {
  return page.textContent('body');
}

export async function screenshotWithName(page, name) {
  await page.screenshot({ path: `./tests/screenshots/${name}.png`, fullPage: true });
}
