import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts'],
      exclude: ['src/utils/**/__tests__/**', 'src/utils/index.ts'],
      thresholds: {
        statements: 60,
        branches: 85,
        functions: 80,
        lines: 60,
      },
    },
  },
});
