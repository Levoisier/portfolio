/** Detects where the game draws on delivered art (signs, screens, windows). */
import { paletteRgb } from './color.ts';
import type { Img } from './img.ts';

export type Rect = readonly [number, number, number, number];

/** Largest axis-aligned rectangle whose pixels all satisfy `pred` (histogram method). */
export function largestRect(img: Img, pred: (p: number) => boolean): Rect | null {
  const heights = new Array<number>(img.w).fill(0);
  let best: Rect | null = null;
  let bestArea = 0;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) heights[x] = pred(y * img.w + x) ? heights[x]! + 1 : 0;
    const stack: number[] = [];
    for (let x = 0; x <= img.w; x++) {
      const h = x < img.w ? heights[x]! : 0;
      while (stack.length && heights[stack[stack.length - 1]!]! >= h) {
        const top = stack.pop()!;
        const height = heights[top]!;
        const left = stack.length ? stack[stack.length - 1]! + 1 : 0;
        const area = height * (x - left);
        if (area > bestArea) {
          bestArea = area;
          best = [left, y - height + 1, x - left, height];
        }
      }
      stack.push(x);
    }
  }
  return best;
}

const NAVY = [paletteRgb('navy-900'), paletteRgb('navy-950')];
export const DOORWAY = [paletteRgb('navy-950')];

/** `sign`: the largest solid rectangle of `colors` (default navy-900/950), at least 4×4. */
export function detectPanel(img: Img, colors = NAVY): Rect | null {
  const rect = largestRect(img, (p) => {
    const i = p * 4;
    return (
      img.data[i + 3] !== 0 &&
      colors.some(
        ([r, g, b]) => img.data[i] === r && img.data[i + 1] === g && img.data[i + 2] === b
      )
    );
  });
  return rect && rect[2] >= 4 && rect[3] >= 4 ? rect : null;
}

/** `window`: bbox of the largest transparent hole not connected to the image border. */
export function detectHole(img: Img): Rect | null {
  const outside = new Uint8Array(img.w * img.h);
  const clear = (p: number) => img.data[p * 4 + 3] === 0;
  const stack: number[] = [];
  for (let x = 0; x < img.w; x++) stack.push(x, (img.h - 1) * img.w + x);
  for (let y = 0; y < img.h; y++) stack.push(y * img.w, y * img.w + img.w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (outside[p] || !clear(p)) continue;
    outside[p] = 1;
    const x = p % img.w;
    if (x > 0) stack.push(p - 1);
    if (x < img.w - 1) stack.push(p + 1);
    if (p >= img.w) stack.push(p - img.w);
    if (p < img.w * (img.h - 1)) stack.push(p + img.w);
  }
  const rect = largestRect(img, (p) => clear(p) && !outside[p]);
  return rect && rect[2] >= 2 && rect[3] >= 2 ? rect : null;
}
