import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import graphQlPlugin from '@graphql-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  ...graphQlPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      parser: typescriptParser,
    },
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      '**/*.d.ts',
      '*.js',
      'src/tsconfig.json',
      'src/next-env.d.ts',
      'src/stories',
      'node_modules/**/*',
      '**/generated/*.ts',
    ],
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...hooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-img-element': 'error',
    },
  },
  {
    ignores: ['./.next/*'],
  },
];
