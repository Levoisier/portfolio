/** Background detection and removal (ARCHITECTURE.md → Asset pipeline → Background detection). */
import { isChromaGreen } from './color.ts';
import type { Img } from './img.ts';

export type Background = 'alpha' | 'green' | 'black' | 'unknown';

function borderIndices(img: Img): number[] {
  const out: number[] = [];
  for (let x = 0; x < img.w; x++) out.push(x, (img.h - 1) * img.w + x);
  for (let y = 1; y < img.h - 1; y++) out.push(y * img.w, y * img.w + img.w - 1);
  return out;
}

const maxChannel = (img: Img, p: number) =>
  Math.max(img.data[p * 4]!, img.data[p * 4 + 1]!, img.data[p * 4 + 2]!);

export function detectBackground(img: Img): { kind: Background; borderMax: number } {
  const border = borderIndices(img);
  const share = (pred: (p: number) => boolean) => border.filter(pred).length / border.length;
  const borderMax = Math.max(...border.map((p) => maxChannel(img, p)));
  if (share((p) => img.data[p * 4 + 3]! < 128) >= 0.95) return { kind: 'alpha', borderMax };
  if (
    share((p) => isChromaGreen(img.data[p * 4]!, img.data[p * 4 + 1]!, img.data[p * 4 + 2]!)) >=
    0.95
  )
    return { kind: 'green', borderMax };
  if (share((p) => maxChannel(img, p) <= 16) >= 0.95) return { kind: 'black', borderMax };
  return { kind: 'unknown', borderMax };
}

/** Makes every chroma-green pixel transparent. */
export function keyGreen(img: Img): Img {
  const data = new Uint8Array(img.data);
  for (let p = 0; p < img.w * img.h; p++) {
    if (isChromaGreen(data[p * 4]!, data[p * 4 + 1]!, data[p * 4 + 2]!)) data[p * 4 + 3] = 0;
  }
  return { ...img, data };
}

/**
 * Flood-fills near-black from the image borders (4-connected) — never a global key, because
 * the panda's fur is black too and only the outside-connected region is background.
 */
export function floodBlack(img: Img, threshold: number): Img {
  const data = new Uint8Array(img.data);
  const seen = new Uint8Array(img.w * img.h);
  const stack = borderIndices(img);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    if (maxChannel(img, p) > threshold) continue;
    data[p * 4 + 3] = 0;
    const x = p % img.w;
    if (x > 0) stack.push(p - 1);
    if (x < img.w - 1) stack.push(p + 1);
    if (p >= img.w) stack.push(p - img.w);
    if (p < img.w * (img.h - 1)) stack.push(p + img.w);
  }
  return { ...img, data };
}

/** Chebyshev distance of each opaque pixel to the nearest transparent pixel (capped). */
function distanceToClear(img: Img, cap: number): Uint8Array {
  const dist = new Uint8Array(img.w * img.h).fill(255);
  let frontier: number[] = [];
  for (let p = 0; p < img.w * img.h; p++) {
    if (img.data[p * 4 + 3] === 0) {
      dist[p] = 0;
      frontier.push(p);
    }
  }
  // Pixels on the image edge are treated as touching the outside.
  for (let x = 0; x < img.w; x++) {
    for (const p of [x, (img.h - 1) * img.w + x])
      if (dist[p]! > 1) ((dist[p] = 1), frontier.push(p));
  }
  for (let y = 0; y < img.h; y++) {
    for (const p of [y * img.w, y * img.w + img.w - 1])
      if (dist[p]! > 1) ((dist[p] = 1), frontier.push(p));
  }
  for (let d = 1; d <= cap && frontier.length; d++) {
    const next: number[] = [];
    for (const p of frontier) {
      const x = p % img.w;
      const y = (p / img.w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h) continue;
          const q = ny * img.w + nx;
          if (dist[q]! > dist[p]! + 1) {
            dist[q] = dist[p]! + 1;
            next.push(q);
          }
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/**
 * Green-source edge cleanup: erode the silhouette by `erode` px, then clear green-tinted
 * pixels (G > max(R, B) + 24) within 2 px of the key boundary — otherwise scarlet/green
 * blends snap to khaki.
 */
export function cleanGreenEdges(img: Img, erode: number): Img {
  const dist = distanceToClear(img, Math.max(erode, 2) + 1);
  const data = new Uint8Array(img.data);
  for (let p = 0; p < img.w * img.h; p++) {
    if (data[p * 4 + 3] === 0) continue;
    const d = dist[p]!;
    const [r, g, b] = [data[p * 4]!, data[p * 4 + 1]!, data[p * 4 + 2]!];
    if (d <= erode || (d <= 2 && g > Math.max(r, b) + 24)) data[p * 4 + 3] = 0;
  }
  return { ...img, data };
}
