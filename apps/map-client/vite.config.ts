import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.browser': 'true',
  },
  resolve: {
    alias: {
      '@techtraverse/map-ui-lib/tailwind.css': path.resolve(__dirname, '../../packages/map-ui-lib/tailwind.css'),
    },
  },
  server: {
    port: 5173,
  },
});
