import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SaveChangesDialog } from './SaveChangesDialog';

/** Leaving a form with unsaved changes (Mentee Settings.dc.html `leaveGuard` confirm). */
const meta: Meta<typeof SaveChangesDialog> = {
  title: 'Templates/SaveChangesDialog',
  component: SaveChangesDialog,
  args: { where: 'Profile', onDiscard: fn(), onSave: fn(), onKeep: fn() },
};
export default meta;
type Story = StoryObj<typeof SaveChangesDialog>;

export const Default: Story = {};
