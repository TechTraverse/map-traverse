import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    restoreMocks: true,
    environmentMatchGlobs: [
      ['src/components/**', 'jsdom'],
      ['src/pages/**', 'jsdom'],
      ['server/**', 'node'],
      ['**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      // Relative to the test config root (this directory).
      // test-exclude resolves these against root and rejects files outside.
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/packages/**',
        '**/coverage/**',
        '**/*.stories.{ts,tsx}',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        // Baselined against the first run of the v8 report scoped to
        // apps/admin-app (see commit message for raw numbers). React
        // components/pages drag statement/line% down to ~11%; we deliberately
        // floor below the current numbers so the bar only goes up over time.
        statements: 10,
        branches: 65,
        functions: 30,
        lines: 10,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
