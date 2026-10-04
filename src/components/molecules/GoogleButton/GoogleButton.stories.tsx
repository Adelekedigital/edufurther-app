import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GoogleButton } from './GoogleButton';

const meta: Meta<typeof GoogleButton> = {
  title: 'Molecules/GoogleButton',
  component: GoogleButton,
  args: { onClick: () => {} },
  decorators: [(S) => <div style={{ maxWidth: 400 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof GoogleButton>;

export const Default: Story = {};

/** Held from the click until the browser leaves for Google's consent screen. */
export const Busy: Story = { args: { busy: true } };
