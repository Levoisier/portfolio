/**
 * Build-time read of `public/game/assets.json` for index.astro (Node only). `null` when the
 * pipeline has not run, or with PORTFOLIO_NO_ASSETS=1 (the e2e "no manifest" build).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RuntimeManifest } from './runtime';

export function readRuntimeManifest(root: string = process.cwd()): RuntimeManifest | null {
  if (process.env.PORTFOLIO_NO_ASSETS === '1') return null;
  try {
    return JSON.parse(
      readFileSync(join(root, 'public/game/assets.json'), 'utf8')
    ) as RuntimeManifest;
  } catch {
    return null;
  }
}

/** Safe inside `<script type="application/json">`: no `</script>` can close it early. */
export const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
