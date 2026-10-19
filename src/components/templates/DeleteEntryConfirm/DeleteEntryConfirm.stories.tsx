import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DeleteEntryConfirm } from './DeleteEntryConfirm';

/** The delete confirm for a degree or an award (Modal tone danger, size sm). */
const meta: Meta<typeof DeleteEntryConfirm> = {
  title: 'Templates/Delete entry confirm',
  component: DeleteEntryConfirm,
  args: { pending: false, error: null, onKeep: fn(), onConfirm: fn() },
};
export default meta;
type Story = StoryObj<typeof DeleteEntryConfirm>;

/** Settings › Education (Mentee Settings.dc.html `deleteAwardSub`). */
export const Education: Story = {
  args: {
    kind: 'education',
    subtitle:
      '“BSc, Microbiology” (University of Lagos, 2022) will be removed. This can’t be undone.',
  },
};

/** The Mentor Profile's rows: no subtitle of their own. */
export const Award: Story = { args: { kind: 'award' } };

export const Deleting: Story = { args: { ...Education.args, pending: true } };

export const Failed: Story = {
  args: { ...Education.args, error: 'We couldn’t delete it. Try again.' },
};
