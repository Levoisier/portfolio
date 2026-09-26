/**
 * Content model — the single source of truth for everything the portfolio says.
 * The game world and the DOM panels both read from here; no copy lives in game code.
 */

export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** A string (or value) that must exist in every supported language. */
export type Localized<T = string> = Record<Lang, T>;

export type ContactChannel = 'email' | 'github' | 'linkedin' | 'whatsapp';

export interface ContactLink {
  channel: ContactChannel;
  /** Visible text, identical in every language (addresses, handles). */
  label: string;
  href: string;
  ariaLabel: Localized;
  /** Opens in a new tab (`target="_blank" rel="noopener noreferrer"`). */
  external: boolean;
}

export interface Profile {
  name: string;
  /** Ordered role lines, e.g. "Full Stack Developer" + "Chemical Engineer". */
  roles: Localized[];
  /** Short kicker from the old hero ("A little glance at my work"). */
  tagline: Localized;
  /** One-sentence positioning, used for meta description and the intro. */
  summary: Localized;
  /** Closing call to action shown at the contact station. */
  callToAction: Localized;
  contact: ContactLink[];
}

export interface Screenshot {
  /** Path under `public/`, e.g. `/media/projects/fiora/…`. */
  src: string;
  thumb: string;
  alt: Localized;
  width: number;
  height: number;
}

export interface Project {
  /** Stable kebab-case id; also the station id and the deep-link hash (`/#fiora`). */
  id: string;
  title: string;
  description: Localized;
  stack: string[];
  liveUrl?: string;
  liveAriaLabel?: Localized;
  platformNote?: Localized;
  screenshots?: Screenshot[];
}

/**
 * NDA work. Golden Rule: never add screenshots, links, client names or employer
 * names. `content.test.ts` enforces the allowed field set.
 */
export interface ConfidentialProject {
  id: string;
  industry: Localized;
  role: Localized;
  stack: string[];
  impact: Localized;
  duration: Localized;
  teamSize: string;
}

export const SKILL_CATEGORIES = [
  'languages',
  'frontend',
  'backend',
  'data-auth',
  'devops',
  'ai',
  'enterprise',
  'testing',
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export interface Skill {
  /** Periodic-table style symbol, e.g. "Ts". */
  symbol: string;
  name: string;
  /** "Atomic number" — display order on the periodic board. */
  number: number;
  category: SkillCategory;
  /** Self-assessed proficiency, 0–100. */
  proficiency: number;
}
