/**
 * Pure half of the in-world pixel text (DECISIONS.md → In-world pixel text). Pixelify Sans is
 * drawn on a grid of ~90.9 font units per design pixel (11 design px per em) but its outlines are
 * offset from the pen and chamfered, so rendering at 11 px gives blurry half-covered pixels.
 * Instead each glyph is rendered at 11 × SCALE px, the grid phase is found, and every SCALE×SCALE
 * cell becomes one binary pixel (coverage ≥ 50 %).
 */
export const DESIGN_PX_PER_EM = 11;
export const SCALE = 8;
export const RENDER_SIZE = DESIGN_PX_PER_EM * SCALE;

/** Printable ASCII + Latin-1 (á é í ó ú ü ñ ¿ ¡ …) + the few typographic marks the UI uses. */
export const CHARSET = [
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)),
  ...Array.from({ length: 0xff - 0xa1 + 1 }, (_, i) => String.fromCharCode(0xa1 + i)),
  '—',
  '–',
  '…',
  '’',
  '“',
  '”',
].join('');

export interface AlphaImage {
  w: number;
  h: number;
  /** One byte per pixel, 0–255. */
  alpha: Uint8Array | Uint8ClampedArray;
}

export interface Bitmap {
  w: number;
  h: number;
  bits: Uint8Array;
}

/** Mean coverage of the cell starting at (cx, cy), in [0, 1]. */
function cellCoverage(img: AlphaImage, cx: number, cy: number, scale: number): number {
  let sum = 0;
  for (let y = cy; y < cy + scale; y++) {
    if (y < 0 || y >= img.h) continue;
    for (let x = cx; x < cx + scale; x++) if (x >= 0 && x < img.w) sum += img.alpha[y * img.w + x]!;
  }
  return sum / (255 * scale * scale);
}

/**
 * The grid phase (0 ≤ p < scale, per axis) where cells are most clearly full or empty —
 * the offset of the font's design grid from the pixel grid. Shared by all glyphs.
 */
export function bestPhase(images: AlphaImage[], scale = SCALE): { x: number; y: number } {
  const score = (px: number, py: number) => {
    let s = 0;
    for (const img of images)
      for (let cy = py - scale; cy < img.h; cy += scale)
        for (let cx = px - scale; cx < img.w; cx += scale) {
          const c = cellCoverage(img, cx, cy, scale);
          s += Math.min(c, 1 - c);
        }
    return s;
  };
  let best = { x: 0, y: 0 };
  let bestScore = Infinity;
  for (let py = 0; py < scale; py++)
    for (let px = 0; px < scale; px++) {
      const s = score(px, py);
      if (s < bestScore) [bestScore, best] = [s, { x: px, y: py }];
    }
  return best;
}

/** Cell grid → binary bitmap. Cell (0,0) starts at (phase − scale) so no ink is cut off. */
export function downsample(
  img: AlphaImage,
  phase: { x: number; y: number },
  scale = SCALE
): Bitmap {
  const ox = phase.x - scale;
  const oy = phase.y - scale;
  const w = Math.ceil((img.w - ox) / scale);
  const h = Math.ceil((img.h - oy) / scale);
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      bits[y * w + x] = cellCoverage(img, ox + x * scale, oy + y * scale, scale) >= 0.5 ? 1 : 0;
  return { w, h, bits };
}

/** Tight box of the set bits, or null for an empty glyph (space). */
export function bitBounds(b: Bitmap): { x: number; y: number; w: number; h: number } | null {
  let x0 = b.w;
  let y0 = b.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++)
      if (b.bits[y * b.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export interface Glyph {
  char: string;
  /** Trimmed bitmap (empty for blanks). */
  bitmap: Bitmap;
  /** Offset of the bitmap from the pen position / line top, in design px. */
  xOffset: number;
  yOffset: number;
  xAdvance: number;
}

export interface PackedGlyph extends Glyph {
  x: number;
  y: number;
}

/** Shelf-packs glyphs into an atlas `width` px wide with 1 px gutters. */
export function packGlyphs(glyphs: Glyph[], width = 256): { glyphs: PackedGlyph[]; h: number } {
  let x = 1;
  let y = 1;
  let row = 0;
  const packed = glyphs.map((g) => {
    if (x + g.bitmap.w + 1 > width) {
      x = 1;
      y += row + 1;
      row = 0;
    }
    const p = { ...g, x, y };
    x += g.bitmap.w + 1;
    row = Math.max(row, g.bitmap.h);
    return p;
  });
  return { glyphs: packed, h: y + row + 1 };
}

/** Phaser `BitmapFontData` (same fields and UV convention as ParseXMLBitmapFont). */
export function bitmapFontData(
  name: string,
  packed: PackedGlyph[],
  atlas: { w: number; h: number },
  lineHeight: number
) {
  const chars: Record<number, object> = {};
  for (const g of packed) {
    const { w, h } = g.bitmap;
    chars[g.char.charCodeAt(0)] = {
      x: g.x,
      y: g.y,
      width: w,
      height: h,
      centerX: Math.floor(w / 2),
      centerY: Math.floor(h / 2),
      xOffset: g.xOffset,
      yOffset: g.yOffset,
      xAdvance: g.xAdvance,
      data: {},
      kerning: {},
      u0: g.x / atlas.w,
      v0: 1 - g.y / atlas.h,
      u1: (g.x + w) / atlas.w,
      v1: 1 - (g.y + h) / atlas.h,
    };
  }
  return { font: name, size: DESIGN_PX_PER_EM, lineHeight, retroFont: false, chars };
}
