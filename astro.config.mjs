// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'hybrid', // Enable hybrid mode for API routes
  adapter: vercel({
    webAnalytics: { enabled: true },
    maxDuration: 60 // Increase timeout for video processing
  }),
  build: {
    inlineStylesheets: 'always'
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'entry.[hash].js',
          chunkFileNames: 'chunks/chunk.[hash].js',
          assetFileNames: 'assets/asset.[hash][extname]'
        }
      }
    }
  }
});
