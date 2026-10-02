/**
 * Pure pieces of the station cue (`stations/cue.ts`) and the station cards (`Stations.ts`): the
 * quest-scroll icon as a pixel map, its bob, and how wide a card is per layout mode. No Phaser.
 */
import type { PaletteName } from '../../design/palette';
import type { LayoutMode } from '../../shared/layout-mode';

/**
 * The "a station with something to read" marker: a rolled quest scroll with a scarlet seal,
 * drawn above whichever station the panda is in range of. One char per art px; `.` is empty.
 */
export const QUEST_ICON: readonly string[] = [
  '.kkkkkkkkkkkk.',
  'kAAAAAAAAAAAAk',
  'kaaaaaaaaaaaak',
  'kbbbbbbbbbbbbk',
  '.kpppppppppqk.',
  '.kpllllllppqk.',
  '.kpppppppppqk.',
  '.kplllllpppqk.',
  '.kpppppppppqk.',
  '.kpllllpsspqk.',
  '.kpppppprrpqk.',
  'kAAAAAAAAAAAAk',
  'kaaaaaaaaaaaak',
  '.kkkkkkkkkkkk.',
];

export const QUEST_ICON_COLORS: Readonly<Record<string, PaletteName>> = {
  k: 'ink-900',
  A: 'amber-400',
  a: 'amber-600',
  b: 'amber-900',
  p: 'paper-100',
  q: 'paper-500',
  l: 'paper-700',
  s: 'scarlet-500',
  r: 'scarlet-700',
};

export const QUEST_ICON_W = QUEST_ICON[0]!.length;
export const QUEST_ICON_H = QUEST_ICON.length;

/** Horizontal same-color runs of the icon, relative to its top-left corner. */
export function questIconRuns(): { x: number; y: number; w: number; color: PaletteName }[] {
  const runs: { x: number; y: number; w: number; color: PaletteName }[] = [];
  QUEST_ICON.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const color = QUEST_ICON_COLORS[ch];
      if (color) runs.push({ x, y, w: end - x, color });
      x = end;
    }
  });
  return runs;
}

/** ms per half of the icon's bob (up, then down). */
export const QUEST_BOB_MS = 420;

/** Whole-pixel lift of the icon at `nowMs`: 0 or 1, and always 0 under reduced motion. */
export function questBob(nowMs: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion || !Number.isFinite(nowMs)) return 0;
  return Math.floor(nowMs / QUEST_BOB_MS) % 2 === 1 ? 1 : 0;
}

/** Widest a code-drawn station card gets in the portrait `handheld` layout (art px): the view
 * there is only ~216–234 art px wide, so design-size cards (160–224) filled the screen. */
export const HANDHELD_CARD_MAX_W = 128;
/** The gate card holds the three-line name sign, so it keeps a little more room. */
export const HANDHELD_SIGN_CARD_MAX_W = 144;
/** Inset (art px) of a narrowed card's sign plate from the card's sides. */
export const CARD_SIGN_INSET = 8;

/** A card's width in `mode`: the design width, narrowed only in the portrait `handheld` layout. */
export function cardWidth(designW: number, mode: LayoutMode, hasSign: boolean): number {
  if (mode !== 'handheld') return designW;
  return Math.min(designW, hasSign ? HANDHELD_SIGN_CARD_MAX_W : HANDHELD_CARD_MAX_W);
}

/** The sign plate (`[x, y, w, h]`, card-relative) of a card `w` wide: the design anchor at the
 * design width, else the same plate inset `CARD_SIGN_INSET` from both sides. */
export function cardSign(
  sign: readonly [number, number, number, number],
  designW: number,
  w: number
): [number, number, number, number] {
  if (w >= designW) return [sign[0], sign[1], sign[2], sign[3]];
  return [CARD_SIGN_INSET, sign[1], w - 2 * CARD_SIGN_INSET, sign[3]];
}
