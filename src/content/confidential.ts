import type { ConfidentialProject, Localized } from './types';

const fullStack: Localized = { es: 'Full Stack Developer', en: 'Full Stack Developer' };

/**
 * NDA engagements — industry, role, stack, abstracted impact, duration, team size ONLY.
 * Never add screenshots, links, client names or employer names (AGENTS.md Golden Rule 3).
 */
export const confidentialProjects: ConfidentialProject[] = [
  {
    id: 'ecommerce-retail',
    industry: { es: 'E-Commerce / Retail', en: 'E-Commerce / Retail' },
    role: fullStack,
    stack: ['Next.js', 'React', 'TypeScript', 'Auth', 'Wompi', 'ERP'],
    impact: {
      es: 'Desarrollé una plataforma de ecommerce personalizada con autenticación, gestión de perfil de usuario, seguimiento de pedidos, sincronización con ERP, pagos Wompi, y flujo de aprobación de transferencias bancarias manuales.',
      en: 'Built a custom ecommerce platform with authentication, user profile management, order tracking, ERP synchronization, Wompi payments, and a manual bank-transfer approval flow.',
    },
    duration: { es: '10+ meses', en: '10+ months' },
    teamSize: '4-6',
  },
  {
    id: 'logistics-warehousing',
    industry: { es: 'Logística / Almacenamiento', en: 'Logistics / Warehousing' },
    role: fullStack,
    stack: ['Next.js', 'React', 'TypeScript', 'Python', 'AWS EKS'],
    impact: {
      es: 'Entregué un WMS conectado a pedidos de ecommerce, con asignación inteligente de tareas, automatizaciones operativas, tickets de incidencias, reportes de KPIs, y flujos de despacho de salida.',
      en: 'Delivered a WMS wired to ecommerce orders, with smart task assignment, operational automations, issue tickets, KPI reporting, and outbound shipping workflows.',
    },
    duration: { es: '12+ meses', en: '12+ months' },
    teamSize: '6-8',
  },
  {
    id: 'sales-operations',
    industry: { es: 'Operaciones de Ventas', en: 'Sales Operations' },
    role: fullStack,
    stack: ['Next.js', 'React', 'TypeScript', 'Python', 'AWS EKS'],
    impact: {
      es: 'Desarrollé un CRM con flujos de seguimiento automatizados, pipelines de leads y cuentas, colas de tareas, historial de actividad, vistas de reportes, y control de acceso por roles.',
      en: 'Built a CRM with automated follow-up flows, lead and account pipelines, task queues, activity history, reporting views, and role-based access control.',
    },
    duration: { es: '8+ meses', en: '8+ months' },
    teamSize: '4-6',
  },
  {
    id: 'finance-erp',
    industry: { es: 'Finanzas / ERP', en: 'Finance / ERP' },
    role: fullStack,
    stack: ['Python', 'ERP', 'DIAN', 'Billing', 'Accounting'],
    impact: {
      es: 'Implementé un módulo de ERP financiero que cubre facturación electrónica a través de DIAN, operaciones de facturación, flujos de contabilidad, seguimiento de estados de documentos, y registros listos para auditoría.',
      en: 'Implemented a financial ERP module covering electronic invoicing through DIAN, billing operations, accounting workflows, document state tracking, and audit-ready records.',
    },
    duration: { es: '9+ meses', en: '9+ months' },
    teamSize: '4-6',
  },
];
