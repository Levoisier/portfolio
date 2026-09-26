import type { Localized } from './types';

/**
 * Cristian's section copy from the old site, kept so panels, signs and menu groups use his
 * words instead of invented ones. Edit freely; every entry needs ES and EN.
 */
export const sectionCopy: Record<
  'projects' | 'confidential' | 'skills' | 'contact',
  { heading: Localized; subheading?: Localized }
> = {
  projects: {
    heading: {
      es: 'Proyectos en producción, resultados medibles',
      en: 'Projects in production, measurable results',
    },
    subheading: {
      es: 'Proyectos en producción: marca, comercio, contenido y flujos operativos.',
      en: 'Live projects across brand, commerce, content, and production workflows.',
    },
  },
  confidential: {
    heading: { es: 'Trabajo Confidencial', en: 'Confidential Work' },
    subheading: {
      es: 'Proyectos bajo NDA resumidos para proteger la confidencialidad.',
      en: 'NDA engagements abstracted to protect confidentiality.',
    },
  },
  skills: {
    heading: { es: 'Mi Stack', en: 'My Stack' },
  },
  contact: {
    heading: { es: 'Hablemos', en: 'Get in touch' },
  },
};
