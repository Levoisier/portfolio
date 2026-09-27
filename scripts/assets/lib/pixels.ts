/** Per-pixel normalization: binary alpha, palette snap, orphan cleanup, native-art detection. */
import { snap } from './color.ts';
import { createImg, type Img } from './img.ts';

export interface SnapStats {
  meanDE: number;
  p95DE: number;
}

/** Alpha ≥ 50 % → opaque, else fully transparent; opaque pixels snap to the palette (OKLab). */
export function snapToPalette(img: Img): { img: Img; stats: SnapStats } {
  const data = new Uint8Array(img.data);
  const des: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) {
      data.fill(0, i, i + 4);
      continue;
    }
    const { rgb, de } = snap(data[i]!, data[i + 1]!, data[i + 2]!);
    data.set([rgb[0], rgb[1], rgb[2], 255], i);
    des.push(de);
  }
  des.sort((a, b) => a - b);
  const meanDE = des.length ? des.reduce((s, d) => s + d, 0) / des.length : 0;
  const p95DE = des.length ? des[Math.min(des.length - 1, Math.floor(des.length * 0.95))]! : 0;
  return { img: { ...img, data }, stats: { meanDE, p95DE } };
}

/** Removes opaque pixels with no opaque 8-neighbour (1-px islands). */
export function removeOrphans(img: Img): Img {
  const data = new Uint8Array(img.data);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3] === 0) continue;
      let neighbours = 0;
      for (let dy = -1; dy <= 1 && !neighbours; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < img.w &&
            ny < img.h &&
            img.data[(ny * img.w + nx) * 4 + 3]
          ) {
            neighbours++;
            break;
          }
        }
      }
      if (!neighbours) data.fill(0, (y * img.w + x) * 4, (y * img.w + x) * 4 + 4);
    }
  }
  return { ...img, data };
}

export function uniqueOpaqueColors(imgs: Img[]): number {
  const set = new Set<number>();
  for (const img of imgs) {
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3]! >= 128)
        set.add((img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!);
    }
  }
  return set.size;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Greatest common divisor of all same-color runs (rows and columns) — k > 1 = upscaled export. */
export function runGcd(imgs: Img[]): number {
  let g = 0;
  const key = (img: Img, p: number) =>
    img.data[p * 4 + 3]! < 128
      ? -1
      : (img.data[p * 4]! << 16) | (img.data[p * 4 + 1]! << 8) | img.data[p * 4 + 2]!;
  for (const img of imgs) {
    for (let y = 0; y < img.h; y++) {
      let run = 1;
      for (let x = 1; x <= img.w; x++) {
        if (x < img.w && key(img, y * img.w + x) === key(img, y * img.w + x - 1)) run++;
        else {
          // Only opaque runs count: transparent margins depend on where the frame was cut.
          if (key(img, y * img.w + x - 1) !== -1) g = gcd(g, run);
          run = 1;
        }
        if (g === 1) return 1;
      }
    }
    for (let x = 0; x < img.w; x++) {
      let run = 1;
      for (let y = 1; y <= img.h; y++) {
        if (y < img.h && key(img, y * img.w + x) === key(img, (y - 1) * img.w + x)) run++;
        else {
          if (key(img, (y - 1) * img.w + x) !== -1) g = gcd(g, run);
          run = 1;
        }
        if (g === 1) return 1;
      }
    }
  }
  return Math.max(1, g);
}

/** Exact 1/k nearest downscale of an upscaled pixel-art export. */
export function downscaleBy(img: Img, k: number): Img {
  const out = createImg(Math.max(1, Math.floor(img.w / k)), Math.max(1, Math.floor(img.h / k)));
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) {
      const s = (y * k * img.w + x * k) * 4;
      out.data.set(img.data.subarray(s, s + 4), (y * out.w + x) * 4);
    }
  }
  return out;
}
