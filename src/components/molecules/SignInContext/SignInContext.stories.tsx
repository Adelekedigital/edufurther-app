import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SignInContext } from './SignInContext';

const meta: Meta<typeof SignInContext> = {
  title: 'Molecules/SignInContext',
  component: SignInContext,
  args: { initials: 'GE', tone: 'sand', children: 'Log in or sign up to finish booking Gbenga E.' },
  decorators: [(S) => <div style={{ maxWidth: 376 }}>{S()}</div>],
};
export default meta;

export const Booking: StoryObj<typeof SignInContext> = {};
