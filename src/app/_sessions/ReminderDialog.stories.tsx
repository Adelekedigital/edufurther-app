import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ReminderDialog } from './ReminderDialog';

/**
 * "Send {First} a reminder?" on a mentee's pending request with under 24
 * hours left for the mentor (`Mentee Bookings.dc.html`, Modal kind="explainer").
 */
const meta = {
  title: 'Bookings/ReminderDialog',
  component: ReminderDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    booking: sampleBookingFor({
      side: 'mentee',
      status: 'pending',
      startsAt: '2026-10-06T13:30:00Z',
    }),
    timeZone: 'America/New_York',
    onSend: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ReminderDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on the drafted message. */
export const Drafted: Story = {};

/** On its way: nothing closes it, Send is busy. */
export const Sending: Story = { args: { pending: true } };

/** Refused (the request closed meanwhile): the text stays for another go. */
export const Refused: Story = {
  args: { error: 'This request has closed, so the reminder can’t go.' },
};
