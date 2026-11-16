import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// A function parameter that starts with "_" (like `_next`) means
// "I know this is unused, it's only there because the function signature requires it".
const unusedVarsRule = [
  'error',
  { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
]

export default defineConfig([
  globalIgnores(['dist', 'server/node_modules', 'server/dist']),

  // 1) The React website (runs in the browser)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': unusedVarsRule,
    },
  },

  // 2) The Express API and config files (run in Node.js, not in a browser)
  {
    files: ['server/**/*.ts', 'vite.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': unusedVarsRule,
    },
  },
])