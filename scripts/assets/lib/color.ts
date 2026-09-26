/** Palette snapping in OKLab and HSV helpers for chroma keying. */
import { PALETTE } from '../../../src/design/palette.ts';

export type RGB = readonly [number, number, number];

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export function oklab([r8, g8, b8]: RGB): RGB {
  const r = linear(r8);
  const g = linear(g8);
  const b = linear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export const deltaE = (a: RGB, b: RGB): number => {
  const p = oklab(a);
  const q = oklab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

export const hexToRgb = (hex: string): RGB => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

export const PALETTE_RGB: readonly RGB[] = Object.values(PALETTE).map(hexToRgb);
const PALETTE_LAB = PALETTE_RGB.map(oklab);
const PALETTE_KEYS = new Set(PALETTE_RGB.map(([r, g, b]) => (r << 16) | (g << 8) | b));

export const isPaletteColor = (r: number, g: number, b: number) =>
  PALETTE_KEYS.has((r << 16) | (g << 8) | b);

export const paletteRgb = (name: keyof typeof PALETTE): RGB => hexToRgb(PALETTE[name]);

const snapCache = new Map<number, { rgb: RGB; de: number }>();

/** Nearest palette color in OKLab (memoized) plus the ΔE it moved. */
export function snap(r: number, g: number, b: number): { rgb: RGB; de: number } {
  const key = (r << 16) | (g << 8) | b;
  const hit = snapCache.get(key);
  if (hit) return hit;
  const p = oklab([r, g, b]);
  let best = 0;
  let bestD = Infinity;
  PALETTE_LAB.forEach((q, i) => {
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  const out = { rgb: PALETTE_RGB[best]!, de: Math.sqrt(bestD) };
  snapCache.set(key, out);
  return out;
}

/** h in degrees [0, 360), s and v in [0, 1]. */
export function hsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max / 255 };
}

/** The delivery chroma key: hue 120° ± 22°, saturation and value > 0.3. */
export function isChromaGreen(r: number, g: number, b: number): boolean {
  const { h, s, v } = hsv(r, g, b);
  return Math.abs(h - 120) <= 22 && s > 0.3 && v > 0.3;
}
