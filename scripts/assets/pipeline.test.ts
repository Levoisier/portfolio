import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, type AssetEntry, type StripAsset } from '../../src/assets/registry.ts';
import { detectHole, detectPanel } from './lib/anchors.ts';
import { cleanGreenEdges, detectBackground, floodBlack, keyGreen } from './lib/background.ts';
import { paletteRgb, snap } from './lib/color.ts';
import { groupComponents, labelComponents } from './lib/components.ts';
import { createImg, fillRect, opaqueBounds, type Img } from './lib/img.ts';
import { encodePng, isPaletteExact } from './lib/output.ts';
import { cropToLoop, packStrip, seamError } from './lib/pack.ts';
import { makePlaceholder } from './lib/placeholder.ts';
import { downscaleBy, removeOrphans, runGcd, snapToPalette } from './lib/pixels.ts';
import { loadSheet, processEntry, type Slices } from './pipeline.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const GREEN = [0, 255, 0, 255];
const rgba = (name: Parameters<typeof paletteRgb>[0]) => [...paletteRgb(name), 255];
const at = (img: Img, x: number, y: number) =>
  Array.from(img.data.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4));
const colorsOf = (img: Img) => {
  const set = new Set<string>();
  for (let i = 0; i < img.data.length; i += 4)
    if (img.data[i + 3]) set.add(Array.from(img.data.subarray(i, i + 3)).join(','));
  return set;
};
const entry = (id: string) => ASSET_MANIFEST.assets.find((a) => a.id === id)!;
const noRaw = () => join(tmpdir(), 'no-such-dir', 'x.png');

/** A disc of `color` anti-aliased onto #00FF00 (4×4 supersampling). */
function aaDisc(size: number, r: number, color: readonly number[]): Img {
  const img = createImg(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++)
          if (Math.hypot(x + (sx + 0.5) / 4 - c, y + (sy + 0.5) / 4 - c) <= r) cover++;
      const k = cover / 16;
      img.data.set(
        [0, 1, 2].map((i) => Math.round(color[i]! * k + GREEN[i]! * (1 - k))).concat(255),
        (y * size + x) * 4
      );
    }
  }
  return img;
}

describe('background', () => {
  it('green key + edge cleanup leaves no khaki fringe on scarlet', () => {
    const disc = aaDisc(64, 20, paletteRgb('scarlet-500'));
    expect(detectBackground(disc).kind).toBe('green');
    const { img } = snapToPalette(cleanGreenEdges(keyGreen(disc), 1));
    const khaki = paletteRgb('paper-700').join(',');
    expect(colorsOf(img).has(khaki)).toBe(false);
    expect(opaqueBounds(img)!.w).toBeGreaterThan(34);
  });

  it('black flood-fill keeps enclosed and edge-touching dark fur above the threshold', () => {
    const img = createImg(20, 20);
    fillRect(img, 0, 0, 20, 20, [0, 0, 0, 255]);
    fillRect(img, 5, 5, 10, 10, [14, 14, 14, 255]); // fur touching the background
    const d = detectBackground(img);
    expect(d.kind).toBe('black');
    const keyed = floodBlack(img, d.borderMax + 4);
    expect(at(keyed, 0, 0)[3]).toBe(0);
    expect(at(keyed, 5, 5)[3]).toBe(255);
  });
});

describe('components', () => {
  const blobs = (boxes: [number, number, number, number][]) => {
    const img = createImg(100, 100);
    for (const [x, y, w, h] of boxes) fillRect(img, x, y, w, h, rgba('ink-700'));
    return labelComponents(img);
  };

  it('reads a grid row-major', () => {
    const { comps } = blobs([
      [60, 60, 20, 20],
      [5, 5, 20, 20],
      [60, 5, 20, 20],
      [5, 60, 20, 20],
    ]);
    const groups = groupComponents(comps, { count: 4 })!;
    expect(groups.map((g) => [g.box.x, g.box.y])).toEqual([
      [5, 5],
      [60, 5],
      [5, 60],
      [60, 60],
    ]);
  });

  it('merges satellites into the nearest frame and drops specks', () => {
    const { comps } = blobs([
      [5, 5, 20, 20],
      [60, 5, 20, 20],
      [82, 8, 4, 4], // detached paw of frame 2
    ]);
    const groups = groupComponents(comps, {})!;
    expect(groups).toHaveLength(2);
    expect(groups[1]!.members).toHaveLength(2);
    expect(groups[1]!.box.w).toBe(26);
  });

  it('rejects when fewer frames than required exist', () => {
    const { comps } = blobs([[5, 5, 20, 20]]);
    expect(groupComponents(comps, { count: 3 })).toBeNull();
  });
});

