// @ts-check

import eslint from '@eslint/js';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/*.d.ts',
      '**/*.js',
      '**/*.jsx',
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
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    extends: [
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver(),
      ],
    },
  },
);
