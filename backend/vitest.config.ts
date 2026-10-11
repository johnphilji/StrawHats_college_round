import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: [],
    testTimeout: 10000,
    env: {
      LLM_PROVIDER: 'mock',
    },
  },
});