describe('pixels', () => {
  it('detects an integer upscale and reverses it exactly', () => {
    const small = createImg(4, 4);
    fillRect(small, 0, 0, 2, 4, rgba('scarlet-500'));
    fillRect(small, 2, 0, 2, 4, rgba('navy-900'));
    const big = createImg(12, 12);
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++)
        big.data.set(at(small, (x / 3) | 0, (y / 3) | 0), (y * 12 + x) * 4);
    expect(runGcd([big])).toBe(6); // 2-px bands × 3
    expect(Array.from(downscaleBy(big, 3).data)).toEqual(Array.from(small.data));
  });

  it('snaps to the palette and binarizes alpha', () => {
    expect(snap(...paletteRgb('amber-400')).de).toBe(0);
    const img = createImg(2, 1);
    img.data.set([230, 30, 40, 200, 230, 30, 40, 100]);
    const out = snapToPalette(img).img;
    expect(at(out, 0, 0)).toEqual(rgba('scarlet-500'));
    expect(at(out, 1, 0)[3]).toBe(0);
  });

  it('removes 1-px orphans', () => {
    const img = createImg(5, 5);
    fillRect(img, 0, 0, 2, 2, rgba('ink-900'));
    fillRect(img, 4, 4, 1, 1, rgba('ink-900'));
    expect(at(removeOrphans(img), 4, 4)[3]).toBe(0);
    expect(at(removeOrphans(img), 0, 0)[3]).toBe(255);
  });
});

describe('packing and layers', () => {
  it('centres frames on the feet and rests them on the baseline', () => {
    const frame = createImg(30, 20);
    fillRect(frame, 0, 2, 12, 3, rgba('scarlet-500')); // scarf trailing left
    fillRect(frame, 14, 0, 10, 20, rgba('ink-700')); // body + feet
    const { img } = packStrip([frame], [64, 64], 60);
    const b = opaqueBounds(img)!;
    expect(b.y + b.h - 1).toBe(59);
    const feet = [...Array(64).keys()].filter((x) => at(img, x, 59)[3]);
    expect(Math.floor((feet[0]! + feet[feet.length - 1]!) / 2)).toBe(32);
  });

  it('crops a layer to its loop point so it tiles seamlessly', () => {
    const img = createImg(27, 4);
    for (let x = 0; x < 27; x++)
      fillRect(img, x, 0, 1, 4, x % 20 < 10 ? rgba('navy-900') : rgba('navy-700'));
    const { img: loop } = cropToLoop(img);
    expect(loop.w).toBe(20);
    expect(seamError(loop)).toBeGreaterThan(0); // first vs last column differ by design…
    expect(cropToLoop(img).error).toBe(0); // …but column 0 matches the loop column
  });
});

describe('anchors', () => {
  it('finds the navy sign panel and an enclosed window', () => {
    const img = createImg(40, 30);
    fillRect(img, 0, 0, 40, 30, rgba('ink-600'));
    fillRect(img, 6, 4, 20, 8, rgba('navy-900'));
    fillRect(img, 10, 18, 6, 5, [0, 0, 0, 0]);
    expect(detectPanel(img)).toEqual([6, 4, 20, 8]);
    expect(detectHole(img)).toEqual([10, 18, 6, 5]);
  });
});

