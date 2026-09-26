/** Packing frames into cells, and seamless layer/tile-strip handling. */
import { deltaE, type RGB } from './color.ts';
import { blit, createImg, crop, opaqueBounds, type Img } from './img.ts';

/** Centroid x of the opaque pixels in the lowest 25 % of rows (the feet), rounded down. */
export function feetCentroidX(img: Img): number {
  const b = opaqueBounds(img);
  if (!b) return 0;
  const from = b.y + Math.floor(b.h * 0.75);
  let sum = 0;
  let n = 0;
  for (let y = from; y < b.y + b.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3]) {
        sum += x;
        n++;
      }
    }
  }
  return n ? Math.floor(sum / n) : Math.floor(img.w / 2);
}

/**
 * Packs frames left→right into one strip of `cell`-sized frames: each frame's feet centroid
 * sits on the cell's centre column and its lowest opaque row on `baseline − 1`.
 */
export function packStrip(
  frames: Img[],
  cell: readonly [number, number],
  baseline: number
): { img: Img; clipped: number[] } {
  const [cw, ch] = cell;
  const strip = createImg(cw * frames.length, ch);
  const clipped: number[] = [];
  frames.forEach((frame, i) => {
    const b = opaqueBounds(frame);
    if (!b) return;
    const tight = crop(frame, b.x, b.y, b.w, b.h);
    const dx = Math.floor(cw / 2) - feetCentroidX(tight);
    const dy = baseline - tight.h;
    const cellImg = createImg(cw, ch);
    if (blit(cellImg, tight, dx, dy)) clipped.push(i);
    blit(strip, cellImg, i * cw, 0);
  });
  return { img: strip, clipped };
}

/** Places `src` bottom-centred in a `size` box (used for set items). */
export function placeBottomCentre(
  src: Img,
  size: readonly [number, number]
): { img: Img; clipped: boolean } {
  const out = createImg(size[0], size[1]);
  const clipped = blit(out, src, Math.floor((size[0] - src.w) / 2), size[1] - src.h);
  return { img: out, clipped };
}

const column = (img: Img, x: number): (RGB | null)[] =>
  Array.from({ length: img.h }, (_, y) => {
    const p = (y * img.w + x) * 4;
    return img.data[p + 3] ? [img.data[p]!, img.data[p + 1]!, img.data[p + 2]!] : null;
  });

/** Mean OKLab ΔE between two columns (transparent vs opaque counts as 1). */
export function columnError(img: Img, a: number, b: number): number {
  const ca = column(img, a);
  const cb = column(img, b);
  let sum = 0;
  for (let y = 0; y < img.h; y++) {
    const p = ca[y]!;
    const q = cb[y]!;
    sum += p && q ? deltaE(p, q) : p || q ? 1 : 0;
  }
  return sum / img.h;
}

/** Finds the loop column c in the right 30 % that best matches column 0; crops to [0, c). */
export function cropToLoop(img: Img): { img: Img; error: number } {
  if (img.w < 8) return { img, error: columnError(img, 0, img.w - 1) };
  // Column c ≈ column 0 means [0, c) repeats; the first best match wins.
  let best = img.w;
  let bestErr = Infinity;
  for (let c = Math.floor(img.w * 0.7); c < img.w; c++) {
    const err = columnError(img, 0, c);
    if (err < bestErr) {
      bestErr = err;
      best = c;
    }
  }
  return { img: crop(img, 0, 0, best, img.h), error: Number.isFinite(bestErr) ? bestErr : 1 };
}

/** Seam error of the final tile: last column vs first column. */
export const seamError = (img: Img): number => columnError(img, 0, img.w - 1);

/** Places a scaled layer into its `size` canvas: layers bottom-aligned, tile-strips top-aligned. */
export function placeLayer(
  src: Img,
  size: readonly [number, number],
  align: 'bottom' | 'top'
): { img: Img; cropped: boolean } {
  const out = createImg(size[0], size[1]);
  const dy = align === 'bottom' ? size[1] - src.h : 0;
  const cropped = blit(out, src, 0, dy);
  return { img: out, cropped };
}
