import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OfflineBanner } from './OfflineBanner';

const meta: Meta<typeof OfflineBanner> = {
  title: 'Molecules/OfflineBanner',
  component: OfflineBanner,
};
export default meta;
type Story = StoryObj;

export const Offline: Story = { render: () => <OfflineBanner /> };
