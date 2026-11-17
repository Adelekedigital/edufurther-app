import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SHARE_NOTE } from '@/lib/copy/profile';
import { ShareProfileModal } from './ShareProfileModal';

/** Share a mentor's profile: the link, Copy and the device's share sheet. */
const meta = {
  title: 'Templates/Share profile modal',
  component: ShareProfileModal,
  parameters: { layout: 'fullscreen' },
  args: {
    url: 'https://app.edufurther.com/mentors/gbenga',
    name: 'Gbenga Elufisan',
    own: false,
    count: fn(),
    onShared: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ShareProfileModal>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A mentee (or anyone) sharing someone else's profile. */
export const Other: Story = {};

/** The mentor sharing their own. */
export const Own: Story = { args: { own: true } };

/** Their own, not public yet: who can see it, in place of the subtitle. */
export const OwnPending: Story = { args: { own: true, note: SHARE_NOTE.pending } };

/** Under 768px: a bottom sheet (Modal.dc.html `mobile="sheet"`). */
export const Phone: Story = { globals: { viewport: { value: 'mobile2', isRotated: false } } };
