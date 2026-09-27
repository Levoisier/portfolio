import { describe, expect, it } from 'vitest';
import {
  AIR_ACCEL,
  AIR_APEX_VY,
  COYOTE_MS,
  GRAVITY,
  GROUND_ACCEL,
  GROUND_DECEL,
  JUMP_BUFFER_MS,
  JUMP_CUT,
  JUMP_VELOCITY,
  LAND_MS,
  LAYOUT_STEP_HZ,
  RUN_SPEED,
  TAKEOFF_MS,
  WALK_SPEED,
} from '../config';
import { NO_INTENT, type Intent } from '../input/intent';
import { ANIM, MAX_STEP_MS, initialPlayerState, jumpApex, step } from './logic';
import type { BodyReport, PlayerState, Pose, StepResult } from './types';

/** 20 ms steps keep timer boundaries exact (COYOTE 90, BUFFER 120, TAKEOFF 60, LAND 80). */
const DT = 20;
const GROUND: BodyReport = { grounded: true, vy: 0, blockedUp: false };
const air = (vy: number, blockedUp = false): BodyReport => ({ grounded: false, vy, blockedUp });
const intent = (over: Partial<Intent> = {}): Intent => ({ ...NO_INTENT, ...over });

/** Runs `n` identical steps and returns every result. */
function steps(
  from: PlayerState,
  n: number,
  input: Intent,
  body: BodyReport,
  pose: Pose = null,
  dt = DT
): StepResult[] {
  const out: StepResult[] = [];
  let state = from;
  for (let i = 0; i < n; i++) {
    const r = step(state, input, dt, body, pose);
    out.push(r);
    state = r.state;
  }
  return out;
}

const last = (rs: StepResult[]): StepResult => {
  const r = rs.at(-1);
  if (!r) throw new Error('no steps');
  return r;
};

/** A grounded state moving at `vx`. */
const movingAt = (vx: number): PlayerState => ({ ...initialPlayerState(), vx });

/** Airborne after walking off a ledge `ms` ago (no jump of our own). */
function walkedOff(ms: number): PlayerState {
  return last(steps(initialPlayerState(), ms / DT, intent(), air(30))).state;
}

/** Airborne `ms` into our own jump. */
function jumped(ms = 0): PlayerState {
  let s = step(
    initialPlayerState(),
    intent({ jumpPressed: true, jumpHeld: true }),
    DT,
    GROUND
  ).state;
  for (let t = 0; t < ms; t += DT) s = step(s, intent({ jumpHeld: true }), DT, air(-300)).state;
  return s;
}

/**
 * Drives `step` against a fake Arcade body integrated the way Arcade does (fixed step, gravity
 * before position, physics before the scene update) and reports the jump's apex height.
 */
function simulateJump(
  heldMs: number,
  hz = LAYOUT_STEP_HZ
): { apex: number; landed: StepResult; frames: string[] } {
  const dt = 1000 / hz;
  let y = 0;
  let vy = 0;
  let grounded = true;
  let state = initialPlayerState();
  let apex = 0;
  const frames: string[] = [];
  for (let frame = 0; frame < 600; frame++) {
    if (frame > 0) {
      vy += GRAVITY / hz;
      y += vy / hz;
      grounded = y >= 0;
      if (grounded) [y, vy] = [0, 0];
    }
    apex = Math.max(apex, -y);
    const input = intent({ jumpPressed: frame === 0, jumpHeld: frame * dt < heldMs });
    const r = step(state, input, dt, { grounded, vy, blockedUp: false });
    state = r.state;
    if (r.vy !== null) vy = r.vy;
    const shown = r.frame ?? r.anim;
    if (frames.at(-1) !== shown) frames.push(shown);
    if (frame > 0 && grounded) return { apex, landed: r, frames };
  }
  throw new Error('never landed');
}

/** The literal Arcade loop `jumpApex` must agree with: gravity first, then move; stop at v ≤ 0. */
function referenceApex(gravity: number, v0: number, stepHz: number): number {
  let v = Math.abs(v0);
  let y = 0;
  for (;;) {
    v -= gravity / stepHz;
    if (v <= 0) return y;
    y += v / stepHz;
  }
}

