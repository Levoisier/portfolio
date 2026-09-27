/**
 * DOM side of the HUD's interactive chrome (BACKLOG.md Phase 7 — GAME_DESIGN.md → HUD): the
 * profile badge, Contact, the ES · EN toggle, the sound toggle and the menu button. Every
 * dynamic label is applied here and re-applied on `lang:change`, the same "aria-labels applied
 * client-side" pattern `src/ui/pad.ts` already uses for its own buttons.
 */
import { getLang, setLang } from '../i18n/lang';
import { ui } from '../i18n/ui';
import { bus } from '../shared/bus';
import { persistSoundOn, readSoundOn } from '../shared/sound';
import type { KeyValueStore } from '../i18n/lang';

export interface HudDeps {
  /** Opens `id`'s panel (`src/ui/panels.ts`'s `open`) if nothing else is open — the badge and
   * Contact button never interrupt an already-open panel or menu (GAME_DESIGN.md → HUD: "from
   * anywhere" means anywhere in the world, not "on top of whatever else is open"). */
  openPanelIfFree(id: string): void;
  /** The combined Esc/B precedence (ARCHITECTURE.md → Input): closes the topmost open panel or
   * the menu, or — when nothing was open — opens the menu. */
  toggleMenu(): void;
  store: KeyValueStore | null;
}

export function mountHud(
  hud: HTMLElement,
  { openPanelIfFree, toggleMenu, store }: HudDeps
): () => void {
  const badge = hud.querySelector<HTMLButtonElement>('[data-hud-badge]');
  const contact = hud.querySelector<HTMLButtonElement>('[data-hud-contact]');
  const langBtn = hud.querySelector<HTMLButtonElement>('[data-hud-lang]');
  const soundBtn = hud.querySelector<HTMLButtonElement>('[data-hud-sound]');
  const menuBtn = hud.querySelector<HTMLButtonElement>('[data-hud-menu]');
  const label = (btn: HTMLElement | null, key: string) =>
    btn?.querySelector<HTMLElement>(`[data-hud-${key}-label]`) ?? null;
  const contactLabel = label(contact, 'contact');
  const soundLabel = label(soundBtn, 'sound');
  const menuLabel = label(menuBtn, 'menu');

  let soundOn = readSoundOn(store);

  function applyLabels(): void {
    const lang = getLang();
    badge?.setAttribute('aria-label', ui.profileLabel[lang]);
    if (contactLabel) contactLabel.textContent = ui.contactLabel[lang];
    langBtn?.setAttribute('aria-label', ui.langSwitchLabel[lang]);
    if (soundBtn) {
      // A toggle keeps one name; its state is `aria-pressed` (and the speaker glyph).
      const state = (soundOn ? ui.soundOnLabel : ui.soundOffLabel)[lang];
      soundBtn.setAttribute('aria-label', ui.soundLabel[lang]);
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.title = state;
      if (soundLabel) soundLabel.textContent = ui.soundLabel[lang];
    }
    if (menuBtn) menuBtn.setAttribute('aria-label', ui.menuLabel[lang]);
    if (menuLabel) menuLabel.textContent = ui.menuLabel[lang];
  }

  const onBadge = () => openPanelIfFree('intro');
  const onContact = () => openPanelIfFree('contact');
  const onLang = () => setLang(getLang() === 'es' ? 'en' : 'es');
  const onSound = () => {
    soundOn = !soundOn;
    persistSoundOn(store, soundOn);
    bus.emit('sound:toggle', { on: soundOn });
    applyLabels();
  };
  const onMenu = () => toggleMenu();

  badge?.addEventListener('click', onBadge);
  contact?.addEventListener('click', onContact);
  langBtn?.addEventListener('click', onLang);
  soundBtn?.addEventListener('click', onSound);
  menuBtn?.addEventListener('click', onMenu);

  applyLabels();
  const offLang = bus.on('lang:change', applyLabels);

  return () => {
    offLang();
    badge?.removeEventListener('click', onBadge);
    contact?.removeEventListener('click', onContact);
    langBtn?.removeEventListener('click', onLang);
    soundBtn?.removeEventListener('click', onSound);
    menuBtn?.removeEventListener('click', onMenu);
  };
}
