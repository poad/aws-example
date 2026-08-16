import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      reporter: ['json', 'json-summary', 'html', 'cobertura'],
    },
  },
});