describe('initialPlayerState', () => {
  it('is grounded, idle, at rest, with nothing buffered', () => {
    expect(initialPlayerState()).toEqual({
      name: 'idle',
      facing: 1,
      vx: 0,
      sinceGrounded: 0,
      sinceJumpPressed: Infinity,
      sinceJump: Infinity,
      sinceLanded: Infinity,
      jumpCut: false,
      wasGrounded: true,
    });
    expect(initialPlayerState(-1).facing).toBe(-1);
  });
});

describe('ground states and animations', () => {
  it('goes idle → walk → run → walk → idle with matching anim keys', () => {
    let r = step(initialPlayerState(), intent(), DT, GROUND);
    expect([r.state.name, r.anim, r.frame]).toEqual(['idle', ANIM.idle, undefined]);
    r = step(r.state, intent({ moveX: 1 }), DT, GROUND);
    expect([r.state.name, r.anim]).toEqual(['walk', 'panda-walk']);
    r = step(r.state, intent({ moveX: 1, run: true }), DT, GROUND);
    expect([r.state.name, r.anim]).toEqual(['run', 'panda-run']);
    r = step(r.state, intent({ moveX: 1 }), DT, GROUND);
    expect(r.state.name).toBe('walk');
    r = step(r.state, intent(), DT, GROUND);
    expect([r.state.name, r.anim]).toEqual(['idle', 'panda-idle']);
  });

  it('holding run without a direction stays idle', () => {
    expect(step(initialPlayerState(), intent({ run: true }), DT, GROUND).state.name).toBe('idle');
  });

  it('never asks for a vertical velocity while just moving on the ground', () => {
    for (const r of steps(initialPlayerState(), 10, intent({ moveX: -1, run: true }), GROUND)) {
      expect(r.vy).toBeNull();
    }
  });
});

