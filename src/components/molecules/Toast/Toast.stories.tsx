import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Molecules/Toast',
  component: Toast,
  args: { open: true },
  decorators: [(S) => <div style={{ minHeight: 200 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof Toast>;

export const LoggedIn: Story = {
  args: { icon: 'login', title: 'Welcome back, Amara', children: 'Opening your Home…' },
};

export const AccountCreated: Story = {
  args: {
    icon: 'how_to_reg',
    title: 'Account created. Welcome, Amara',
    children: 'Next, let’s find your first mentor…',
  },
};

export const GoogleLinked: Story = {
  args: {
    icon: 'link',
    title: 'Welcome back, Amara',
    children: 'Google is now linked to your account. Opening your Home…',
  },
};

/** At 390px the toast wraps inside a 16px margin a side. */
export const LongLineOnPhone: Story = {
  args: {
    icon: 'login',
    title: 'You already have an account',
    children: 'We logged you in instead. Taking you back to your booking with Gbenga E.…',
  },
  globals: { viewport: { value: 'mobile1' } },
};
