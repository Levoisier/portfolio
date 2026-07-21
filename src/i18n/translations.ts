export type Lang = 'es' | 'en';

export const translations: Record<Lang, Record<string, string>> = {
  es: {
    // Hero
    'hero.premise': 'Conoce un poco de mi trabajo',
    'hero.role.line1': 'Full Stack Developer &',
    'hero.role.line2': 'Ingeniero Químico',

    // Projects
    'projects.heading': 'PROYECTOS EN PRODUCCIÓN, RESULTADOS MEDIBLES',
    'projects.subheading':
      'Proyectos en producción: marca, comercio, contenido y flujos operativos.',
    'projects.0.description':
      'Catálogo de repuestos de motocicletas con imágenes de alto rendimiento y muy optimizadas, sincronizado en tiempo real con el ERP, con seguimiento de estado de pedidos para clientes y autenticación con Firebase. Imágenes servidas vía CloudFront sobre AWS S3 y EC2.',
    'projects.1.description':
      'Sistema de marca y flujo de reservas para restaurante: fachada cinematográfica con Astro/GSAP combinada con operaciones de reservas impulsadas por Python.',
    'projects.2.description':
      'Tienda en Shopify y configuración de comercio para una marca de ropa de dormir, con trabajo en tema Liquid, Mercado Pago, SellerChat, y manual de marca completo.',
    'projects.3.description':
      'Landing de agencia, portafolio, sistema de blog y manual de marca construidos de punta a punta con Next.js y TypeScript.',
    'projects.0.live-aria': 'Abrir sitio en vivo de JapaniRacer',
    'projects.1.live-aria': 'Abrir sitio en vivo de Le Parché',
    'projects.2.live-aria': 'Abrir sitio en vivo de Maison Cielare',
    'projects.3.live-aria': 'Abrir sitio en vivo de Orquestia',
    'projects.4.description':
      'App móvil de finanzas personales para Android: gestión de tarjetas de crédito, presupuestos por categoría, calendario de gastos y balance multi-cuenta, con recomendaciones de ahorro. En producción, sin listado público todavía — la galería muestra la app real.',
    'projects.4.gallery-aria': 'Ver capturas de pantalla de Fiora',
    'projects.4.platform-note': 'Android · Expo — app en producción, sin enlace público',

    // Lightbox
    'lightbox.eyebrow': 'Capturas de pantalla',
    'lightbox.close': 'Cerrar galería',
    'lightbox.prev': 'Captura anterior',
    'lightbox.next': 'Siguiente captura',

    // Confidential
    'confidential.classified': '[CLASIFICADO]',
    'confidential.heading': 'Trabajo Confidencial',
    'confidential.subheading': 'Proyectos bajo NDA resumidos para proteger la confidencialidad.',
    'confidential.field.role': 'Rol',
    'confidential.field.stack': 'Stack',
    'confidential.field.impact': 'Impacto',
    'confidential.field.duration': 'Duración',
    'confidential.field.team': 'Equipo',
    'confidential.0.industry': 'E-Commerce / Retail',
    'confidential.0.impact':
      'Desarrollé una plataforma de ecommerce personalizada con autenticación, gestión de perfil de usuario, seguimiento de pedidos, sincronización con ERP, pagos Wompi, y flujo de aprobación de transferencias bancarias manuales.',
    'confidential.0.duration': '10+ meses',
    'confidential.0.card-aria': 'Proyecto confidencial: E-Commerce / Retail',
    'confidential.1.industry': 'Logística / Almacenamiento',
    'confidential.1.impact':
      'Entregué un WMS conectado a pedidos de ecommerce, con asignación inteligente de tareas, automatizaciones operativas, tickets de incidencias, reportes de KPIs, y flujos de despacho de salida.',
    'confidential.1.duration': '12+ meses',
    'confidential.1.card-aria': 'Proyecto confidencial: Logística / Almacenamiento',
    'confidential.2.industry': 'Operaciones de Ventas',
    'confidential.2.impact':
      'Desarrollé un CRM con flujos de seguimiento automatizados, pipelines de leads y cuentas, colas de tareas, historial de actividad, vistas de reportes, y control de acceso por roles.',
    'confidential.2.duration': '8+ meses',
    'confidential.2.card-aria': 'Proyecto confidencial: Operaciones de Ventas',
    'confidential.3.industry': 'Finanzas / ERP',
    'confidential.3.impact':
      'Implementé un módulo de ERP financiero que cubre facturación electrónica a través de DIAN, operaciones de facturación, flujos de contabilidad, seguimiento de estados de documentos, y registros listos para auditoría.',
    'confidential.3.duration': '9+ meses',
    'confidential.3.card-aria': 'Proyecto confidencial: Finanzas / ERP',

    // Skills
    'skills.eyebrow': '',
    'skills.heading': 'Mi Stack',
    'skills.description':
      'Lenguajes, frameworks, plataformas y herramientas que uso para llevar proyectos a producción. Cada semana en expansión.',
    'skills.grid-aria': 'Stack tecnológico',
    'skills.legend-aria': 'Leyenda de categorías',
    'skills.legend.languages': 'Lenguajes',
    'skills.legend.frontend': 'Frontend',
    'skills.legend.backend': 'Backend',
    'skills.legend.data-auth': 'Datos/Auth',
    'skills.legend.devops': 'DevOps',
    'skills.legend.ai': 'IA',
    'skills.legend.enterprise': 'Empresarial',
    'skills.legend.testing': 'Testing',

    // Contact
    'contact.heading': 'Hablemos',
    'contact.body':
      'Trae un problema y te ayudo a convertirlo en la próxima oportunidad de crecimiento.',
    'contact.email-aria': 'Enviar email a Cristian',
    'contact.github-aria': 'Perfil de GitHub (abre en nueva pestaña)',
    'contact.whatsapp-aria': 'Escribirle a Cristian por WhatsApp (abre en nueva pestaña)',
    'contact.linkedin-aria': 'Perfil de LinkedIn (abre en nueva pestaña)',

    // Companion (panda)
    'companion.hint': 'tócame · inclina para jugar',
  },

  en: {
    // Hero
    'hero.premise': 'A little glance at my work',
    'hero.role.line1': 'Full Stack Developer &',
    'hero.role.line2': 'Chemical Engineer',

    // Projects
    'projects.heading': 'PROJECTS IN PRODUCTION, MEASURABLE RESULTS',
    'projects.subheading':
      'Live projects across brand, commerce, content, and production workflows.',
    'projects.0.description':
      'High-performance, heavily optimized motorcycle parts catalog images, synced in real time with the ERP, with client order-status tracking and Firebase authentication. Images served through CloudFront on AWS S3 and EC2.',
    'projects.1.description':
      'Restaurant brand system and booking flow: cinematic Astro/GSAP frontage paired with Python-powered reservation operations.',
    'projects.2.description':
      'Shopify storefront and commerce setup for a sleepwear brand, with Liquid theme work, Mercado Pago, SellerChat, and a complete brand manual.',
    'projects.3.description':
      'Agency landing page, portfolio, blog system, and brand manual built end-to-end with a focused Next.js and TypeScript stack.',
    'projects.0.live-aria': 'Open live site for JapaniRacer',
    'projects.1.live-aria': 'Open live site for Le Parché',
    'projects.2.live-aria': 'Open live site for Maison Cielare',
    'projects.3.live-aria': 'Open live site for Orquestia',
    'projects.4.description':
      'Personal finance app for Android: credit card management, category budgets, a spending calendar, and multi-account balance tracking, with savings recommendations. Live in production, no public listing yet — the gallery shows the real app.',
    'projects.4.gallery-aria': 'View screenshots of Fiora',
    'projects.4.platform-note': 'Android · Expo — live app, no public link',

    // Lightbox
    'lightbox.eyebrow': 'Screenshots',
    'lightbox.close': 'Close gallery',
    'lightbox.prev': 'Previous screenshot',
    'lightbox.next': 'Next screenshot',

    // Confidential
    'confidential.classified': '[CLASSIFIED]',
    'confidential.heading': 'Confidential Work',
    'confidential.subheading': 'NDA engagements abstracted to protect confidentiality.',
    'confidential.field.role': 'Role',
    'confidential.field.stack': 'Stack',
    'confidential.field.impact': 'Impact',
    'confidential.field.duration': 'Duration',
    'confidential.field.team': 'Team',
    'confidential.0.industry': 'E-Commerce / Retail',
    'confidential.0.impact':
      'Built a custom ecommerce platform with authentication, user profile management, order tracking, ERP synchronization, Wompi payments, and a manual bank-transfer approval flow.',
    'confidential.0.duration': '10+ months',
    'confidential.0.card-aria': 'Confidential project: E-Commerce / Retail',
    'confidential.1.industry': 'Logistics / Warehousing',
    'confidential.1.impact':
      'Delivered a WMS wired to ecommerce orders, with smart task assignment, operational automations, issue tickets, KPI reporting, and outbound shipping workflows.',
    'confidential.1.duration': '12+ months',
    'confidential.1.card-aria': 'Confidential project: Logistics / Warehousing',
    'confidential.2.industry': 'Sales Operations',
    'confidential.2.impact':
      'Built a CRM with automated follow-up flows, lead and account pipelines, task queues, activity history, reporting views, and role-based access control.',
    'confidential.2.duration': '8+ months',
    'confidential.2.card-aria': 'Confidential project: Sales Operations',
    'confidential.3.industry': 'Finance / ERP',
    'confidential.3.impact':
      'Implemented a financial ERP module covering electronic invoicing through DIAN, billing operations, accounting workflows, document state tracking, and audit-ready records.',
    'confidential.3.duration': '9+ months',
    'confidential.3.card-aria': 'Confidential project: Finance / ERP',

    // Skills
    'skills.eyebrow': '',
    'skills.heading': 'My Stack',
    'skills.description':
      'Languages, frameworks, platforms, and tools I use to ship production work. Growing each week.',
    'skills.grid-aria': 'Technology stack',
    'skills.legend-aria': 'Category legend',
    'skills.legend.languages': 'Languages',
    'skills.legend.frontend': 'Frontend',
    'skills.legend.backend': 'Backend',
    'skills.legend.data-auth': 'Data/Auth',
    'skills.legend.devops': 'DevOps',
    'skills.legend.ai': 'AI',
    'skills.legend.enterprise': 'Enterprise',
    'skills.legend.testing': 'Testing',

    // Contact
    'contact.heading': 'Get in touch',
    'contact.body': 'Bring a clear problem, and I can help turn it into a production-ready build.',
    'contact.email-aria': 'Send email to Cristian',
    'contact.github-aria': 'GitHub profile (opens in new tab)',
    'contact.whatsapp-aria': 'Message Cristian on WhatsApp (opens in new tab)',
    'contact.linkedin-aria': 'LinkedIn profile (opens in new tab)',

    // Companion (panda)
    'companion.hint': 'tap me · tilt to play',
  },
};
