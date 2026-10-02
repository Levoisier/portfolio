import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, parseManifest } from './registry';

const assetsDoc = readFileSync(new URL('../../ASSETS.md', import.meta.url), 'utf8');
const slices = JSON.parse(
  readFileSync(new URL('../../art/reference/panda-sheet-v1.slices.json', import.meta.url), 'utf8')
) as {
  strips: Record<string, number[][]>;
  derived?: Record<string, unknown>;
};

/** Registry rows of ASSETS.md: `| \`id\` | wave | launch | kind | geometry | status |`. */
const registryRows = [
  ...assetsDoc.matchAll(
    /^\|\s*`([a-z0-9-]+)`\s*\|\s*([A-D])\s*\|\s*(required|optional)\s*\|\s*([a-z-]+)\s*\|/gm
  ),
].map(([, id, wave, launch, kind]) => ({ id: id!, wave, required: launch === 'required', kind }));

describe('art/manifest.json', () => {
  it('parses', () => {
    expect(ASSET_MANIFEST.assets.length).toBeGreaterThan(0);
  });

  it('rejects malformed entries', () => {
    expect(() => parseManifest({ version: 1, grid: 16, assets: [{ id: 'Bad Id' }] })).toThrow();
  });

  it('is documented one-to-one in the ASSETS.md registry (id, wave, launch, kind)', () => {
    const fromManifest = ASSET_MANIFEST.assets
      .map(({ id, wave, required, kind }) => ({ id, wave, required, kind }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const fromDoc = [...registryRows].sort((a, b) => a.id.localeCompare(b.id));
    expect(fromDoc).toEqual(fromManifest);
  });

  it('interim reference slices only target existing strips and never exceed their frame count', () => {
    for (const [id, boxes] of Object.entries(slices.strips)) {
      const entry = ASSET_MANIFEST.assets.find((a) => a.id === id);
      expect(entry?.kind, id).toBe('strip');
      if (entry?.kind === 'strip') expect(boxes.length).toBeLessThanOrEqual(entry.frames);
      for (const box of boxes) expect(box).toHaveLength(4);
    }
  });

  it('derived interim strips name a sliced frame and give one whole-pixel lift per cut', () => {
    for (const [id, raw] of Object.entries(slices.derived ?? {})) {
      if (id.startsWith('$')) continue;
      const spec = raw as { from: string; frame: number; cuts: number[]; lifts: number[][] };
      const entry = ASSET_MANIFEST.assets.find((a) => a.id === id);
      expect(entry?.kind, id).toBe('strip');
      if (entry?.kind === 'strip') expect(spec.lifts.length).toBeLessThanOrEqual(entry.frames);
      expect(slices.strips[spec.from]?.[spec.frame], `${id} → ${spec.from}`).toHaveLength(4);
      for (const lift of spec.lifts) {
        expect(lift).toHaveLength(spec.cuts.length);
        for (const px of lift) expect(Number.isInteger(px) && px >= 0).toBe(true);
      }
    }
  });
});
