import { describe, expect, it } from 'vitest';
import { NO_INTENT } from './intent';
import {
  KEY_BINDINGS,
  KEY_NAMES,
  KeyboardState,
  type KeyEvent,
  type KeyName,
} from './keyboard-state';

/** A keyboard with its own clock: every event is 1 ms after the previous one. */
function rig() {
  const kb = new KeyboardState();
  let now = 1000;
  const send = (code: KeyName, down: boolean, extra: Partial<KeyEvent> = {}) =>
    kb.handle({ code, down, timeStamp: (now += 1), ...extra });
  return {
    kb,
    down: (code: KeyName, extra?: Partial<KeyEvent>) => send(code, true, extra),
    up: (code: KeyName) => send(code, false),
    tap: (code: KeyName) => {
      send(code, true);
      send(code, false);
    },
    /** A timestamp for a modal transition, advancing the clock. */
    tick: () => (now += 1),
    /** An event stamped `ms` before the clock's current time (a queued / replayed event). */
    stale: (code: KeyName, down: boolean, ms: number) =>
      kb.handle({ code, down, timeStamp: now - ms }),
  };
}

describe('KeyboardState bindings', () => {
  it('maps every key of ARCHITECTURE.md → Input', () => {
    expect([...KEY_NAMES].sort()).toEqual(
      ['A', 'D', 'E', 'ENTER', 'ESC', 'LEFT', 'M', 'RIGHT', 'SHIFT', 'SPACE', 'UP', 'W'].sort()
    );
    expect(KEY_BINDINGS.ESC).toBe('menu');
    expect(KEY_BINDINGS.ENTER).toBe('interact');
  });

  it.each([
    ['LEFT', { moveX: -1 }],
    ['A', { moveX: -1 }],
    ['RIGHT', { moveX: 1 }],
    ['D', { moveX: 1 }],
    ['SHIFT', { run: true }],
    ['SPACE', { jumpPressed: true, jumpHeld: true }],
    ['W', { jumpPressed: true, jumpHeld: true }],
    ['UP', { jumpPressed: true, jumpHeld: true }],
    ['E', { interactPressed: true }],
    ['ENTER', { interactPressed: true }],
    ['M', { menuPressed: true }],
    ['ESC', { menuPressed: true }],
  ] as const)('%s', (code, expected) => {
    const r = rig();
    r.down(code);
    expect(r.kb.read()).toEqual({ ...NO_INTENT, ...expected });
  });
});

describe('KeyboardState levels', () => {
  it('both directions held cancel out; releasing one walks the other way', () => {
    const r = rig();
    r.down('LEFT');
    r.down('D');
    expect(r.kb.read().moveX).toBe(0);
    r.up('LEFT');
    expect(r.kb.read().moveX).toBe(1);
  });

  it('two keys for one direction: releasing one keeps walking', () => {
    const r = rig();
    r.down('RIGHT');
    r.down('D');
    r.up('RIGHT');
    expect(r.kb.read().moveX).toBe(1);
    r.up('D');
    expect(r.kb.read().moveX).toBe(0);
  });

  it('jumpHeld is a level across reads, over any jump key', () => {
    const r = rig();
    r.down('SPACE');
    expect(r.kb.read().jumpHeld).toBe(true);
    r.down('UP');
    r.up('SPACE');
    expect(r.kb.read().jumpHeld).toBe(true);
    r.up('UP');
    expect(r.kb.read().jumpHeld).toBe(false);
  });
});

