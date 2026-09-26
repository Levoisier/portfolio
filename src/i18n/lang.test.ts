import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  initialLang,
  persistLang,
  type KeyValueStore,
} from './lang';

const memory = (init: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(init));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('lang', () => {
  it('defaults to Spanish', () => {
    expect(DEFAULT_LANG).toBe('es');
    expect(initialLang(memory())).toBe('es');
    expect(initialLang(null)).toBe('es');
  });

  it('the stored choice wins; junk is ignored', () => {
    expect(initialLang(memory({ [LANG_STORAGE_KEY]: 'en' }))).toBe('en');
    expect(initialLang(memory({ [LANG_STORAGE_KEY]: 'fr' }))).toBe('es');
  });

  it('persists and survives throwing storage', () => {
    const store = memory();
    persistLang(store, 'en');
    expect(initialLang(store)).toBe('en');
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => persistLang(broken, 'en')).not.toThrow();
    expect(initialLang(broken)).toBe('es');
  });
});
