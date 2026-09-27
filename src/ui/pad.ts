/**
 * DOM side of the handheld pad (BACKLOG.md Phase 6 — ARCHITECTURE.md → Input → Touch pad). Every
 * button's down/up edge is forwarded on the bus as `input:pad`; the game never touches these
 * elements (AGENTS.md Golden Rule 7). `B` closes the topmost open panel first (same precedence as
 * a real Esc — GAME_DESIGN.md → Controls): when it does, the press is never also forwarded, so it
 * can never register as an interact on the station behind the panel it just closed.
 */
import { getLang } from '../i18n/lang';
import { ui, type UiKey } from '../i18n/ui';
import { bus, type PadButton } from '../shared/bus';

const LABEL_KEY: Record<PadButton, UiKey> = {
  left: 'padLeft',
  right: 'padRight',
  a: 'padJump',
  b: 'padInteract',
};

/** Android only; iOS Safari has no Vibration API. A blocked or unsupported call is silent. */
function vibrateTick(): void {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Some browsers throw calling this outside a user gesture; a missed tick is harmless.
  }
}

export interface PadOptions {
  /** Closes the topmost open panel/menu and reports whether it did (`src/ui/panels.ts`'s
   * `PanelsApi.closeTopmost`) — `B` only reaches the game as an interact press when nothing was
   * open. */
  onClose: () => boolean;
}

function isPadButton(v: string | undefined): v is PadButton {
  return v === 'left' || v === 'right' || v === 'a' || v === 'b';
}

/** Mounts the pad's pointer handling; returns an unsubscribe (there is only ever one pad, but
 * this keeps the module symmetrical with every other UI mount function). */
export function mountPad(root: HTMLElement, { onClose }: PadOptions): () => void {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pad-btn]'));
  const cleanup: (() => void)[] = [];

  for (const el of buttons) {
    const button = el.dataset.padBtn;
    if (!isPadButton(button)) continue;
    // Multiple fingers can land on/leave the same button (a slight roll); only the first down
    // and the last up are real edges, so a stray second contact never re-fires a press.
    const pointers = new Set<number>();

    const press = (timeStamp: number): void => {
      el.dataset.pressed = 'true';
      if (button === 'a' || button === 'b') vibrateTick();
      if (button === 'b' && onClose()) return;
      bus.emit('input:pad', { button, down: true, timeStamp });
    };
    const release = (timeStamp: number): void => {
      delete el.dataset.pressed;
      bus.emit('input:pad', { button, down: false, timeStamp });
    };

    const onPointerDown = (e: PointerEvent): void => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic/inactive pointer id: capture is a robustness nicety, not a requirement.
      }
      const wasIdle = pointers.size === 0;
      pointers.add(e.pointerId);
      if (wasIdle) press(e.timeStamp);
    };
    const onPointerUp = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) release(e.timeStamp);
    };
    const onContextMenu = (e: Event): void => e.preventDefault();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('contextmenu', onContextMenu);
    cleanup.push(() => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('contextmenu', onContextMenu);
    });
  }

  function applyLabels(): void {
    const lang = getLang();
    for (const el of buttons) {
      const button = el.dataset.padBtn;
      if (isPadButton(button)) el.setAttribute('aria-label', ui[LABEL_KEY[button]][lang]);
    }
  }
  applyLabels();
  cleanup.push(bus.on('lang:change', applyLabels));

  return () => {
    for (const off of cleanup.splice(0)) off();
  };
}
