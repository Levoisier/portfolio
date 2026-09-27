import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../i18n/lang';
import { persistSoundOn, readSoundOn, SOUND_STORAGE_KEY } from './sound';

const memory = (init: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(init));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('shared/sound', () => {
  it('defaults to off with no store and with nothing stored yet', () => {
    expect(readSoundOn(null)).toBe(false);
    expect(readSoundOn(memory())).toBe(false);
  });

  it('persists on and off across reads', () => {
    const store = memory();
    persistSoundOn(store, true);
    expect(readSoundOn(store)).toBe(true);
    persistSoundOn(store, false);
    expect(readSoundOn(store)).toBe(false);
  });

  it('ignores junk in storage instead of throwing', () => {
    expect(readSoundOn(memory({ [SOUND_STORAGE_KEY]: 'yes' }))).toBe(false);
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
    expect(() => persistSoundOn(broken, true)).not.toThrow();
    expect(readSoundOn(broken)).toBe(false);
  });
});
