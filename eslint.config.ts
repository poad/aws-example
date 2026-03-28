// @ts-check

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

import { includeIgnoreFile } from '@eslint/compat';
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  {
    ignores: [
      '**/*.d.ts',
      'src/tsconfig.json',
      'src/stories',
      '**/*.css',
      'node_modules/**/*',
      './.next/*',
      'out',
      '.storybook',
      '**/bin/**/*.js',
      '**/lambda/**/*.js',
      '**/lib/**/*.js',
      '**/cdk.out/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // @ts-ignore
  reactHooksPlugin.configs.flat.recommended,
  {
    files: ['eslint.config.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
    plugins: {
      '@stylistic': stylistic,
    },
    extends: [
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import-x/internal-regex': '^~/',
      'import-x/resolver-next': [
        createTypeScriptImportResolver(),
      ],
    },
    rules: {
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
    },
  },
);
