module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    project: './tsconfig.json',
    useJSXTextNode: true
  },
  extends: [
    'airbnb-typescript/base',
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: [
    'jest'
  ],
  settings: {
    react: {
      version: "detect"
    }
  },
  // add your custom rules here
  rules: {
    '@typescript-eslint/indent': [
      'error',
      2
    ],
    'spaced-comment': [
      'error',
      'always',
      { markers: ['/ <reference'] }
    ],
    'max-len': ['off'],
    'prefer-promise-reject-errors': ['off'],
    'react/jsx-filename-extension': ['off'],
    'react/prop-types': ['off'],
    'import/extensions': ['off'],
    'jsx-a11y/anchor-is-valid': ['off'],
    'no-return-assign': ['off'],
    '@next/next/no-img-element': ['off'],
  }
}
