import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { InviteLinkPanel } from './InviteLinkPanel';

/** The invite link and its Copy / Share actions, in the modal and on Home's next-step card. */
const meta: Meta<typeof InviteLinkPanel> = {
  title: 'Molecules/InviteLinkPanel',
  component: InviteLinkPanel,
  args: {
    url: 'https://edufurther.com/invite/damilola-7k2x',
    urlLoading: false,
    urlError: false,
    onRetry: fn(),
    onShared: fn(),
  },
  decorators: [(S) => <div style={{ maxWidth: 560, display: 'grid', gap: 16 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof InviteLinkPanel>;

export const Modal: Story = { args: { layout: 'modal' } };
export const Card: Story = {
  args: { layout: 'card' },
  decorators: [
    (S) => (
      <div style={{ padding: 24, background: 'var(--blue-50)', display: 'grid', gap: 16 }}>
        {S()}
      </div>
    ),
  ],
};
export const Loading: Story = { args: { url: null, urlLoading: true } };
export const Failed: Story = { args: { url: null, urlError: true } };
export const TurnedOff: Story = { args: { linkActive: false } };
