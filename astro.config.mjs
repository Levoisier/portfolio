import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

/**
 * Warm the GSAP controller chunk in the module map while the page is still
 * idling, instead of only starting its download once `requestIdleCallback`
 * fires (see the mount script in Layout.astro).
 *
 * The controller is a DYNAMIC import so the hero can paint before ~51 KB gzip
 * of GSAP + ScrollTrigger + ScrollSmoother is fetched, parsed, and run. The
 * cost of that is strictly serial on a slow connection: idle wait, THEN
 * download, THEN mount. A `modulepreload` overlaps the download with the wait,
 * so the controller is ready to execute the moment idle arrives.
 *
 * `fetchpriority="low"` is load-bearing: a bare modulepreload is fetched at
 * High priority and would compete with the LCP panda and the fonts, which is
 * the exact trade this site cannot afford (mobile LCP is the open item in
 * BACKLOG.md). Low priority means it fills spare bandwidth only.
 *
 * This runs as a build hook rather than a `<link>` in Layout.astro because the
 * chunk's hashed filename does not exist until after the client bundle is
 * written. (Importing `controller.ts?url` from the layout does NOT work — Vite
 * treats it as a static asset and emits the raw .ts source.)
 */
function preloadControllerChunk() {
  return {
    name: 'preload-controller-chunk',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const assetDir = new URL('_astro/', dir);

        const files = await readdir(fileURLToPath(assetDir));
        const chunks = files.filter((f) => /^controller\..+\.js$/.test(f));

        if (chunks.length !== 1) {
          // Fail loudly rather than silently shipping a stale or missing hint.
          throw new Error(
            `[preload-controller-chunk] expected exactly 1 controller chunk in _astro/, found ${chunks.length}: ${files.join(', ')}`
          );
        }

        const href = `/_astro/${chunks[0]}`;
        const tag = `<link rel="modulepreload" href="${href}" fetchpriority="low">`;

        const htmlPath = new URL('index.html', dir);
        const html = await readFile(htmlPath, 'utf8');

        if (!html.includes('</head>')) {
          throw new Error('[preload-controller-chunk] no </head> in index.html');
        }

        await writeFile(htmlPath, html.replace('</head>', `${tag}</head>`));
        logger.info(`preloaded ${href} (low priority) — ${outDir}`);
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    preloadControllerChunk(),
  ],
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
    },
  },
});
