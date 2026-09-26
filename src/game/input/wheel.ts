/**
 * Wheel / trackpad walking (ARCHITECTURE.md → Input → Wheel). Pure: the UI forwards every page
 * wheel event on the bus (`input:wheel`) and the scene feeds them here.
 */
import { WHEEL_LINE_PX, WHEEL_MAX_MS, WHEEL_MS_PER_PX, WHEEL_PAGE_PX } from '../config';

/** `WheelEvent.deltaMode` values. */
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

/**
 * Signed wheel distance in px, > 0 = walk right. The dominant axis wins, so a vertical scroll and
 * a horizontal swipe both walk, and a slightly diagonal trackpad gesture does not fight itself.
 */
export function normalizeWheel(deltaX: number, deltaY: number, deltaMode: number): number {
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  const unit =
    deltaMode === DOM_DELTA_LINE ? WHEEL_LINE_PX : deltaMode === DOM_DELTA_PAGE ? WHEEL_PAGE_PX : 1;
  return delta * unit;
}

/**
 * Turns wheel pushes into walking time. Each push banks `|px| × WHEEL_MS_PER_PX` ms (capped at
 * `WHEEL_MAX_MS`) and the bank drains in real time, which is the short decay that makes a flick
 * walk a few steps and lets trackpad momentum carry on. The opposite direction replaces the bank,
 * so turning around is instant instead of first spending the old walk.
 */
export class WheelWalker {
  private bank = 0;
  private dir: -1 | 0 | 1 = 0;

  push(deltaX: number, deltaY: number, deltaMode: number): void {
    const px = normalizeWheel(deltaX, deltaY, deltaMode);
    // Sub-pixel deltas are trackpad jitter (and `!(… >= 1)` also drops NaN).
    if (!(Math.abs(px) >= 1)) return;
    const dir = px > 0 ? 1 : -1;
    const earned = Math.abs(px) * WHEEL_MS_PER_PX;
    this.bank = Math.min(WHEEL_MAX_MS, (dir === this.dir ? this.bank : 0) + earned);
    this.dir = dir;
  }

  /** The walk direction for a frame of `dtMs`: any bank left at its start walks this frame. */
  update(dtMs: number): -1 | 0 | 1 {
    if (this.bank <= 0) return 0;
    const dir = this.dir;
    this.bank -= Math.max(0, dtMs);
    if (this.bank <= 0) this.reset();
    return dir;
  }

  reset(): void {
    this.bank = 0;
    this.dir = 0;
  }
}
