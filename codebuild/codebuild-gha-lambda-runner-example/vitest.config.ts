import { defineConfig } from 'vitest/config';
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['tsconfig-test.json']
    })
  ],
  test: {
    coverage: {
      reporter: ['json', 'json-summary', 'html', 'cobertura']
    }
  },
});