describe('placeholders', () => {
  it.each(ASSET_MANIFEST.assets.filter((a) => a.required).map((a) => [a.id, a] as const))(
    '%s has the final geometry',
    (_id, a) => {
      const ph = makePlaceholder(a);
      if (a.kind === 'strip')
        expect([ph.img!.w, ph.img!.h]).toEqual([a.cell[0] * a.frames, a.cell[1]]);
      if (a.kind === 'sprite')
        expect([ph.img!.w, ph.img!.h]).toEqual([a.maxSize[0], a.targetHeight]);
      if (a.kind === 'layer' || a.kind === 'tile-strip')
        expect([ph.img!.w, ph.img!.h]).toEqual([...a.size]);
      if (a.kind === 'set')
        for (const it of a.items)
          expect([ph.items![it.name]!.w, ph.items![it.name]!.h]).toEqual([...it.size]);
      if (ph.img) expect(isPaletteExact(ph.img)).toBe(true);
    }
  );

  it('keeps the skill-block window transparent', () => {
    const e = entry('skill-block') as StripAsset;
    const [x, y, w, h] = e.anchors!.window!;
    expect(at(makePlaceholder(e).img!, x + Math.floor(w / 2), y + Math.floor(h / 2))[3]).toBe(0);
  });
});

describe('output', () => {
  it('writes palette-exact PNGs that read back identically', async () => {
    const img = makePlaceholder(entry('station-spawn-gate')).img!;
    const png = await encodePng(img);
    const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(Buffer.compare(data, Buffer.from(img.data))).toBe(0);
  });
});

describe('processEntry', () => {
  const slices = JSON.parse(
    readFileSync(join(root, 'art/reference/panda-sheet-v1.slices.json'), 'utf8')
  ) as Slices;
  let sheet: Promise<Img> | undefined;
  const ctx = (rawPath: (id: string) => string) => ({
    rawPath,
    slices,
    sheet: () => (sheet ??= loadSheet(join(root, 'art/reference', slices.source), slices)),
  });

  it('resolves optional assets without a source to `missing`', async () => {
    const out = await processEntry(entry('flare-flame'), ctx(noRaw));
    expect(out.runtime.source).toBe('missing');
    expect(out.png).toBeUndefined();
  });

  it('cuts interim panda frames from the reference sheet on the baseline, without shadows', async () => {
    const out = await processEntry(entry('panda-walk'), ctx(noRaw));
    expect(out.runtime.source).toBe('reference');
    if (out.runtime.source === 'missing' || out.runtime.kind !== 'strip')
      throw new Error('strip expected');
    expect(out.runtime.frames).toBe(4);
    const img = out.png!;
    for (let f = 0; f < 4; f++) {
      const rows = [...Array(64).keys()].filter((y) =>
        [...Array(64).keys()].some((x) => at(img, f * 64 + x, y)[3])
      );
      expect(Math.max(...rows)).toBe(59);
      expect(Math.max(...rows) - Math.min(...rows) + 1).toBeLessThanOrEqual(50);
    }
    expect(isPaletteExact(img)).toBe(true);
  });

  it('processes a green-screen strip: drops the ruler, scales from it, keeps the frame count', async () => {
    // Fake "fake pixel art": ruler + 4 frames at 4× a 48 px character, blurred so colors multiply.
    const W = 5 * 160;
    const src = createImg(W, 260);
    fillRect(src, 0, 0, W, 260, GREEN);
    for (let i = 0; i < 5; i++) {
      fillRect(src, i * 160 + 40, 40, 64, 192, rgba('ink-800'));
      fillRect(src, i * 160 + 56, 80, 32, 60, rgba('paper-100'));
      fillRect(src, i * 160 + 30, 60, 20, 12, rgba('scarlet-500'));
    }
    const blurred = await sharp(Buffer.from(src.data), {
      raw: { width: W, height: 260, channels: 4 },
    })
      .blur(3)
      .png()
      .toBuffer();
    const dir = mkdtempSync(join(tmpdir(), 'assets-'));
    writeFileSync(join(dir, 'panda-idle.png'), blurred);
    const out = await processEntry(
      entry('panda-idle') as AssetEntry,
      ctx((id) => join(dir, `${id}.png`))
    );
    expect(out.runtime.source).toBe('raw');
    if (out.runtime.source === 'missing' || out.runtime.kind !== 'strip')
      throw new Error('strip expected');
    expect(out.runtime.frames).toBe(4);
    const b = opaqueBounds(out.png!)!;
    expect(b.h).toBeGreaterThanOrEqual(47);
    expect(b.h).toBeLessThanOrEqual(49);
    expect(isPaletteExact(out.png!)).toBe(true);
  });

  it('rejects a raw strip with too few frames and falls back', async () => {
    const src = createImg(200, 100);
    fillRect(src, 0, 0, 200, 100, GREEN);
    fillRect(src, 20, 20, 40, 60, rgba('ink-800'));
    const dir = mkdtempSync(join(tmpdir(), 'assets-'));
    writeFileSync(
      join(dir, 'panda-air.png'),
      await sharp(Buffer.from(src.data), { raw: { width: 200, height: 100, channels: 4 } })
        .png()
        .toBuffer()
    );
    const out = await processEntry(
      entry('panda-air'),
      ctx((id) => join(dir, `${id}.png`))
    );
    expect(out.runtime.source).toBe('reference');
    expect(out.runtime.warnings[0]).toMatch(/raw delivery rejected/);
  });

  it('produces a runtime entry for every manifest asset', async () => {
    for (const a of ASSET_MANIFEST.assets) {
      const out = await processEntry(a, ctx(noRaw));
      expect(out.runtime.id).toBe(a.id);
      if (a.required) expect(out.runtime.source).not.toBe('missing');
      if (out.runtime.source !== 'missing') {
        expect(out.runtime.url).toBe(`/game/${a.id}.png`);
        expect(out.png).toBeDefined();
      }
    }
  });
});

