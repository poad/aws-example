module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    useJSXTextNode: true,
    project: true,
    projectRoot: __dirname,
    tsconfigRootDir: __dirname,
  },
  extends: [
    'airbnb-typescript/base',
    'plugin:react/recommended',
    'plugin:@next/next/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react'
  ],
  settings: {
    react: {
      version: "detect"
    }
  },
  // add your custom rules here
  rules: {
    '@typescript-eslint/indent': ['off'],
    'spaced-comment': [
      'error',
      'always',
      { markers: ['/ <reference'] }
    ],
    'import/no-extraneous-dependencies': ['off', {
      devDependencies: true,
      optionalDependencies: false,
    }],
    '@next/next/no-img-element': ['off'],
    'prefer-promise-reject-errors': ['off'],
    'react/jsx-filename-extension': ['off'],
    'react/react-in-jsx-scope': ['off'],
    'react/prop-types': ['off'],
    'import/extensions': ['off'],
    'jsx-a11y/anchor-is-valid': ['off'],
    'no-return-assign': ['off'],
    'react/display-name': ['off'],
  }
}
