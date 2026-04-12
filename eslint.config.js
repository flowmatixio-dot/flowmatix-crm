import security from 'eslint-plugin-security';
import globals from 'globals';

export default [
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { security },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Security rules only — hook purpose is security, not style
      ...security.configs.recommended.rules,
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
