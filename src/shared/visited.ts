/**
 * Visited stations, persisted in `localStorage` (ARCHITECTURE.md → Stations & panels; AGENTS.md
 * Golden Rule 2/9). Pure functions take an injected store (same pattern as `i18n/lang.ts`) so
 * they are testable without a real browser; `src/ui/panels.ts` supplies `safeLocalStorage()`.
 */
import type { KeyValueStore } from '../i18n/lang';

export const VISITED_STORAGE_KEY = 'portfolio:visited';

/** The stored set of visited station/panel ids; corrupt or blocked storage reads as empty. */
export function readVisited(store: KeyValueStore | null): Set<string> {
  try {
    const raw = store?.getItem(VISITED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    );
  } catch {
    return new Set();
  }
}

/** Adds `id` to the stored set and returns the resulting set. Silently a no-op if storage
 * throws (private mode / blocked): the mark then lasts only for this page view. */
export function markVisited(store: KeyValueStore | null, id: string): Set<string> {
  const visited = readVisited(store);
  visited.add(id);
  try {
    store?.setItem(VISITED_STORAGE_KEY, JSON.stringify([...visited]));
  } catch {
    // Private mode / blocked storage: the mark lasts only for this page view.
  }
  return visited;
}
