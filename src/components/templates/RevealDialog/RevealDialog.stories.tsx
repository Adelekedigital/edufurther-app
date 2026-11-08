import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { RevealDialog } from './RevealDialog';

/** Preview as user: the reason before a reveal (View As.dc.html Reveal, Modal edit, size sm). */
const meta: Meta<typeof RevealDialog> = {
  title: 'Templates/Reveal dialog',
  component: RevealDialog,
  args: { firstName: 'Amara', maxLength: 500, onReveal: fn(), onClose: fn() },
};
export default meta;
type Story = StoryObj<typeof RevealDialog>;

/** Press Reveal with the box empty to see "Add a reason to reveal." */
export const Default: Story = {};
/** The request is out: Reveal is busy, Cancel and × are off. */
export const Pending: Story = { args: { pending: true } };
/** Provisional copy (no design). */
export const Failed: Story = { args: { error: 'We couldn’t reveal this. Try again.' } };
