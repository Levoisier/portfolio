/**
 * The pure core of the keyboard source (ARCHITECTURE.md → Input → Keyboard, Modal gating):
 * key events in, one `Intent` per `read()` out. `keyboard.ts` feeds it from Phaser's keys.
 */
import { NO_INTENT, type Intent } from './intent';

type Action = 'left' | 'right' | 'run' | 'jump' | 'interact' | 'menu';
type PressAction = 'jump' | 'interact' | 'menu';

/** Phaser key names (`Phaser.Input.Keyboard.KeyCodes`) and what each one does. */
export const KEY_BINDINGS = {
  LEFT: 'left',
  A: 'left',
  RIGHT: 'right',
  D: 'right',
  SHIFT: 'run',
  SPACE: 'jump',
  W: 'jump',
  UP: 'jump',
  E: 'interact',
  ENTER: 'interact',
  M: 'menu',
  ESC: 'menu',
} as const satisfies Record<string, Action>;

export type KeyName = keyof typeof KEY_BINDINGS;
export const KEY_NAMES = Object.keys(KEY_BINDINGS) as KeyName[];

export interface KeyEvent {
  code: KeyName;
  down: boolean;
  /** `KeyboardEvent.timeStamp` — the same clock as `performance.now()`. */
  timeStamp: number;
  /** `KeyboardEvent.repeat`: an auto-repeat is never a new press. */
  repeat?: boolean;
  /** Ctrl, Meta or Alt was held: the chord belongs to the browser / OS (and macOS drops the
   * keyup of keys pressed with Meta, which would leave the panda walking). */
  modified?: boolean;
}

const isPress = (a: Action): a is PressAction => a === 'jump' || a === 'interact' || a === 'menu';

export class KeyboardState {
  private readonly held = new Set<KeyName>();
  /** Edges since the last `read()`, so a press released before the frame still counts once. */
  private readonly pressed = new Set<PressAction>();
  private modal = false;
  /** Events stamped at or before this belong to an earlier input context (the UI, a lost focus). */
  private cutoff = -Infinity;

  handle({ code, down, timeStamp, repeat = false, modified = false }: KeyEvent): void {
    // `<=`: browsers coarsen timestamps, and a key stamped in the closing millisecond was the UI's.
    if (this.modal || timeStamp <= this.cutoff) return;
    if (!down) {
      this.held.delete(code);
      return;
    }
    // A repeat for a key we do not hold means it was held through a reset: it needs a fresh down.
    if (repeat || modified || this.held.has(code)) return;
    this.held.add(code);
    const action = KEY_BINDINGS[code];
    if (isPress(action)) this.pressed.add(action);
  }

  /**
   * `ui:modal` transitions. While open everything is ignored; on close every key is dropped and
   * events stamped before `timeStamp` are ignored, so the Esc that closed a panel (still queued
   * or replayed by Phaser) cannot also open the menu. Repeated reports of the same state are no-ops.
   */
  setModal(open: boolean, timeStamp: number): void {
    if (open === this.modal) return;
    this.modal = open;
    this.reset(open ? -Infinity : timeStamp);
  }

  /** Drops held keys and pending presses (blur, pause) and ignores events up to `timeStamp`. */
  reset(timeStamp = -Infinity): void {
    this.held.clear();
    this.pressed.clear();
    this.cutoff = Math.max(this.cutoff, timeStamp);
  }

  read(): Intent {
    if (this.modal) return { ...NO_INTENT };
    let left = false;
    let right = false;
    let run = false;
    let jumpHeld = false;
    for (const code of this.held) {
      const action = KEY_BINDINGS[code];
      if (action === 'left') left = true;
      else if (action === 'right') right = true;
      else if (action === 'run') run = true;
      else if (action === 'jump') jumpHeld = true;
    }
    const intent: Intent = {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      run,
      jumpPressed: this.pressed.has('jump'),
      jumpHeld,
      interactPressed: this.pressed.has('interact'),
      menuPressed: this.pressed.has('menu'),
    };
    this.pressed.clear();
    return intent;
  }
}
