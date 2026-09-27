import { describe, expect, it } from 'vitest';
import {
  CAMERA_DEADZONE_W,
  CAMERA_LOOKAHEAD,
  GROUND_ACCEL,
  GROUND_DECEL,
  RUN_SPEED,
  WALK_SPEED,
  WORLD_W,
} from '../config';
import { follow, snapFollow, type FollowInput, type FollowState } from './follow';

const VIEW_W = 640;
const MAX_SCROLL = WORLD_W - VIEW_W;
/** Deadzone edges in view px for a 640 px view: 288 … 352. */
const BAND_LEFT = (VIEW_W - CAMERA_DEADZONE_W) / 2;
const BAND_RIGHT = BAND_LEFT + CAMERA_DEADZONE_W;

const at = (targetX: number, facing: -1 | 1 = 1, dtMs = 1000 / 60): FollowInput => ({
  targetX,
  facing,
  viewW: VIEW_W,
  worldW: WORLD_W,
  dtMs,
});

/** Where the camera rests once the focus sits on the leading deadzone edge. */
const edgeScroll = (x: number, facing: -1 | 1) =>
  x + facing * CAMERA_LOOKAHEAD - (facing > 0 ? BAND_RIGHT : BAND_LEFT);

/** Seeded LCG, so the "random" cases are reproducible. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Frame-to-frame moves of `values` against `dir`. */
function reversals(values: readonly number[], dir: number): number {
  let n = 0;
  for (let i = 1; i < values.length; i++) if ((values[i]! - values[i - 1]!) * dir < 0) n++;
  return n;
}

function changes(values: readonly number[]): number {
  return values.filter((v, i) => i > 0 && v !== values[i - 1]).length;
}

interface Frame {
  moving: boolean;
  x: number;
  cam: FollowState;
}

interface Run {
  hz: number;
  speed: number;
  dir: -1 | 1;
  x0: number;
  runMs?: number;
  stopMs?: number;
  /** Hand the module a pre-rounded x instead of the sprite's x. */
  rounded?: boolean;
}

/** The panda at a constant speed on Arcade's fixed step (one step per frame), then stopped. */
function simulate({ hz, speed, dir, x0, runMs = 3000, stopMs = 1500, rounded = false }: Run) {
  const stepMs = 1000 / hz;
  let x = x0;
  const input = (dtMs: number) => at(rounded ? Math.round(x) : x, dir, dtMs);
  let cam = snapFollow(input(0));
  const frames: Frame[] = [];
  const total = Math.round(((runMs + stopMs) * hz) / 1000);
  const running = Math.round((runMs * hz) / 1000);
  for (let i = 0; i < total; i++) {
    const moving = i < running;
    if (moving) x += (dir * speed * stepMs) / 1000;
    cam = follow(cam, input(stepMs));
    frames.push({ moving, x, cam });
  }
  return { frames, hz, x };
}

describe('snapFollow', () => {
  it('centres the focus (the panda plus its lookahead) on a whole pixel', () => {
    const right = snapFollow(at(1000.4));
    expect(right).toEqual({
      exact: 1000 + CAMERA_LOOKAHEAD - VIEW_W / 2,
      scrollX: 1000 + CAMERA_LOOKAHEAD - VIEW_W / 2,
      screenX: VIEW_W / 2 - CAMERA_LOOKAHEAD,
    });
    const left = snapFollow(at(1000.4, -1));
    expect(left.scrollX).toBe(1000 - CAMERA_LOOKAHEAD - VIEW_W / 2);
    expect(left.screenX).toBe(VIEW_W / 2 + CAMERA_LOOKAHEAD);
  });

  it('clamps to the world, and to 0 when the world is narrower than the view', () => {
    expect(snapFollow(at(40)).scrollX).toBe(0);
    expect(snapFollow(at(WORLD_W - 10)).scrollX).toBe(MAX_SCROLL);
    expect(snapFollow({ ...at(300), worldW: 500 }).scrollX).toBe(0);
  });
});

