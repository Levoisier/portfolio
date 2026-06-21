/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        scarlet: 'var(--scarlet)',
        'scarlet-soft': 'var(--scarlet-soft)',
        navy: 'var(--navy)',
        'navy-soft': 'var(--navy-soft)',
        ink: 'var(--ink)',
        paper: 'var(--paper)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
