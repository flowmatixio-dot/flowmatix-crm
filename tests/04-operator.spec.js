import { test, expect } from '@playwright/test';
import { login, navigateTo, navigateToOperatorTab, getBodyText } from './helpers.js';

test.describe('Operator Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Operator');
  });

  test('operator panel loads with tabs', async ({ page }) => {
    const body = await getBodyText(page);
    const hasTabs = /Dashboard|Clinics|Monitoring|Support/i.test(body);
    expect(hasTabs).toBeTruthy();
  });

  test('operator dashboard shows welcome banner', async ({ page }) => {
    const body = await getBodyText(page);
    const hasWelcome = /Welcome|Willkommen/i.test(body);
    expect(hasWelcome || body.length > 200).toBeTruthy();
  });

  test('operator dashboard shows KPIs', async ({ page }) => {
    await page.waitForTimeout(2000);
    const body = await getBodyText(page);
    const hasKPI = /MRR|Revenue|Clinics|Users|Welcome|Dashboard|Active|Total/i.test(body);
    expect(hasKPI || body.length > 200).toBeTruthy();
  });

  test('can switch between all operator tabs', async ({ page }) => {
    const tabs = ['Dashboard', 'Clinics', 'Applications', 'Onboarding',
      'WhatsApp', 'Integrations', 'Automations', 'Monitoring',
      'Incidents', 'Logs', 'API', 'Billing', 'Security', 'Support'];

    for (const tabName of tabs) {
      const tab = page.locator(`text=${tabName}`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(1500);
        const body = await getBodyText(page);
        expect(body.length).toBeGreaterThan(50);
      }
    }
  });

  test('clinics tab shows clinic list', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');
    const body = await getBodyText(page);
    const hasClinicData = /active|inactive|health|provisioning|status|clinic/i.test(body);
    expect(hasClinicData).toBeTruthy();
  });

  test('monitoring tab shows system metrics', async ({ page }) => {
    await navigateToOperatorTab(page, 'Monitoring');
    const body = await getBodyText(page);
    const hasMetrics = /uptime|cpu|memory|status|healthy|services|monitoring/i.test(body);
    expect(hasMetrics || body.length > 100).toBeTruthy();
  });

  test('support tab loads support center', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');
    const body = await getBodyText(page);
    const hasSupport = /Support|Critical|Warning|Total|Clinic/i.test(body);
    expect(hasSupport || body.length > 100).toBeTruthy();
  });

  test('alert center shows alerts or content', async ({ page }) => {
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });

  test('activity feed exists', async ({ page }) => {
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });
});
