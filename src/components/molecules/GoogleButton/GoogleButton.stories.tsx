import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GoogleButton } from './GoogleButton';

const meta: Meta<typeof GoogleButton> = {
  title: 'Molecules/GoogleButton',
  component: GoogleButton,
  args: { onClick: () => {} },
  decorators: [(S) => <div style={{ maxWidth: 376 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof GoogleButton>;

export const Default: Story = {};

/** Log-in, when this device last signed in with Google. */
export const LastUsed: Story = { args: { lastUsed: true } };

/** Held from the click until the browser leaves for Google's consent screen. */
export const Busy: Story = { args: { busy: true } };

/** Offline: Google can't be reached, so the button is dimmed and inert. */
export const Offline: Story = { args: { disabled: true } };
