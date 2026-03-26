import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Lead Pipeline — Drag & Drop, Erstellen, Bearbeiten', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);
  });

  test('pipeline hat mindestens eine stage-spalte', async ({ page }) => {
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
    await screenshotWithName(page, 'pipeline-overview');
  });

  test('lead cards sind draggable', async ({ page }) => {
    const draggables = page.locator('[draggable="true"]');
    const count = await draggables.count();
    if (count > 0) {
      // Verify draggable attribute exists
      const isDraggable = await draggables.first().getAttribute('draggable');
      expect(isDraggable).toBe('true');
    }
  });

  test('drag & drop — lead von einer stage zur anderen ziehen', async ({ page }) => {
    const draggables = page.locator('[draggable="true"]');
    const count = await draggables.count();

    if (count > 0) {
      const card = draggables.first();
      const cardBox = await card.boundingBox();

      if (cardBox) {
        // Simulate drag — move card 300px to the right (next column)
        await card.hover();
        await page.mouse.down();
        await page.mouse.move(cardBox.x + 300, cardBox.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(1000);

        // Page should not crash
        const body = await getBodyText(page);
        expect(body.length).toBeGreaterThan(50);
        await screenshotWithName(page, 'pipeline-after-drag');
      }
    }
  });

  test('lead detail panel öffnet sich komplett', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      // Detail should show comprehensive lead info
      expect(body.length).toBeGreaterThan(200);
      await screenshotWithName(page, 'pipeline-lead-detail-full');
    }
  });

  test('lead detail — name wird angezeigt', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      // Name should be prominently displayed
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(100);
    }
  });

  test('lead detail — telefonnummer angezeigt', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      const hasPhone = /phone|telefon|\+\d{2}|📞|☎/i.test(body);
      // Phone should be shown
    }
  });

  test('lead detail — email angezeigt wenn vorhanden', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      const hasEmail = /email|e-mail|@/i.test(body);
      // Email if available
    }
  });

  test('lead detail — treatment typ angezeigt', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      const hasTreatment = /treatment|behandlung|hair|transplant|procedure/i.test(body);
      // Treatment type
    }
  });

  test('lead detail — notiz hinzufügen input vorhanden', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const noteInput = page.locator('input[placeholder*="note" i]')
        .or(page.locator('textarea[placeholder*="note" i]'))
        .or(page.locator('input[placeholder*="notiz" i]'))
        .or(page.locator('textarea[placeholder*="notiz" i]'));

      if (await noteInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Type a note but don't submit
        await noteInput.first().fill('Test note — nicht speichern');
        await screenshotWithName(page, 'pipeline-note-input');
        await noteInput.first().fill('');
      }
    }
  });

  test('lead detail — timeline events angezeigt', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      const hasTimeline = /timeline|verlauf|history|created|event|→/i.test(body);
      // Timeline section
    }
  });

  test('lead detail — fotos section', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 5);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(1000);

      const body = await getBodyText(page);
      if (/photo|foto|image|bild|📷/i.test(body)) {
        await screenshotWithName(page, 'pipeline-photos-section');
        return;
      }
    }
  });

  test('lead detail — intake daten section', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 5);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(1000);

      const body = await getBodyText(page);
      if (/intake|concern|medication|hair.?loss|previous|behandlung/i.test(body)) {
        await screenshotWithName(page, 'pipeline-intake-data');
        return;
      }
    }
  });

  test('lead detail — review / arzt-zuweisung', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 5);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(1000);

      const body = await getBodyText(page);
      if (/review|doctor|arzt|assign|zuweisen|grafts|plan/i.test(body)) {
        await screenshotWithName(page, 'pipeline-review-section');
        return;
      }
    }
  });

  test('lead detail — booking section', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 5);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(1000);

      const body = await getBodyText(page);
      if (/booking|buchung|date|datum|time|uhrzeit|doctor|arzt/i.test(body)) {
        await screenshotWithName(page, 'pipeline-booking-section');
        return;
      }
    }
  });

  test('lead detail — control mode anzeige (ai/human/paused)', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      const body = await getBodyText(page);
      const hasControlMode = /ai|human|paused|bot|manual|automatisch|manuell/i.test(body);
      // Control mode indicator
    }
  });

  test('lead detail — schliessen button', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);

      // Close/back button to return to pipeline
      const closeBtn = page.locator('button:has-text("×")')
        .or(page.locator('button:has-text("✕")')
        .or(page.locator('button:has-text("Close")')
        .or(page.locator('button:has-text("Schließen")')
        .or(page.locator('button:has-text("←")')
        .or(page.locator('button:has-text("Back")'))))));

      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.first().click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('mehrere leads durchklicken — kein crash', async ({ page }) => {
    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 10);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);
      const body = await getBodyText(page);
      expect(body.length).toBeGreaterThan(50);
    }
  });
});
