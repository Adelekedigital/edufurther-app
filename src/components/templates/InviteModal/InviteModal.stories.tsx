import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { InviteModal } from './InviteModal';

/**
 * Invite a friend (InviteModal.dc.html). Locked: the two steps to the monthly
 * grant. Unlocked: the badge and the reason to share.
 */
const meta = {
  title: 'Templates/Invite modal',
  component: InviteModal,
  parameters: { layout: 'fullscreen' },
  args: {
    url: 'https://app.edufurther.com/invite/damilola-7k2x',
    urlLoading: false,
    urlError: false,
    onRetry: fn(),
    friendJoined: false,
    attended: false,
    unlocked: false,
    onShared: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof InviteModal>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Neither step done: the design's saved default. */
export const Locked: Story = {};

export const FriendJoined: Story = { args: { friendJoined: true } };

/** Both steps done, the grant not yet reported open. */
export const BothDone: Story = { args: { friendJoined: true, attended: true } };

export const Unlocked: Story = { args: { friendJoined: true, attended: true, unlocked: true } };

export const LinkLoading: Story = { args: { url: null, urlLoading: true } };

/** The link couldn't be read (ours: the design draws no failure). */
export const LinkError: Story = { args: { url: null, urlError: true } };

/** Under 768px: a bottom sheet (Modal.dc.html `mobile="sheet"`). */
export const Phone: Story = { globals: { viewport: { value: 'mobile2', isRotated: false } } };
