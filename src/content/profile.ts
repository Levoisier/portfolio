import type { Profile } from './types';

export const profile: Profile = {
  name: 'Cristian Zapata Cartagena',
  roles: [
    { es: 'Full Stack Developer', en: 'Full Stack Developer' },
    { es: 'Ingeniero Químico', en: 'Chemical Engineer' },
  ],
  tagline: {
    es: 'Conoce un poco de mi trabajo',
    en: 'A little glance at my work',
  },
  summary: {
    es: 'Full Stack Developer e Ingeniero Químico. Construyo interfaces de precisión fusionadas con pensamiento científico.',
    en: 'Full Stack Developer & Chemical Engineer. Building precision interfaces fused with scientific thinking.',
  },
  callToAction: {
    es: 'Trae un problema y te ayudo a convertirlo en la próxima oportunidad de crecimiento.',
    en: 'Bring a clear problem, and I can help turn it into a production-ready build.',
  },
  contact: [
    {
      channel: 'email',
      label: 'ing.cristian.cartagena@gmail.com',
      href: 'mailto:ing.cristian.cartagena@gmail.com',
      ariaLabel: { es: 'Enviar email a Cristian', en: 'Send email to Cristian' },
      external: false,
    },
    {
      channel: 'github',
      label: 'github.com/levoisier',
      href: 'https://github.com/levoisier',
      ariaLabel: {
        es: 'Perfil de GitHub (abre en nueva pestaña)',
        en: 'GitHub profile (opens in new tab)',
      },
      external: true,
    },
    {
      channel: 'whatsapp',
      label: '+57 301 509 3825',
      href: 'https://wa.me/573015093825',
      ariaLabel: {
        es: 'Escribirle a Cristian por WhatsApp (abre en nueva pestaña)',
        en: 'Message Cristian on WhatsApp (opens in new tab)',
      },
      external: true,
    },
    {
      channel: 'linkedin',
      label: 'linkedin.com/in/levoisier',
      href: 'https://linkedin.com/in/levoisier',
      ariaLabel: {
        es: 'Perfil de LinkedIn (abre en nueva pestaña)',
        en: 'LinkedIn profile (opens in new tab)',
      },
      external: true,
    },
  ],
};
