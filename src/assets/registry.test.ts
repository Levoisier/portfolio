import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, parseManifest } from './registry';

const assetsDoc = readFileSync(new URL('../../ASSETS.md', import.meta.url), 'utf8');
const slices = JSON.parse(
  readFileSync(new URL('../../art/reference/panda-sheet-v1.slices.json', import.meta.url), 'utf8')
) as { strips: Record<string, number[][]> };

/** Ids in the first column of every ASSETS.md table row written as `| \`id\` |`. */
const documentedIds = [...assetsDoc.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]);

describe('art/manifest.json', () => {
  it('parses', () => {
    expect(ASSET_MANIFEST.assets.length).toBeGreaterThan(0);
  });

  it('rejects malformed entries', () => {
    expect(() => parseManifest({ version: 1, grid: 16, assets: [{ id: 'Bad Id' }] })).toThrow();
  });

  it('is documented one-to-one in ASSETS.md', () => {
    const ids = ASSET_MANIFEST.assets.map((a) => a.id).sort();
    expect([...new Set(documentedIds)].sort()).toEqual(ids);
  });

  it('interim reference slices only target existing strips and never exceed their frame count', () => {
    for (const [id, boxes] of Object.entries(slices.strips)) {
      const entry = ASSET_MANIFEST.assets.find((a) => a.id === id);
      expect(entry?.kind, id).toBe('strip');
      if (entry?.kind === 'strip') expect(boxes.length).toBeLessThanOrEqual(entry.frames);
      for (const box of boxes) expect(box).toHaveLength(4);
    }
  });
});
