/**
 * DOM side of stations & panels (BACKLOG.md Phase 5 — ARCHITECTURE.md → Stations & panels). The
 * game only ever emits `station:enter` / `station:leave` / `station:open` on the bus (AGENTS.md
 * Golden Rule 7); this module decides whether a panel exists for an id, shows/hides it, owns
 * `ui:modal`, focus, the HUD prompt text, visited marks and the URL hash.
 */
import { projects } from '../content';
import { hashFor } from '../game/travel/deep-link';
import { getLang, safeLocalStorage } from '../i18n/lang';
import { ui } from '../i18n/ui';
import { bus } from '../shared/bus';
import { markVisited } from '../shared/visited';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** A stop whose panel is filed under a different id (GAME_DESIGN.md → Canonical ids: "Stop →
 * panel" — only `gate` → `intro` today; `classified`/`lab` still open their own stub id until
 * Phase 8/9 add the real vault/stack panels and this mapping). Applied once, on the way in, so
 * `openId` (and the hash/visited mark it drives) is always the real `[data-panel]` id — `gate`
 * and `intro` end up sharing one visited mark, matching GAME_DESIGN.md's "`/#gate` = `/#intro`".
 * Exported: `src/ui/menu.ts` (Phase 7) checks the same id when it reads a menu entry's visited
 * mark. */
export const PANEL_FOR_STOP: Record<string, string> = { gate: 'intro' };

export function panelIdFor(stopId: string): string {
  return PANEL_FOR_STOP[stopId] ?? stopId;
}

/** Skips elements hidden by CSS (`offsetParent === null`) or made non-interactive with `inert`
 * (the gallery grid, while its lightbox is open). Exported: `src/ui/menu.ts` (Phase 7) traps
 * focus inside the menu dialog the same way. */
export function focusablesIn(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null && !el.closest('[inert]')
  );
}

/** The two `[lang]` children of a dialog section are both always in the DOM; `shell.css`'s
 * `html[data-lang]` rule hides one of them with `display: none`. Exported: `src/ui/menu.ts`
 * (Phase 7) focuses its own dialog the same way. */
export function visibleLangEl(section: HTMLElement): HTMLElement | null {
  for (const el of section.querySelectorAll<HTMLElement>(':scope > [lang]')) {
    if (getComputedStyle(el).display !== 'none') return el;
  }
  return null;
}

/** Exported: `src/ui/menu.ts` (Phase 7) restores focus to the canvas the same way on close. */
export function focusCanvas(): boolean {
  const canvas = document.querySelector<HTMLCanvasElement>('#screen canvas');
  if (!canvas) return false;
  // Programmatically focusable without joining the page's tab order.
  if (canvas.tabIndex < 0) canvas.tabIndex = -1;
  canvas.focus();
  return true;
}

function setGalleryInert(gallery: HTMLElement, on: boolean): void {
  const grid = gallery.querySelector<HTMLElement>('.gallery__grid');
  if (!grid) return;
  if (on) grid.setAttribute('inert', '');
  else grid.removeAttribute('inert');
}

function showImage(gallery: HTMLElement, lightbox: HTMLElement, index: number): void {
  const thumbs = Array.from(gallery.querySelectorAll<HTMLElement>('[data-gallery-open]'));
  if (thumbs.length === 0) return;
  const i = ((index % thumbs.length) + thumbs.length) % thumbs.length;
  const target = thumbs[i]!;
  const image = lightbox.querySelector<HTMLImageElement>('[data-gallery-image]');
  if (image) {
    image.src = target.dataset.src ?? '';
    image.alt = target.dataset.alt ?? '';
  }
  lightbox.dataset.index = String(i);
}

/** Opens the lightbox on `index`; `opener` (the thumbnail clicked, when there is one) is where
 * focus returns to on close. Navigating with the arrows calls `showImage` directly instead. */
function openLightbox(gallery: HTMLElement, index: number, opener?: HTMLElement): void {
  const lightbox = gallery.querySelector<HTMLElement>('[data-gallery-lightbox]');
  if (!lightbox) return;
  showImage(gallery, lightbox, index);
  if (opener) {
    if (!opener.id) opener.id = `gallery-thumb-${Math.random().toString(36).slice(2)}`;
    lightbox.dataset.opener = opener.id;
  }
  setGalleryInert(gallery, true);
  lightbox.hidden = false;
  lightbox.querySelector<HTMLElement>('[data-gallery-close]')?.focus();
}

function closeLightbox(lightbox: HTMLElement): void {
  lightbox.hidden = true;
  const gallery = lightbox.closest<HTMLElement>('[data-gallery]');
  if (gallery) setGalleryInert(gallery, false);
  const opener = lightbox.dataset.opener;
  delete lightbox.dataset.opener;
  if (opener) document.getElementById(opener)?.focus();
}

export interface PanelsApi {
  /** Closes the topmost open lightbox or panel (same precedence as a real Esc press) and
   * reports whether it did — `false` when nothing was open. BACKLOG.md Phase 6: `src/ui/pad.ts`
   * calls this before ever forwarding a `B` press, so the same press that closes a panel is
   * never also read as an interact. */
  closeTopmost(): boolean;
  /** Opens `id`'s panel (HUD badge/Contact — BACKLOG.md Phase 7) if none is open yet; a no-op,
   * reported by its `false` return, while a panel is already open — the caller (`src/ui/hud.ts`)
   * decides whether to close it first (it does not: "from anywhere" means anywhere in the
   * world, not "interrupting whatever else is open"). */
  open(id: string): boolean;
  /** Whether a panel (or its gallery lightbox) is currently open — `src/ui/main.ts` (Phase 7)
   * composes this with the menu's own `isOpen` so HUD actions never open a second thing on top
   * of the menu. */
  isOpen(): boolean;
}

