import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrivalRow } from './ArrivalRow';

const meta: Meta<typeof ArrivalRow> = {
  title: 'Molecules/ArrivalRow',
  component: ArrivalRow,
  args: {
    initial: 'D',
    tone: 'rose',
    photoUrl: null,
    kicker: 'Invited by Damilola',
    you: 'You',
    perk: 'First session free',
  },
};
export default meta;
type Story = StoryObj<typeof ArrivalRow>;

/** The initial on the inviter's colour (no photo, or one from another host). */
export const Initial: Story = {};

/** A photo that fails to load falls back to the initial (Avatar). */
export const BrokenPhoto: Story = { args: { photoUrl: 'https://example.supabase.co/missing.jpg' } };

/** 320px: the pill wraps under the circles rather than overflowing. */
export const Narrow: Story = {
  decorators: [(S) => <div style={{ maxWidth: 280 }}>{<S />}</div>],
};