describe('horizontal speed', () => {
  it('accelerates to walk speed at GROUND_ACCEL and never overshoots', () => {
    const rs = steps(initialPlayerState(), 30, intent({ moveX: 1 }), GROUND);
    expect(rs[0]?.vx).toBeCloseTo((GROUND_ACCEL * DT) / 1000, 9);
    expect(Math.max(...rs.map((r) => r.vx))).toBe(WALK_SPEED);
    expect(last(rs).vx).toBe(WALK_SPEED);
    expect(last(rs).state.vx).toBe(WALK_SPEED);
  });

  it('reaches run speed while running, and brakes back to walk at GROUND_DECEL', () => {
    const running = last(steps(initialPlayerState(), 30, intent({ moveX: 1, run: true }), GROUND));
    expect(running.vx).toBe(RUN_SPEED);
    const r = step(running.state, intent({ moveX: 1 }), DT, GROUND);
    expect(r.vx).toBeCloseTo(RUN_SPEED - (GROUND_DECEL * DT) / 1000, 9);
    expect(last(steps(r.state, 10, intent({ moveX: 1 }), GROUND)).vx).toBe(WALK_SPEED);
  });

  it('brakes to exactly zero on release without reversing', () => {
    const rs = steps(movingAt(RUN_SPEED), 20, intent(), GROUND);
    expect(rs[0]?.vx).toBeCloseTo(RUN_SPEED - (GROUND_DECEL * DT) / 1000, 9);
    expect(Math.min(...rs.map((r) => r.vx))).toBe(0);
    expect(last(rs).vx).toBe(0);
  });

  it('turns with the braking rate and settles at the opposite speed', () => {
    const rs = steps(movingAt(WALK_SPEED), 30, intent({ moveX: -1 }), GROUND);
    expect(rs[0]?.vx).toBeCloseTo(WALK_SPEED - (GROUND_DECEL * DT) / 1000, 9);
    expect(Math.min(...rs.map((r) => r.vx))).toBe(-WALK_SPEED);
    expect(last(rs).vx).toBe(-WALK_SPEED);
  });

  it('uses AIR_ACCEL for every change in the air', () => {
    const s = walkedOff(DT);
    expect(step(s, intent({ moveX: 1 }), DT, air(30)).vx).toBeCloseTo((AIR_ACCEL * DT) / 1000, 9);
    const fast = { ...s, vx: WALK_SPEED };
    expect(step(fast, intent({ moveX: -1 }), DT, air(30)).vx).toBeCloseTo(
      WALK_SPEED - (AIR_ACCEL * DT) / 1000,
      9
    );
  });

  it('clamps moveX to [-1, 1] (±Infinity included) and treats NaN as no input', () => {
    expect(last(steps(initialPlayerState(), 30, intent({ moveX: 5 }), GROUND)).vx).toBe(WALK_SPEED);
    const right = last(steps(initialPlayerState(), 30, intent({ moveX: Infinity }), GROUND));
    expect([right.vx, right.state.name, right.state.facing]).toEqual([WALK_SPEED, 'walk', 1]);
    const left = last(steps(initialPlayerState(), 30, intent({ moveX: -Infinity }), GROUND));
    expect([left.vx, left.state.facing]).toEqual([-WALK_SPEED, -1]);
    const r = step(initialPlayerState(), intent({ moveX: Number.NaN }), DT, GROUND);
    expect([r.vx, r.state.name]).toEqual([0, 'idle']);
  });

  it('turns the same at every frame rate: brake to a stop, then speed up', () => {
    // 50 ms braking from WALK_SPEED at GROUND_DECEL, then 50 ms at GROUND_ACCEL the other way.
    const expected = -(GROUND_ACCEL * (0.1 - WALK_SPEED / GROUND_DECEL));
    for (const n of [1, 5, 6, 10]) {
      const r = last(steps(movingAt(WALK_SPEED), n, intent({ moveX: -1 }), GROUND, null, 100 / n));
      expect(r.vx).toBeCloseTo(expected, 9);
    }
  });

  it('scales with analog moveX', () => {
    expect(last(steps(initialPlayerState(), 30, intent({ moveX: 0.5 }), GROUND)).vx).toBe(
      WALK_SPEED / 2
    );
  });

  it(`integrates acceleration over at most ${MAX_STEP_MS} ms after a hitch`, () => {
    const r = step(initialPlayerState(), intent({ moveX: 1, run: true }), 1000, GROUND);
    expect(r.vx).toBeCloseTo((GROUND_ACCEL * MAX_STEP_MS) / 1000, 9);
  });
});

describe('facing', () => {
  it('follows the sign of moveX, keeps the last one at rest, and flips for left', () => {
    let r = step(initialPlayerState(), intent({ moveX: -0.3 }), DT, GROUND);
    expect([r.state.facing, r.flipX]).toEqual([-1, true]);
    r = step(r.state, intent(), DT, GROUND);
    expect([r.state.facing, r.flipX]).toEqual([-1, true]);
    r = step(r.state, intent({ moveX: 1 }), DT, GROUND);
    expect([r.state.facing, r.flipX]).toEqual([1, false]);
  });

  it('turns in the air too', () => {
    const r = step(walkedOff(DT), intent({ moveX: -1 }), DT, air(30));
    expect(r.flipX).toBe(true);
  });
});

