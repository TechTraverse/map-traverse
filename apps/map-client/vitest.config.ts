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
        // Map-client baseline reflects the scaffold + smoke-test scope.
        // mapStore and useMapUrlState are well-covered; the MapLibre-bound
        // App/MapContainer/MapOverlay surfaces are excluded by necessity.
        // Bump these up as we add more tests.
        statements: 5,
        branches: 3,
        functions: 15,
        lines: 5,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
