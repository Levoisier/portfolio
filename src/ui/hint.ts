/**
 * DOM side of the first-visit controls hint (BACKLOG.md Phase 7 — GAME_DESIGN.md → HUD:
 * "disappears after the first move"; input-aware per `shared/layout-mode.ts`). Hides on
 * `input:first-move`, on a panel/menu opening (it would only clash with the dialog), and stays
 * hidden forever once dismissed (`shared/hint.ts`, persisted in `localStorage`).
 */
import { getLang } from '../i18n/lang';
import { ui } from '../i18n/ui';
import { bus } from '../shared/bus';
import { hintSeen, markHintSeen } from '../shared/hint';
import type { KeyValueStore } from '../i18n/lang';
import { watchLayoutMode } from '../shared/layout-mode';

export function mountHint(el: HTMLElement, store: KeyValueStore | null): () => void {
  let dismissed = hintSeen(store);
  let touch = false;

  function render(): void {
    if (dismissed) {
      el.hidden = true;
      return;
    }
    const lang = getLang();
    el.textContent = (touch ? ui.hintTouch : ui.hintDesktop)[lang];
    el.hidden = false;
  }

  function dismiss(): void {
    if (dismissed) return;
    dismissed = true;
    markHintSeen(store);
    el.hidden = true;
  }

  const cleanup: (() => void)[] = [];
  cleanup.push(bus.on('lang:change', render));
  cleanup.push(bus.on('input:first-move', dismiss));
  cleanup.push(
    bus.on('ui:modal', ({ open }) => {
      if (open) el.hidden = true;
      else if (!dismissed) render();
    })
  );
  cleanup.push(
    watchLayoutMode((mode) => {
      touch = mode !== 'desktop';
      render();
    })
  );

  return () => cleanup.splice(0).forEach((off) => off());
}
