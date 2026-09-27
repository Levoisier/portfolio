import { expect, test } from '@playwright/test';
import { waitForGame } from './helpers';

/** Phase 3 — Panda controller (BACKLOG.md). Runs on desktop + mobile; the no-assets projects
 * only run smoke/shell (playwright.config.ts `testMatch`). */

test('ArrowRight walks right, ArrowLeft walks left, and flips to face it', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__PORTFOLIO__!.getState().player?.flipX)).toBe(false);
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('ArrowLeft');
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBeLessThan(0);
  expect(await page.evaluate(() => window.__PORTFOLIO__!.getState().player?.flipX)).toBe(true);
  await page.keyboard.up('ArrowLeft');
});

test('Space leaves the ground and returns', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.keyboard.down('Space');
  await page.waitForFunction(
    () => window.__PORTFOLIO__!.getState().player?.grounded === false,
    undefined,
    { polling: 'raf', timeout: 2000 }
  );
  await page.keyboard.up('Space');
  await page.waitForFunction(
    () => window.__PORTFOLIO__!.getState().player?.grounded === true,
    undefined,
    { polling: 'raf', timeout: 2000 }
  );
});

test('wheel over the canvas walks the panda', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const before = (await page.evaluate(() => window.__PORTFOLIO__!.getState().player?.x)) ?? 0;

  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);

  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player?.x)) ?? 0)
    .toBeGreaterThan(before);
});

test('a focused DOM button still activates with Enter and Space (keys are not captured)', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'e2e-focus-target';
    button.textContent = 'focus target';
    button.dataset.clicks = '0';
    button.addEventListener('click', () => {
      button.dataset.clicks = String(Number(button.dataset.clicks) + 1);
    });
    document.getElementById('hud')?.append(button);
    button.focus();
  });

  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');

  await expect(page.locator('#e2e-focus-target')).toHaveAttribute('data-clicks', '2');
});

test('an open modal blocks ArrowRight; closing it restores movement', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.evaluate(() => window.__PORTFOLIO__!.emit('ui:modal', { open: true }));
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__PORTFOLIO__!.getState().player?.vx)).toBe(0);
  await page.keyboard.up('ArrowRight');

  await page.evaluate(() => window.__PORTFOLIO__!.emit('ui:modal', { open: false }));
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBeGreaterThan(0);
  await page.keyboard.up('ArrowRight');
});

test('the land frame shows after a jump', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.keyboard.down('Space');
  await page.waitForFunction(
    () => window.__PORTFOLIO__!.getState().player?.grounded === false,
    undefined,
    { polling: 'raf', timeout: 2000 }
  );
  await page.waitForFunction(
    () => {
      const p = window.__PORTFOLIO__!.getState().player;
      return p?.state === 'land' || p?.frame === 'land';
    },
    undefined,
    { polling: 'raf', timeout: 3000 }
  );
  await page.keyboard.up('Space');
});