describe('follow', () => {
  it('always returns an integer scroll within the world and within 1 px of exact', () => {
    const rnd = lcg(42);
    let x = 2000;
    let cam = snapFollow(at(x));
    for (let i = 0; i < 5000; i++) {
      x = Math.min(WORLD_W, Math.max(0, x + (rnd() - 0.5) * 12));
      const facing = rnd() < 0.02 ? -1 : 1;
      cam = follow(cam, at(x, facing, 4 + rnd() * 30));
      expect(Number.isInteger(cam.scrollX)).toBe(true);
      expect(cam.scrollX).toBeGreaterThanOrEqual(0);
      expect(cam.scrollX).toBeLessThanOrEqual(MAX_SCROLL);
      expect(Math.abs(cam.scrollX - cam.exact)).toBeLessThanOrEqual(1);
      expect(cam.screenX).toBe(Math.round(x) - cam.scrollX);
    }
  });

  it('holds the camera still while the panda moves inside the deadzone', () => {
    const start = snapFollow(at(1000));
    let cam = start;
    // The focus starts centred, so ±32 px either way stays inside the 64 px band.
    for (const x of [1000.6, 1010, 1025.3, 1032, 1012, 990, 972.5, 968, 985, 1000]) {
      cam = follow(cam, at(x));
      expect(cam.exact).toBe(start.exact);
      expect(cam.scrollX).toBe(start.scrollX);
    }
  });

  it('chases the focus to the deadzone edge and converges exactly, without stalling', () => {
    let cam = snapFollow(at(1000));
    const scrolls: number[] = [];
    for (let i = 0; i < 60; i++) {
      cam = follow(cam, at(1100));
      scrolls.push(cam.scrollX);
    }
    // 100 px at τ = 90 ms is inside 0.5 px after ~480 ms: settled well within 1 s.
    expect(cam.exact).toBe(edgeScroll(1100, 1));
    expect(cam.scrollX).toBe(edgeScroll(1100, 1));
    expect(reversals(scrolls, 1)).toBe(0);
    expect(follow(cam, at(1100))).toEqual(cam);

    // A fractional target settles on the pixel next to it, never one short.
    for (let i = 0; i < 60; i++) cam = follow(cam, at(1180.37));
    expect(cam.exact).toBeCloseTo(edgeScroll(1180.37, 1), 9);
    expect(Math.abs(cam.scrollX - cam.exact)).toBeLessThanOrEqual(0.5);
  });

  it('turning around re-aims the lookahead the other way', () => {
    let cam = snapFollow(at(2000));
    for (let i = 0; i < 90; i++) cam = follow(cam, at(2000, -1));
    // The focus jumps 2 × lookahead = 48 px left, 16 px past the left edge of the band.
    expect(cam.exact).toBe(edgeScroll(2000, -1));
    expect(cam.scrollX).toBe(snapFollow(at(2000)).scrollX - 16);
  });

  it('clamps at both world ends and pins to 0 when the world is narrower than the view', () => {
    let cam = snapFollow(at(400));
    for (let x = 400; x > 0; x -= 2) cam = follow(cam, at(x, -1));
    for (let i = 0; i < 60; i++) cam = follow(cam, at(0, -1));
    expect(cam).toMatchObject({ exact: 0, scrollX: 0, screenX: 0 });

    cam = snapFollow(at(WORLD_W - 400));
    for (let x = WORLD_W - 400; x < WORLD_W; x += 2) {
      cam = follow(cam, at(x));
      expect(cam.scrollX).toBeLessThanOrEqual(MAX_SCROLL);
    }
    for (let i = 0; i < 60; i++) cam = follow(cam, at(WORLD_W));
    expect(cam).toMatchObject({ exact: MAX_SCROLL, scrollX: MAX_SCROLL, screenX: VIEW_W });

    cam = snapFollow({ ...at(100), worldW: 500 });
    for (let x = 100; x < 500; x += 3) {
      cam = follow(cam, { ...at(x), worldW: 500 });
      expect(cam.scrollX).toBe(0);
    }
  });

  it('a frame without time (dt ≤ 0, e.g. no physics step) changes nothing', () => {
    const cam = snapFollow(at(1000));
    expect(follow(cam, at(1300, 1, 0))).toBe(cam);
    expect(follow(cam, at(1300, 1, -5))).toBe(cam);
  });

  it('is independent of the frame rate', () => {
    // A fixed target: the exponential is exact for any dt.
    const catchUp = (hz: number) => {
      let cam = snapFollow(at(1000));
      for (let i = 0; i < (200 * hz) / 1000; i++) cam = follow(cam, at(1100, 1, 1000 / hz));
      return cam.exact;
    };
    expect(catchUp(60)).toBeCloseTo(catchUp(120), 9);
    expect(catchUp(60)).toBeCloseTo(catchUp(240), 9);
    // A moving target: 1 s of running lands within 1 px at 60 and 120 Hz.
    for (const speed of [WALK_SPEED, RUN_SPEED]) {
      const a = simulate({ hz: 60, speed, dir: 1, x0: 1000, runMs: 1000, stopMs: 0 }).frames.at(
        -1
      )!;
      const b = simulate({ hz: 120, speed, dir: 1, x0: 1000, runMs: 1000, stopMs: 0 }).frames.at(
        -1
      )!;
      expect(Math.abs(a.cam.exact - b.cam.exact)).toBeLessThan(1);
      expect(Math.abs(a.cam.scrollX - b.cam.scrollX)).toBeLessThanOrEqual(1);
    }
  });
});

