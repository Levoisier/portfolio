/**
 * Touch pad input source (BACKLOG.md Phase 6 — ARCHITECTURE.md → Input → Touch pad). Pure state,
 * fed from the bus exactly like `WheelWalker` is fed `input:wheel`: `src/ui/pad.ts` (the DOM
 * controller) forwards every button press/release as `input:pad`, `WorldScene` calls `handle()`
 * for each one and `read()` once a frame.
 */
import type { PadButton } from '../../shared/bus';
import type { Intent } from './intent';

export type { PadButton };

type PressButton = 'a' | 'b' | 'start';
type DirButton = 'left' | 'right';

export interface PadEvent {
  button: PadButton;
  down: boolean;
  /** Same clock as `performance.now()` (`PointerEvent.timeStamp`); only used to detect a
   * double-tap-and-hold. */
  timeStamp: number;
}

const isPress = (b: PadButton): b is PressButton => b === 'a' || b === 'b' || b === 'start';
const isDir = (b: PadButton): b is DirButton => b === 'left' || b === 'right';

/** A direction released and pressed again within this window, then held, runs (GAME_DESIGN.md →
 * Controls: "double-tap-hold ◀ ▶"). */
export const DOUBLE_TAP_MS = 300;

export class TouchPadState {
  private readonly held = new Set<PadButton>();
  /** Edges since the last `read()`, so a press released before the frame still counts once
   * (mirrors `KeyboardState`). */
  private readonly pressed = new Set<PressButton>();
  private readonly releasedAt: Partial<Record<DirButton, number>> = {};
  private runDir: DirButton | null = null;

  /**
   * Call for every `input:pad` event. A `down` for a button already held (a second finger
   * landing on it, or a duplicate report) is ignored, the same way a keyboard auto-repeat is not
   * a new press.
   */
  handle({ button, down, timeStamp }: PadEvent): void {
    if (down) {
      if (this.held.has(button)) return;
      this.held.add(button);
      if (isPress(button)) this.pressed.add(button);
      if (isDir(button)) {
        const releasedAt = this.releasedAt[button];
        if (releasedAt !== undefined && timeStamp - releasedAt <= DOUBLE_TAP_MS) {
          this.runDir = button;
        }
      }
      return;
    }
    this.held.delete(button);
    if (isDir(button)) {
      this.releasedAt[button] = timeStamp;
      if (this.runDir === button) this.runDir = null;
    }
  }

  /**
   * Drops every held button, pending press and the run flag. `WorldScene` calls this on every
   * `ui:modal` change (same as `WheelWalker.reset()`): a finger still resting on a button when a
   * panel opens or closes needs a fresh lift-and-press to count again, so a hold never leaks
   * across the boundary.
   */
  reset(): void {
    this.held.clear();
    this.pressed.clear();
    this.runDir = null;
  }

  read(): Intent {
    const left = this.held.has('left');
    const right = this.held.has('right');
    const intent: Intent = {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      run: this.runDir !== null && this.held.has(this.runDir),
      jumpPressed: this.pressed.has('a'),
      jumpHeld: this.held.has('a'),
      interactPressed: this.pressed.has('b'),
      menuPressed: this.pressed.has('start'),
    };
    this.pressed.clear();
    return intent;
  }
}
