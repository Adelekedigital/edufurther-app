import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ConfirmDialog } from './ConfirmDialog';

/** Every "Are you sure?" in the app (Modal.dc.html confirm, size sm). */
const meta: Meta<typeof ConfirmDialog> = {
  title: 'Templates/Confirm dialog',
  component: ConfirmDialog,
  args: {
    title: 'Delete this award?',
    subtitle: 'This can’t be undone.',
    icon: 'delete',
    tone: 'danger',
    keepLabel: 'Keep it',
    confirmLabel: 'Delete award',
    pendingLabel: 'Deleting…',
    onKeep: fn(),
    onConfirm: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Destructive: Story = {};
/** The request is out: Keep it and × are off, Escape does nothing. */
export const Pending: Story = { args: { pending: true } };
export const Failed: Story = {
  args: { error: 'We couldn’t delete it. Check your connection and try again.' },
};
/** Not destructive, so blue (Session Types.dc.html `feature` confirm). */
export const NotDestructive: Story = {
  args: {
    title: 'Feature “Mock visa interview” instead?',
    subtitle:
      'It moves to the top of your profile. “SOP draft review” will no longer be featured. You can feature one session at a time.',
    icon: 'star',
    tone: 'default',
    keepLabel: 'Cancel',
    confirmLabel: 'Feature this instead',
  },
};
