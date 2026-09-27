import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../i18n/lang';
import { hintSeen, markHintSeen, HINT_STORAGE_KEY } from './hint';

const memory = (init: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(init));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('shared/hint', () => {
  it('is unseen with no store and with nothing stored yet', () => {
    expect(hintSeen(null)).toBe(false);
    expect(hintSeen(memory())).toBe(false);
  });

  it('is seen once marked, and stays seen', () => {
    const store = memory();
    markHintSeen(store);
    expect(hintSeen(store)).toBe(true);
    markHintSeen(store);
    expect(hintSeen(store)).toBe(true);
  });

  it('ignores junk in storage instead of throwing', () => {
    expect(hintSeen(memory({ [HINT_STORAGE_KEY]: 'yes' }))).toBe(false);
  });

  it('never throws when storage is blocked', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => markHintSeen(broken)).not.toThrow();
    expect(hintSeen(broken)).toBe(false);
  });
});