describe('follow — anti-shimmer', () => {
  // 1.5 / 2.5 px per frame at 60 Hz, 0.75 / 1.25 at 120 Hz, from several sub-pixel phases.
  const cases = [60, 120].flatMap((hz) =>
    [WALK_SPEED, RUN_SPEED].flatMap((speed) =>
      ([1, -1] as const).flatMap((dir) =>
        [0, 0.25, 0.5, 0.75, 0.1, 0.37].map((phase) => ({ hz, speed, dir, phase }))
      )
    )
  );

  it.each(cases)(
    '$hz Hz, $speed px/s, dir $dir, phase $phase: the panda never jitters on screen',
    ({ hz, speed, dir, phase }) => {
      for (const rounded of [false, true]) {
        const { frames, x } = simulate({ hz, speed, dir, x0: 2000 + phase, rounded });
        const run = frames.filter((f) => f.moving);
        const stop = frames.filter((f) => !f.moving);
        const screen = run.map((f) => f.cam.screenX);

        // While chasing, the panda's screen x only ever moves forward…
        expect(reversals(screen, dir)).toBe(0);
        // …then the camera has caught up and carries it at a fixed screen x.
        expect(changes(screen.slice(-hz))).toBe(0);
        // The camera itself never steps backwards, running or catching up after the stop.
        expect(
          reversals(
            frames.map((f) => f.cam.scrollX),
            dir
          )
        ).toBe(0);
        // It really followed: 3 s of running minus the band and the chase lag.
        expect(Math.abs(run.at(-1)!.cam.scrollX - run[0]!.cam.scrollX)).toBeGreaterThan(
          speed * 3 - CAMERA_DEADZONE_W
        );

        // Stopped: the panda slides back toward the band edge, the camera settles and holds.
        expect(
          reversals(
            stop.map((f) => f.cam.screenX),
            -dir
          )
        ).toBe(0);
        const last = stop.at(-1)!.cam;
        expect(last.exact).toBeCloseTo(edgeScroll(rounded ? Math.round(x) : x, dir), 9);
        expect(Math.abs(last.scrollX - last.exact)).toBeLessThanOrEqual(0.5);
        expect(changes(stop.slice(-hz / 2).map((f) => f.cam.scrollX))).toBe(0);
      }

      // The test has teeth: rounding `exact` on its own shimmers in this very run.
      const { frames } = simulate({ hz, speed, dir, x0: 2000 + phase, stopMs: 0 });
      const naive = frames.map((f) => Math.round(f.x) - Math.round(f.cam.exact));
      expect(reversals(naive, dir)).toBeGreaterThan(0);
    }
  );

  it('stays steady with real acceleration on a jittery physics clock', () => {
    for (const hz of [60, 120, 144]) {
      for (const dir of [1, -1] as const) {
        const rnd = lcg(hz * 7 + dir);
        const stepMs = 1000 / hz;
        let x = 2000.3;
        let vx = 0;
        let backlog = 0;
        let cam = snapFollow(at(x, dir));
        const run: number[] = [];
        const scroll: number[] = [];
        for (let i = 0; i < 4 * hz; i++) {
          const stopping = i >= 3 * hz;
          // Render deltas wobble ±1.5 ms and 1 % of frames drop: Arcade then takes 0 or 2+ steps.
          backlog += stepMs + (rnd() - 0.5) * 3 + (rnd() < 0.01 ? stepMs : 0);
          let steps = 0;
          for (; backlog >= stepMs; backlog -= stepMs, steps++) {
            const goal = stopping ? 0 : RUN_SPEED;
            const dv = ((stopping ? GROUND_DECEL : GROUND_ACCEL) * stepMs) / 1000;
            vx = vx < goal ? Math.min(goal, vx + dv) : Math.max(goal, vx - dv);
            x += (dir * vx * stepMs) / 1000;
          }
          // dt from the physics clock: the camera advances exactly as far as the panda did.
          cam = follow(cam, at(x, dir, steps * stepMs));
          if (!stopping) run.push(cam.screenX);
          scroll.push(cam.scrollX);
        }
        expect(reversals(run, dir)).toBe(0);
        expect(reversals(scroll, dir)).toBe(0);
        expect(Math.abs(cam.scrollX - cam.exact)).toBeLessThanOrEqual(0.5);
      }
    }
  });
});