describe('jumping', () => {
  it('jumps from the ground at once, consuming the press', () => {
    const r = step(initialPlayerState(), intent({ jumpPressed: true, jumpHeld: true }), DT, GROUND);
    expect(r.vy).toBe(JUMP_VELOCITY);
    expect([r.state.name, r.anim, r.frame]).toEqual(['air', ANIM.air, 'takeoff']);
    expect(r.state.sinceJumpPressed).toBe(Infinity);
    expect(r.state.sinceJump).toBe(0);
    expect(r.state.jumpCut).toBe(false);
  });

  it('allows a coyote jump just after walking off a ledge', () => {
    for (const ms of [DT, 80]) {
      const s = walkedOff(ms);
      expect(s.sinceGrounded).toBe(ms);
      const r = step(s, intent({ jumpPressed: true, jumpHeld: true }), 10, air(30));
      expect(r.state.sinceGrounded).toBeLessThanOrEqual(COYOTE_MS);
      expect(r.vy).toBe(JUMP_VELOCITY);
      expect(r.frame).toBe('takeoff');
    }
  });

  it('refuses a jump once COYOTE_MS has passed, but buffers the press', () => {
    const s = walkedOff(80);
    const r = step(s, intent({ jumpPressed: true, jumpHeld: true }), DT, air(30));
    expect(r.state.sinceGrounded).toBeGreaterThan(COYOTE_MS);
    expect(r.vy).toBeNull();
    expect(r.state.sinceJumpPressed).toBe(0);
  });

  it('gives only one coyote jump', () => {
    const coyote = step(walkedOff(DT), intent({ jumpPressed: true, jumpHeld: true }), DT, air(30));
    expect(coyote.vy).toBe(JUMP_VELOCITY);
    const again = step(coyote.state, intent({ jumpPressed: true, jumpHeld: true }), DT, air(-315));
    expect(again.state.sinceGrounded).toBeLessThanOrEqual(COYOTE_MS);
    expect(again.vy).toBeNull();
  });

  it('never double-jumps inside the coyote window after a ground jump', () => {
    const s = jumped();
    const r = step(s, intent({ jumpPressed: true, jumpHeld: true }), DT, air(-315));
    expect(r.state.sinceGrounded).toBeLessThanOrEqual(COYOTE_MS);
    expect(r.vy).toBeNull();
  });

  it('fires a press buffered in the air on the landing step within JUMP_BUFFER_MS', () => {
    let s = step(walkedOff(200), intent({ jumpPressed: true, jumpHeld: true }), DT, air(200)).state;
    s = last(steps(s, JUMP_BUFFER_MS / DT - 1, intent({ jumpHeld: true }), air(250))).state;
    const r = step(s, intent({ jumpHeld: true }), DT, GROUND);
    expect(r.state.sinceJumpPressed).toBe(Infinity);
    expect(r.vy).toBe(JUMP_VELOCITY);
    expect([r.state.name, r.frame]).toEqual(['air', 'takeoff']);
  });

  it('drops a buffered press older than JUMP_BUFFER_MS', () => {
    let s = step(walkedOff(200), intent({ jumpPressed: true, jumpHeld: true }), DT, air(200)).state;
    s = last(steps(s, JUMP_BUFFER_MS / DT, intent({ jumpHeld: true }), air(250))).state;
    const r = step(s, intent({ jumpHeld: true }), DT, GROUND);
    expect(r.state.sinceJumpPressed).toBeGreaterThan(JUMP_BUFFER_MS);
    expect(r.vy).toBeNull();
    expect(r.state.name).toBe('land');
  });

  it('cuts an early-released jump once', () => {
    const s = jumped();
    const cut = step(s, intent(), DT, air(-315));
    expect(cut.vy).toBeCloseTo(-315 * JUMP_CUT, 9);
    expect(cut.state.jumpCut).toBe(true);
    expect(step(cut.state, intent(), DT, air(-140)).vy).toBeNull();
  });

  it('does not cut while jump is held, nor on release after the apex', () => {
    const s = jumped();
    const held = step(s, intent({ jumpHeld: true }), DT, air(-315));
    expect(held.vy).toBeNull();
    const pastApex = step(held.state, intent(), DT, air(20));
    expect(pastApex.vy).toBeNull();
    expect(pastApex.state.jumpCut).toBe(false);
  });

  it('does not cut an upward motion that is not our jump', () => {
    expect(step(walkedOff(DT), intent(), DT, air(-100)).vy).toBeNull();
  });

  it('re-arms the cut for the next jump', () => {
    const cut = step(jumped(), intent(), DT, air(-315));
    const landed = step(cut.state, intent(), DT, GROUND);
    expect(landed.state.jumpCut).toBe(false);
    const next = step(landed.state, intent({ jumpPressed: true }), DT, GROUND);
    expect(step(next.state, intent(), DT, air(-315)).vy).toBeCloseTo(-315 * JUMP_CUT, 9);
  });

  it('stops the rise on a head bump, ahead of the cut', () => {
    const r = step(jumped(), intent(), DT, air(-250, true));
    expect(r.vy).toBe(0);
    expect(r.state.jumpCut).toBe(false);
    expect(step(jumped(), intent(), DT, air(40, true)).vy).toBeNull();
  });

  it('treats a stale grounded report while rising as airborne', () => {
    const s = jumped();
    const r = step(s, intent({ jumpHeld: true }), DT, {
      grounded: true,
      vy: -330,
      blockedUp: false,
    });
    expect([r.state.name, r.frame, r.vy]).toEqual(['air', 'takeoff', null]);
    expect(r.state.wasGrounded).toBe(false);
    expect(r.state.sinceJump).toBe(DT);
  });

  it('matches jumpApex against Arcade-style integration, and a tap jumps lower', () => {
    const full = simulateJump(Infinity);
    expect(full.apex).toBeCloseTo(jumpApex(GRAVITY, JUMP_VELOCITY, LAYOUT_STEP_HZ), 9);
    expect(full.landed.state.name).toBe('land');
    const tap = simulateJump(0);
    expect(tap.apex).toBeLessThan(full.apex * 0.4);
    expect(tap.apex).toBeGreaterThan(0);
  });
});

