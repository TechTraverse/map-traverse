import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/__tests__/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        statements: 20,
        branches: 50,
        functions: 30,
        lines: 20,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
