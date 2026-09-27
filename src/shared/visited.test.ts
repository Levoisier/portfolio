import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../i18n/lang';
import { markVisited, readVisited, VISITED_STORAGE_KEY } from './visited';

const memory = (init: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(init));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('shared/visited', () => {
  it('is empty with no store and with nothing stored yet', () => {
    expect(readVisited(null)).toEqual(new Set());
    expect(readVisited(memory())).toEqual(new Set());
  });

  it('marks and persists across reads', () => {
    const store = memory();
    markVisited(store, 'fiora');
    expect(readVisited(store)).toEqual(new Set(['fiora']));
    markVisited(store, 'japaniracer');
    expect(readVisited(store)).toEqual(new Set(['fiora', 'japaniracer']));
  });

  it('marking the same id twice does not duplicate it', () => {
    const store = memory();
    markVisited(store, 'fiora');
    markVisited(store, 'fiora');
    expect(readVisited(store)).toEqual(new Set(['fiora']));
  });

  it('ignores junk in storage instead of throwing', () => {
    expect(readVisited(memory({ [VISITED_STORAGE_KEY]: '{not json' }))).toEqual(new Set());
    expect(readVisited(memory({ [VISITED_STORAGE_KEY]: '42' }))).toEqual(new Set());
    expect(readVisited(memory({ [VISITED_STORAGE_KEY]: '["a", 1, "b"]' }))).toEqual(
      new Set(['a', 'b'])
    );
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
    expect(() => markVisited(broken, 'fiora')).not.toThrow();
    expect(readVisited(broken)).toEqual(new Set());
  });
});
