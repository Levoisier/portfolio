import { describe, expect, it } from 'vitest';
import { NO_INTENT, type SourcedIntent } from './intent';
import { mergeIntents } from './merge';

const open = { modalOpen: true };
const closed = { modalOpen: false };

describe('mergeIntents', () => {
  it('fills missing fields from NO_INTENT', () => {
    expect(mergeIntents([], closed)).toEqual(NO_INTENT);
    expect(mergeIntents([{ source: 'keyboard', intent: { run: true } }], closed)).toEqual({
      ...NO_INTENT,
      run: true,
    });
  });

  it('sums moveX and clamps it to [-1, 1]', () => {
    const both = (a: number, b: number): SourcedIntent[] => [
      { source: 'keyboard', intent: { moveX: a } },
      { source: 'wheel', intent: { moveX: b } },
    ];
    expect(mergeIntents(both(1, 1), closed).moveX).toBe(1);
    expect(mergeIntents(both(-1, -1), closed).moveX).toBe(-1);
    expect(mergeIntents(both(1, -1), closed).moveX).toBe(0);
    expect(mergeIntents(both(0.25, 0.5), closed).moveX).toBe(0.75);
  });

  it('ORs the booleans across sources', () => {
    const merged = mergeIntents(
      [
        { source: 'keyboard', intent: { jumpPressed: true, run: false } },
        { source: 'pad', intent: { jumpHeld: true, run: true } },
        { source: 'pointer', intent: { interactPressed: true } },
        { source: 'wheel', intent: { menuPressed: true } },
      ],
      closed
    );
    expect(merged).toEqual({
      moveX: 0,
      run: true,
      jumpPressed: true,
      jumpHeld: true,
      interactPressed: true,
      menuPressed: true,
    });
  });

  it('ignores every source while a modal is open', () => {
    const sources: SourcedIntent[] = [
      { source: 'keyboard', intent: { moveX: 1, menuPressed: true } },
      { source: 'wheel', intent: { moveX: -1 } },
      { source: 'pad', intent: { jumpPressed: true } },
      { source: 'pointer', intent: { interactPressed: true } },
      { source: 'travel', intent: { moveX: 1 }, active: false },
    ];
    expect(mergeIntents(sources, open)).toEqual(NO_INTENT);
  });

  it('an active travel source replaces everything, also while modal', () => {
    const sources: SourcedIntent[] = [
      { source: 'keyboard', intent: { moveX: -1, jumpPressed: true, menuPressed: true } },
      { source: 'travel', intent: { moveX: 1, run: true }, active: true },
    ];
    const expected = { ...NO_INTENT, moveX: 1, run: true };
    expect(mergeIntents(sources, closed)).toEqual(expected);
    expect(mergeIntents(sources, open)).toEqual(expected);
  });

  it('clamps an active travel moveX too', () => {
    expect(
      mergeIntents([{ source: 'travel', intent: { moveX: 3 }, active: true }], closed).moveX
    ).toBe(1);
  });

  it('an inactive travel source merges like any other', () => {
    const merged = mergeIntents(
      [
        { source: 'keyboard', intent: { moveX: 1 } },
        { source: 'travel', intent: { moveX: -1 }, active: false },
      ],
      closed
    );
    expect(merged.moveX).toBe(0);
  });

  it('returns a fresh object (NO_INTENT stays frozen and untouched)', () => {
    const merged = mergeIntents([], closed);
    merged.moveX = 1;
    expect(NO_INTENT.moveX).toBe(0);
  });
});
