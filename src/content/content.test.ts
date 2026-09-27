import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LANGS,
  SKILL_CATEGORIES,
  confidentialProjects,
  profile,
  projects,
  sectionCopy,
  skillCategoryLabels,
  skillCategorySymbols,
  skills,
  skillsIntro,
} from './index';

const publicPath = (p: string) => new URL(`../../public${p}`, import.meta.url);

/** Collects every `{ es, en }` object in a tree with its path. */
function localizedNodes(node: unknown, path = '$'): [string, Record<string, unknown>][] {
  if (typeof node !== 'object' || node === null) return [];
  const keys = Object.keys(node);
  if (keys.length === LANGS.length && LANGS.every((l) => keys.includes(l))) {
    return [[path, node as Record<string, unknown>]];
  }
  return Object.entries(node).flatMap(([k, v]) => localizedNodes(v, `${path}.${k}`));
}

describe('content: bilingual completeness', () => {
  const all = {
    profile,
    projects,
    confidentialProjects,
    skillCategoryLabels,
    skillsIntro,
    sectionCopy,
  };
  it.each(localizedNodes(all))('%s has non-empty es + en', (_path, value) => {
    for (const lang of LANGS) {
      expect(typeof value[lang]).toBe('string');
      expect((value[lang] as string).trim().length).toBeGreaterThan(0);
    }
  });
});

describe('content: profile', () => {
  it('has contact links with valid hrefs', () => {
    expect(profile.contact.length).toBeGreaterThan(0);
    for (const link of profile.contact) {
      expect(link.href).toMatch(/^(mailto:|https:\/\/)/);
      expect(link.external).toBe(link.href.startsWith('https://'));
    }
  });
});

describe('content: projects', () => {
  it('have unique kebab-case ids', () => {
    const ids = projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('link only over https and label every live link', () => {
    for (const p of projects) {
      if (p.liveUrl) {
        expect(p.liveUrl).toMatch(/^https:\/\//);
        expect(p.liveAriaLabel, p.id).toBeDefined();
      }
    }
  });

  it('reference screenshots that exist on disk', () => {
    for (const shot of projects.flatMap((p) => p.screenshots ?? [])) {
      expect(existsSync(publicPath(shot.src)), shot.src).toBe(true);
      expect(existsSync(publicPath(shot.thumb)), shot.thumb).toBe(true);
    }
  });
});

describe('content: confidential (Golden Rule — no screenshots, links, client or employer names)', () => {
  const allowed = ['id', 'industry', 'role', 'stack', 'impact', 'duration', 'teamSize'];
  const linkish = /https?:|www\.|\.(com|co|io|net|org|app)\b|@/i;

  it('only uses the allowed fields', () => {
    for (const c of confidentialProjects) {
      expect(
        Object.keys(c).filter((k) => !allowed.includes(k)),
        c.id
      ).toEqual([]);
    }
  });

  it('contains no links, domains or emails in any text', () => {
    const texts = JSON.stringify(confidentialProjects);
    expect(texts).not.toMatch(linkish);
  });

  it('have unique ids', () => {
    const ids = confidentialProjects.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('content: skills', () => {
  it('have unique symbols and a contiguous 1..N numbering', () => {
    expect(new Set(skills.map((s) => s.symbol)).size).toBe(skills.length);
    expect(skills.map((s) => s.number).sort((a, b) => a - b)).toEqual(skills.map((_, i) => i + 1));
  });

  it('use known categories, each labelled and non-empty', () => {
    for (const s of skills) {
      expect(SKILL_CATEGORIES).toContain(s.category);
      expect(s.proficiency).toBeGreaterThanOrEqual(0);
      expect(s.proficiency).toBeLessThanOrEqual(100);
    }
    for (const cat of SKILL_CATEGORIES) {
      expect(skillCategoryLabels[cat]).toBeDefined();
      expect(skillCategorySymbols[cat]).toMatch(/^[A-Z][a-z]$/);
      expect(
        skills.some((s) => s.category === cat),
        cat
      ).toBe(true);
    }
  });
});
