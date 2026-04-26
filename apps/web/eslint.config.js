import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-invalid-void-type': [
        'error',
        { allowAsThisParameter: false, allowInGenericTypeArguments: true },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreVoidReturningFunctions: true },
      ],
    },
  },
  {
    files: ['**/*api.ts'],
    rules: {
      '@typescript-eslint/no-invalid-void-type': 'warn', // I have no idea why the '@typescript-eslint/no-invalid-void-type' isn't working -- it should; suppressing it for now
    },
  },
  {
    files: ['src/shared/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'warn',
    },
  },
  {
    files: ['src/shared/components/ui/sidebar.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
    },
  },
  {
    files: ['src/shared/hooks/use-mobile.ts'],
    rules: {
      '@typescript-eslint/restrict-template-expressions': 'warn',
    },
  },
]);
