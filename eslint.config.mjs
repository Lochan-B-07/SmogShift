import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/server/*',
                '@/components/*',
                '@/app/*',
                '@/hooks/*',
                '@/lib/*',
                '@/data/*',
                '../server/*',
                '../components/*',
                '../app/*',
                '../hooks/*',
                '../lib/*',
                '../data/*',
                'next/*',
              ],
              message: 'src/engine/ may only import from src/shared/ and itself.',
            },
          ],
          paths: [
            { name: 'fs', message: 'src/engine/ must remain pure with zero I/O.' },
            { name: 'node:fs', message: 'src/engine/ must remain pure with zero I/O.' },
            { name: 'react', message: 'src/engine/ must not import React.' },
            { name: 'react-dom', message: 'src/engine/ must not import React DOM.' },
            { name: '@google/genai', message: 'src/engine/ must not import Gemini SDK.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/app/**/page.tsx', 'src/app/**/layout.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '../server/*', '../../server/*'],
              message: 'Client UI code must never import from src/server/.',
            },
          ],
          paths: [
            { name: '@google/genai', message: 'Never call Gemini from client components.' },
            { name: 'fs', message: 'Client code must not import fs.' },
            { name: 'node:fs', message: 'Client code must not import fs.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/server/**/*.{ts,tsx}', 'src/app/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Never read process.env outside src/server/ or src/app/api/.',
        },
      ],
    },
  },
]);

export default eslintConfig;
