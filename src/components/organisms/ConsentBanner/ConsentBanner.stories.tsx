import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ConsentBanner } from './ConsentBanner';

/** Storybook never loads analytics: the banner's buttons only log here. */
const meta: Meta<typeof ConsentBanner> = {
  title: 'Organisms/ConsentBanner',
  component: ConsentBanner,
  args: { onAccept: fn(), onDecline: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ConsentBanner>;

export const Desktop: Story = {};

export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
};
