import type { Localized, Skill, SkillCategory } from './types';

export const skillsIntro: Localized = {
  es: 'Lenguajes, frameworks, plataformas y herramientas que uso para llevar proyectos a producción. Cada semana en expansión.',
  en: 'Languages, frameworks, platforms, and tools I use to ship production work. Growing each week.',
};

export const skillCategoryLabels: Record<SkillCategory, Localized> = {
  languages: { es: 'Lenguajes', en: 'Languages' },
  frontend: { es: 'Frontend', en: 'Frontend' },
  backend: { es: 'Backend', en: 'Backend' },
  'data-auth': { es: 'Datos/Auth', en: 'Data/Auth' },
  devops: { es: 'DevOps', en: 'DevOps' },
  ai: { es: 'IA', en: 'AI' },
  enterprise: { es: 'Empresarial', en: 'Enterprise' },
  testing: { es: 'Testing', en: 'Testing' },
};

/** Ordered by `number` (the periodic-board position). */
export const skills: Skill[] = [
  { symbol: 'Ts', name: 'TypeScript', number: 1, category: 'languages', proficiency: 94 },
  { symbol: 'Js', name: 'JavaScript', number: 2, category: 'languages', proficiency: 92 },
  { symbol: 'Py', name: 'Python', number: 3, category: 'languages', proficiency: 86 },
  { symbol: 'Php', name: 'PHP', number: 4, category: 'languages', proficiency: 78 },
  { symbol: 'Re', name: 'React', number: 5, category: 'frontend', proficiency: 94 },
  { symbol: 'Nx', name: 'Next.js', number: 6, category: 'frontend', proficiency: 90 },
  { symbol: 'Vu', name: 'Vue', number: 7, category: 'frontend', proficiency: 82 },
  { symbol: 'As', name: 'Astro', number: 8, category: 'frontend', proficiency: 88 },
  { symbol: 'Gp', name: 'GSAP', number: 9, category: 'frontend', proficiency: 84 },
  { symbol: 'Sh', name: 'shadcn/ui', number: 10, category: 'frontend', proficiency: 86 },
  { symbol: 'No', name: 'Node.js', number: 11, category: 'backend', proficiency: 90 },
  { symbol: 'Dj', name: 'Django', number: 12, category: 'backend', proficiency: 82 },
  { symbol: 'Fa', name: 'FastAPI', number: 13, category: 'backend', proficiency: 84 },
  { symbol: 'Lv', name: 'Laravel', number: 14, category: 'backend', proficiency: 82 },
  { symbol: 'Pg', name: 'Postgres', number: 15, category: 'data-auth', proficiency: 88 },
  { symbol: 'Sb', name: 'Supabase', number: 16, category: 'data-auth', proficiency: 86 },
  { symbol: 'Fb', name: 'Firebase', number: 17, category: 'data-auth', proficiency: 80 },
  { symbol: 'Ne', name: 'Neon', number: 18, category: 'data-auth', proficiency: 82 },
  { symbol: 'Dk', name: 'Docker', number: 19, category: 'devops', proficiency: 80 },
  { symbol: 'Aw', name: 'AWS', number: 20, category: 'devops', proficiency: 74 },
  { symbol: 'Vc', name: 'Vercel', number: 21, category: 'devops', proficiency: 88 },
  { symbol: 'Cf', name: 'Cloudflare', number: 22, category: 'devops', proficiency: 84 },
  { symbol: 'Gt', name: 'Git', number: 23, category: 'devops', proficiency: 92 },
  { symbol: 'Cc', name: 'Claude Code', number: 24, category: 'ai', proficiency: 88 },
  { symbol: 'Cx', name: 'Codex', number: 25, category: 'ai', proficiency: 90 },
  { symbol: 'Cr', name: 'Cursor', number: 26, category: 'ai', proficiency: 86 },
  { symbol: 'Sp', name: 'SAP', number: 27, category: 'enterprise', proficiency: 72 },
  { symbol: 'Od', name: 'Odoo', number: 28, category: 'enterprise', proficiency: 80 },
  { symbol: 'Sf', name: 'Shopify', number: 29, category: 'enterprise', proficiency: 82 },
  { symbol: 'Je', name: 'Jest', number: 30, category: 'testing', proficiency: 82 },
  { symbol: 'Rt', name: 'RTL', number: 31, category: 'testing', proficiency: 78 },
  { symbol: 'Pw', name: 'Playwright', number: 32, category: 'testing', proficiency: 86 },
  { symbol: 'Rn', name: 'React Native', number: 33, category: 'frontend', proficiency: 84 },
  { symbol: 'Ex', name: 'Expo', number: 34, category: 'frontend', proficiency: 82 },
];
