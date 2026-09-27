/**
 * The HUD sound toggle's state, persisted in `localStorage` (BACKLOG.md Phase 7 — GAME_DESIGN.md
 * → Audio: "defaults to off and remembers the choice"). State only until Phase 11 wires actual
 * playback to `sound:toggle`. Same pure pattern as `i18n/lang.ts`/`shared/visited.ts`.
 */
import type { KeyValueStore } from '../i18n/lang';

export const SOUND_STORAGE_KEY = 'portfolio:sound';

/** Off by default (never autoplay); on only if a previous visit explicitly turned it on. */
export function readSoundOn(store: KeyValueStore | null): boolean {
  try {
    return store?.getItem(SOUND_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Silently a no-op if storage throws (private mode / blocked): the choice then lasts only for
 * this page view. */
export function persistSoundOn(store: KeyValueStore | null, on: boolean): void {
  try {
    store?.setItem(SOUND_STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Private mode / blocked storage: the choice lasts only for this page view.
  }
}
