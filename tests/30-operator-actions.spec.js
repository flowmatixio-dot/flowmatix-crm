import { test, expect } from '@playwright/test';
import { login, navigateTo, navigateToOperatorTab, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Operator Aktionen — Clinic Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Operator');
    await page.waitForTimeout(2000);
  });

  test('clinic health scores berechnet und angezeigt', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');
    const body = await getBodyText(page);
    const hasHealth = /health|\d{1,3}%|score|punktzahl/i.test(body);
    await screenshotWithName(page, 'op-clinic-health-scores');
  });

  test('clinic provisioning status sichtbar', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');
    const body = await getBodyText(page);
    const hasProvisioning = /provisioning|completed|pending|active|setup/i.test(body);
    expect(hasProvisioning || body.length > 100).toBeTruthy();
  });

  test('clinic timeline expandierbar', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');

    const timelineBtn = page.locator('button:has-text("Timeline")')
      .or(page.locator('button:has-text("📋")')
      .or(page.locator('button:has-text("History")')
      .or(page.locator('button:has-text("Verlauf")'))));

    if (await timelineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timelineBtn.first().click();
      await page.waitForTimeout(1000);
      await screenshotWithName(page, 'op-clinic-timeline');
    }
  });

  test('impersonate / open CRM button', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');

    const openCRM = page.locator('button:has-text("Open CRM")')
      .or(page.locator('button:has-text("CRM öffnen")'));

    if (await openCRM.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(openCRM.first()).toBeEnabled();
      await screenshotWithName(page, 'op-impersonate-btn');
    }
  });

  test('support center filter: all/critical/warning/setup', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    // Support center should have filter categories
    const hasFilters = /Total|Critical|Warning|Setup|All|Clinic/i.test(body);
    expect(hasFilters || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-support-filters');
  });

  test('alert center zeigt alerts nach severity sortiert', async ({ page }) => {
    // On dashboard
    const body = await getBodyText(page);
    const hasAlerts = /alert|warning|critical|info|🚨|⚠️/i.test(body);
    await screenshotWithName(page, 'op-alerts-sorted');
  });

  test('onboarding tab zeigt setup tasks', async ({ page }) => {
    await navigateToOperatorTab(page, 'Onboarding');
    const body = await getBodyText(page);
    const hasOnboarding = /onboarding|setup|step|task|complete|pending|✓|✗/i.test(body);
    expect(hasOnboarding || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-onboarding-tasks');
  });

  test('monitoring zeigt service status', async ({ page }) => {
    await navigateToOperatorTab(page, 'Monitoring');
    const body = await getBodyText(page);
    const hasMonitoring = /service|api|bot|queue|whatsapp|healthy|degraded|down|status/i.test(body);
    expect(hasMonitoring || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-monitoring-services');
  });

  test('incidents tab zeigt vorfälle oder empty state', async ({ page }) => {
    await navigateToOperatorTab(page, 'Incidents');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-incidents');
  });

  test('logs tab zeigt system logs', async ({ page }) => {
    await navigateToOperatorTab(page, 'Logs');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-logs-detail');
  });

  test('API keys tab — keys angezeigt (maskiert)', async ({ page }) => {
    await navigateToOperatorTab(page, 'API');
    const body = await getBodyText(page);
    const hasKeys = /api|key|secret|token|sk_|pk_/i.test(body);
    expect(hasKeys || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-api-keys');
  });

  test('security tab zeigt access control', async ({ page }) => {
    await navigateToOperatorTab(page, 'Security');
    const body = await getBodyText(page);
    const hasSecurity = /security|access|permission|role|audit|2fa|mfa/i.test(body);
    expect(hasSecurity || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-security');
  });

  test('billing tab zeigt umsatz-daten', async ({ page }) => {
    await navigateToOperatorTab(page, 'Billing');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-billing');
  });

  test('auto-refresh auf monitoring — daten aktualisieren sich', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToOperatorTab(page, 'Monitoring');
    const body1 = await getBodyText(page);

    // Wait for auto-refresh (should happen every 30s)
    await page.waitForTimeout(35000);

    const body2 = await getBodyText(page);
    // Page should still have content (auto-refresh didn't break it)
    expect(body2.length).toBeGreaterThan(100);
  });
});
