import { useState } from 'react';
import { act, getDefaultNormalizer, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mentor, Remote, SessionType } from '@/types/mentor';
import { BookingFlow, type BookingFlowProps } from './BookingFlow';
import {
  allKinds,
  mentor,
  pinToday,
  props,
  remote,
  sessionTypes,
  setPhone,
  slots,
} from './BookingFlow.testkit';

pinToday();

describe('BookingFlow week view (7 days at a time)', () => {
  beforeEach(() => setPhone(false));

  it('says no open times when none of the four weeks has any, even if the fetch had some beyond', () => {
    // Today is Sep 27; Oct 25 is today+28, fetched as margin but never shown.
    render(<BookingFlow {...props({ slots: remote(['2026-10-25T12:00:00Z']) })} />);
    expect(screen.getByText('No open times at the moment')).toBeInTheDocument();
  });

  it('clears the chosen time when the week changes', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow
        {...props({ sessionTypeId: 'st2', slots: remote([...slots, '2026-10-06T09:00:00Z']) })}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    expect(screen.getByRole('button', { name: /^Request Mon, Sep 28/ })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('moves the week on at midnight while the modal is open', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date('2026-09-27T23:59:30Z'));
      render(<BookingFlow {...props()} />);
      expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
      vi.setSystemTime(new Date('2026-09-28T00:00:30Z'));
      act(() => vi.advanceTimersByTime(60 * 1000));
      expect(screen.getByText('Next 7 days · Sep 28 – Oct 4')).toBeInTheDocument();
    } finally {
      // Back to the file's pinned clock, pass or fail, so later tests see Sep 27.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
    }
  });

  it('always opens on the next 7 days from today, empty days disabled', () => {
    render(<BookingFlow {...props()} />);
    expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Sun, Sep 27, no open times/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Mon, Sep 28, 1 time/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Earlier dates' })).toBeDisabled();
  });

  it('opens on a given time: its week, its day, the time picked', () => {
    render(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote([...slots, '2026-10-06T09:00:00Z']),
          // A different spelling of the same instant still matches.
          initialTime: '2026-10-06T09:00:00.000+00:00',
        })}
      />,
    );
    expect(screen.getByText('Oct 4 – Oct 10')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tue, Oct 6, 1 time/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeChecked();
    expect(screen.getByRole('button', { name: /^Request Tue, Oct 6/ })).toBeEnabled();
  });

  it('applies the time when the slots arrive after the modal opened, once', async () => {
    const user = userEvent.setup();
    const later = [...slots, '2026-10-06T09:00:00Z'];
    const { rerender } = render(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote<string[]>(null, { isLoading: true }),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote(later),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeChecked();
    expect(screen.getByText('Oct 4 – Oct 10')).toBeInTheDocument();
    // A refetch after the viewer moved on doesn't pull them back.
    await user.click(screen.getByRole('button', { name: 'Earlier dates' }));
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote([...later]),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
  });

  it('finds the time on another offering, and says so when no offering has it', () => {
    // A page stand-in: it owns the offering and serves each one's slots.
    const byType: Record<string, string[]> = { st1: slots, st2: ['2026-10-01T15:00:00Z'] };
    function Page({ initialTime }: { initialTime: string }) {
      const [typeId, setTypeId] = useState('st1');
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: remote(byType[typeId]!),
            initialTime,
          })}
        />
      );
    }
    const { unmount } = render(<Page initialTime="2026-10-01T15:00:00Z" />);
    expect(screen.getByRole('button', { name: /^Request Thu, Oct 1/ })).toBeEnabled();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
    unmount();

    render(<Page initialTime="2026-10-02T15:00:00Z" />);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'That time was just taken. Here’s what’s open.',
    );
    // Back on the first offering, nothing picked.
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('a load error is not "time taken", and a successful retry picks the time', async () => {
    const user = userEvent.setup();
    const time = '2026-10-01T15:00:00Z';
    function Page() {
      const [typeId, setTypeId] = useState('st1');
      const [st1, setSt1] = useState<Remote<string[]>>(
        remote<string[]>(null, {
          error: { kind: 'offline', message: 'x' },
          retry: () => setSt1(remote([...slots, time])),
        }),
      );
      const byType: Record<string, Remote<string[]>> = { st1, st2: remote(slots) };
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: byType[typeId]!,
            initialTime: time,
          })}
        />
      );
    }
    render(<Page />);
    // st1 failed, st2 loaded without it: back on st1 with its load error, no "taken".
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByText('We couldn’t load available times')).toBeInTheDocument();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('radio', { name: /Thu, Oct 1/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3:00 pm' })).toBeChecked();
  });

  it('stops looking once the viewer picks an offering', async () => {
    const user = userEvent.setup();
    function Page() {
      const [typeId, setTypeId] = useState('st1');
      // st2 never finishes loading: the search would wait on it.
      const byType: Record<string, Remote<string[]>> = {
        st1: remote(slots),
        st2: remote<string[]>(null, { isLoading: true }),
      };
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: byType[typeId]!,
            initialTime: '2026-10-02T15:00:00Z',
          })}
        />
      );
    }
    render(<Page />);
    expect(screen.getByRole('combobox')).toHaveValue('st2');
    await user.selectOptions(screen.getByRole('combobox'), 'st1');
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByRole('radio', { name: /Mon, Sep 28, 1 time/ })).toBeInTheDocument();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
  });

  it('an empty week offers the next week with times, or points back', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-10-13T09:00:00Z']) })} />,
    );
    expect(screen.getByText('No open times this week')).toBeInTheDocument();
    expect(screen.getByText('Try later dates.')).toBeInTheDocument();
    // Oct 13 is in the third week (Oct 11 – Oct 17), past an empty second week.
    await user.click(screen.getByRole('button', { name: 'Show Oct 11 – Oct 17' }));
    expect(screen.getByText('Oct 11 – Oct 17')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tue, Oct 13, 1 time/ })).toBeChecked();
    unmount();
    // Nothing later in the four weeks, but this week had times: no link, and
    // it points back rather than saying "Check back soon" (review of #26).
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-09-27T20:00:00Z']) })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByText('Try earlier dates.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Show / })).not.toBeInTheDocument();
  });

  it('the week link keeps focus in the modal, on the new week’s chosen day', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-10-13T09:00:00Z']) })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Show Oct 11 – Oct 17' }));
    expect(screen.getByRole('radio', { name: /Tue, Oct 13, 1 time/ })).toHaveFocus();
  });

  it('an empty week after the open ones says to try earlier dates', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-09-28T09:00:00Z']) })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByText('Try earlier dates.')).toBeInTheDocument();
    expect(screen.queryByText('Check back soon.')).not.toBeInTheDocument();
  });

  it('shows the first-mentees reasons on the first step only, when given', async () => {
    const user = userEvent.setup();
    const reasons = [
      {
        icon: 'flight_takeoff' as const,
        k: 'Made the move you’re planning.',
        v: 'From Nigeria to the United States.',
      },
    ];
    const { unmount } = render(
      <BookingFlow {...props({ sessionTypeId: 'st1', firstReasons: reasons })} />,
    );
    expect(screen.getByText('Be one of Olajuwon’s first mentees')).toBeInTheDocument();
    expect(screen.getByText('Made the move you’re planning.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
    unmount();
    render(<BookingFlow {...props({ sessionTypeId: 'st1', firstReasons: [] })} />);
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
  });

  it('opens on this week even when the first time is later, and ‹ › reach it', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ slots: remote(['2026-10-06T09:00:00Z']) })} />);
    expect(screen.getByText(/No open times this week/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByText('Oct 4 – Oct 10')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tue, Oct 6, 1 time/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeDisabled();
  });

  it('pages only as far as the session type can be booked: one week for 7 days, eight for 56', async () => {
    const user = userEvent.setup();
    const typed = (windowDays: number) => remote(sessionTypes.map((t) => ({ ...t, windowDays })));
    const { unmount } = render(
      <BookingFlow
        {...props({
          sessionTypes: typed(7),
          slots: remote(['2026-10-01T09:00:00Z', '2026-10-06T09:00:00Z']),
        })}
      />,
    );
    // Oct 6 is past a 7-day window: never offered, and there's no later page.
    expect(screen.getByRole('radio', { name: /Oct 1, 1 time/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeDisabled();
    expect(screen.queryByRole('radio', { name: /Oct 6/ })).toBeNull();
    unmount();
    render(<BookingFlow {...props({ sessionTypes: typed(56) })} />);
    for (let i = 0; i < 7; i++)
      await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeDisabled();
  });

  it('a window that isn’t whole weeks: the last page stops at its end, labelled to it', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow
        {...props({ sessionTypes: remote(sessionTypes.map((t) => ({ ...t, windowDays: 10 }))) })}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    // Sep 27 + 10 days: Oct 4, 5 and 6, and nothing past the window.
    expect(screen.getByText('Oct 4 – Oct 6')).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: /^\w{3}, Oct \d/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeDisabled();
  });
});