describe('air frames', () => {
  it('shows takeoff for TAKEOFF_MS, then rise → apex → fall by vy', () => {
    let r = step(initialPlayerState(), intent({ jumpPressed: true, jumpHeld: true }), DT, GROUND);
    const frames = [r.frame];
    for (let t = DT; t <= TAKEOFF_MS; t += DT) {
      r = step(r.state, intent({ jumpHeld: true }), DT, air(-300));
      frames.push(r.frame);
    }
    expect(frames).toEqual([...Array<string>(TAKEOFF_MS / DT).fill('takeoff'), 'rise']);
    const s = jumped(TAKEOFF_MS);
    expect(s.sinceJump).toBeGreaterThanOrEqual(TAKEOFF_MS);
    const frameAt = (vy: number) => step(s, intent({ jumpHeld: true }), DT, air(vy)).frame;
    expect(frameAt(-AIR_APEX_VY - 1)).toBe('rise');
    expect(frameAt(-AIR_APEX_VY)).toBe('apex');
    expect(frameAt(0)).toBe('apex');
    expect(frameAt(AIR_APEX_VY)).toBe('apex');
    expect(frameAt(AIR_APEX_VY + 1)).toBe('fall');
  });

  it('picks the frame from the vy set this step', () => {
    const s = jumped(TAKEOFF_MS);
    const cut = step(s, intent(), DT, air(-100));
    expect(cut.vy).toBe(-100 * JUMP_CUT);
    expect(cut.frame).toBe('apex');
    expect(step(s, intent(), DT, air(-200, true)).frame).toBe('apex');
  });

  it.each([60, 144])('runs takeoff → rise → apex → fall → land over a real jump at %s Hz', (hz) => {
    const { apex, frames } = simulateJump(Infinity, hz);
    expect(frames).toEqual(['takeoff', 'rise', 'apex', 'fall', 'land']);
    expect(apex).toBeCloseTo(jumpApex(GRAVITY, JUMP_VELOCITY, hz), 9);
  });

  it('walking off a ledge goes straight to the vy frame, no takeoff', () => {
    const r = step(initialPlayerState(), intent({ moveX: 1 }), DT, air(15));
    expect([r.state.name, r.anim, r.frame]).toEqual(['air', ANIM.air, 'apex']);
    expect(step(r.state, intent(), DT, air(120)).frame).toBe('fall');
  });
});

