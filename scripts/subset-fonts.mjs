#!/usr/bin/env node
/**
 * subset-fonts.mjs
 *
 * Regenerates the Latin subsets of the self-hosted variable fonts.
 *
 * WHY: the upstream Inter variable font ships every script it supports —
 * 344 KB, of which this site renders roughly 90 characters. `unicode-range` in
 * the @font-face rule only gates WHETHER the file downloads; it does not make
 * the file smaller. Subsetting does.
 *
 * The kept range is Google Fonts' standard `latin` subset: Basic Latin +
 * Latin-1 Supplement (all Spanish accents + ¿¡ñ), the handful of Latin
 * Extended-A/B letters Google includes, General Punctuation (em dash, curly
 * quotes, ellipsis), and a few symbols. Deliberately wider than what the
 * current copy uses so routine ES/EN copy edits never hit a missing glyph.
 *
 * Variable axes are preserved (no instancing) — `font-weight: 100 900` and
 * Inter's optical-size axis keep working.
 *
 * SUBSETS IN PLACE, so the served paths stay exactly as ASSETS.md documents
 * them (Golden Rule 6). This is idempotent — the kept range is fixed, so a
 * second run is a no-op. The full upstream files remain recoverable from git
 * history; to re-subset after dropping in a fresh upstream font, just run this
 * again.
 *
 * Requires fonttools + brotli:  pip install fonttools brotli
 * Run:                          node scripts/subset-fonts.mjs
 */

import { execFile } from 'node:child_process';
import { rename, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = resolve(ROOT, 'public/fonts');

/** Google Fonts' `latin` subset, verbatim. Keep in sync with the
 *  `unicode-range` descriptors in src/styles/global.css. */
const UNICODES = [
  'U+0000-00FF',
  'U+0131',
  'U+0152-0153',
  'U+02BB-02BC',
  'U+02C6',
  'U+02DA',
  'U+02DC',
  'U+2000-206F',
  'U+2074',
  'U+20AC',
  'U+2122',
  'U+2191',
  'U+2193',
  'U+2212',
  'U+2215',
  'U+FEFF',
  'U+FFFD',
].join(',');

const FONTS = ['Inter-VariableFont_opsz,wght.woff2', 'DMMono-VariableFont_wght.woff2'];

async function subset(file) {
  const path = resolve(FONT_DIR, file);
  const before = (await stat(path)).size;
  const tmp = `${path}.subset`;

  await run('pyftsubset', [
    path,
    `--output-file=${tmp}`,
    '--flavor=woff2',
    `--unicodes=${UNICODES}`,
    // Keep the variable axes intact — no instancing.
    '--layout-features=*',
    '--no-hinting',
    '--desubroutinize',
    '--name-IDs=*',
    '--drop-tables+=DSIG',
  ]);

  const after = (await stat(tmp)).size;
  await rename(tmp, path);

  const saved = (((before - after) / before) * 100).toFixed(0);
  console.log(
    `${file.padEnd(38)} ${(before / 1024).toFixed(0).padStart(4)} KB → ${(after / 1024)
      .toFixed(0)
      .padStart(3)} KB   (−${saved}%)`
  );
}

for (const font of FONTS) {
  await subset(font);
}
