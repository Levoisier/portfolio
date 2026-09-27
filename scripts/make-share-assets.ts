/**
 * Favicons and the Open Graph image from the `panda-portrait` pipeline output (BACKLOG.md
 * Phase 12). Run `pnpm assets` first, then `pnpm share`; the outputs in public/ are committed.
 * Favicons only — no web app manifest (DECISIONS.md → Not installable).
 */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { paletteRgb } from './assets/lib/color.ts';

const pub = (name: string) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const portrait = pub('game/panda-portrait.png');
const bg = (name: Parameters<typeof paletteRgb>[0]) => {
  const [r, g, b] = paletteRgb(name);
  return { r, g, b, alpha: 1 };
};

/** The head: a 48×48 crop from the top of the 77×100 portrait (ears to scarf knot). */
const HEAD = { left: 14, top: 0, width: 48, height: 48 };

async function main() {
  const head = await sharp(portrait).extract(HEAD).png().toBuffer();
  await sharp(head).png().toFile(pub('favicon-48.png'));
  // ×4 nearest on the brand navy (iOS home screen / bookmarks ignore transparency).
  await sharp({ create: { width: 192, height: 192, channels: 4, background: bg('navy-900') } })
    .composite([{ input: await sharp(head).resize(192, 192, { kernel: 'nearest' }).toBuffer() }])
    .png()
    .toFile(pub('apple-touch-icon.png'));

  // 1200×630: the portrait ×5 (integer) on navy with a scarlet floor band.
  const scale = 5;
  const meta = await sharp(portrait).metadata();
  const w = (meta.width ?? 77) * scale;
  const h = (meta.height ?? 100) * scale;
  const big = await sharp(portrait).resize(w, h, { kernel: 'nearest' }).toBuffer();
  const band = await sharp({
    create: { width: 1200, height: 40, channels: 4, background: bg('scarlet-500') },
  })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: bg('navy-900') } })
    .composite([
      { input: band, left: 0, top: 590 },
      { input: big, left: Math.round((1200 - w) / 2), top: 590 - h },
    ])
    .png()
    .toFile(pub('og.png'));
  console.log('public/favicon-48.png, apple-touch-icon.png, og.png written');
}

await main();
