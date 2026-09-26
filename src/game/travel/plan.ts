/**
 * Pure "basic walk-to-x" planning for click/tap-to-open (ARCHITECTURE.md → Input → Pointer / tap;
 * BACKLOG.md Phase 5). No Phaser import (folder map: `travel/ ← plan.ts (pure) + auto-walk`) —
 * `WorldScene` drives the panda toward the plan by feeding `autoWalkStep`'s intent every frame.
 */
import type { Intent } from '../input/intent';

export interface TravelPlan {
  targetX: number;
  direction: -1 | 1 | 0;
}

/** A plan from `fromX` to `targetX`; `direction` is 0 only when already there. */
export function planWalk(fromX: number, targetX: number): TravelPlan {
  const dx = targetX - fromX;
  return { targetX, direction: dx > 0 ? 1 : dx < 0 ? -1 : 0 };
}

/** Within `epsilon` px of the plan's target — close enough to stop and open the station. */
export function arrivedAt(x: number, plan: TravelPlan, epsilon = 2): boolean {
  return Math.abs(x - plan.targetX) <= epsilon;
}

/**
 * One frame of auto-walk intent (plain walk, never run): `null` once arrived, telling the caller
 * to stop the plan and open the destination.
 */
export function autoWalkStep(x: number, plan: TravelPlan, epsilon = 2): Partial<Intent> | null {
  if (plan.direction === 0 || arrivedAt(x, plan, epsilon)) return null;
  return { moveX: plan.direction };
}
