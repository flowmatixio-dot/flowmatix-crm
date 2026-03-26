import { test, expect } from '@playwright/test';
import { login, navigateTo, navigateToOperatorTab, screenshotWithName } from './helpers.js';

test.describe('Visual Screenshots — Jede Seite dokumentieren', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('screenshot: dashboard', async ({ page }) => {
    await navigateTo(page, 'Dashboard');
    await page.waitForTimeout(3000);
    await screenshotWithName(page, 'visual-dashboard');
  });

  test('screenshot: inbox leer oder mit konversationen', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-inbox');
  });

  test('screenshot: inbox chat offen', async ({ page }) => {
    await navigateTo(page, 'Inbox');
    await page.waitForTimeout(2000);
    const convItems = page.locator('[style*="cursor: pointer"]');
    if (await convItems.count() > 0) {
      await convItems.first().click();
      await page.waitForTimeout(1500);
    }
    await screenshotWithName(page, 'visual-inbox-chat');
  });

  test('screenshot: pipeline', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-pipeline');
  });

  test('screenshot: pipeline lead detail', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);
    }
    await screenshotWithName(page, 'visual-pipeline-detail');
  });

  test('screenshot: appointments', async ({ page }) => {
    await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-appointments');
  });

  test('screenshot: analytics', async ({ page }) => {
    await navigateTo(page, 'Analytics');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-analytics');
  });

  test('screenshot: revenue', async ({ page }) => {
    await navigateTo(page, 'Revenue');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-revenue');
  });

  test('screenshot: ai control', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-ai-control');
  });

  test('screenshot: automations', async ({ page }) => {
    await navigateTo(page, 'Automations');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-automations');
  });

  test('screenshot: files', async ({ page }) => {
    await navigateTo(page, 'Files');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-files');
  });

  test('screenshot: settings', async ({ page }) => {
    await navigateTo(page, 'Settings');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-settings');
  });

  test('screenshot: billing', async ({ page }) => {
    await navigateTo(page, 'Billing');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-billing');
  });

  test('screenshot: operator dashboard', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    await page.waitForTimeout(3000);
    await screenshotWithName(page, 'visual-op-dashboard');
  });

  test('screenshot: operator clinics', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-op-clinics');
  });

  test('screenshot: operator support center', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-op-support');
  });

  test('screenshot: operator monitoring', async ({ page }) => {
    await navigateToOperatorTab(page, 'Monitoring');
    await page.waitForTimeout(2000);
    await screenshotWithName(page, 'visual-op-monitoring');
  });
});
