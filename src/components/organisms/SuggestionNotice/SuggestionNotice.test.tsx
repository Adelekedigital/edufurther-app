import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingSuggestion } from '@/types/booking';
import { SuggestionNotice } from './SuggestionNotice';

const NOW = new Date('2026-10-05T12:00:00Z');

const suggestion = (over: Partial<BookingSuggestion> = {}): BookingSuggestion => ({
  id: 'sg1',
  startsAt: '2026-10-05T23:30:00Z',
  endsAt: '2026-10-06T00:30:00Z',
  durationMin: 60,
  // Ninety minutes of the two-hour hold left.
  heldUntil: '2026-10-05T13:30:00Z',
  status: 'active',
  bookedSessionId: null,
  ...over,
});

const notice = (over: Partial<BookingSuggestion> = {}, zone = 'America/Chicago') =>
  render(
    <SuggestionNotice
      suggestion={suggestion(over)}
      firstName="Amara"
      timeZone={zone}
      onBook={() => {}}
      now={NOW}
    />,
  );

describe('a live offer', () => {
  it('names who offered it, when, how long it is held and the one action', () => {
    notice();
    expect(screen.getByText('New time offered')).toBeInTheDocument();
    expect(screen.getByText('Amara offered another time')).toBeInTheDocument();
    expect(screen.getByText('Oct 5, 2026 · 6:30 pm to 7:30 pm')).toBeInTheDocument();
    expect(screen.getByText('1h 30m left')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('says the hold is exclusive, which is the whole reason to hurry', () => {
    notice();
    expect(screen.getByText(/held for you alone/)).toBeInTheDocument();
  });

  it('the action names the time, so two offers on one page are told apart', () => {
    notice();
    // Asserted on the computed name, not the markup (failure log #51).
    expect(
      screen.getByRole('button', { name: 'Book Oct 5, 2026 · 6:30 pm to 7:30 pm' }),
    ).toBeInTheDocument();
  });

  it('hands the click back untouched — booking is the screen\u2019s business', async () => {
    const onBook = vi.fn();
    render(
      <SuggestionNotice
        suggestion={suggestion()}
        firstName="Amara"
        timeZone="America/Chicago"
        onBook={onBook}
        now={NOW}
      />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onBook).toHaveBeenCalledTimes(1);
  });
});

describe('an offer already taken', () => {
  it('says so and offers nothing more to do', () => {
    notice({ status: 'booked', bookedSessionId: 's9' });
    expect(screen.getByText('Time booked')).toBeInTheDocument();
    expect(screen.getByText('You booked the time Amara offered')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/left$/)).not.toBeInTheDocument();
  });

  it('a booked offer past its hold is still booked, not lapsed', () => {
    // The hold running out says nothing about a time the mentee already took.
    notice({ status: 'booked', heldUntil: '2026-10-05T11:00:00Z' });
    expect(screen.getByText('Time booked')).toBeInTheDocument();
  });
});

describe('an offer that lapsed', () => {
  it('says the hold is gone and that the time is anyone\u2019s again', () => {
    notice({ status: 'expired' });
    expect(screen.getByText('Offer lapsed')).toBeInTheDocument();
    expect(screen.getByText('The time Amara offered is no longer held')).toBeInTheDocument();
    expect(screen.getByText(/open to anyone again/)).toBeInTheDocument();
  });

  it('never offers a one-tap book on a hold nobody is keeping', () => {
    notice({ status: 'expired' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('a row still saying "active" past its hold reads as lapsed', () => {
    // The backend computes the status per read, so a row fetched while the hold
    // was alive keeps saying `active`. Expected, not a bug — the clock decides.
    notice({ status: 'active', heldUntil: '2026-10-05T11:59:59Z' });
    expect(screen.getByText('Offer lapsed')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('the viewer\u2019s zone', () => {
  it('reads the same instant in each zone, date and all', () => {
    const chicago = notice();
    expect(screen.getByText('Oct 5, 2026 · 6:30 pm to 7:30 pm')).toBeInTheDocument();
    chicago.unmount();
    notice({}, 'Africa/Lagos');
    // Past midnight in Lagos: the date moves with the time, not just the clock.
    expect(screen.getByText('Oct 6, 2026 · 12:30 am to 1:30 am')).toBeInTheDocument();
  });

  it('the zone is the only thing that moves the reading, in every state', () => {
    notice({ status: 'expired' }, 'Africa/Lagos');
    expect(screen.getByText('Oct 6, 2026 · 12:30 am to 1:30 am')).toBeInTheDocument();
  });
});

describe('what happens when a hold runs out under you', () => {
  const held = (heldUntil: string) => ({
    id: 's1',
    startsAt: '2026-10-08T14:00:00Z',
    endsAt: '2026-10-08T15:00:00Z',
    durationMin: 60,
    heldUntil,
    status: 'active' as const,
    bookedSessionId: null,
  });

  it('says so out loud — the pill’s own region goes with the pill', () => {
    const { rerender } = render(
      <SuggestionNotice
        suggestion={held('2026-10-04T13:00:00Z')}
        firstName="Wanjiru"
        timeZone="America/New_York"
        onBook={vi.fn()}
        now={new Date('2026-10-04T12:00:00Z')}
      />,
    );
    rerender(
      <SuggestionNotice
        suggestion={held('2026-10-04T13:00:00Z')}
        firstName="Wanjiru"
        timeZone="America/New_York"
        onBook={vi.fn()}
        now={new Date('2026-10-04T13:30:00Z')}
      />,
    );
    expect(
      screen.getByText('The hold on the time Wanjiru offered has lapsed.'),
    ).toBeInTheDocument();
  });

  it('shows the offer with nothing to press when there is no flow to open', () => {
    render(
      <SuggestionNotice
        suggestion={held('2026-10-04T13:00:00Z')}
        firstName="Wanjiru"
        timeZone="America/New_York"
        now={new Date('2026-10-04T12:00:00Z')}
      />,
    );
    // A migrated booking records no offering. Hiding the whole notice would
    // mean a mentee never learning a time was offered at all.
    expect(screen.getByText(/Wanjiru offered another time/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Book / })).not.toBeInTheDocument();
  });
});