describe('KeyboardState edges', () => {
  it('a press is reported on exactly one read', () => {
    const r = rig();
    r.down('SPACE');
    expect(r.kb.read()).toMatchObject({ jumpPressed: true, jumpHeld: true });
    expect(r.kb.read()).toMatchObject({ jumpPressed: false, jumpHeld: true });
  });

  it('down and up between two reads still yields one press', () => {
    const r = rig();
    r.tap('SPACE');
    r.tap('E');
    r.tap('ESC');
    expect(r.kb.read()).toEqual({
      ...NO_INTENT,
      jumpPressed: true,
      interactPressed: true,
      menuPressed: true,
    });
    expect(r.kb.read()).toEqual(NO_INTENT);
  });

  it('two presses of one action between reads collapse into one edge', () => {
    const r = rig();
    r.tap('SPACE');
    r.tap('W');
    expect(r.kb.read().jumpPressed).toBe(true);
    expect(r.kb.read().jumpPressed).toBe(false);
  });

  it('auto-repeat downs are not new presses', () => {
    const r = rig();
    r.down('ENTER');
    expect(r.kb.read().interactPressed).toBe(true);
    r.down('ENTER'); // down while already down
    r.down('ENTER', { repeat: true });
    expect(r.kb.read().interactPressed).toBe(false);
    r.up('ENTER');
    r.down('ENTER');
    expect(r.kb.read().interactPressed).toBe(true);
  });

  it('chords with Ctrl / Meta / Alt belong to the browser', () => {
    const r = rig();
    r.down('D', { modified: true }); // Ctrl+D bookmarks; macOS may never send its keyup
    r.down('ESC', { modified: true });
    expect(r.kb.read()).toEqual(NO_INTENT);
  });

  it('reset (blur, pause) drops held keys and pending presses', () => {
    const r = rig();
    r.down('RIGHT');
    r.down('SPACE');
    r.kb.reset(r.tick());
    expect(r.kb.read()).toEqual(NO_INTENT);
  });
});

describe('KeyboardState modal gating', () => {
  it('reads NO_INTENT and ignores events while a modal is open', () => {
    const r = rig();
    r.down('RIGHT');
    r.kb.setModal(true, r.tick());
    expect(r.kb.read()).toEqual(NO_INTENT);
    r.down('LEFT');
    r.tap('ESC');
    r.tap('ENTER');
    expect(r.kb.read()).toEqual(NO_INTENT);
    r.kb.setModal(false, r.tick());
    expect(r.kb.read()).toEqual(NO_INTENT);
  });

  it('a press pending when the modal opens is dropped', () => {
    const r = rig();
    r.tap('M');
    r.kb.setModal(true, r.tick());
    r.kb.setModal(false, r.tick());
    expect(r.kb.read().menuPressed).toBe(false);
  });

  it('the Esc that closed a panel does not also open the menu', () => {
    const r = rig();
    r.kb.setModal(true, r.tick());
    r.tick(); // the Esc keydown happens…
    r.kb.setModal(false, r.tick()); // …and the UI closes the panel while handling it
    r.stale('ESC', true, 1); // Phaser dispatches (or replays) it afterwards
    r.stale('ESC', false, 1);
    expect(r.kb.read().menuPressed).toBe(false);
    r.tap('ESC'); // a fresh press does open it
    expect(r.kb.read().menuPressed).toBe(true);
  });

  it('events stamped in the closing millisecond count as before the close', () => {
    const r = rig();
    r.kb.setModal(true, r.tick());
    const closedAt = r.tick();
    r.kb.setModal(false, closedAt);
    r.kb.handle({ code: 'ENTER', down: true, timeStamp: closedAt });
    expect(r.kb.read().interactPressed).toBe(false);
  });

  it('a key held through the close only counts after a fresh down', () => {
    const r = rig();
    r.down('RIGHT');
    r.kb.setModal(true, r.tick());
    r.kb.setModal(false, r.tick());
    // Phaser's resetKeys() makes the next auto-repeat look like a down: it is still a repeat.
    r.down('RIGHT', { repeat: true });
    expect(r.kb.read().moveX).toBe(0);
    r.up('RIGHT');
    r.down('RIGHT');
    expect(r.kb.read().moveX).toBe(1);
  });

  it('repeated reports of the same modal state change nothing', () => {
    const r = rig();
    r.down('RIGHT');
    r.kb.setModal(false, r.tick());
    expect(r.kb.read().moveX).toBe(1);
  });
});
