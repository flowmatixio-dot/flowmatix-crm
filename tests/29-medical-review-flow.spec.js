import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText, screenshotWithName } from './helpers.js';

test.describe('Medical Review Flow — Arzt-Bewertung & Plan', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('patient in needs_medical_review status finden', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const body = await getBodyText(page);
    const hasReview = /Medical Review|review|⚕️|Ärztliche/i.test(body);
    await screenshotWithName(page, 'medical-review-pipeline');
  });

  test('review assign select — arzt zuweisen', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const assignSelect = page.locator('#reviewAssignSelect')
        .or(page.locator('select:near(:text("doctor"))'))
        .or(page.locator('select:near(:text("assign"))'));

      if (await assignSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await screenshotWithName(page, 'medical-review-assign');
        return;
      }
    }
  });

  test('review data — grafts, preis, notizen felder', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const body = await getBodyText(page);
      if (/grafts|price|preis|review|notes|notizen/i.test(body)) {
        await screenshotWithName(page, 'medical-review-data');
        return;
      }
    }
  });

  test('send treatment plan — plan an patient senden', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const sendPlan = page.locator('button:has-text("Treatment Plan")')
        .or(page.locator('button:has-text("Send Plan")')
        .or(page.locator('button:has-text("Behandlungsplan")')));

      if (await sendPlan.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(sendPlan.first()).toBeEnabled();
        await screenshotWithName(page, 'medical-review-send-plan');
        return;
      }
    }
  });

  test('fotos anzeige für review', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const photos = page.locator('img[src*="photo"]')
        .or(page.locator('img[src*="upload"]'))
        .or(page.locator('[style*="background-image"]'));

      if (await photos.count() > 0) {
        await screenshotWithName(page, 'medical-review-photos');
        return;
      }
    }
  });
});

test.describe('Aftercare Flow — Nachsorge', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('aftercare section bei abgeschlossenen patienten', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const body = await getBodyText(page);
      if (/aftercare|nachsorge|post.?op|follow.?up/i.test(body)) {
        await screenshotWithName(page, 'aftercare-section');
        return;
      }
    }
  });

  test('flight/logistik info', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const body = await getBodyText(page);
      if (/flight|flug|airline|arrival|ankunft|driver|fahrer|logistics/i.test(body)) {
        await screenshotWithName(page, 'logistics-section');
        return;
      }
    }
  });

  test('consent status anzeige', async ({ page }) => {
    await navigateTo(page, 'Pipeline');
    await page.waitForTimeout(2000);

    const cards = page.locator('[draggable="true"], [style*="cursor: grab"]');
    const count = Math.min(await cards.count(), 8);

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(800);

      const body = await getBodyText(page);
      if (/consent|einwilligung|gdpr|dsgvo|granted|erteilt/i.test(body)) {
        await screenshotWithName(page, 'consent-status');
        return;
      }
    }
  });
});
