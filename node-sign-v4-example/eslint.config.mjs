// @ts-check

import eslint from '@eslint/js';
// @ts-ignore
import importPlugin from 'eslint-plugin-import';

import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/*.d.ts',
      '*.{js,jsx}',
      'src/tsconfig.json',
      'src/stories',
      '**/*.css',
      'node_modules/**/*',
      './.next/*',
      'out',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.ts'],
    ...importPlugin.flatConfigs.recommended,
    ...importPlugin.flatConfigs.typescript,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
    },
    settings: {
      'import/resolver': {
        node: true,
        typescript: true,
      },
    },
  },
);
