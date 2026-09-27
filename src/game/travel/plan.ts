/**
 * Pure "basic walk-to-x" planning for click/tap-to-open (ARCHITECTURE.md → Input → Pointer / tap;
 * BACKLOG.md Phase 5). No Phaser import (folder map: `travel/ ← plan.ts (pure) + auto-walk`) —
 * `WorldScene` drives the panda toward the plan by feeding `autoWalkStep`'s intent every frame.
 */
import type { Intent } from '../input/intent';
import { WORLD_LAYOUT } from '../world/layout';

export interface TravelPlan {
  targetX: number;
  direction: -1 | 1 | 0;
  /** Fast travel (BACKLOG.md Phase 7 — the menu): runs instead of walking. Absent for a plain
   * click-to-open walk, so `autoWalkStep` keeps returning its pre-Phase-7 shape for that case. */
  run?: boolean;
}

/** A plan from `fromX` to `targetX`; `direction` is 0 only when already there. */
export function planWalk(fromX: number, targetX: number): TravelPlan {
  const dx = targetX - fromX;
  return { targetX, direction: dx > 0 ? 1 : dx < 0 ? -1 : 0 };
}

/** A menu/fast-travel plan (GAME_DESIGN.md → Menu / map): the same walk, tagged to run. */
export function planFastTravel(fromX: number, targetX: number): TravelPlan {
  return { ...planWalk(fromX, targetX), run: true };
}

/** Within `epsilon` px of the plan's target — close enough to stop and open the station. */
export function arrivedAt(x: number, plan: TravelPlan, epsilon = 2): boolean {
  return Math.abs(x - plan.targetX) <= epsilon;
}

/**
 * One frame of auto-walk intent: `null` once arrived, telling the caller to stop the plan and
 * open the destination. Walks for a plain click-to-open plan; runs (`run: true`, the intent
 * merger's overridable `travel` source) for a fast-travel one.
 */
export function autoWalkStep(x: number, plan: TravelPlan, epsilon = 2): Partial<Intent> | null {
  if (plan.direction === 0 || arrivedAt(x, plan, epsilon)) return null;
  return plan.run ? { moveX: plan.direction, run: true } : { moveX: plan.direction };
}

/**
 * The x a menu/fast-travel selection should aim for: a station's own x, or — for a stop with no
 * station yet (today, only `lab`: the Reagent lab has no station until Phase 9) — the centre of
 * its zone. `null` for an id that is neither.
 */
export function travelTargetX(id: string): number | null {
  const station = WORLD_LAYOUT.stations.find((s) => s.id === id);
  if (station) return station.x;
  const zone = WORLD_LAYOUT.zones.find((z) => z.id === id);
  return zone ? Math.round((zone.x0 + zone.x1) / 2) : null;
}

/** Screens (view widths) beyond which a menu selection fade-teleports instead of running there. */
export const FADE_TRAVEL_SCREENS = 1.5;

/**
 * Whether a menu/fast-travel selection should fade-teleport instead of an auto-run pan: farther
 * than `screens` view-widths away, or the visitor prefers reduced motion (GAME_DESIGN.md →
 * Ambience tiers: "fast-travel uses fades instead of pans" — a nearby stop's own pan is still a
 * camera pan, and reduced motion means none, not just fewer/shorter ones).
 */
export function shouldFadeTravel(
  fromX: number,
  targetX: number,
  viewW: number,
  reducedMotion: boolean,
  screens = FADE_TRAVEL_SCREENS
): boolean {
  return reducedMotion || Math.abs(targetX - fromX) > screens * viewW;
}
