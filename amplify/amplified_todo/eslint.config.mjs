import eslintPluginReactNative from '@react-native/eslint-plugin';
export default [
  // add more generic rule sets here, such as:
  // js.configs.recommended,
  ...eslintPluginReactNative.configs['flat/recommended'],
  {
    rules: {
      // override/add rules settings here, such as:
      // 'svelte/rule-name': 'error'
    }
  }
];
