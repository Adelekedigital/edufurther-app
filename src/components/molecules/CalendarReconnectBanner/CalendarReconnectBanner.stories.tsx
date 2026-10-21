import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { RECONNECT_FAILURES } from '@/lib/copy/integrations';
import { CalendarReconnectBanner } from './CalendarReconnectBanner';

/**
 * Its own file rather than molecules.stories.tsx: that one is already near the
 * 1000-line cap, and adding four states to it put it over.
 */
const meta: Meta<typeof CalendarReconnectBanner> = {
  title: 'Integrations/Calendar reconnect banner',
  component: CalendarReconnectBanner,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CalendarReconnectBanner>;

const base = { busy: false, unavailable: false, failure: null, onReconnect: fn() };

/** What a mentor meets on Calendar and Mentor Home when the grant has lapsed. */
export const Broken: Story = { args: base };

export const Waiting: Story = { args: { ...base, busy: true } };

/** Google's calendar checkbox is a separate step, and skipping it grants nothing. */
export const NothingReconnected: Story = {
  args: { ...base, failure: RECONNECT_FAILURES.nothingConnected },
};

export const PopupBlocked: Story = {
  args: { ...base, failure: RECONNECT_FAILURES.blocked },
};

/** No Google client on this deployment: the button stops offering. */
export const Unavailable: Story = {
  args: { ...base, unavailable: true, failure: RECONNECT_FAILURES.unavailable },
};
