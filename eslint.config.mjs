/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nodePlugin from 'eslint-plugin-n';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/template-*/**',
    '**/package/**',
    'github-pages/**',
    'github-pages-source/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      n: nodePlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
