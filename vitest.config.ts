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
  },
});
