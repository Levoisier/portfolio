/**
 * The panda's pure state machine (ARCHITECTURE.md → Player): intent + what the body reports in,
 * velocities to apply + what to show out. No Phaser, so every feel rule is unit-tested; the
 * adapter (`PandaSprite`) only copies `vx`/`vy` onto the Arcade body and plays `anim`/`frame`.
 */
import {
  AIR_ACCEL,
  AIR_APEX_VY,
  COYOTE_MS,
  GROUND_ACCEL,
  GROUND_DECEL,
  JUMP_BUFFER_MS,
  JUMP_CUT,
  JUMP_VELOCITY,
  LAND_MS,
  RUN_SPEED,
  TAKEOFF_MS,
  WALK_SPEED,
} from '../config';
import type { Intent } from '../input/intent';
import type { AirFrame, BodyReport, PlayerState, PlayerStateName, Pose, StepResult } from './types';

/** Animation keys (manifest ids); `air` and `land` share the `panda-air` strip. */
export const ANIM = {
  idle: 'panda-idle',
  walk: 'panda-walk',
  run: 'panda-run',
  air: 'panda-air',
  interact: 'panda-interact',
  wave: 'panda-wave',
} as const;

export type AnimKey = (typeof ANIM)[keyof typeof ANIM];

/**
 * Longest dt acceleration integrates over: after a hitch the panda must not jump to full speed
 * in one step. Timers still advance by the real dt, so stale presses and coyote windows expire.
 */
export const MAX_STEP_MS = 100;

export function initialPlayerState(facing: -1 | 1 = 1): PlayerState {
  return {
    name: 'idle',
    facing,
    vx: 0,
    sinceGrounded: 0,
    sinceJumpPressed: Infinity,
    sinceJump: Infinity,
    sinceLanded: Infinity,
    jumpCut: false,
    wasGrounded: true,
  };
}

export function step(
  prev: PlayerState,
  intent: Intent,
  dtMs: number,
  body: BodyReport,
  pose: Pose = null
): StepResult {
  if (!(dtMs > 0)) return present(prev, prev.vx, null, body.vy);

  // A body moving up is airborne: on a frame where Arcade runs no physics step right after a
  // jump, `blocked.down` is still the previous step's `true` while vy is already the launch speed.
  const grounded = body.grounded && body.vy >= 0;
  const touchdown = grounded && !prev.wasGrounded;
  // Poses only hold on the ground; in the air they wait for the landing.
  const posed = grounded && pose !== null;
  const moveX = posed ? 0 : clampMove(intent.moveX);
  const moving = moveX !== 0;
  const facing: -1 | 1 = moveX > 0 ? 1 : moveX < 0 ? -1 : prev.facing;

  const sinceGrounded = grounded ? 0 : prev.sinceGrounded + dtMs;
  const sinceLanded = touchdown ? 0 : prev.sinceLanded + dtMs;
  let sinceJumpPressed = intent.jumpPressed ? 0 : prev.sinceJumpPressed + dtMs;

  // A finite `sinceJump` in the air means this airtime is our own jump, which spends the coyote
  // window: walking off a ledge allows one late jump, a jump never allows a second.
  const inOwnJump = Number.isFinite(prev.sinceJump);
  const canJump = grounded || (sinceGrounded <= COYOTE_MS && !inOwnJump);
  const fire = !posed && sinceJumpPressed <= JUMP_BUFFER_MS && canJump;
  if (fire || posed) sinceJumpPressed = Infinity;

  const sinceJump = fire ? 0 : grounded ? Infinity : prev.sinceJump + dtMs;
  let jumpCut = fire || grounded ? false : prev.jumpCut;

  let vy: number | null = null;
  if (fire) {
    vy = JUMP_VELOCITY;
  } else if (body.blockedUp && body.vy < 0) {
    vy = 0;
  } else if (Number.isFinite(sinceJump) && body.vy < 0 && !intent.jumpHeld && !jumpCut) {
    // Variable jump height: an early release cuts the rise once; after the apex vy ≥ 0.
    vy = body.vy * JUMP_CUT;
    jumpCut = true;
  }

  const target = moveX * (intent.run ? RUN_SPEED : WALK_SPEED);
  const vx = nextVx(prev.vx, target, grounded, Math.min(dtMs, MAX_STEP_MS) / 1000);

  let name: PlayerStateName;
  if (fire || !grounded) name = 'air';
  else if (posed) name = pose;
  // The land frame only continues an uninterrupted landing; any move or jump ends it for good.
  else if (!moving && (touchdown || (prev.name === 'land' && sinceLanded < LAND_MS))) name = 'land';
  else if (moving) name = intent.run ? 'run' : 'walk';
  else name = 'idle';

  const state: PlayerState = {
    name,
    facing,
    vx,
    sinceGrounded,
    sinceJumpPressed,
    sinceJump,
    sinceLanded,
    jumpCut,
    wasGrounded: grounded,
  };
  return present(state, vx, vy, body.vy);
}

