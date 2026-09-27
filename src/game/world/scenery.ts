/**
 * Pure geometry for the painted scenery (ARCHITECTURE.md → Scenery): how a terrain span is cut
 * into end caps and repeated tiles, where the gaps for bridges fall, how far below the ground the
 * camera looks in each layout mode, and where the full-screen backdrop sits. No Phaser import.
 */
import type { LayoutMode } from '../../shared/layout-mode';

/** The terrain sprite's slicing, from its resolved `surface` and `tile` anchors. */
export interface TerrainSlices {
  /** Sprite width. */
  width: number;
  /** First column of the repeatable tile (the left cap is `[0, tileX)`). */
  tileX: number;
  tileW: number;
}

/** One image to draw: the source columns `[srcX, srcX + w)` of the terrain sprite, at world `x`. */
export interface TerrainPiece {
  x: number;
  srcX: number;
  w: number;
}

/**
 * Cuts the span `[x0, x1)` into a left cap, as many whole tiles as fit, a last tile cropped to
 * the remainder, and a right cap ending exactly at `x1`. A span shorter than both caps shows the
 * left cap's first columns and the right cap's last ones.
 */
export function terrainPieces(x0: number, x1: number, s: TerrainSlices): TerrainPiece[] {
  const leftW = s.tileX;
  const rightX = s.tileX + s.tileW;
  const rightW = s.width - rightX;
  const len = x1 - x0;
  if (len <= 0) return [];
  if (len < leftW + rightW) {
    const l = Math.ceil(len / 2);
    return [
      { x: x0, srcX: 0, w: l },
      { x: x0 + l, srcX: s.width - (len - l), w: len - l },
    ];
  }
  const pieces: TerrainPiece[] = [{ x: x0, srcX: 0, w: leftW }];
  const end = x1 - rightW;
  for (let x = x0 + leftW; x < end; x += s.tileW) {
    pieces.push({ x, srcX: s.tileX, w: Math.min(s.tileW, end - x) });
  }
  pieces.push({ x: end, srcX: rightX, w: rightW });
  return pieces;
}

/**
 * The ground split by bridge gaps: `[x0, x1)` spans, the outer ones pushed past the world's
 * edges by the cap widths so the rounded ends only ever show at a gap.
 */
export function terrainSpans(
  worldW: number,
  gapCentres: readonly number[],
  gapW: number,
  s: TerrainSlices
): [number, number][] {
  const spans: [number, number][] = [];
  let x = -s.tileX;
  for (const c of [...gapCentres].sort((a, b) => a - b)) {
    const g0 = Math.round(c - gapW / 2);
    spans.push([x, g0]);
    x = g0 + gapW;
  }
  spans.push([x, worldW + (s.width - s.tileX - s.tileW)]);
  return spans;
}

/**
 * Art px of world the camera shows below the ground's top edge. Desktop and landscape keep the
 * level low in the frame; the full-screen handheld lifts it to ~70 % of the height so the
 * panda walks above the touch pad overlaid on the bottom of the screen.
 */
export function belowGround(mode: LayoutMode, viewH: number): number {
  if (mode === 'handheld') return Math.max(96, Math.round(viewH * 0.3));
  if (mode === 'landscape-touch') return 72;
  return 64;
}

/** Camera `scrollY` that puts `groundY` `belowGround()` px above the bottom of the view. */
export const cameraScrollY = (mode: LayoutMode, viewH: number, groundY: number): number =>
  groundY + belowGround(mode, viewH) - viewH;

export type BackdropId = 'backdrop-portrait' | 'backdrop-landscape';

/** A taller-than-wide view gets the portrait painting, anything else the landscape one. */
export const pickBackdrop = (viewW: number, viewH: number): BackdropId =>
  viewW < viewH ? 'backdrop-portrait' : 'backdrop-landscape';

/**
 * How far below the ground's top edge each painting's horizon (its lake line) sits on screen:
 * the portrait one shows the lake under the terrain wall, as in the handheld mock-up; the
 * landscape one tucks it just behind the wall so the mountains fill the wide view.
 */
const HORIZON_BELOW_GROUND: Record<BackdropId, number> = {
  'backdrop-portrait': 78,
  'backdrop-landscape': 16,
};

export interface BackdropView {
  id: BackdropId;
  viewW: number;
  viewH: number;
  bgW: number;
  bgH: number;
  /** The painting's `horizon` anchor y. */
  horizonY: number;
  /** Screen y of the ground's top edge. */
  groundScreenY: number;
  scrollX: number;
  worldW: number;
}

/**
 * Screen position (integer art px) of the backdrop's top-left corner. Vertically: the horizon
 * sits `HORIZON_BELOW_GROUND` under the ground line, never leaving a gap at the top or the
 * bottom (the top padding covers tall views). Horizontally: a slow pan across the painting's
 * spare width over the whole level — parallax without a seam, since it never tiles — or
 * centred when the painting is narrower than the view.
 */
export function backdropPlacement(v: BackdropView): { x: number; y: number } {
  const spare = v.bgW - v.viewW;
  const progress = Math.min(1, Math.max(0, v.scrollX / Math.max(1, v.worldW - v.viewW)));
  const x = spare <= 0 ? Math.round(-spare / 2) : Math.round(-spare * progress) + 0;
  const target = v.groundScreenY + HORIZON_BELOW_GROUND[v.id] - v.horizonY;
  const y = Math.max(v.viewH - v.bgH, Math.min(0, target));
  return { x, y };
}
