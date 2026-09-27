/**
 * Pure Reagent lab math (BACKLOG.md Phase 9 — ARCHITECTURE.md → Reagent lab): which block a
 * "bump from below" hit, and where a skill's element tile lands on the periodic board. No
 * Phaser; `stations/Skills.ts` is the adapter that calls these from the scene.
 */
import type { Skill, SkillCategory } from '../../content/types';
import { stationAt, type StationTrigger } from './trigger';

/** The block whose bottom edge the panda's head just hit — airborne, blocked from continuing
 * upward (`body.blockedUp`, `player/logic.ts`), while under a block's x span — or `null`. Reuses
 * `stationAt`'s trigger-span math (unit-tested there); the only new part is gating it on the
 * physics signal, since mere proximity should never count as a bump (only interacting, which
 * goes through the ordinary station-open path, does). `stations` is the block stations only
 * (`stations/Skills.ts` passes its own `kind: 'block'` filter, same as every other trigger
 * filter `WorldScene` applies before calling `stationAt`). */
export function bumpedBlock(
  x: number,
  blockedUp: boolean,
  stations: readonly StationTrigger[]
): string | null {
  if (!blockedUp) return null;
  return stationAt(x, stations);
}

export interface BoardSlot {
  col: number;
  row: number;
}

/** Columns in the periodic board's flat grid (GAME_DESIGN.md → Skills mechanic: "arc into the
 * periodic board"). A flat, `number`-ordered grid reads left-to-right, top-to-bottom, is far
 * shorter than one column per category (the tallest category alone would need 8 rows — the lab
 * wall does not have that much headroom above the blocks, ARCHITECTURE.md → Rendering contract),
 * and still visually clusters by category most of the time: `content/skills.ts` assigns numbers
 * in category blocks. */
export const BOARD_COLUMNS = 12;

/** The slot `skill.number` (1-based, "atomic number") lands in, wrapped into `columns`-wide rows. */
export function boardSlot(number: number, columns: number = BOARD_COLUMNS): BoardSlot {
  const index = number - 1;
  return { col: index % columns, row: Math.floor(index / columns) };
}

/** How many rows a board holding `count` tiles needs — read from the data (`skills.length`),
 * never hard-coded, so the board always fits however many skills `content/skills.ts` lists. */
export function boardRows(count: number, columns: number = BOARD_COLUMNS): number {
  return Math.max(1, Math.ceil(count / columns));
}

/** Whether every category has been bumped — the board is "complete" (GAME_DESIGN.md → Skills
 * mechanic). `categories` is `SKILL_CATEGORIES`, passed in to keep this pure/content-agnostic. */
export function isBoardComplete(
  used: ReadonlySet<SkillCategory>,
  categories: readonly SkillCategory[]
): boolean {
  return categories.every((c) => used.has(c));
}

/** The skills belonging to one category, in periodic-board (`number`) order — what pops out and
 * arcs into the board when that category's block is bumped. */
export function skillsInCategory(skills: readonly Skill[], category: SkillCategory): Skill[] {
  return skills.filter((s) => s.category === category).sort((a, b) => a.number - b.number);
}
