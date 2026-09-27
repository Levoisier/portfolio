import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, TouchPadState } from './touch';

describe('TouchPadState', () => {
  it('reports moveX from held left/right and drops it on release', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    expect(s.read().moveX).toBe(1);
    s.handle({ button: 'right', down: false, timeStamp: 10 });
    expect(s.read().moveX).toBe(0);
  });

  it('opposite directions held together cancel out', () => {
    const s = new TouchPadState();
    s.handle({ button: 'left', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    expect(s.read().moveX).toBe(0);
  });

  it('A/B are edges: pressed exactly once, cleared by the next read', () => {
    const s = new TouchPadState();
    s.handle({ button: 'a', down: true, timeStamp: 0 });
    expect(s.read().jumpPressed).toBe(true);
    expect(s.read().jumpPressed).toBe(false);
  });

  it('A stays held (jumpHeld) until its own up event', () => {
    const s = new TouchPadState();
    s.handle({ button: 'a', down: true, timeStamp: 0 });
    expect(s.read().jumpHeld).toBe(true);
    expect(s.read().jumpHeld).toBe(true);
    s.handle({ button: 'a', down: false, timeStamp: 5 });
    expect(s.read().jumpHeld).toBe(false);
  });

  it('B reads independently of any held direction', () => {
    const s = new TouchPadState();
    s.handle({ button: 'left', down: true, timeStamp: 0 });
    s.handle({ button: 'b', down: true, timeStamp: 0 });
    const intent = s.read();
    expect(intent.moveX).toBe(-1);
    expect(intent.interactPressed).toBe(true);
  });

  it('a second finger landing on an already-held button does not re-arm the press edge', () => {
    const s = new TouchPadState();
    s.handle({ button: 'b', down: true, timeStamp: 0 });
    s.read();
    s.handle({ button: 'b', down: true, timeStamp: 1 }); // still held: ignored
    expect(s.read().interactPressed).toBe(false);
  });

  it('a lone tap on a direction does not run', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: false, timeStamp: 50 });
    expect(s.read().run).toBe(false);
  });

  it('pressing again outside the double-tap window does not run', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: false, timeStamp: 50 });
    s.handle({ button: 'right', down: true, timeStamp: 50 + DOUBLE_TAP_MS + 1 });
    expect(s.read().run).toBe(false);
  });

  it('double-tap-and-hold a direction runs while it stays held', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: false, timeStamp: 50 });
    s.handle({ button: 'right', down: true, timeStamp: 50 + DOUBLE_TAP_MS });
    const intent = s.read();
    expect(intent.run).toBe(true);
    expect(intent.moveX).toBe(1);
  });

  it('releasing the running direction stops the run; a plain re-press does not resume it', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: false, timeStamp: 50 });
    s.handle({ button: 'right', down: true, timeStamp: 100 });
    expect(s.read().run).toBe(true);
    s.handle({ button: 'right', down: false, timeStamp: 200 });
    expect(s.read().run).toBe(false);
  });

  it('switching to the other direction does not inherit the run flag', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: false, timeStamp: 50 });
    s.handle({ button: 'right', down: true, timeStamp: 100 }); // double-tap-hold: running right
    s.handle({ button: 'right', down: false, timeStamp: 150 });
    s.handle({ button: 'left', down: true, timeStamp: 160 });
    expect(s.read().run).toBe(false);
  });

  it('reset drops held buttons, pending presses and the run flag', () => {
    const s = new TouchPadState();
    s.handle({ button: 'right', down: true, timeStamp: 0 });
    s.handle({ button: 'right', down: false, timeStamp: 50 });
    s.handle({ button: 'right', down: true, timeStamp: 100 }); // running
    s.handle({ button: 'a', down: true, timeStamp: 100 });
    s.reset();
    const intent = s.read();
    expect(intent.moveX).toBe(0);
    expect(intent.run).toBe(false);
    expect(intent.jumpHeld).toBe(false);
    expect(intent.jumpPressed).toBe(false);
  });
});
