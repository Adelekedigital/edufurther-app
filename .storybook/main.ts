import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  // The app's self-hosted fonts, served to preview-head.html at /fonts.
  staticDirs: ['../public', { from: '../src/app/fonts', to: '/fonts' }],
};

export default config;
