import eslintPluginAstro from 'eslint-plugin-astro';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/*
 * Phaser throws `window is not defined` when imported in Node (astro build, Vitest), and a
 * static import from the entry pulls ~355 KB gzip into the first paint. Only these modules
 * may import it at runtime (ARCHITECTURE.md → Testing strategy); `import type` is fine anywhere.
 */
const PHASER_ALLOWED = [
  'src/game/main.ts',
  'src/game/scenes/**',
  'src/game/player/PandaSprite.ts',
  'src/game/stations/**',
  'src/game/fx/**',
];

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**', 'public/game/**', 'test-results/**'],
  },
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: PHASER_ALLOWED,
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'phaser',
              message:
                'Only main.ts, scenes/, PandaSprite.ts, stations/ and fx/ may import phaser at runtime (use `import type`).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.astro'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'phaser', message: 'Never import phaser from .astro files.' }] },
      ],
    },
  },
  {
    // CLI scripts (asset pipeline, references) print reports to the terminal.
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