describe('sets: fill items and item anchors', () => {
  it('scales fill items to their exact width and keeps doorway anchors in the placeholder', async () => {
    const vault = entry('confidential-vault');
    if (vault.kind !== 'set') throw new Error('set expected');
    const wall = makePlaceholder(vault).items!.wall!;
    const [x, y, w, h] = vault.items[0]!.anchors!.doorway!;
    expect(at(wall, x + w / 2, y + h / 2)).toEqual(rgba('navy-950'));

    const src = createImg(600, 200);
    fillRect(src, 0, 0, 600, 200, GREEN);
    // Three platforms drawn at a 3.2:1-ish ratio, too short for their 16-px collision box.
    fillRect(src, 20, 80, 120, 34, rgba('ink-600'));
    fillRect(src, 170, 80, 200, 60, rgba('ink-600'));
    fillRect(src, 400, 80, 180, 20, rgba('ink-600'));
    const dir = mkdtempSync(join(tmpdir(), 'assets-'));
    writeFileSync(
      join(dir, 'platforms.png'),
      await sharp(Buffer.from(src.data), { raw: { width: 600, height: 200, channels: 4 } })
        .blur(2) // many colors → "fake" pixel art, so the fill scaling applies
        .png()
        .toBuffer()
    );
    const out = await processEntry(entry('platforms'), { rawPath: (id) => join(dir, `${id}.png`) });
    if (out.runtime.source === 'missing' || out.runtime.kind !== 'set')
      throw new Error('set expected');
    expect(out.runtime.items['platform-s']).toEqual({ w: 48, h: 16 });
    // Every fill item spans its full box width (so it tiles and matches its collision box).
    const atlasFrames = (
      out.atlasJson as { frames: Record<string, { frame: { x: number; w: number } }> }
    ).frames;
    for (const name of ['platform-s', 'platform-m', 'platform-l']) {
      const { x: fx, w: fw } = atlasFrames[name]!.frame;
      expect(at(out.png!, fx, 0)[3]).toBe(255);
      expect(at(out.png!, fx + fw - 1, 0)[3]).toBe(255);
    }
  });

  it('keeps a transparent (PixelLab) strip whole: no ruler is dropped', async () => {
    const src = createImg(6 * 64, 64);
    for (let i = 0; i < 6; i++) fillRect(src, i * 64 + 20, 12, 22, 48, rgba('ink-800'));
    const dir = mkdtempSync(join(tmpdir(), 'assets-'));
    writeFileSync(
      join(dir, 'panda-air.png'),
      await sharp(Buffer.from(src.data), { raw: { width: 6 * 64, height: 64, channels: 4 } })
        .png()
        .toBuffer()
    );
    const out = await processEntry(entry('panda-air'), { rawPath: (id) => join(dir, `${id}.png`) });
    expect(out.runtime.source).toBe('raw');
    if (out.runtime.source === 'missing' || out.runtime.kind !== 'strip')
      throw new Error('strip expected');
    expect(out.runtime.frames).toBe(6);
    expect(out.runtime.frameNames).toHaveLength(6);
  });
});
