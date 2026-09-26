/** 8-connected components of opaque pixels, and grouping them into frames/items. */
import { createImg, type Img } from './img.ts';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Component extends Box {
  id: number;
  area: number;
}

export function labelComponents(img: Img): { labels: Int32Array; comps: Component[] } {
  const labels = new Int32Array(img.w * img.h).fill(-1);
  const comps: Component[] = [];
  for (let start = 0; start < img.w * img.h; start++) {
    if (labels[start] !== -1 || img.data[start * 4 + 3] === 0) continue;
    const id = comps.length;
    let [x0, y0, x1, y1, area] = [img.w, img.h, -1, -1, 0];
    const stack = [start];
    labels[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % img.w;
      const y = (p / img.w) | 0;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h) continue;
          const q = ny * img.w + nx;
          if (labels[q] === -1 && img.data[q * 4 + 3] !== 0) {
            labels[q] = id;
            stack.push(q);
          }
        }
      }
    }
    comps.push({ id, area, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return { labels, comps };
}

export const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** Gap between two boxes (0 when they overlap). */
export const boxDistance = (a: Box, b: Box): number => {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.hypot(dx, dy);
};

export interface Group {
  box: Box;
  members: number[];
}

/** Orders groups row-major: rows by vertical overlap, rows top→bottom, groups left→right. */
export function rowMajor(groups: Group[]): Group[] {
  const sorted = [...groups].sort((a, b) => a.box.y - b.box.y);
  const rows: { y0: number; y1: number; items: Group[] }[] = [];
  for (const g of sorted) {
    const cy = g.box.y + g.box.h / 2;
    const row = rows.find((r) => cy >= r.y0 && cy <= r.y1);
    if (row) {
      row.items.push(g);
      row.y0 = Math.min(row.y0, g.box.y);
      row.y1 = Math.max(row.y1, g.box.y + g.box.h);
    } else rows.push({ y0: g.box.y, y1: g.box.y + g.box.h, items: [g] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.box.x - b.box.x));
}

export interface GroupOptions {
  /** Exact count wanted, or `undefined` to take every major component (loops, min 2). */
  count?: number;
}

/**
 * Picks the frames/items of a raw source: the N largest components (or every component at
 * least 30 % of the largest when N is open), merges remaining components ≥ 0.5 % of the median
 * major area into the nearest major, drops smaller specks, and returns them row-major.
 * Returns null when fewer than the wanted count exist.
 */
export function groupComponents(comps: Component[], opts: GroupOptions): Group[] | null {
  const bySize = [...comps].sort((a, b) => b.area - a.area);
  if (bySize.length === 0) return null;
  let majors: Component[];
  if (opts.count !== undefined) {
    if (bySize.length < opts.count) return null;
    majors = bySize.slice(0, opts.count);
  } else {
    majors = bySize.filter((c) => c.area >= bySize[0]!.area * 0.3);
    if (majors.length < 2) return null;
  }
  const areas = majors.map((m) => m.area).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)]!;
  const groups: Group[] = majors.map((m) => ({ box: { ...m }, members: [m.id] }));
  for (const c of bySize) {
    if (majors.includes(c) || c.area < median * 0.005) continue;
    let best = groups[0]!;
    for (const g of groups) if (boxDistance(g.box, c) < boxDistance(best.box, c)) best = g;
    best.members.push(c.id);
    best.box = union(best.box, c);
  }
  return rowMajor(groups);
}

/** Extracts only the member components' pixels inside the group's box. */
export function extractGroup(img: Img, labels: Int32Array, group: Group): Img {
  const { x, y, w, h } = group.box;
  const out = createImg(w, h);
  const members = new Set(group.members);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const p = (y + yy) * img.w + (x + xx);
      if (!members.has(labels[p]!)) continue;
      out.data.set(img.data.subarray(p * 4, p * 4 + 4), (yy * w + xx) * 4);
    }
  }
  return out;
}
