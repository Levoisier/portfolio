/**
 * Pure zoom/viewport math — ARCHITECTURE.md → Rendering contract. Every art pixel becomes an
 * integer number of DEVICE pixels; the canvas never exceeds its screen.
 */
export const MAX_VIEW_W = 960;
export const MIN_VIEW_W = 200;

export interface ScreenRect {
  /** The #screen box in device px. */
  widthDev: number;
  heightDev: number;
  dpr: number;
}

export interface Viewport {
  /** Device px per art px. */
  zoom: number;
  /** Canvas backing store = game size, in art px. */
  backingW: number;
  backingH: number;
  /** Canvas CSS size (backing × zoom / dpr) and its offset inside #screen, CSS px. */
  cssW: number;
  cssH: number;
  offsetX: number;
  offsetY: number;
  /** For Phaser's Scale Manager, whose zoom is CSS px per game px. */
  scaleZoom: number;
}

export function computeViewport(
  { widthDev, heightDev, dpr }: ScreenRect,
  targetViewHeight: number
): Viewport {
  const w = Math.max(1, Math.floor(widthDev));
  const h = Math.max(1, Math.floor(heightDev));
  const zoom = Math.max(1, Math.min(Math.floor(h / targetViewHeight), Math.floor(w / MIN_VIEW_W)));
  const backingW = Math.max(1, Math.min(MAX_VIEW_W, Math.floor(w / zoom)));
  const backingH = Math.max(1, Math.floor(h / zoom));
  return {
    zoom,
    backingW,
    backingH,
    cssW: (backingW * zoom) / dpr,
    cssH: (backingH * zoom) / dpr,
    // Centre on a whole DEVICE pixel so the upscale grid stays aligned.
    offsetX: Math.round((w - backingW * zoom) / 2) / dpr,
    offsetY: Math.round((h - backingH * zoom) / 2) / dpr,
    scaleZoom: zoom / dpr,
  };
}

/** Screen rect from a CSS box when `devicePixelContentBoxSize` is unavailable. */
export function screenFromCss(cssW: number, cssH: number, dpr: number): ScreenRect {
  return { widthDev: Math.floor(cssW * dpr), heightDev: Math.floor(cssH * dpr), dpr };
}
