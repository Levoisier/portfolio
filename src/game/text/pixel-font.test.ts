import { describe, expect, it } from 'vitest';
import {
  CHARSET,
  bestPhase,
  bitBounds,
  bitmapFontData,
  downsample,
  packGlyphs,
  type AlphaImage,
} from './pixel-font';

/** A 3×2-design-px "glyph" drawn at scale 4 with its grid offset by (1, 2) and soft edges. */
function fixture(): AlphaImage {
  const scale = 4;
  const w = 20;
  const h = 16;
  const alpha = new Uint8Array(w * h);
  const on = [
    [0, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ];
  for (const [gx, gy] of on)
    for (let y = 0; y < scale; y++)
      for (let x = 0; x < scale; x++) alpha[(2 + gy! * scale + y) * w + 1 + gx! * scale + x] = 255;
  // Anti-aliased fringe one px outside the ink, as a browser draws it.
  for (let x = 1; x < 13; x++) alpha[10 * w + x] = 60;
  return { w, h, alpha };
}

describe('pixel font rasterizer', () => {
  it('finds the grid phase and makes binary pixels', () => {
    const img = fixture();
    const phase = bestPhase([img], 4);
    expect(phase).toEqual({ x: 1, y: 2 });
    const bmp = downsample(img, phase, 4);
    const box = bitBounds(bmp)!;
    expect([box.w, box.h]).toEqual([3, 2]);
    const rows = Array.from({ length: box.h }, (_, y) =>
      Array.from({ length: box.w }, (_, x) => bmp.bits[(box.y + y) * bmp.w + box.x + x]).join('')
    );
    expect(rows).toEqual(['101', '111']);
  });

  it('empty glyphs have no bounds', () => {
    expect(bitBounds({ w: 2, h: 2, bits: new Uint8Array(4) })).toBeNull();
  });

  it('covers Spanish characters', () => {
    for (const ch of 'áéíóúüñÁÉÍÓÚÜÑ¿¡—') expect(CHARSET).toContain(ch);
  });

  it('packs without overlap and emits Phaser font data', () => {
    const glyph = (char: string, w: number) => ({
      char,
      bitmap: { w, h: 8, bits: new Uint8Array(w * 8) },
      xOffset: 0,
      yOffset: 2,
      xAdvance: w + 1,
    });
    const { glyphs, h } = packGlyphs([glyph('a', 100), glyph('b', 100), glyph('c', 100)], 256);
    expect(glyphs.map((g) => [g.x, g.y])).toEqual([
      [1, 1],
      [102, 1],
      [1, 10],
    ]);
    const data = bitmapFontData('px', glyphs, { w: 256, h }, 14);
    expect(data.chars['c'.charCodeAt(0)]).toMatchObject({ x: 1, y: 10, width: 100, xAdvance: 101 });
  });
});
