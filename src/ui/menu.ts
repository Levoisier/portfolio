/**
 * DOM side of the fast-travel menu (BACKLOG.md Phase 7 — GAME_DESIGN.md → Menu / map). Lists
 * every stop in world order plus the 4 dossier sub-entries (`components/Menu.astro`), with
 * visited ✓ marks read from `shared/visited.ts`. Selecting an entry hides the menu and asks the
 * game to travel there (`bus.emit('travel:to', …)`) — `ui:modal` is left `true` the whole time
 * (`game/input/merge.ts`: "an active travel source replaces everything, even while a modal is
 * open"), so the destination's `station:open` (once `WorldScene` arrives) opens straight into
 * the still-paused game, exactly like any other panel. Same open/close/focus-trap shape as
 * `src/ui/panels.ts`, whose generic dialog helpers this reuses.
 */
import { safeLocalStorage } from '../i18n/lang';
import { bus } from '../shared/bus';
import { readVisited } from '../shared/visited';
import { focusCanvas, focusablesIn, panelIdFor, visibleLangEl } from './panels';

export interface MenuApi {
  open(): void;
  /** Closes the menu (Escape, the close button, or a combined `closeTopmost`) and reports
   * whether it was open — `false` when it was already closed. */
  close(): boolean;
  isOpen(): boolean;
}

export function mountMenu(root: HTMLElement): MenuApi {
  let menuOpen = false;
  let lastFocus: HTMLElement | null = null;

  /** `[data-menu-check]`/`[data-menu-visited-label]` exist once per language (both are always in
   * the DOM, like a panel's two `[lang]` divs); updating every copy is harmless and needs no
   * language lookup here — each copy already carries its own language's text, pre-rendered. */
  function refreshVisited(): void {
    const visited = readVisited(safeLocalStorage());
    for (const entry of root.querySelectorAll<HTMLElement>('[data-menu-entry]')) {
      const id = entry.dataset.menuEntry;
      if (!id) continue;
      const visitedHere = visited.has(panelIdFor(id));
      const check = entry.querySelector<HTMLElement>('[data-menu-check]');
      if (check) check.textContent = visitedHere ? '✓' : '';
      const label = entry.querySelector<HTMLElement>('[data-menu-visited-label]');
      if (label) label.hidden = !visitedHere;
    }
  }

  function open(): void {
    if (menuOpen) return;
    lastFocus = document.activeElement as HTMLElement | null;
    menuOpen = true;
    refreshVisited();
    root.hidden = false;
    bus.emit('ui:modal', { open: true });
    visibleLangEl(root)?.focus();
  }

  /** Hides the menu without touching `ui:modal` — used by `select`, where the game keeps
   * control (the fast-travel run/fade) straight through to the destination panel. */
  function hide(): void {
    menuOpen = false;
    root.hidden = true;
  }

  /** A genuine cancel (Escape, the close button, a combined `closeTopmost`): hides the menu AND
   * releases input back to the game. */
  function close(): boolean {
    if (!menuOpen) return false;
    hide();
    bus.emit('ui:modal', { open: false });
    if (!focusCanvas()) lastFocus?.focus();
    return true;
  }

  function select(id: string): void {
    hide();
    bus.emit('travel:to', { id });
  }

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-menu-close]')) {
      close();
      return;
    }
    const entry = target.closest<HTMLElement>('[data-menu-entry]');
    if (entry?.dataset.menuEntry) select(entry.dataset.menuEntry);
  });

  document.addEventListener('keydown', (e) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const lang = visibleLangEl(root);
    if (!lang) return;
    const focusables = focusablesIn(lang);
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  bus.on('menu:open', open);

  return { open, close, isOpen: () => menuOpen };
}
