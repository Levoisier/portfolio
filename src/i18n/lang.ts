/**
 * Language: the stored choice, otherwise Spanish (DECISIONS.md → Languages; no browser
 * detection). The pre-paint inline script in index.astro applies the same rule before first
 * paint using LANG_STORAGE_KEY and HTML_LANG, so the page never flashes the wrong language.
 */
import { LANGS, type Lang } from '../content/types';
import { bus } from '../shared/bus';

export const DEFAULT_LANG: Lang = 'es';
export const LANG_STORAGE_KEY = 'portfolio:lang';
/** `html[lang]` per language (`data-lang` holds the short code). */
export const HTML_LANG: Record<Lang, string> = { es: 'es-419', en: 'en' };

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

export function initialLang(store: KeyValueStore | null): Lang {
  try {
    const stored = store?.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function persistLang(store: KeyValueStore | null, lang: Lang): void {
  try {
    store?.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Private mode / blocked storage: the choice lasts for this page view only.
  }
}

/** Exported for other stores that persist through `localStorage` (e.g. `shared/visited.ts`),
 * wrapped the same way: private mode / blocked storage falls back to session-only state. */
export function safeLocalStorage(): KeyValueStore | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** The active language (read from `html[data-lang]`, which the pre-paint script set). */
export function getLang(): Lang {
  const current = document.documentElement.dataset.lang;
  return isLang(current) ? current : initialLang(safeLocalStorage());
}

export function setLang(lang: Lang): void {
  const html = document.documentElement;
  html.lang = HTML_LANG[lang];
  html.dataset.lang = lang;
  persistLang(safeLocalStorage(), lang);
  bus.emit('lang:change', { lang });
}
