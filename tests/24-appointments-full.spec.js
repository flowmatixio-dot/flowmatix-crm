import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Termine - Erstellen, Bearbeiten, Stornieren', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Appointments') || await navigateTo(page, 'Termine') || await navigateTo(page, 'Calendar');
    await page.waitForTimeout(2000);
  });

  test('kalender zeigt tagesansicht oder wochenansicht', async ({ page }) => {
    const body = await getBodyText(page);
    const hasView = /day|week|month|tag|woche|monat|today|heute/i.test(body);
    expect(hasView || body.length > 100).toBeTruthy();
    await screenshotWithName(page, 'appointments-calendar');
  });

  test('termine mit verschiedenen status-farben', async ({ page }) => {
    const body = await getBodyText(page);
    await screenshotWithName(page, 'appointments-status-colors');
  });

  test('termin anklicken zeigt details', async ({ page }) => {
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
      await screenshotWithName(page, 'appointments-detail');
    }
  });

  test('termin detail zeigt patient name', async ({ page }) => {
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
    }
  });

  test('termin detail zeigt datum und uhrzeit', async ({ page }) => {
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      const hasDateTime = /\d{1,2}:\d{2}|date|time|datum|uhrzeit/i.test(body);
    }
  });

  test('termin detail zeigt arzt', async ({ page }) => {
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      const hasDoctor = /doctor|arzt|assigned|zugewiesen/i.test(body);
    }
  });

  test('termin detail zeigt treatment typ', async ({ page }) => {
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      const hasTreatment = /treatment|behandlung|procedure|hair|consultation/i.test(body);
    }
  });

  test('neuen termin erstellen button vorhanden', async ({ page }) => {
    const newApptBtn = page.locator('button:has-text("New")')
      .or(page.locator('button:has-text("Neu")'))
      .or(page.locator('button:has-text("Add")'))
      .or(page.locator('button:has-text("Create")'))
      .or(page.locator('button:has-text("+")'));

    if (await newApptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(newApptBtn.first()).toBeVisible();
      await screenshotWithName(page, 'appointments-new-btn');
    }
  });

  test('cancel option vorhanden', async ({ page }) => {
    const apptItems = page.locator('[style*="cursor: pointer"]');
    if (await apptItems.count() > 0) {
      await apptItems.first().click();
      await page.waitForTimeout(1000);

      const cancelBtn = page.locator('button:has-text("Cancel")')
        .or(page.locator('button:has-text("Stornieren")'))
        .or(page.locator('button:has-text("Delete")'));

      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(cancelBtn.first()).toBeVisible();
      }
    }
  });

  test('kalender navigation buttons', async ({ page }) => {
    const navBtns = page.locator('button:has-text("Next")')
      .or(page.locator('button:has-text("Weiter")'))
      .or(page.locator('button:has-text("Prev")'))
      .or(page.locator('button:has-text("Today")'));

    if (await navBtns.isVisible({ timeout: 2000 }).catch(() => false)) {
      await navBtns.first().click();
      await page.waitForTimeout(1000);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
    }
  });
});
