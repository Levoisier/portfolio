/** Contract of the pure player state machine (`logic.ts`) and its Phaser adapter. */
export type PlayerStateName = 'idle' | 'walk' | 'run' | 'air' | 'land' | 'interact' | 'wave';

/** Air-strip frame names (manifest `panda-air.frameNames`); `crouch` is unused. */
export type AirFrame = 'takeoff' | 'rise' | 'apex' | 'fall' | 'land';

export interface PlayerState {
  name: PlayerStateName;
  /** −1 or 1; art faces right, so −1 means flipX. */
  facing: -1 | 1;
  /** Current horizontal velocity, px/s (the machine accelerates it toward the target). */
  vx: number;
  /** ms since the body was last grounded (Infinity before the first landing is fine as 0). */
  sinceGrounded: number;
  /** ms since the last jump press not yet consumed (Infinity = none buffered). */
  sinceJumpPressed: number;
  /** ms since the current jump started (Infinity = not in a jump started by us). */
  sinceJump: number;
  /** ms since the last touchdown (drives the `land` frame / state). */
  sinceLanded: number;
  /** The current jump was already cut by an early release. */
  jumpCut: boolean;
  /** Grounded on the previous step (to detect touchdown / leaving the ground). */
  wasGrounded: boolean;
}

/** What the physics body reports this step (read from Arcade before calling `step`). */
export interface BodyReport {
  grounded: boolean;
  vy: number;
  /** Head hit a ceiling / block from below this step. */
  blockedUp: boolean;
}

/** An externally imposed pose: `interact` while a panel is open, `wave` at spawn / finale. */
export type Pose = 'interact' | 'wave' | null;

export interface StepResult {
  state: PlayerState;
  vx: number;
  /** A velocity to set this step, or null to leave vy to physics. */
  vy: number | null;
  /** Animation key: `panda-idle` | `panda-walk` | `panda-run` | `panda-air` | `panda-interact` | `panda-wave`. */
  anim: string;
  /** For `panda-air` only: which named frame to show. */
  frame?: AirFrame;
  flipX: boolean;
}
