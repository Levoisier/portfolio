import { defineConfig } from 'astro/config';

// PORTFOLIO_NO_ASSETS=1 builds the "no manifest" variant e2e tests into its own folder.
const noAssets = process.env.PORTFOLIO_NO_ASSETS === '1';

export default defineConfig({
  output: 'static',
  outDir: noAssets ? './dist-no-assets' : './dist',
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
