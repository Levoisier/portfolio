import { describe, expect, it } from 'vitest';
import { skills } from '../../content';
import { SKILL_CATEGORIES } from '../../content/types';
import type { StationTrigger } from './trigger';
import {
  BOARD_COLUMNS,
  boardRows,
  boardSlot,
  bumpedBlock,
  isBoardComplete,
  skillsInCategory,
} from './skills-logic';

const BLOCKS: StationTrigger[] = [
  { id: 'languages', x: 3250, triggerW: 32 },
  { id: 'frontend', x: 3350, triggerW: 32 },
];

describe('stations/skills-logic: bumpedBlock (bump detection)', () => {
  it('is null when the panda is not blocked upward, however close it is', () => {
    expect(bumpedBlock(3250, false, BLOCKS)).toBeNull();
  });

  it('resolves the block under the panda when it is blocked upward', () => {
    expect(bumpedBlock(3250, true, BLOCKS)).toBe('languages');
    expect(bumpedBlock(3350, true, BLOCKS)).toBe('frontend');
  });

  it('is null when blocked upward but between two blocks (nothing overhead)', () => {
    expect(bumpedBlock(3300, true, BLOCKS)).toBeNull();
  });

  it('respects the trigger half-open edges, same as stationAt', () => {
    expect(bumpedBlock(3233, true, BLOCKS)).toBeNull(); // just outside 3250 - 32/2
    expect(bumpedBlock(3234, true, BLOCKS)).toBe('languages'); // 3250 - 32/2, inclusive
    expect(bumpedBlock(3266, true, BLOCKS)).toBeNull(); // 3250 + 32/2, half-open
  });
});

describe('stations/skills-logic: boardSlot / boardRows (periodic board layout)', () => {
  it('fills a row left to right before wrapping to the next', () => {
    expect(boardSlot(1)).toEqual({ col: 0, row: 0 });
    expect(boardSlot(BOARD_COLUMNS)).toEqual({ col: BOARD_COLUMNS - 1, row: 0 });
    expect(boardSlot(BOARD_COLUMNS + 1)).toEqual({ col: 0, row: 1 });
  });

  it('gives every real skill number a distinct slot', () => {
    const slots = skills.map((s) => boardSlot(s.number));
    const keys = new Set(slots.map((s) => `${s.col},${s.row}`));
    expect(keys.size).toBe(skills.length);
  });

  it('computes the row count from the actual skill count, not a hard-coded number', () => {
    expect(boardRows(skills.length)).toBe(Math.ceil(skills.length / BOARD_COLUMNS));
    expect(boardRows(1)).toBe(1);
    expect(boardRows(BOARD_COLUMNS)).toBe(1);
    expect(boardRows(BOARD_COLUMNS + 1)).toBe(2);
  });

  it('every real skill fits within the computed row count', () => {
    const rows = boardRows(skills.length);
    for (const s of skills) expect(boardSlot(s.number).row).toBeLessThan(rows);
  });
});

describe('stations/skills-logic: isBoardComplete', () => {
  it('is false until every category has been used', () => {
    const used = new Set<(typeof SKILL_CATEGORIES)[number]>();
    expect(isBoardComplete(used, SKILL_CATEGORIES)).toBe(false);
    for (const cat of SKILL_CATEGORIES.slice(0, -1)) used.add(cat);
    expect(isBoardComplete(used, SKILL_CATEGORIES)).toBe(false);
    used.add(SKILL_CATEGORIES.at(-1)!);
    expect(isBoardComplete(used, SKILL_CATEGORIES)).toBe(true);
  });
});

describe('stations/skills-logic: skillsInCategory', () => {
  it('returns only that category, in periodic-board (number) order', () => {
    const frontend = skillsInCategory(skills, 'frontend');
    expect(frontend.every((s) => s.category === 'frontend')).toBe(true);
    expect(frontend.map((s) => s.number)).toEqual(
      [...frontend.map((s) => s.number)].sort((a, b) => a - b)
    );
    expect(frontend.length).toBe(skills.filter((s) => s.category === 'frontend').length);
  });
});
