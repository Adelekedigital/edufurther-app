import next from 'eslint-config-next';

// Skeleton width/height are a sizing primitive's raw dimensions (a shimmer's
// measurement) — a literal px, a %, or a semantic size token (--button-h-*).
// A --space-*/--radius-*/--text-* token is spacing/radius/type, not a size.
// check-css guards .module.css only, so this holds the TSX side (failure log #64).
const skeletonSizeToken = {
  selector:
    "JSXOpeningElement[name.name='Skeleton'] > JSXAttribute[name.name=/^(width|height)$/] > Literal[value=/^var\\(--(space|radius|text)/]",
  message:
    'Skeleton width/height take a literal px or a semantic size token (--button-h-small|medium|large). A --space-*/--radius-*/--text-* token is spacing, not a size. See project-conventions → House conventions.',
};

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
        skeletonSizeToken,
      ],
    },
  },
  // Mock routes answer through respond.ts (#225): ok() types a success body
  // against the contract, problem() is the backend's error shape. A bare
  // NextResponse.json is a body nothing checks, so mock drift comes back.
  {
    files: ['src/app/api/mock/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name=/^(Next)?Response$/][callee.property.name='json']",
          message:
            'Mock routes answer with ok(path, method, body) or problem(status, body) from @/lib/api/mock/respond.',
        },
        {
          selector:
            "CallExpression[callee.object.name=/^(Next)?Response$/][callee.computed=true][callee.property.value='json']",
          message:
            'Mock routes answer with ok(path, method, body) or problem(status, body) from @/lib/api/mock/respond.',
        },
      ],
    },
  },
  // The same Skeleton-size rule for components (src/app is covered by the hex
  // block above, which also owns no-restricted-syntax for that tree).
  {
    files: ['src/components/**/*.{tsx,jsx}'],
    rules: { 'no-restricted-syntax': ['error', skeletonSizeToken] },
  },
];

export default config;
