import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PALETTE, SKILL_CATEGORY_COLOR, num } from './palette';
import { SKILL_CATEGORIES } from '../content/types';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tokensCss = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');

describe('palette', () => {
  it('holds only #RRGGBB values', () => {
    for (const [name, value] of Object.entries(PALETTE)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('converts to Phaser numbers', () => {
    expect(num('scarlet-500')).toBe(0xe11d2a);
  });

  it('is mirrored exactly by src/styles/tokens.css as --c-<name>', () => {
    const declared = new Map(
      [...tokensCss.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [
        m[1],
        m[2]!.toUpperCase(),
      ])
    );
    expect(Object.fromEntries(declared)).toEqual(PALETTE);
  });

  it('assigns every skill category a palette color', () => {
    for (const cat of SKILL_CATEGORIES) expect(PALETTE[SKILL_CATEGORY_COLOR[cat]]).toBeDefined();
  });
});

/**
 * Golden Rule: no color literals outside palette.json / tokens.css.
 * Catches CSS hex/rgb/hsl and Phaser-style 0xRRGGBB numbers in source files.
 */
describe('no hardcoded colors', () => {
  const allowedFiles = new Set(['src/design/palette.json', 'src/styles/tokens.css']);
  const scanned = /\.(ts|astro|css|mjs|js)$/;
  const colorLiteral =
    /(?<![\w&])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\brgba?\(|\bhsla?\(|\b0x[0-9a-fA-F]{6}\b/;

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });

  const files = walk(join(root, 'src'))
    .map((f) => relative(root, f).split('\\').join('/'))
    .filter((f) => scanned.test(f) && !allowedFiles.has(f) && !f.endsWith('.test.ts'));

  it.each(files)('%s', (file) => {
    const offenders = readFileSync(join(root, file), 'utf8')
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => colorLiteral.test(line));
    expect(offenders.map(([n, l]) => `${file}:${n}: ${l.trim()}`)).toEqual([]);
  });
});
