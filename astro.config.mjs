// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable server mode for API routes
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
          assetFileNames: 'assets/asset.[hash][extname]',
          manualChunks: {
            // Separate vendor chunks for better caching
            'vendor-stores': ['nanostores', '@nanostores/persistent'],
            'vendor-vercel': ['@vercel/analytics', '@vercel/speed-insights']
          }
        }
      },
      // Optimize for production
      minify: 'esbuild',
      sourcemap: false,
      // Remove console logs in production
      esbuild: {
        drop: ['console', 'debugger']
      }
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['nanostores', '@nanostores/persistent']
    }
  }
});
