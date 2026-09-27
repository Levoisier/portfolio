/**
 * UI strings (HUD, loading screen, menu chrome). Portfolio content lives in src/content;
 * this file holds only interface copy. Every entry needs ES and EN.
 */
import type { Localized } from '../content/types';

export const ui = {
  loading: { es: 'Cargando', en: 'Loading' },
  loadingProgress: { es: 'Progreso de carga', en: 'Loading progress' },
  gameLabel: {
    es: 'Portafolio jugable: un panda recorre una planta química con mis proyectos',
    en: 'Playable portfolio: a panda walks through a chemical plant with my projects',
  },
  noscript: {
    es: 'Este portafolio es un juego y necesita JavaScript.',
    en: 'This portfolio is a game and needs JavaScript.',
  },
  // ─── Stations & panels (Phase 5) ─────────────────────────────────────────
  close: { es: 'Cerrar', en: 'Close' },
  finaleThanks: { es: '¡Gracias por visitar!', en: 'Thanks for visiting!' },
  stackSymbol: { es: 'Símbolo', en: 'Symbol' },
  stackName: { es: 'Tecnología', en: 'Technology' },
  stackCategory: { es: 'Categoría', en: 'Category' },
  stackProficiency: { es: 'Dominio', en: 'Proficiency' },
  stackReset: { es: 'Reiniciar laboratorio', en: 'Reset lab' },
  stackHeading: { es: 'Stack', en: 'Stack' },
  viewLive: { es: 'Ver sitio en vivo', en: 'View live site' },
  galleryPrev: { es: 'Anterior', en: 'Previous' },
  galleryNext: { es: 'Siguiente', en: 'Next' },
  galleryClose: { es: 'Cerrar galería', en: 'Close gallery' },
  /** `{title}` is replaced with the station's title; kept as plain templates (not functions) so
   * every `ui` entry stays a `Localized<string>`. */
  stationPromptKey: { es: 'E — {title}', en: 'E — {title}' },
  stationPromptTouch: { es: 'Toca — {title}', en: 'Toca — {title}' },
  // ─── Handheld pad (Phase 6) ───────────────────────────────────────────────
  padLeft: { es: 'Caminar a la izquierda', en: 'Walk left' },
  padRight: { es: 'Caminar a la derecha', en: 'Walk right' },
  padJump: { es: 'Saltar', en: 'Jump' },
  padInteract: { es: 'Interactuar', en: 'Interact' },
  // ─── Menu, HUD & accessibility (Phase 7) ─────────────────────────────────
  /** The HUD's menu button text/aria-label AND the menu dialog's own title. */
  menuLabel: { es: 'Mapa', en: 'Map' },
  menuGate: { es: 'Portón', en: 'Gate' },
  menuClassified: { es: 'Ala clasificada', en: 'Classified wing' },
  menuLab: { es: 'Laboratorio de reactivos', en: 'Reagent lab' },
  /** The HUD's Contact button AND the menu's Contact entry. */
  contactLabel: { es: 'Contacto', en: 'Contact' },
  /** Screen-reader-only suffix on a visited menu entry (the ✓ glyph itself is decorative). */
  menuVisitedLabel: { es: ', visitado', en: ', visited' },
  /** The HUD name badge's aria-label (opens the `intro` panel). */
  profileLabel: { es: 'Ver perfil', en: 'View profile' },
  langSwitchLabel: { es: 'Cambiar idioma', en: 'Switch language' },
  /** The sound toggle's accessible name; its on/off state is `aria-pressed`. */
  soundLabel: { es: 'Sonido', en: 'Sound' },
  soundOnLabel: { es: 'Sonido activado', en: 'Sound on' },
  soundOffLabel: { es: 'Sonido desactivado', en: 'Sound off' },
  /** A stop whose own phase has not merged yet opens this generic stand-in panel. */
  stubBody: {
    es: 'Esta parada llega en una fase futura del proyecto.',
    en: 'This stop arrives in a later phase of the build.',
  },
  // ─── Classified wing (Phase 8) ────────────────────────────────────────────
  /** The code-drawn wing sign — deliberately identical in both languages (a physical bilingual
   * placard), unlike every other entry here. */
  classifiedSign: { es: 'CLASIFICADO / CLASSIFIED', en: 'CLASIFICADO / CLASSIFIED' },
  dossierRole: { es: 'Rol', en: 'Role' },
  dossierImpact: { es: 'Impacto', en: 'Impact' },
  dossierDuration: { es: 'Duración', en: 'Duration' },
  dossierTeamSize: { es: 'Tamaño del equipo', en: 'Team size' },
  hintDesktop: {
    es: '← → o A/D para caminar, Espacio para saltar, E para interactuar — o solo usa la rueda del mouse.',
    en: '← → or A/D to walk, Space to jump, E to interact — or just scroll.',
  },
  hintTouch: {
    es: 'Usa el control de abajo para moverte, saltar e interactuar.',
    en: 'Use the pad below to move, jump and interact.',
  },
} satisfies Record<string, Localized>;

export type UiKey = keyof typeof ui;
