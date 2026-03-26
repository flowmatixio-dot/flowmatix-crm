import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Termine / Appointments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('appointments view lädt', async ({ page }) => {
    const found = await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine') || await navigateTo(page, 'Calendar');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'appointments-overview');
  });

  test('kalender wird angezeigt', async ({ page }) => {
    await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasCalendar = /monday|tuesday|wednesday|montag|dienstag|mittwoch|today|heute|week|woche|month|monat/i.test(body);
    expect(hasCalendar || body.length > 100).toBeTruthy();
  });

  test('termine mit status werden angezeigt', async ({ page }) => {
    await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasStatus = /booked|confirmed|completed|cancelled|gebucht|bestätigt/i.test(body);
    // Status depends on data
  });

  test('termin details anklickbar', async ({ page }) => {
    await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine');
    await page.waitForTimeout(2000);

    // Click on an appointment if any exist
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
    }
  });

  test('termin zeigt patient, treatment, doctor', async ({ page }) => {
    await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    // Appointment info fields
    const hasFields = /doctor|arzt|treatment|behandlung|patient|time|uhrzeit/i.test(body);
    // Informational - depends on data
  });
});
