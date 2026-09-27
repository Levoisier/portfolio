/**
 * Integer camera follow — ARCHITECTURE.md → Rendering contract → Camera. Pure (no Phaser): the
 * scene feeds it the panda's x once per frame and applies `scrollX` in POST_UPDATE.
 *
 * `exact` is a smooth, dt-based chase of a deadzone target; `scrollX` is its integer projection,
 * and the projection is where shimmer comes from. The panda is drawn at `Math.round(x)`, so at
 * 1.5 px/frame it steps 1, 2, 1, 2… px; `Math.round(exact)` steps on its own schedule, and the
 * panda's on-screen x flickers ±1 px while the camera chases (rounding the screen offset of an
 * already-rounded x is the same thing). Instead, `scrollX` moves by exactly the panda's integer
 * step — the panda keeps its screen x — and only deviates when that would leave it more than
 * 1 px from `exact`. At rest, and while the panda walks inside the deadzone, it holds still.
 */
import { CAMERA_DEADZONE_W, CAMERA_LOOKAHEAD, CAMERA_TAU_MS } from '../config';

export interface FollowInput {
  /**
   * The panda's world x as Phaser holds it (`sprite.x`), NOT rounded: the renderer rounds each
   * vertex with `Math.round`, and so does this module. A pre-rounded x still works, but the
   * chase then picks up the rounding ripple.
   */
  targetX: number;
  /** −1 faces left; the camera aims `lookahead` px ahead of the panda. */
  facing: -1 | 1;
  /** View (backing) width, art px. */
  viewW: number;
  worldW: number;
  /** Time the panda moved this frame, ms — ideally physics time (see `follow`). */
  dtMs: number;
  deadzoneW?: number;
  tauMs?: number;
  lookahead?: number;
}

export interface FollowState {
  /** Smoothed scroll, fractional art px. */
  exact: number;
  /** The integer scroll to apply to the camera. */
  scrollX: number;
  /** The panda's integer on-screen x, `Math.round(targetX) − scrollX`. */
  screenX: number;
}

interface Frame {
  focus: number;
  rendered: number;
  /** Deadzone edges, in view px from the left of the view. */
  left: number;
  right: number;
  maxScroll: number;
}

function frame(p: Omit<FollowInput, 'dtMs'>): Frame {
  const deadzone = Math.min(Math.max(0, p.deadzoneW ?? CAMERA_DEADZONE_W), p.viewW);
  // Integer edges: a whole-px focus then settles the camera on a whole px.
  const left = Math.floor((p.viewW - deadzone) / 2);
  return {
    focus: p.targetX + p.facing * (p.lookahead ?? CAMERA_LOOKAHEAD),
    rendered: Math.round(p.targetX),
    left,
    right: left + deadzone,
    maxScroll: Math.max(0, Math.floor(p.worldW - p.viewW)),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * One frame of camera follow. Pass the previous result back in; start from `snapFollow`. Feed
 * `dtMs` from the physics clock (the Arcade steps taken this frame × step ms), so a frame with no
 * physics step (dt 0) leaves the camera alone instead of letting it slide under a frozen panda.
 */
export function follow(prev: FollowState, p: FollowInput): FollowState {
  if (!(p.dtMs > 0)) return prev;
  const { focus, rendered, left, right, maxScroll } = frame(p);

  // Inside the deadzone the target is wherever the camera already is.
  let desired = prev.exact;
  if (focus - prev.exact > right) desired = focus - right;
  else if (focus - prev.exact < left) desired = focus - left;
  desired = clamp(desired, 0, maxScroll);

  if (desired === prev.exact) {
    const scrollX = clamp(prev.scrollX, 0, maxScroll);
    return { exact: prev.exact, scrollX, screenX: rendered - scrollX };
  }

  let exact =
    prev.exact + (desired - prev.exact) * (1 - Math.exp(-p.dtMs / (p.tauMs ?? CAMERA_TAU_MS)));
  // The exponential never arrives on its own; snap so the camera cannot stall a pixel short.
  const settled = Math.abs(desired - exact) < 0.5;
  if (settled) exact = desired;

  // Ride along with the panda (same integer step, same screen x) while within 1 px of `exact`.
  let scrollX = clamp(rendered - prev.screenX, Math.ceil(exact - 1), Math.floor(exact + 1));
  // Never step against the way the camera is travelling; once settled, end within 0.5 px.
  if (exact > prev.exact)
    scrollX = Math.max(scrollX, prev.scrollX, settled ? Math.ceil(exact - 0.5) : -Infinity);
  else scrollX = Math.min(scrollX, prev.scrollX, settled ? Math.floor(exact + 0.5) : Infinity);
  scrollX = clamp(scrollX, 0, maxScroll);
  return { exact, scrollX, screenX: rendered - scrollX };
}

/**
 * Jump-cut framing for spawn and teleports: the focus at the centre of the deadzone, on a whole
 * px, clamped to the world.
 */
export function snapFollow(p: Omit<FollowInput, 'dtMs'>): FollowState {
  const { focus, rendered, left, right, maxScroll } = frame(p);
  const scrollX = clamp(Math.round(focus - (left + right) / 2), 0, maxScroll);
  return { exact: scrollX, scrollX, screenX: rendered - scrollX };
}
