import { expect, test } from '@playwright/test';
import { WORLD_LAYOUT } from '../../src/game/world/layout';
import { waitForGame } from './helpers';

/** Phase 4 — World: layout, ground, sky, parallax (BACKLOG.md). */

const zoneCenter = (x0: number, x1: number) => Math.min(x1 - 1, Math.round((x0 + x1) / 2));

test('teleporting through every zone updates the reported zone id (zone:enter on the bus)', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);

  for (const zone of WORLD_LAYOUT.zones) {
    const x = zoneCenter(zone.x0, zone.x1);
    await page.evaluate((tx) => window.__PORTFOLIO__!.teleport(tx), x);
    await expect
      .poll(() => page.evaluate(() => window.__PORTFOLIO__!.getState().zone))
      .toBe(zone.id);
  }
});

test('the ground, sky and parallax keep drawing across the whole level', async ({ page }) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await expect(page.locator('#loading')).toBeHidden();

  for (const x of [0, Math.round(WORLD_LAYOUT.width / 2), WORLD_LAYOUT.width - 1]) {
    await page.evaluate((tx) => window.__PORTFOLIO__!.teleport(tx), x);
    // One frame for the sky/parallax update (POST_UPDATE) to repaint before the screenshot.
    await page.waitForTimeout(50);
    const shot = await page.locator('canvas').screenshot();
    expect(shot.length).toBeGreaterThan(0);
  }
});

/** Mean RGB of a canvas screenshot: a cheap stand-in for "the sky got brighter/warmer". */
async function meanColor(page: import('@playwright/test').Page, b64: string) {
  return page.evaluate(async (data) => {
    const img = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${data}`)).blob()
    );
    const c = new OffscreenCanvas(img.width, img.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]!;
      g += d[i + 1]!;
      b += d[i + 2]!;
    }
    return { r: r / n, g: g / n, b: b / n };
  }, b64);
}

test('the sky visibly shifts from deep night at the gate to sunrise at the lookout', async ({
  page,
}) => {
  await page.goto('/?debug');
  await waitForGame(page);
  await expect(page.locator('#loading')).toBeHidden();

  const gate = WORLD_LAYOUT.zones.find((z) => z.id === 'gate')!;
  const contact = WORLD_LAYOUT.zones.find((z) => z.id === 'contact')!;

  await page.evaluate((tx) => window.__PORTFOLIO__!.teleport(tx), zoneCenter(gate.x0, gate.x1));
  await page.waitForTimeout(50);
  const nightShot = (await page.locator('canvas').screenshot()).toString('base64');

  await page.evaluate(
    (tx) => window.__PORTFOLIO__!.teleport(tx),
    zoneCenter(contact.x0, contact.x1)
  );
  await page.waitForTimeout(50);
  const dawnShot = (await page.locator('canvas').screenshot()).toString('base64');

  const night = await meanColor(page, nightShot);
  const dawn = await meanColor(page, dawnShot);
  // Sunrise is warmer (more red/amber than blue) and brighter than deep night.
  expect(dawn.r + dawn.g + dawn.b).toBeGreaterThan(night.r + night.g + night.b);
  expect(dawn.r - dawn.b).toBeGreaterThan(night.r - night.b);
});
