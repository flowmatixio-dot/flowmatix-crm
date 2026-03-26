import { test, expect } from '@playwright/test';
import { login, navigateTo, getBodyText } from './helpers.js';

test.describe('Settings & Views', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('settings view loads', async ({ page }) => {
    await navigateTo(page, 'Settings');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });

  test('AI control view loads', async ({ page }) => {
    await navigateTo(page, 'AI Control');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(100);
  });

  test('automations view loads', async ({ page }) => {
    await navigateTo(page, 'Automations');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });

  test('billing view loads', async ({ page }) => {
    await navigateTo(page, 'Billing');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });

  test('revenue view loads', async ({ page }) => {
    await navigateTo(page, 'Revenue');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });

  test('analytics view loads', async ({ page }) => {
    await navigateTo(page, 'Analytics');
    const body = await getBodyText(page);
    expect(body.length).toBeGreaterThan(50);
  });
});
