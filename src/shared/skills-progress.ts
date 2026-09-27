/**
 * Which element blocks' categories have already been bumped, persisted in `localStorage`
 * (ARCHITECTURE.md → Reagent lab; AGENTS.md Golden Rule 2/9 — "Progress persisted", BACKLOG.md
 * Phase 9). Pure functions over an injected store, same pattern as `shared/visited.ts` and
 * `i18n/lang.ts`'s `initialLang`/`persistLang`, so they are unit-tested without a real browser;
 * `game/stations/Skills.ts` supplies `safeLocalStorage()`.
 */
import { SKILL_CATEGORIES, type SkillCategory } from '../content/types';
import type { KeyValueStore } from '../i18n/lang';

export const SKILLS_STORAGE_KEY = 'portfolio:skills';

const isCategory = (v: unknown): v is SkillCategory =>
  typeof v === 'string' && (SKILL_CATEGORIES as readonly string[]).includes(v);

/** The stored set of already-bumped categories; corrupt or blocked storage reads as empty. */
export function readUsedCategories(store: KeyValueStore | null): Set<SkillCategory> {
  try {
    const raw = store?.getItem(SKILLS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(isCategory) : []);
  } catch {
    return new Set();
  }
}

/** Adds `category` to the stored set and returns the resulting set. Silently a no-op if storage
 * throws (private mode / blocked): the block then reads as bumped only for this page view. */
export function markUsedCategory(
  store: KeyValueStore | null,
  category: SkillCategory
): Set<SkillCategory> {
  const used = readUsedCategories(store);
  used.add(category);
  try {
    store?.setItem(SKILLS_STORAGE_KEY, JSON.stringify([...used]));
  } catch {
    // Private mode / blocked storage: the mark lasts only for this page view.
  }
  return used;
}

/** The stack panel's "reset lab" control: clears every category back to un-bumped. */
export function resetUsedCategories(store: KeyValueStore | null): void {
  try {
    store?.setItem(SKILLS_STORAGE_KEY, '[]');
  } catch {
    // Private mode / blocked storage: nothing was persisted to begin with.
  }
}
