import { expect, test } from '@playwright/test';
import { WORLD_LAYOUT } from '../../src/game/world/layout';
import { waitForGame } from './helpers';

/** Phase 6 — Mobile: handheld mode & touch (BACKLOG.md). The pad only renders under
 * `(pointer: coarse)` (ARCHITECTURE.md → Layout modes), so every test here is touch-only; the
 * `mobile` project already emulates it (`isMobile`/`hasTouch` — playwright.config.ts). */

test.skip(({ isMobile }) => !isMobile, 'the pad only renders on a coarse (touch) pointer');

const fioraX = WORLD_LAYOUT.stations.find((s) => s.id === 'fiora')!.x;

/** The centre of a locator's box, for a `page.mouse` press/release on it — a real pointerdown/up
 * with an active pointer id, unlike a dispatched synthetic event (`el.setPointerCapture` would
 * throw on those). */
async function centerOf(locator: import('@playwright/test').Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('locator has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('the pad is visible in portrait (handheld)', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await expect(page.locator('#pad')).toBeVisible();
  expect(await page.evaluate(() => window.__PORTFOLIO__!.getState().mode)).toBe('handheld');
});

test('holding ▶ walks the panda right and releasing it stops', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const { x, y } = await centerOf(page.locator('[data-pad-btn="right"]'));

  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBeGreaterThan(0);
  await page.mouse.up();
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBe(0);
});

test('A jumps', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const { x, y } = await centerOf(page.locator('[data-pad-btn="a"]'));

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForFunction(
    () => window.__PORTFOLIO__!.getState().player?.grounded === false,
    undefined,
    { polling: 'raf', timeout: 2000 }
  );
  await page.mouse.up();
  await page.waitForFunction(
    () => window.__PORTFOLIO__!.getState().player?.grounded === true,
    undefined,
    { polling: 'raf', timeout: 2000 }
  );
});

test('double-tap-and-hold ▶ reaches run speed', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  const { x, y } = await centerOf(page.locator('[data-pad-btn="right"]'));

  // A quick tap, then press again within the double-tap window and hold.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.down();

  // WALK_SPEED is 90 px/s, RUN_SPEED 150 (config.ts) — 120 only clears on a real run.
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx, {
      timeout: 3000,
    })
    .toBeGreaterThan(120);
  await page.mouse.up();
});

test('B opens a station and closes it (no stray interact on the same press)', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate((x) => window.__PORTFOLIO__!.teleport(x), fioraX);
  await expect.poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().zone)).toBe('fiora');

  await page.locator('[data-pad-btn="b"]').click();
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible();

  await page.locator('[data-pad-btn="b"]').click();
  await expect(page.locator('[data-panel="fiora"]')).toBeHidden();
});

test('rotating to landscape keeps the game playing with the pad as an overlay', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().mode))
    .toBe('landscape-touch');
  await expect(page.locator('#pad')).toBeVisible();
  await expect(page.locator('#screen')).toBeVisible();

  const { x, y } = await centerOf(page.locator('[data-pad-btn="right"]'));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect
    .poll(async () => (await page.evaluate(() => window.__PORTFOLIO__!.getState().player))?.vx)
    .toBeGreaterThan(0);
  await page.mouse.up();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(overflow).toBe(false);
});

test('the pad never blocks a tap on the game underneath in the landscape overlay', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect
    .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().mode))
    .toBe('landscape-touch');

  // A point on #pad's own box, away from any button, must hit the canvas underneath.
  const hit = await page.evaluate(() => {
    const pad = document.getElementById('pad')!;
    const r = pad.getBoundingClientRect();
    const el = document.elementFromPoint(Math.round(r.left + 4), Math.round(r.top + 4));
    return el?.tagName.toLowerCase();
  });
  expect(hit).toBe('canvas');
});

test('tapping a station on the canvas walks there and opens its panel (handheld)', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await page.evaluate((x) => window.__PORTFOLIO__!.teleport(x - 80), fioraX);

  // Real zoom/camera math (LESSONS.md: "a click-by-world-x test must replicate computeViewport's
  // formulas", not a guessed screen fraction): a point close to the ground, at the station's own
  // x, lands inside its placeholder/sprite box regardless of its exact height.
  const canvasBox = await page.locator('canvas').boundingBox();
  if (!canvasBox) throw new Error('canvas has no box');
  const point = await page.evaluate(
    ({ x, groundY }) => {
      const s = window.__PORTFOLIO__!.getState();
      const cssPerArtPx = s.zoom / s.dpr; // Viewport.scaleZoom (render/zoom.ts): CSS px per art px.
      return {
        cssX: (x - s.camera.scrollX) * cssPerArtPx,
        cssY: (groundY - 10 - s.camera.scrollY) * cssPerArtPx,
      };
    },
    { x: fioraX, groundY: 432 }
  );

  await page.mouse.click(canvasBox.x + point.cssX, canvasBox.y + point.cssY);
  await expect(page.locator('[data-panel="fiora"]')).toBeVisible({ timeout: 5000 });
});
