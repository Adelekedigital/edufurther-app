import next from 'eslint-config-next';

const config = [
  ...next,
  { ignores: ['.next/**', 'node_modules/**', 'src/lib/api/generated/**', '.review/**', 'storybook-static/**'] },
  // File size (product, 2026-09-29): at most 1000 lines of code per file, comments
  // and blank lines not counted. Start splitting past 900 (project-conventions).
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs}', 'scripts/**/*.{js,mjs}'],
    rules: { 'max-lines': ['error', { max: 1000, skipComments: true, skipBlankLines: true }] },
  },
];

export default config;
