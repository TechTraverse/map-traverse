import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@ogc-maps/storybook-components/tailwind.css': path.resolve(__dirname, '../../packages/map-ui-lib/tailwind.css'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
