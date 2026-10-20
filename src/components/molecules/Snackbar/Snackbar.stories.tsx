import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Snackbar } from './Snackbar';

/** A short outcome at the bottom of the screen (Mentee Settings.dc.html `hasToast`). */
const meta: Meta<typeof Snackbar> = {
  title: 'Molecules/Snackbar',
  component: Snackbar,
  parameters: { layout: 'fullscreen' },
  decorators: [(S) => <div style={{ minHeight: '100vh' }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof Snackbar>;

export const Saved: Story = { args: { message: 'Profile saved' } };
