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
  // No raw hex in pages either (audit item 3): check-boundaries covers
  // components; a colour is defined only under src/styles.
  {
    files: ['src/app/**/*.{ts,tsx,js,jsx,mjs}'],
    ignores: ['src/app/api/mock/**', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/(^|[\\s(:,])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message: 'Raw hex colour: use a token, or src/styles/brand.ts where CSS variables cannot reach.',
        },
        {
          selector: 'TemplateElement[value.raw=/(^|[\\s(:,])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message: 'Raw hex colour: use a token, or src/styles/brand.ts where CSS variables cannot reach.',
        },
      ],
    },
  },
];

export default config;
