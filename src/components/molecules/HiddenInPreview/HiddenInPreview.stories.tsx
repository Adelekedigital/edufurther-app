import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { HiddenInPreview } from './HiddenInPreview';

/** Preview as user: an item hidden from the admin (View As.dc.html "Latest message"). */
const meta: Meta<typeof HiddenInPreview> = {
  title: 'Molecules/HiddenInPreview',
  component: HiddenInPreview,
  args: { onReveal: fn() },
};
export default meta;
type Story = StoryObj<typeof HiddenInPreview>;

/** `masked`, with Reveal (the admin's grant has can_reveal). */
export const Masked: Story = {};
/** No can_reveal, or inside another control (a chat list row): no Reveal. */
export const NoReveal: Story = { args: { onReveal: undefined } };
/** After a reveal: the content is the caller's; this is the quiet line under it. */
export const Revealed: Story = { args: { revealed: true } };