describe('landing', () => {
  it('shows the land frame for LAND_MS, then idles', () => {
    const touch = step(walkedOff(200), intent(), DT, GROUND);
    expect([touch.state.name, touch.anim, touch.frame]).toEqual(['land', ANIM.air, 'land']);
    expect(touch.state.sinceLanded).toBe(0);
    const rs = steps(touch.state, LAND_MS / DT, intent(), GROUND);
    expect(rs.slice(0, -1).every((r) => r.frame === 'land')).toBe(true);
    expect(last(rs).state.sinceLanded).toBe(LAND_MS);
    expect([last(rs).state.name, last(rs).anim, last(rs).frame]).toEqual([
      'idle',
      ANIM.idle,
      undefined,
    ]);
  });

  it('is skipped when landing with a direction held', () => {
    const r = step(walkedOff(200), intent({ moveX: 1, run: true }), DT, GROUND);
    expect([r.state.name, r.anim]).toEqual(['run', ANIM.run]);
  });

  it('is cancelled by input for good', () => {
    const touch = step(walkedOff(200), intent(), DT, GROUND);
    const walk = step(touch.state, intent({ moveX: -1 }), DT, GROUND);
    expect(walk.state.name).toBe('walk');
    expect(step(walk.state, intent(), DT, GROUND).state.name).toBe('idle');
    const hop = step(touch.state, intent({ jumpPressed: true }), DT, GROUND);
    expect([hop.state.name, hop.frame, hop.vy]).toEqual(['air', 'takeoff', JUMP_VELOCITY]);
  });

  it('resets the jump bookkeeping on touchdown', () => {
    const r = step(jumped(200), intent(), DT, GROUND);
    expect(r.state.sinceJump).toBe(Infinity);
    expect(r.state.sinceGrounded).toBe(0);
    expect(r.state.wasGrounded).toBe(true);
  });
});

describe('poses', () => {
  it.each([
    ['interact', ANIM.interact],
    ['wave', ANIM.wave],
  ] as const)('%s holds on the ground and ignores move and jump', (pose, anim) => {
    const s = { ...movingAt(WALK_SPEED), sinceJumpPressed: 0 };
    const r = step(s, intent({ moveX: -1, run: true, jumpPressed: true }), DT, GROUND, pose);
    expect([r.state.name, r.anim, r.frame, r.vy]).toEqual([pose, anim, undefined, null]);
    expect(r.vx).toBeCloseTo(WALK_SPEED - (GROUND_DECEL * DT) / 1000, 9);
    expect(r.state.facing).toBe(1);
    expect(r.state.sinceJumpPressed).toBe(Infinity);
    expect(last(steps(r.state, 20, intent({ moveX: 1 }), GROUND, pose)).vx).toBe(0);
  });

  it('waits for the landing in the air, then drops the buffered jump', () => {
    const s = walkedOff(200);
    const inAir = step(s, intent({ jumpPressed: true }), DT, air(200), 'interact');
    expect(inAir.state.name).toBe('air');
    const landed = step(inAir.state, intent(), DT, GROUND, 'interact');
    expect([landed.state.name, landed.anim, landed.vy]).toEqual(['interact', ANIM.interact, null]);
    expect(step(landed.state, intent(), DT, GROUND).vy).toBeNull();
  });

  it('still lets a jump already under way be cut', () => {
    expect(step(jumped(), intent(), DT, air(-315), 'wave').vy).toBeCloseTo(-315 * JUMP_CUT, 9);
  });
});

