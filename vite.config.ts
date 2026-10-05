import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('/services/photoEngine') ||
              id.includes('/services/dedupeEngine') ||
              id.includes('/services/cryptoEngine') ||
              id.includes('/services/burstEngine') ||
              id.includes('/services/funnelEngine') ||
              id.includes('/services/peopleEngine')
            ) {
              return 'engine-core';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
