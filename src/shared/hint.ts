/**
 * First-visit controls hint, persisted in `localStorage` (BACKLOG.md Phase 7 — GAME_DESIGN.md →
 * HUD: "disappears after the first move"). Same pure-function-over-an-injected-store pattern as
 * `i18n/lang.ts`/`shared/visited.ts`, so it is unit-tested without a real browser.
 */
import type { KeyValueStore } from '../i18n/lang';

export const HINT_STORAGE_KEY = 'portfolio:hint-seen';

/** Whether the hint was already dismissed in an earlier visit (or this one). */
export function hintSeen(store: KeyValueStore | null): boolean {
  try {
    return store?.getItem(HINT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Silently a no-op if storage throws (private mode / blocked): the dismissal then lasts only
 * for this page view. */
export function markHintSeen(store: KeyValueStore | null): void {
  try {
    store?.setItem(HINT_STORAGE_KEY, '1');
  } catch {
    // Private mode / blocked storage: the dismissal lasts only for this page view.
  }
}
