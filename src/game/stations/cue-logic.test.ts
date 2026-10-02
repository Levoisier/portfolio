import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../design/palette';
import {
  CARD_SIGN_INSET,
  HANDHELD_CARD_MAX_W,
  HANDHELD_SIGN_CARD_MAX_W,
  QUEST_BOB_MS,
  QUEST_ICON,
  QUEST_ICON_COLORS,
  QUEST_ICON_H,
  QUEST_ICON_W,
  cardSign,
  cardWidth,
  questBob,
  questIconRuns,
} from './cue-logic';

describe('quest icon', () => {
  it('is a rectangular pixel map whose every color is a palette entry', () => {
    for (const row of QUEST_ICON) {
      expect(row).toHaveLength(QUEST_ICON_W);
      for (const ch of row) if (ch !== '.') expect(QUEST_ICON_COLORS[ch], ch).toBeDefined();
    }
    for (const name of Object.values(QUEST_ICON_COLORS)) expect(PALETTE[name]).toBeDefined();
  });

  it('runs cover exactly the opaque pixels, once each', () => {
    const covered = new Map<string, string>();
    for (const run of questIconRuns()) {
      for (let x = run.x; x < run.x + run.w; x++) {
        const key = `${x},${run.y}`;
        expect(covered.has(key)).toBe(false);
        covered.set(key, run.color);
      }
    }
    let opaque = 0;
    for (let y = 0; y < QUEST_ICON_H; y++)
      for (let x = 0; x < QUEST_ICON_W; x++) {
        const ch = QUEST_ICON[y]![x]!;
        if (ch === '.') continue;
        opaque++;
        expect(covered.get(`${x},${y}`)).toBe(QUEST_ICON_COLORS[ch]);
      }
    expect(covered.size).toBe(opaque);
  });

  it('bobs a whole pixel on a fixed beat, and never under reduced motion', () => {
    expect(questBob(0, false)).toBe(0);
    expect(questBob(QUEST_BOB_MS, false)).toBe(1);
    expect(questBob(2 * QUEST_BOB_MS, false)).toBe(0);
    for (let t = 0; t < 5000; t += 97) expect(questBob(t, true)).toBe(0);
    expect(questBob(Number.NaN, false)).toBe(0);
  });
});

describe('station card width', () => {
  it('keeps the design width outside the portrait handheld layout', () => {
    for (const mode of ['desktop', 'landscape-touch'] as const) {
      expect(cardWidth(176, mode, false)).toBe(176);
      expect(cardWidth(224, mode, true)).toBe(224);
    }
  });

  it('narrows cards in handheld, the signed gate a little less, and never widens one', () => {
    expect(cardWidth(176, 'handheld', false)).toBe(HANDHELD_CARD_MAX_W);
    expect(cardWidth(224, 'handheld', true)).toBe(HANDHELD_SIGN_CARD_MAX_W);
    expect(cardWidth(48, 'handheld', false)).toBe(48);
  });

  it('keeps the design sign at the design width and insets it on a narrowed card', () => {
    const sign = [24, 8, 176, 40] as const;
    expect(cardSign(sign, 224, 224)).toEqual([24, 8, 176, 40]);
    expect(cardSign(sign, 224, 144)).toEqual([CARD_SIGN_INSET, 8, 144 - 2 * CARD_SIGN_INSET, 40]);
  });
});
