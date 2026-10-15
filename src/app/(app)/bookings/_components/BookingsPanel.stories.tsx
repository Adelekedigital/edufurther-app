import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { sampleBooking } from '@/components/organisms/BookingRow/BookingRow.stories';
import type { AppError } from '@/types/mentor';
import { BookingsPanel } from './BookingsPanel';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();
const rows = (n: number, over: Parameters<typeof sampleBooking>[0] = {}) =>
  Array.from({ length: n }, (_, i) =>
    sampleBooking({ id: `r${i}`, startsAt: at(26 + i * 6), endsAt: at(27 + i * 6), ...over }),
  );

const SERVER: AppError = { kind: 'server', message: 'x', status: 500 };
const OFFLINE: AppError = { kind: 'offline', message: 'x' };

/**
 * The four states every tab renders (`ui-states`). Error is checked before
 * empty: a failed load that reads "No past sessions yet" tells someone their
 * history is gone.
 */
const meta: Meta<typeof BookingsPanel> = {
  title: 'Screens/Bookings panel',
  component: BookingsPanel,
  args: {
    tab: 'upcoming',
    bookings: rows(3),
    isLoading: false,
    error: null,
    retry: fn(),
    timeZone: 'Africa/Lagos',
    isMentor: true,
    shown: 5,
    showMore: fn(),
    now: NOW,
  },
};
export default meta;
type Story = StoryObj<typeof BookingsPanel>;

export const Loading: Story = { args: { isLoading: true, bookings: [] } };
export const Error: Story = { args: { error: SERVER, bookings: [] } };
export const Offline: Story = { args: { error: OFFLINE, bookings: [] } };
export const Content: Story = { args: { heading: 'Later', total: 3 } };

/** More than a page: the design's reveal footer. */
export const WithMore: Story = {
  args: { bookings: rows(8), heading: 'Later', total: 8 },
};

/** A background refetch failed, but the rows are still there — they stay. */
export const ContentDespiteAFailedRefetch: Story = {
  args: { error: SERVER, heading: 'Later', total: 3 },
};

/** The next page failed: said under the button that was pressed. */
export const LoadMoreFailed: Story = {
  args: { bookings: rows(8), heading: 'Later', total: 8, loadMoreError: SERVER },
};

export const EmptyUpcomingMentor: Story = { args: { bookings: [] } };
export const EmptyUpcomingMentee: Story = { args: { bookings: [], isMentor: false } };

export const PendingContent: Story = {
  args: {
    tab: 'pending',
    bookings: [
      sampleBooking({ id: 'p1', status: 'pending', respondBy: at(4) }),
      sampleBooking({ id: 'p2', status: 'pending', respondBy: at(50) }),
      sampleBooking({ id: 'p3', status: 'pending', respondBy: at(-2) }),
    ],
    intro: 'These mentees asked for a time.',
  },
};
export const EmptyPendingMentor: Story = { args: { tab: 'pending', bookings: [] } };
export const EmptyPendingMentee: Story = {
  args: { tab: 'pending', bookings: [], isMentor: false },
};

export const HistoryContent: Story = {
  args: {
    tab: 'history',
    bookings: [
      sampleBooking({ id: 'h1', status: 'completed', startsAt: at(-48), endsAt: at(-47) }),
      sampleBooking({ id: 'h2', status: 'cancelled', startsAt: at(-200), endsAt: at(-199) }),
      sampleBooking({ id: 'h3', status: 'noShow', startsAt: at(-500), endsAt: at(-499) }),
      sampleBooking({ id: 'h4', status: 'declined', startsAt: at(-900), endsAt: at(-899) }),
      sampleBooking({ id: 'h5', status: 'expired', startsAt: at(-1500), endsAt: at(-1499) }),
      sampleBooking({ id: 'h6', status: 'withdrawn', startsAt: at(-2000), endsAt: at(-1999) }),
    ],
    total: 6,
  },
};
export const EmptyHistory: Story = { args: { tab: 'history', bookings: [] } };
/** A filter is on, so the advice is to clear one — not "nothing yet". */
export const EmptyHistoryFiltered: Story = {
  args: { tab: 'history', bookings: [], filtered: true },
};

export const Phone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  args: { bookings: rows(8), heading: 'Later', total: 8 },
};
