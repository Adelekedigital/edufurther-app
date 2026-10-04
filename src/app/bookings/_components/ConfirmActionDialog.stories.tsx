import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

/**
 * The confirm step for a decline, a withdrawal or a cancellation. **The design
 * draws no dialog for any of these** — this is ours, on ModalShell. The rule it
 * exists to enforce is that what happens to the credit is said *before* the
 * button, never after.
 */
const meta = {
  title: 'Bookings/ConfirmActionDialog',
  component: ConfirmActionDialog,
  parameters: { layout: 'fullscreen' },
  args: { onConfirm: fn(), onClose: fn(), now: NOW, timeZone: 'America/New_York', accountZone: 'America/New_York', viewerId: 'me' },
} satisfies Meta<typeof ConfirmActionDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const confirmed = (side: 'mentor' | 'mentee', hours: number) =>
  sampleBookingFor({ side, status: 'confirmed', startsAt: at(hours), endsAt: at(hours + 1) });

/** A mentee cancelling with notice: the credit comes back. */
export const MenteeCancelsInTime: Story = {
  args: { action: 'cancel', booking: confirmed('mentee', 48) },
};

/** Inside twelve hours it does not — said before the button, not after. */
export const MenteeCancelsLate: Story = {
  args: { action: 'cancel', booking: confirmed('mentee', 9) },
};

/** A mentor sees the slot choice, and no credit wording at all. */
export const MentorCancels: Story = {
  args: { action: 'cancel', booking: confirmed('mentor', 48) },
};

export const MentorDeclines: Story = {
  args: { action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) },
};

export const MenteeWithdraws: Story = {
  args: { action: 'withdraw', booking: sampleBookingFor({ side: 'mentee', status: 'pending' }) },
};

/** Working: the button says so and swallows a second click. */
export const Working: Story = {
  args: { action: 'cancel', booking: confirmed('mentee', 48), pending: true },
};

/** Refused. The dialog stays open with the note still typed, to send again. */
export const Refused: Story = {
  args: {
    action: 'cancel',
    booking: confirmed('mentee', 48),
    error: { kind: 'conflict', message: 'This booking changed while you were looking.' },
  },
};
