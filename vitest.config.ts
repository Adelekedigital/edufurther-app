import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    // Under full-suite load, jsdom screens that click through several steps
    // passed the 5s default at random. Half the cores, and a limit that only
    // a hung test reaches (agreed with the profile session, 2026-09-29).
    testTimeout: 15_000,
    maxWorkers: '50%',
    // A floor, not a goal (audit item 4): today's numbers from main's first real
    // coverage run (2026-10-12: 87.39 / 83.44 / 85.17 / 89.1), rounded down.
    // Raise them as coverage grows; never lower one to go green.
    coverage: {
      provider: 'v8',
      thresholds: { statements: 87, branches: 83, functions: 85, lines: 89 },
    },
  },
});