export function mountPanels(root: HTMLElement, hud: HTMLElement): PanelsApi {
  const promptEl = hud.querySelector<HTMLElement>('[data-slot="prompt"]');
  let currentStationId: string | null = null;
  let openId: string | null = null;
  let lastFocus: HTMLElement | null = null;
  /** Mirrors the bus's `ui:modal` regardless of source (a panel here, or the menu — `src/ui/
   * menu.ts`, Phase 7) so the prompt hides for either, not only this module's own `openId`. */
  let modalOpen = false;

  const panelSection = (id: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-panel="${id}"]`);

  function promptText(id: string | null): string {
    if (!id) return '';
    const project = projects.find((p) => p.id === id);
    if (!project) return '';
    const lang = getLang();
    const touch = document.documentElement.dataset.mode !== 'desktop';
    const template = touch ? ui.stationPromptTouch[lang] : ui.stationPromptKey[lang];
    return template.replace('{title}', project.title);
  }

  function updatePrompt(): void {
    if (promptEl) promptEl.textContent = modalOpen ? '' : promptText(currentStationId);
  }

  function openPanel(rawId: string): boolean {
    const id = panelIdFor(rawId);
    const section = panelSection(id);
    if (!section || openId) return false;
    lastFocus = document.activeElement as HTMLElement | null;
    openId = id;
    section.hidden = false;
    updatePrompt();
    history.replaceState(null, '', hashFor(id));
    bus.emit('ui:modal', { open: true });
    visibleLangEl(section)?.focus();
    return true;
  }

  function closePanel(): void {
    if (!openId) return;
    const id = openId;
    const section = panelSection(id);
    if (section) {
      for (const lb of section.querySelectorAll<HTMLElement>('[data-gallery-lightbox]')) {
        lb.hidden = true;
        delete lb.dataset.opener;
      }
      section.setAttribute('hidden', '');
    }
    openId = null;
    markVisited(safeLocalStorage(), id);
    history.replaceState(null, '', location.pathname + location.search);
    updatePrompt();
    bus.emit('ui:modal', { open: false });
    bus.emit('panel:closed', { id });
    if (!focusCanvas()) lastFocus?.focus();
  }

  /** The topmost thing open: an open lightbox closes first, a second call (or press) then
   * closes the panel underneath — same order the Esc handler below already used. */
  function closeTopmost(): boolean {
    if (!openId) return false;
    const section = panelSection(openId);
    const openLb = section?.querySelector<HTMLElement>('[data-gallery-lightbox]:not([hidden])');
    if (openLb) closeLightbox(openLb);
    else closePanel();
    return true;
  }

  bus.on('station:enter', ({ id }) => {
    currentStationId = id;
    updatePrompt();
  });
  bus.on('station:leave', () => {
    currentStationId = null;
    updatePrompt();
  });
  bus.on('lang:change', updatePrompt);
  bus.on('station:open', ({ id }) => openPanel(id));
  // The menu (Phase 7) also sets `ui:modal`; the prompt must hide for it too, not only for a
  // panel this module opened itself (`openPanel` already emits the same event, so this doubles
  // as its own `open`/`close` handling — a harmless, idempotent extra `updatePrompt()` call).
  bus.on('ui:modal', ({ open }) => {
    modalOpen = open;
    updatePrompt();
  });

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-panel-close]')) {
      closePanel();
      return;
    }
    const openBtn = target.closest<HTMLElement>('[data-gallery-open]');
    if (openBtn) {
      const gallery = openBtn.closest<HTMLElement>('[data-gallery]');
      if (gallery) openLightbox(gallery, Number(openBtn.dataset.index ?? '0'), openBtn);
      return;
    }
    const lightbox = target.closest<HTMLElement>('[data-gallery-lightbox]');
    if (!lightbox) return;
    const gallery = lightbox.closest<HTMLElement>('[data-gallery]');
    if (!gallery) return;
    const index = Number(lightbox.dataset.index ?? '0');
    if (target.closest('[data-gallery-close]')) closeLightbox(lightbox);
    else if (target.closest('[data-gallery-prev]')) showImage(gallery, lightbox, index - 1);
    else if (target.closest('[data-gallery-next]')) showImage(gallery, lightbox, index + 1);
  });

  document.addEventListener('keydown', (e) => {
    if (!openId) return;
    const section = panelSection(openId);
    const lang = section && visibleLangEl(section);
    if (!section || !lang) return;
    const openLb = section.querySelector<HTMLElement>('[data-gallery-lightbox]:not([hidden])');

    if (e.key === 'Escape') {
      closeTopmost();
      return;
    }
    if (openLb) {
      const gallery = openLb.closest<HTMLElement>('[data-gallery]');
      const index = Number(openLb.dataset.index ?? '0');
      if (gallery && e.key === 'ArrowLeft') {
        showImage(gallery, openLb, index - 1);
        return;
      }
      if (gallery && e.key === 'ArrowRight') {
        showImage(gallery, openLb, index + 1);
        return;
      }
    }
    if (e.key === 'Tab') {
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
      return;
    }
    // A real `<a href>` only activates on Enter by default; Space matches every other control in
    // the panel (close, gallery nav are `<button>`s), so both keys work on every one.
    if (e.key === ' ') {
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href]');
      if (link && section.contains(link)) {
        e.preventDefault();
        link.click();
      }
    }
  });

  return { closeTopmost, open: openPanel, isOpen: () => openId !== null };
}