/**
 * Apex height (px) of a jump launched at `v0` (magnitude; the sign is ignored so
 * `JUMP_VELOCITY` can be passed as is), integrated the way Arcade does at a fixed step: each
 * step first applies gravity to v, then moves by the new v. That is why 330 px/s at 900 px/s²
 * peaks at 57.75 px at 60 Hz, not v²/2g = 60.5.
 */
export function jumpApex(gravity: number, v0: number, stepHz: number): number {
  const dv = gravity / stepHz;
  // Rejected rather than looped on: with stepHz = Infinity, dv is 0 and v never reaches 0.
  if (!(gravity > 0) || !(stepHz > 0) || !(dv > 0 && dv < Infinity) || !Number.isFinite(v0)) {
    throw new RangeError(`jumpApex: invalid input (g=${gravity}, v0=${v0}, hz=${stepHz})`);
  }
  const speed = Math.abs(v0);
  // Steps k = 1…n still move up (v_k = speed − k·dv > 0); summing Σ v_k / stepHz in closed form
  // keeps this O(1) for any input and free of accumulated float drift.
  const n = Math.ceil(speed / dv) - 1;
  if (!(n > 0)) return 0;
  // dv negligible next to speed (n overflows): the sum is its continuous limit v²/2g.
  if (!Number.isFinite(n)) return (speed * speed) / (2 * gravity);
  return (n * (speed - (dv * (n + 1)) / 2)) / stepHz;
}

function present(state: PlayerState, vx: number, vy: number | null, bodyVy: number): StepResult {
  const flipX = state.facing === -1;
  switch (state.name) {
    case 'air':
      return { state, vx, vy, anim: ANIM.air, frame: airFrame(state, vy ?? bodyVy), flipX };
    case 'land':
      return { state, vx, vy, anim: ANIM.air, frame: 'land', flipX };
    default:
      return { state, vx, vy, anim: ANIM[state.name], flipX };
  }
}

/** Air frames follow the state, not a clock; walking off a ledge has no takeoff. */
function airFrame(state: PlayerState, vy: number): AirFrame {
  if (state.sinceJump < TAKEOFF_MS) return 'takeoff';
  if (vy < -AIR_APEX_VY) return 'rise';
  if (vy > AIR_APEX_VY) return 'fall';
  return 'apex';
}

/** NaN carries no direction; ±Infinity clamps like any other out-of-range value. */
function clampMove(moveX: number): number {
  return Number.isNaN(moveX) ? 0 : Math.max(-1, Math.min(1, moveX));
}

/**
 * vx after `s` seconds. On the ground, speeding up (same direction or from rest) uses
 * GROUND_ACCEL and slowing uses GROUND_DECEL; a turn brakes only until it stops and spends the
 * rest of the step speeding up, so where frame boundaries fall does not change the result.
 */
function nextVx(vx: number, target: number, grounded: boolean, s: number): number {
  if (!grounded) return approach(vx, target, AIR_ACCEL * s);
  if (vx * target < 0) {
    const stopS = Math.abs(vx) / GROUND_DECEL;
    if (stopS >= s) return approach(vx, 0, GROUND_DECEL * s);
    return approach(0, target, GROUND_ACCEL * (s - stopS));
  }
  const rate = Math.abs(target) > Math.abs(vx) ? GROUND_ACCEL : GROUND_DECEL;
  return approach(vx, target, rate * s);
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return target;
}
