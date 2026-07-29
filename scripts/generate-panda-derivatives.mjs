#!/usr/bin/env node
/**
 * generate-panda-derivatives.mjs
 *
 * Regenerates the responsive WebP derivatives for the companion / party panda
 * poses from their canonical PNG sources.
 *
 * WHY: the canonical poses are 1254×1254–1600×2000 PNGs (~5.2 MB for the five
 * of them), but they are only ever painted at 55–256 CSS px — the fixed
 * companions (`#panda-companion` ≤16rem, `#panda-companion-mobile` ≤8rem) and
 * the Contact `.panda-party` row (≤6rem). Shipping the canonical PNGs to those
 * boxes was 82% of the page's transfer weight.
 *
 * NOT IN SCOPE — the hero ladder. `panda-hero-{320,480,800}.webp` were authored
 * with a SQUARE crop (320×320 …) that does not match the 847×1196 canonical
 * source, and `#panda-body` letterboxes them inside a fixed `aspect-[4/5]` box
 * with `object-contain`. Re-deriving them proportionally would change the hero
 * composition and the LCP element. They are left exactly as committed; if the
 * hero source is ever replaced, redo that crop by hand.
 *
 * Run after replacing any canonical companion panda source:
 *   node scripts/generate-panda-derivatives.mjs
 *
 * Paths written here MUST match the "Generated Panda Derivatives" table in
 * ASSETS.md (Golden Rule 6 — the swap contract).
 */

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = resolve(ROOT, 'public/media/panda');
const OUT_DIR = resolve(SRC_DIR, 'generated');

/**
 * width = the derivative's rendered width in CSS px × 2 (retina headroom).
 *   · 320 → covers the mobile companion (≤8rem/128px) and the party row
 *           (≤6rem/96px) at 2×, with room to spare.
 *   · 480 → covers the desktop companion (≤16rem/256px) at ~2×.
 * Resizes are proportional (no crop), so each derivative paints identically to
 * the canonical PNG it replaces.
 */
const JOBS = [
  { name: 'panda-master', widths: [320, 480] },
  { name: 'panda-coding', widths: [320, 480] },
  { name: 'panda-wave', widths: [320, 480] },
  { name: 'panda-head', widths: [320, 480] },
  // The hero POSE as used by the companions + party: proportional to the
  // canonical 847×1196 source, unlike the square-cropped `panda-hero-*` LCP
  // ladder above. Separate name so the two never collide.
  { name: 'panda-hero', outName: 'panda-hero-pose', widths: [320, 480] },
];

// Quality 82 is visually lossless for these flat-shaded illustrations at the
// sizes they are painted; `effort: 6` buys a few extra % for build-time only.
const WEBP_OPTIONS = { quality: 82, effort: 6, alphaQuality: 90 };

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const rows = [];
  let sourceBytes = 0;
  let outputBytes = 0;

  for (const job of JOBS) {
    const srcPath = resolve(SRC_DIR, `${job.name}.png`);
    const source = await readFile(srcPath);
    const meta = await sharp(source).metadata();
    sourceBytes += source.length;

    const outName = job.outName ?? job.name;

    for (const width of job.widths) {
      const outPath = resolve(OUT_DIR, `${outName}-${width}.webp`);
      const buffer = await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp(WEBP_OPTIONS)
        .toBuffer();

      await writeFile(outPath, buffer);
      const out = await sharp(buffer).metadata();
      outputBytes += buffer.length;

      rows.push({
        file: `/media/panda/generated/${outName}-${width}.webp`,
        dims: `${out.width}×${out.height}`,
        from: `${meta.width}×${meta.height} png`,
        kb: (buffer.length / 1024).toFixed(1),
      });
    }
  }

  const width = Math.max(...rows.map((r) => r.file.length));
  for (const row of rows) {
    console.log(
      `${row.file.padEnd(width)}  ${row.dims.padStart(9)}  ${row.kb.padStart(7)} KB   ← ${row.from}`
    );
  }

  console.log(
    `\nsources ${(sourceBytes / 1024 / 1024).toFixed(2)} MB → derivatives ${(
      outputBytes / 1024
    ).toFixed(0)} KB  (${(sourceBytes / outputBytes).toFixed(0)}× smaller)`
  );

  // Guard: the canonical sources must stay on disk — they are the regeneration
  // input and ASSETS.md documents them as the swap target.
  for (const job of JOBS) {
    await stat(resolve(SRC_DIR, `${job.name}.png`));
  }
}

await main();
