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
} satisfies Record<string, Localized>;

export type UiKey = keyof typeof ui;
