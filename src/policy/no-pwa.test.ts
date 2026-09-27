import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Policy: the portfolio is deliberately NOT installable (DECISIONS.md → "Not installable").
 * No web app manifest, no service worker, no standalone-mode meta, no install prompt.
 */
const root = fileURLToPath(new URL('../../', import.meta.url));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const rel = (f: string) => relative(root, f).split('\\').join('/');

describe('not a PWA', () => {
  it('ships no web app manifest file', () => {
    const offenders = walk(join(root, 'public'))
      .map(rel)
      .filter((f) => /\.webmanifest$/.test(f) || /^public\/manifest\.json$/.test(f));
    expect(offenders).toEqual([]);
  });

  it('has no manifest link, service worker, standalone meta or install prompt in source', () => {
    const forbidden =
      /rel=["']manifest["']|serviceWorker\s*\.\s*register|apple-mobile-web-app-capable|mobile-web-app-capable|beforeinstallprompt/;
    const offenders = walk(join(root, 'src'))
      .filter((f) => /\.(ts|astro|js|mjs|html)$/.test(f) && !f.endsWith('.test.ts'))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => [i + 1, line] as const)
          .filter(([, line]) => forbidden.test(line))
          .map(([n, line]) => `${rel(f)}:${n}: ${line.trim()}`)
      );
    expect(offenders).toEqual([]);
  });
});
