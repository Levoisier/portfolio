import { translations, type Lang } from '../i18n/translations';

const STORAGE_KEY = 'portfolio-lang';
const DEFAULT_LANG: Lang = 'es';

export function getCurrentLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored as Lang;
  } catch {
    // localStorage may be unavailable (private browsing, permissions)
  }
  return DEFAULT_LANG;
}

export function applyLang(lang: Lang): void {
  const t = translations[lang];

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n!;
    if (Object.prototype.hasOwnProperty.call(t, key)) {
      el.textContent = t[key]!;
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria!;
    if (Object.prototype.hasOwnProperty.call(t, key)) {
      el.setAttribute('aria-label', t[key]!);
    }
  });

  document.documentElement.lang = lang === 'es' ? 'es-419' : 'en';

  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }

  window.dispatchEvent(new CustomEvent('lang:change', { detail: { lang } }));
}

// Auto-init: HTML is baked in Spanish; only swap if user previously chose English.
try {
  if (localStorage.getItem(STORAGE_KEY) === 'en') {
    applyLang('en');
  }
} catch {
  // ignore
}
