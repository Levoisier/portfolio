import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../i18n/lang';
import {
  markUsedCategory,
  readUsedCategories,
  resetUsedCategories,
  SKILLS_STORAGE_KEY,
} from './skills-progress';

const memory = (init: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(init));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('shared/skills-progress', () => {
  it('is empty with no store and with nothing stored yet', () => {
    expect(readUsedCategories(null)).toEqual(new Set());
    expect(readUsedCategories(memory())).toEqual(new Set());
  });

  it('marks and persists across reads', () => {
    const store = memory();
    markUsedCategory(store, 'frontend');
    expect(readUsedCategories(store)).toEqual(new Set(['frontend']));
    markUsedCategory(store, 'backend');
    expect(readUsedCategories(store)).toEqual(new Set(['frontend', 'backend']));
  });

  it('marking the same category twice does not duplicate it', () => {
    const store = memory();
    markUsedCategory(store, 'devops');
    markUsedCategory(store, 'devops');
    expect(readUsedCategories(store)).toEqual(new Set(['devops']));
  });

  it('ignores junk in storage instead of throwing', () => {
    expect(readUsedCategories(memory({ [SKILLS_STORAGE_KEY]: '{not json' }))).toEqual(new Set());
    expect(readUsedCategories(memory({ [SKILLS_STORAGE_KEY]: '42' }))).toEqual(new Set());
    expect(
      readUsedCategories(memory({ [SKILLS_STORAGE_KEY]: '["frontend", "not-a-category", 1]' }))
    ).toEqual(new Set(['frontend']));
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
    expect(() => markUsedCategory(broken, 'ai')).not.toThrow();
    expect(() => resetUsedCategories(broken)).not.toThrow();
    expect(readUsedCategories(broken)).toEqual(new Set());
  });

  it('reset clears every previously marked category', () => {
    const store = memory();
    markUsedCategory(store, 'languages');
    markUsedCategory(store, 'testing');
    resetUsedCategories(store);
    expect(readUsedCategories(store)).toEqual(new Set());
  });
});
