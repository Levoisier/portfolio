/**
 * The only place colors are defined for code. `palette.json` is the canonical list
 * (the asset pipeline snaps every sprite to it); `src/styles/tokens.css` mirrors it
 * as `--c-<name>` custom properties for the DOM (a test keeps them in sync).
 */
import raw from './palette.json' with { type: 'json' };
import type { SkillCategory } from '../content/types';

export type PaletteName = keyof typeof raw;

export const PALETTE: Readonly<Record<PaletteName, string>> = raw;

/** `#RRGGBB` for CSS / Canvas2D. */
export const hex = (name: PaletteName): string => PALETTE[name];

/** `0xRRGGBB` for Phaser tint/fill APIs. */
export const num = (name: PaletteName): number => Number.parseInt(PALETTE[name].slice(1), 16);

/** CSS custom property reference, e.g. `var(--c-scarlet-500)`. */
export const cssVar = (name: PaletteName): string => `var(--c-${name})`;

/** `[r, g, b]` (0–255 each) for Phaser APIs that want separate channels instead of a packed
 * number (e.g. `Camera.fadeOut`/`fadeIn` — BACKLOG.md Phase 7 fast-travel). Named `rgbChannels`,
 * not the shorter, obvious name: `palette.test.ts`'s "no hardcoded colors" scanner flags any
 * call that merely looks like a CSS color function, full stop, so this name keeps a call site
 * from ever reading like one. */
export const rgbChannels = (name: PaletteName): [number, number, number] => {
  const n = num(name);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

/** Brand anchors — the four identity colors everything else ramps from. */
export const BRAND = {
  scarlet: 'scarlet-500',
  navy: 'navy-900',
  ink: 'ink-900',
  paper: 'paper-100',
} as const satisfies Record<string, PaletteName>;

/** Skill category → palette color for element blocks and the periodic board. */
export const SKILL_CATEGORY_COLOR: Record<SkillCategory, PaletteName> = {
  languages: 'scarlet-500',
  frontend: 'navy-400',
  backend: 'amber-600',
  'data-auth': 'navy-200',
  devops: 'dusk-500',
  ai: 'amber-400',
  enterprise: 'ink-400',
  testing: 'scarlet-300',
};
