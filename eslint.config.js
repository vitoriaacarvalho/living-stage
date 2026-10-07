import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', '**/coverage', '**/generated'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/frontend/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/backend/**/*.ts', '*.js'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
