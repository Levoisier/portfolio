import { expect, test } from '@playwright/test';

test('page loads with the profile name and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('requestfailed', (req) => errors.push(`request failed: ${req.url()}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cristian Zapata Cartagena');
  expect(errors).toEqual([]);
});

test('no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(overflow).toBe(false);
});

test('is not installable: no web app manifest, no service worker', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  const workers = await page.evaluate(async () =>
    'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0
  );
  expect(workers).toBe(0);
});
