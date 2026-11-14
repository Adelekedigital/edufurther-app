import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { INVITE_LINK_SHARE } from '@/lib/copy/invite';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { LinkSharePanel } from './LinkSharePanel';

/**
 * A link and its Copy / Share actions: the invite (in its modal and on Home's
 * next-step card) and a mentor's profile (in the share modal).
 */
const meta: Meta<typeof LinkSharePanel> = {
  title: 'Molecules/LinkSharePanel',
  component: LinkSharePanel,
  args: {
    url: 'https://edufurther.com/invite/damilola-7k2x',
    urlLoading: false,
    urlError: false,
    onRetry: fn(),
    onShared: fn(),
    content: INVITE_LINK_SHARE,
  },
  decorators: [(S) => <div style={{ maxWidth: 560, display: 'grid', gap: 16 }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof LinkSharePanel>;

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
export const MentorProfile: Story = {
  args: {
    url: 'https://edufurther.com/mentors/gbenga',
    content: MENTOR_SHARE_COPY.panel(false, 'Gbenga Elufisan'),
  },
};
export const Loading: Story = { args: { url: null, urlLoading: true } };
export const Failed: Story = { args: { url: null, urlError: true } };
export const TurnedOff: Story = { args: { linkActive: false } };
