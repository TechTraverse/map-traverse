import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.stories.tsx',
        'src/**/*.stories.ts',
        'src/**/index.ts',
        'src/main.ts',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Re-baselined for whole-src coverage. Tighten over time.
        // Actuals at baseline: 30.04 / 79.98 / 42.17 / 30.04
        statements: 25,
        branches: 70,
        functions: 40,
        lines: 25,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
