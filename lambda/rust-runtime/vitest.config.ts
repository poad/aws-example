import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import * as dotenv from 'dotenv';

export default defineConfig({
  // モノレポ用の共通設定
  resolve: {
    alias: {
      // パッケージ間の直接参照
      '@llm-ts-example/common-core': resolve(__dirname, '../../common/core/src'),
      '@llm-ts-example/common-backend': resolve(__dirname, '../../common/backend/src'),
    },
  },
  server: {
    fs: {
      // モノレポ内のファイルアクセスを許可
      allow: ['..'],
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // ESModuleとして出力
      output: {
        format: 'es',
      },
    },
  },
  root: '.',
  test: {
    environment: 'node',
    globals: true,
    isolate: true,
    env: dotenv.config({ path: '.env.test' }).parsed,
    testTimeout: 30000,
  },
  // resolve: {
  //   conditions: ['development'],
  // }
});
