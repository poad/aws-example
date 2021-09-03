module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'max-len': ['error', {'code': 150}],
    'prefer-destructuring': ['off'],
    'import/no-unresolved': ['off'],
    'import/extensions': ['off'],
  },
};
