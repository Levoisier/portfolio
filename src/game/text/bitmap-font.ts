/**
 * Registers the Pixelify Sans bitmap font with a scene (no Phaser import: it only uses the
 * scene it is given). Call after `fonts:ready` — canvas text silently falls back to another
 * family while the web font is still loading.
 */
import type Phaser from 'phaser';
import { hex } from '../../design/palette';
import {
  CHARSET,
  RENDER_SIZE,
  SCALE,
  bestPhase,
  bitBounds,
  bitmapFontData,
  downsample,
  packGlyphs,
  type AlphaImage,
  type Glyph,
} from './pixel-font';

export const PIXEL_FONT = 'pixelify';
/** Font size to pass to `add.bitmapText` for 1 design px = 1 art px. */
export const PIXEL_FONT_SIZE = 11;
const ASCENT = 10;
const LINE_HEIGHT = 14;
const PAD = 2 * SCALE;
const CELL_W = RENDER_SIZE * 2;
const CELL_H = RENDER_SIZE * 2;
const BASELINE = PAD + Math.round(RENDER_SIZE * 1.1);
const PHASE_SAMPLE = 'HOoxgÑÁ¿';
/** Atlas bytes of an inked pixel (RGBA all 255 = palette white, opaque). */
const WHITE = 255;

export function registerPixelFont(scene: Phaser.Scene): boolean {
  if (scene.cache.bitmapFont.has(PIXEL_FONT)) return true;
  const scratch = scene.textures.createCanvas(`${PIXEL_FONT}-scratch`, CELL_W, CELL_H);
  if (!scratch) return false;
  const ctx = scratch.context;
  ctx.font = `${RENDER_SIZE}px "Pixelify Sans"`;
  ctx.textBaseline = 'alphabetic';
  // White ink so BitmapText tint (palette colors) applies unchanged.
  ctx.fillStyle = hex('white');

  const render = (char: string): AlphaImage => {
    ctx.clearRect(0, 0, CELL_W, CELL_H);
    ctx.fillText(char, PAD, BASELINE);
    const rgba = ctx.getImageData(0, 0, CELL_W, CELL_H).data;
    const alpha = new Uint8Array(CELL_W * CELL_H);
    for (let p = 0; p < alpha.length; p++) alpha[p] = rgba[p * 4 + 3]!;
    return { w: CELL_W, h: CELL_H, alpha };
  };

  const phase = bestPhase([...PHASE_SAMPLE].map(render));
  const penX = Math.round((PAD - (phase.x - SCALE)) / SCALE);
  const lineTop = Math.round((BASELINE - (phase.y - SCALE)) / SCALE) - ASCENT;

  const glyphs: Glyph[] = [...CHARSET].map((char) => {
    const full = downsample(render(char), phase);
    const box = bitBounds(full) ?? { x: penX, y: lineTop, w: 0, h: 0 };
    const bits = new Uint8Array(box.w * box.h);
    for (let y = 0; y < box.h; y++)
      for (let x = 0; x < box.w; x++)
        bits[y * box.w + x] = full.bits[(box.y + y) * full.w + box.x + x]!;
    return {
      char,
      bitmap: { w: box.w, h: box.h, bits },
      xOffset: box.x - penX,
      yOffset: box.y - lineTop,
      xAdvance: Math.round(ctx.measureText(char).width / SCALE),
    };
  });
  scene.textures.remove(scratch);

  const { glyphs: packed, h } = packGlyphs(glyphs);
  const atlas = scene.textures.createCanvas(PIXEL_FONT, 256, h);
  if (!atlas) return false;
  const image = atlas.context.createImageData(256, h);
  for (const g of packed)
    for (let y = 0; y < g.bitmap.h; y++)
      for (let x = 0; x < g.bitmap.w; x++)
        if (g.bitmap.bits[y * g.bitmap.w + x])
          image.data.fill(
            WHITE,
            ((g.y + y) * 256 + g.x + x) * 4,
            ((g.y + y) * 256 + g.x + x + 1) * 4
          );
  atlas.context.putImageData(image, 0, 0);
  atlas.refresh();
  for (const g of packed) if (g.bitmap.w) atlas.add(g.char, 0, g.x, g.y, g.bitmap.w, g.bitmap.h);

  scene.cache.bitmapFont.add(PIXEL_FONT, {
    data: bitmapFontData(PIXEL_FONT, packed, { w: 256, h }, LINE_HEIGHT),
    texture: PIXEL_FONT,
    frame: null,
  });
  return true;
}
