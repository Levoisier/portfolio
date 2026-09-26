import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

test('page loads with the profile name and no console errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cristian Zapata Cartagena');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('no horizontal overflow and the page never scrolls', async ({ page }) => {
  await page.goto('/');
  const [overflow, bodyOverflow] = await page.evaluate(() => [
    document.documentElement.scrollWidth > window.innerWidth,
    getComputedStyle(document.body).overflow,
  ]);
  expect(overflow).toBe(false);
  expect(bodyOverflow).toBe('hidden');
});

test('is not installable: no web app manifest, no service worker', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  const workers = await page.evaluate(async () =>
    'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0
  );
  expect(workers).toBe(0);
});
