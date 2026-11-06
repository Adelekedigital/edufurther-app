import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InviteBanner } from './InviteBanner';

const meta: Meta<typeof InviteBanner> = {
  title: 'Molecules/InviteBanner',
  component: InviteBanner,
  args: {
    initial: 'D',
    tone: 'rose',
    photoUrl: null,
    lead: 'Invited by Damilola.',
    rest: 'Your first session is free.',
  },
};
export default meta;
type Story = StoryObj<typeof InviteBanner>;

/** On Explore for a guest holding a live invite. */
export const Default: Story = {};

/** A long name wraps beside the avatar on a phone. */
export const LongName: Story = {
  args: { lead: 'Invited by Oluwadamilolaoluwaseun.' },
  decorators: [(S) => <div style={{ maxWidth: 320 }}>{<S />}</div>],
};
