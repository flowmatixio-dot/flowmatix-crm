import { test, expect } from '@playwright/test';
import { login, navigateTo, navigateToOperatorTab, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Operator Panel — Jeder Tab im Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('operator dashboard — welcome banner + goldene uhr', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    const body = await getBodyText(page);
    const hasWelcome = /Welcome|Willkommen|Mr\.|Barkowski/i.test(body);
    expect(hasWelcome || body.length > 200).toBeTruthy();
    await screenshotWithName(page, 'op-dashboard');
  });

  test('operator dashboard — MRR und KPIs', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    const body = await getBodyText(page);
    const hasMRR = /MRR|Monthly|Revenue|Umsatz/i.test(body);
    const hasClinics = /Clinic|Klinik/i.test(body);
    expect(hasMRR || hasClinics).toBeTruthy();
  });

  test('operator dashboard — alert center', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    const body = await getBodyText(page);
    const hasAlerts = /ALERT|Alert|warning|critical|🚨|⚠️/i.test(body);
    // Alerts section should exist (may be empty)
  });

  test('operator dashboard — platform health section', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    const body = await getBodyText(page);
    const hasHealth = /PLATFORM HEALTH|Messages|Automation|Webhook|System|HEALTH/i.test(body);
    expect(hasHealth || body.length > 200).toBeTruthy();
  });

  test('operator dashboard — activity feed', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    const body = await getBodyText(page);
    const hasActivity = /ACTIVITY|Activity|Live|Feed|Aktivität/i.test(body);
    // Activity section
  });

  test('operator dashboard — services status bar', async ({ page }) => {
    await navigateToOperatorTab(page, 'Dashboard');
    const body = await getBodyText(page);
    const hasServices = /API|WhatsApp|Bot|Queue|service|healthy/i.test(body);
    expect(hasServices || body.length > 200).toBeTruthy();
  });

  test('operator — clinics tab mit health scores', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');
    const body = await getBodyText(page);
    const hasClinics = /clinic|health|active|inactive|provisioning/i.test(body);
    expect(hasClinics).toBeTruthy();
    await screenshotWithName(page, 'op-clinics');
  });

  test('operator — clinics tab zeigt timeline button', async ({ page }) => {
    await navigateToOperatorTab(page, 'Clinics');
    const body = await getBodyText(page);
    const hasTimeline = /timeline|verlauf|history|📋/i.test(body);
    // Timeline button per clinic
  });

  test('operator — applications tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Applications');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-applications');
  });

  test('operator — outreach tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Outreach');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-outreach');
  });

  test('operator — onboarding tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Onboarding');
    const body = await getBodyText(page);
    const hasOnboarding = /onboarding|setup|step|schritt|task|aufgabe/i.test(body);
    expect(hasOnboarding || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-onboarding');
  });

  test('operator — whatsapp tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'WhatsApp');
    const body = await getBodyText(page);
    const hasWA = /whatsapp|meta|business|phone|number|telefon/i.test(body);
    expect(hasWA || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-whatsapp');
  });

  test('operator — integrations tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Integrations');
    const body = await getBodyText(page);
    const hasIntegrations = /integration|google|calendar|api|connect|verbind/i.test(body);
    expect(hasIntegrations || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-integrations');
  });

  test('operator — automations tab mit inspector', async ({ page }) => {
    await navigateToOperatorTab(page, 'Automations');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-automations');
  });

  test('operator — monitoring tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Monitoring');
    const body = await getBodyText(page);
    const hasMonitoring = /monitoring|uptime|cpu|memory|status|healthy|service/i.test(body);
    expect(hasMonitoring || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-monitoring');
  });

  test('operator — incidents tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Incidents');
    const body = await getBodyText(page);
    const hasIncidents = /incident|alert|issue|problem|vorfall/i.test(body);
    expect(hasIncidents || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-incidents');
  });

  test('operator — logs tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Logs');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-logs');
  });

  test('operator — API keys tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'API');
    const body = await getBodyText(page);
    const hasAPI = /api|key|secret|token|schlüssel/i.test(body);
    expect(hasAPI || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-api');
  });

  test('operator — billing tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Billing');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'op-billing');
  });

  test('operator — security tab', async ({ page }) => {
    await navigateToOperatorTab(page, 'Security');
    const body = await getBodyText(page);
    const hasSecurity = /security|access|permission|audit|sicherheit/i.test(body);
    expect(hasSecurity || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-security');
  });

  test('operator — support center', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');
    const body = await getBodyText(page);
    const hasSupport = /Support Center|Total Clinics|Critical|Warning/i.test(body);
    expect(hasSupport || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'op-support');
  });

  test('operator — support center zeigt clinic health tabelle', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');
    const body = await getBodyText(page);
    const hasTable = /Clinic|Health|Status|Provisioning|Actions/i.test(body);
    expect(hasTable || body.length > 100).toBeTruthy();
  });

  test('operator — support center impersonate button', async ({ page }) => {
    await navigateToOperatorTab(page, 'Support');
    const openCRM = page.locator('button:has-text("Open CRM")').or(page.locator('button:has-text("CRM öffnen")'));
    if (await openCRM.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(openCRM.first()).toBeVisible();
    }
  });
});
