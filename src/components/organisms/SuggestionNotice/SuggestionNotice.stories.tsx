import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { BookingSuggestion } from '@/types/booking';
import { SuggestionNotice } from './SuggestionNotice';

const NOW = new Date('2026-10-05T12:00:00Z');
const inMin = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();

const sample = (over: Partial<BookingSuggestion> = {}): BookingSuggestion => ({
  id: 'sg1',
  startsAt: '2026-10-08T15:00:00Z',
  endsAt: '2026-10-08T16:00:00Z',
  durationMin: 60,
  heldUntil: inMin(118),
  status: 'active',
  bookedSessionId: null,
  ...over,
});

/**
 * Ours: the design has no mentee-side view of an offered time — its
 * `SuggestTime` is the mentor's panel for making the offer. Recorded in
 * `design-divergence.md`.
 */
const meta: Meta<typeof SuggestionNotice> = {
  title: 'Organisms/Suggestion notice',
  component: SuggestionNotice,
  args: {
    suggestion: sample(),
    firstName: 'Amara',
    timeZone: 'Africa/Lagos',
    onBook: fn(),
    now: NOW,
  },
};
export default meta;
type Story = StoryObj<typeof SuggestionNotice>;

/** A fresh offer: nearly the whole two-hour hold left. */
export const Held: Story = {};

/** Under the hour. The pill is still grey; only the reading has changed. */
export const UnderAnHour: Story = {
  args: { suggestion: sample({ heldUntil: inMin(58) }) },
};

/** Under ten minutes: warm, and the words say so too — never colour alone. */
export const AboutToLapse: Story = {
  args: { suggestion: sample({ heldUntil: inMin(4) }) },
};

/** Taken. Settled rather than urgent, and nothing left to do. */
export const Booked: Story = {
  args: { suggestion: sample({ status: 'booked', bookedSessionId: 's9' }) },
};

/** Over. The time may still be free, which is why the copy promises neither way. */
export const Lapsed: Story = {
  args: { suggestion: sample({ status: 'expired', heldUntil: inMin(-40) }) },
};

/**
 * A row fetched while the hold was alive still says `active` — the backend
 * computes the status per read. The clock settles what to show.
 */
export const StaleActiveRow: Story = {
  args: { suggestion: sample({ status: 'active', heldUntil: inMin(-1) }) },
};

/** The same instant in the viewer's own zone, date and all. */
export const AnotherZone: Story = {
  args: { timeZone: 'America/Chicago' },
};

/** No clock from the screen: the pill keeps its own and counts down live. */
export const LiveClock: Story = {
  args: {
    now: undefined,
    suggestion: sample({ heldUntil: new Date(Date.now() + 4.4 * 60_000).toISOString() }),
  },
};
