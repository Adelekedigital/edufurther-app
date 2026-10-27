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

/** With an action (Mentee Dashboard v2.dc.html gsToast). */
export const WithUndo: Story = {
  args: {
    message: 'Getting started hidden',
    stamp: 1,
    action: { label: 'Undo', onClick: () => {} },
  },
};

/** With a glyph (Admin.dc.html toast): a done action, and one that failed. */
export const Success: Story = {
  args: { message: '2 credits added for Amara Okafor', stamp: 1, tone: 'success' },
};
export const Failed: Story = {
  args: { message: 'That didn’t go through. Nothing changed, try again.', stamp: 1, tone: 'error' },
};