describe('degenerate dt', () => {
  it.each([0, -16, Number.NaN])('dt = %s leaves the state untouched', (dt) => {
    const prev = { ...movingAt(WALK_SPEED), name: 'walk' as const, sinceJumpPressed: 50 };
    const r = step(prev, intent({ moveX: -1, jumpPressed: true }), dt, GROUND);
    expect(r.state).toBe(prev);
    expect([r.vx, r.vy, r.anim, r.flipX]).toEqual([WALK_SPEED, null, ANIM.walk, false]);
  });

  it('an infinite dt integrates at most MAX_STEP_MS and produces no NaN', () => {
    const r = step(jumped(), intent({ moveX: 1, run: true, jumpHeld: true }), Infinity, air(-300));
    expect(r.vx).toBeCloseTo((AIR_ACCEL * MAX_STEP_MS) / 1000, 9);
    expect(Object.values(r.state).some((v) => Number.isNaN(v))).toBe(false);
    expect(r.frame).toBe('rise');
  });

  it('still presents an air state consistently', () => {
    const r = step(jumped(TAKEOFF_MS), intent(), 0, air(200));
    expect([r.anim, r.frame]).toEqual([ANIM.air, 'fall']);
  });

  it('keeps its invariants under seeded random input, dt and body reports', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
    const anims: readonly string[] = Object.values(ANIM);
    let s = initialPlayerState();
    for (let i = 0; i < 5000; i++) {
      const dt = pick([1000 / 60, 1000 / 144, 33, 250, 0, -5, Number.NaN, Infinity]);
      const pose = pick<Pose>([null, null, null, 'interact', 'wave']);
      const r = step(
        s,
        intent({
          moveX: pick([0, 1, -1, 0.4, -0.7, 3, Number.NaN, Infinity]),
          run: rand() < 0.5,
          jumpPressed: rand() < 0.2,
          jumpHeld: rand() < 0.5,
        }),
        dt,
        { grounded: rand() < 0.5, vy: pick([0, 15, -315, -60, 61, 400]), blockedUp: rand() < 0.1 },
        pose
      );
      expect(Math.abs(r.vx)).toBeLessThanOrEqual(RUN_SPEED);
      expect(r.vx).toBe(r.state.vx);
      expect(Object.values(r.state).some((v) => Number.isNaN(v))).toBe(false);
      expect(anims).toContain(r.anim);
      expect(r.frame !== undefined).toBe(r.anim === ANIM.air);
      expect(r.flipX).toBe(r.state.facing === -1);
      if (dt > 0 && pose && r.state.wasGrounded) expect(r.state.name).toBe(pose);
      s = r.state;
    }
  });
});

describe('jumpApex', () => {
  it('reproduces Arcade semi-implicit integration at 60 Hz', () => {
    expect(jumpApex(900, 330, 60)).toBeCloseTo(57.75, 9);
    expect(jumpApex(GRAVITY, JUMP_VELOCITY, LAYOUT_STEP_HZ)).toBeCloseTo(57.75, 9);
  });

  it('stays below v²/2g and approaches it as the step shrinks', () => {
    const ideal = (330 * 330) / (2 * 900);
    expect(jumpApex(900, 330, 120)).toBeGreaterThan(jumpApex(900, 330, 60));
    expect(jumpApex(900, 330, 120)).toBeLessThan(ideal);
    expect(jumpApex(900, 330, 10_000)).toBeCloseTo(ideal, 1);
  });

  it('is zero without launch speed and rejects nonsense', () => {
    expect(jumpApex(900, 0, 60)).toBe(0);
    expect(jumpApex(900, 10, 60)).toBe(0);
    expect(() => jumpApex(0, 330, 60)).toThrow(RangeError);
    expect(() => jumpApex(900, 330, 0)).toThrow(RangeError);
    expect(() => jumpApex(900, Number.NaN, 60)).toThrow(RangeError);
  });

  it('rejects an infinite gravity or step rate instead of looping forever', () => {
    expect(() => jumpApex(900, 330, Infinity)).toThrow(RangeError);
    expect(() => jumpApex(Infinity, 330, 60)).toThrow(RangeError);
  });

  it.each([
    [900, 330, 60],
    [900, 330, 144],
    [900, 331.7, 60],
    [1234.5, 287.3, 75],
    [900, 150, 165],
  ])('equals the literal step loop (g=%s, v0=%s, hz=%s)', (g, v0, hz) => {
    expect(jumpApex(g, v0, hz)).toBeCloseTo(referenceApex(g, v0, hz), 9);
    expect(jumpApex(g, -v0, hz)).toBe(jumpApex(g, v0, hz));
  });

  it('answers at once even when the loop would need billions of steps', () => {
    const ideal = (330 * 330) / (2 * 1e-6);
    expect(Math.abs(jumpApex(1e-6, 330, 60) / ideal - 1)).toBeLessThan(1e-6);
    // A per-step change so small the step count overflows still gives v²/2g, never −∞ or NaN.
    expect(jumpApex(1e-310, 330, 60)).toBe(Infinity);
    expect(jumpApex(1e-313, 1e-5, 60) / ((1e-5 * 1e-5) / (2 * 1e-313))).toBeCloseTo(1, 9);
  });
});
