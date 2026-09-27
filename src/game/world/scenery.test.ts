import { describe, expect, it } from 'vitest';
import {
  backdropPlacement,
  belowGround,
  cameraScrollY,
  pickBackdrop,
  terrainPieces,
  terrainSpans,
  type BackdropView,
} from './scenery';

// The delivered terrain: 426 wide, tile [64, 294).
const SLICES = { width: 426, tileX: 64, tileW: 230 };

describe('terrainPieces', () => {
  it('covers the span exactly, caps at both ends', () => {
    const pieces = terrainPieces(100, 1000, SLICES);
    expect(pieces[0]).toEqual({ x: 100, srcX: 0, w: 64 });
    expect(pieces.at(-1)).toEqual({ x: 1000 - 132, srcX: 294, w: 132 });
    let x = 100;
    for (const p of pieces) {
      expect(p.x).toBe(x);
      x += p.w;
    }
    expect(x).toBe(1000);
  });

  it('repeats whole tiles and crops only the last one', () => {
    const middle = terrainPieces(0, 64 + 230 * 2 + 50 + 132, SLICES).slice(1, -1);
    expect(middle.map((p) => [p.srcX, p.w])).toEqual([
      [64, 230],
      [64, 230],
      [64, 50],
    ]);
  });

  it('never draws outside a span shorter than the caps', () => {
    const pieces = terrainPieces(0, 101, SLICES);
    expect(pieces.reduce((s, p) => s + p.w, 0)).toBe(101);
    expect(pieces[1]!.srcX + pieces[1]!.w).toBe(426);
    expect(terrainPieces(10, 10, SLICES)).toEqual([]);
  });
});

describe('terrainSpans', () => {
  it('leaves a gap per bridge and hides the outer caps past the world edges', () => {
    expect(terrainSpans(4620, [4100, 448], 144, SLICES)).toEqual([
      [-64, 376],
      [520, 4028],
      [4172, 4620 + 132],
    ]);
  });

  it('is one span with no bridges', () => {
    expect(terrainSpans(1000, [], 144, SLICES)).toEqual([[-64, 1132]]);
  });
});

describe('ground anchor', () => {
  it('keeps desktop low and lifts the full-screen handheld above the pad', () => {
    expect(belowGround('desktop', 450)).toBe(64);
    expect(belowGround('landscape-touch', 292)).toBe(72);
    expect(belowGround('handheld', 506)).toBe(152);
    expect(belowGround('handheld', 240)).toBe(96);
  });

  it('puts the ground line belowGround() px above the view bottom', () => {
    const viewH = 506;
    const scrollY = cameraScrollY('handheld', viewH, 432);
    expect(viewH - (432 - scrollY)).toBe(belowGround('handheld', viewH));
  });
});

describe('backdrop', () => {
  it('picks the painting by aspect', () => {
    expect(pickBackdrop(234, 506)).toBe('backdrop-portrait');
    expect(pickBackdrop(720, 450)).toBe('backdrop-landscape');
    expect(pickBackdrop(300, 300)).toBe('backdrop-landscape');
  });

  const portrait: BackdropView = {
    id: 'backdrop-portrait',
    viewW: 234,
    viewH: 506,
    bgW: 288,
    bgH: 900,
    horizonY: 735,
    groundScreenY: 354,
    scrollX: 0,
    worldW: 4620,
  };

  it('pans across the spare width over the whole level', () => {
    expect(backdropPlacement(portrait).x).toBe(0);
    expect(backdropPlacement({ ...portrait, scrollX: 4620 - 234 }).x).toBe(-54);
    expect(backdropPlacement({ ...portrait, scrollX: (4620 - 234) / 2 }).x).toBe(-27);
  });

  it('centres a painting narrower than the view', () => {
    expect(backdropPlacement({ ...portrait, viewW: 300 }).x).toBe(6);
  });

  it('hangs the horizon under the ground and never uncovers the top or bottom', () => {
    const { y } = backdropPlacement(portrait);
    expect(y + 735).toBe(354 + 78);
    for (const viewH of [240, 506, 719, 900]) {
      const p = backdropPlacement({ ...portrait, viewH, groundScreenY: viewH - 150 });
      expect(p.y).toBeLessThanOrEqual(0);
      expect(p.y + 900).toBeGreaterThanOrEqual(viewH);
    }
  });
});
