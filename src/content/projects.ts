import type { Project, Screenshot } from './types';

const fioraShot = (slug: string, alt: Screenshot['alt']): Screenshot => ({
  src: `/media/projects/fiora/fiora-${slug}.webp`,
  thumb: `/media/projects/fiora/fiora-${slug}-thumb.webp`,
  alt,
  width: 1080,
  height: 2340,
});

/** Public projects, in world order (left → right). */
export const projects: Project[] = [
  {
    id: 'fiora',
    title: 'Fiora',
    description: {
      es: 'App móvil de finanzas personales para Android: gestión de tarjetas de crédito, presupuestos por categoría, calendario de gastos y balance multi-cuenta, con recomendaciones de ahorro. En producción, sin listado público todavía — la galería muestra la app real.',
      en: 'Personal finance app for Android: credit card management, category budgets, a spending calendar, and multi-account balance tracking, with savings recommendations. Live in production, no public listing yet — the gallery shows the real app.',
    },
    stack: ['React Native', 'Expo', 'TypeScript'],
    platformNote: {
      es: 'Android · Expo — app en producción, sin enlace público',
      en: 'Android · Expo — live app, no public link',
    },
    screenshots: [
      fioraShot('overview-light', {
        es: 'Fiora — pantalla Overview en tema claro, con gasto seguro del día y presupuesto mensual',
        en: 'Fiora — Overview screen in light theme, with safe-to-spend today and monthly budget',
      }),
      fioraShot('overview-dark', {
        es: 'Fiora — pantalla Overview en tema oscuro, con balance total y crédito disponible',
        en: 'Fiora — Overview screen in dark theme, with total balance and available credit',
      }),
      fioraShot('budget-dark', {
        es: 'Fiora — pantalla Budget con progreso por categoría de gasto',
        en: 'Fiora — Budget screen with progress per spending category',
      }),
      fioraShot('calendar-dark', {
        es: 'Fiora — Calendario mensual con gasto diario proyectado',
        en: 'Fiora — Monthly calendar with projected daily spending',
      }),
      fioraShot('balance-dark', {
        es: 'Fiora — Balance con cuentas de efectivo, débito y crédito disponible',
        en: 'Fiora — Balance with cash, debit and available credit accounts',
      }),
    ],
  },
  {
    id: 'japaniracer',
    title: 'JapaniRacer',
    description: {
      es: 'Catálogo de repuestos de motocicletas con imágenes de alto rendimiento y muy optimizadas, sincronizado en tiempo real con el ERP, con seguimiento de estado de pedidos para clientes y autenticación con Firebase. Imágenes servidas vía CloudFront sobre AWS S3 y EC2.',
      en: 'High-performance, heavily optimized motorcycle parts catalog images, synced in real time with the ERP, with client order-status tracking and Firebase authentication. Images served through CloudFront on AWS S3 and EC2.',
    },
    stack: ['Next.js', 'React', 'TypeScript', 'Firebase', 'AWS S3', 'EC2', 'CloudFront'],
    liveUrl: 'https://japaniracer.com/',
    liveAriaLabel: {
      es: 'Abrir sitio en vivo de JapaniRacer',
      en: 'Open live site for JapaniRacer',
    },
  },
  {
    id: 'le-parche',
    title: 'Le Parché',
    description: {
      es: 'Sistema de marca y flujo de reservas para restaurante: fachada cinematográfica con Astro/GSAP combinada con operaciones de reservas impulsadas por Python.',
      en: 'Restaurant brand system and booking flow: cinematic Astro/GSAP frontage paired with Python-powered reservation operations.',
    },
    stack: ['Astro', 'GSAP', 'React', 'TypeScript', 'Python'],
    liveUrl: 'https://leparche.com.co/',
    liveAriaLabel: {
      es: 'Abrir sitio en vivo de Le Parché',
      en: 'Open live site for Le Parché',
    },
  },
  {
    id: 'maison-cielare',
    title: 'Maison Cielare',
    description: {
      es: 'Tienda en Shopify y configuración de comercio para una marca de ropa de dormir, con trabajo en tema Liquid, Mercado Pago, SellerChat, y manual de marca completo.',
      en: 'Shopify storefront and commerce setup for a sleepwear brand, with Liquid theme work, Mercado Pago, SellerChat, and a complete brand manual.',
    },
    stack: ['Shopify', 'Liquid', 'HTML', 'CSS', 'Mercado Pago'],
    liveUrl: 'https://maisoncielare.com/',
    liveAriaLabel: {
      es: 'Abrir sitio en vivo de Maison Cielare',
      en: 'Open live site for Maison Cielare',
    },
  },
  {
    id: 'orquestia',
    title: 'Orquestia',
    description: {
      es: 'Landing de agencia, portafolio, sistema de blog y manual de marca construidos de punta a punta con Next.js y TypeScript.',
      en: 'Agency landing page, portfolio, blog system, and brand manual built end-to-end with a focused Next.js and TypeScript stack.',
    },
    stack: ['Next.js', 'React', 'TypeScript', 'Blog', 'Brand System'],
    liveUrl: 'https://www.orquestia.io/',
    liveAriaLabel: {
      es: 'Abrir sitio en vivo de Orquestia',
      en: 'Open live site for Orquestia',
    },
  },
];
