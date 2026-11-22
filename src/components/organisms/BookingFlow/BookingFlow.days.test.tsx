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
import { pickOption } from '@/test-utils/select';

pinToday();

describe('BookingFlow day row (open days only, owner 2026-11-21)', () => {
  beforeEach(() => setPhone(false));

  it('says no open times when the window has none, even if the fetch had some beyond', () => {
    // Today is Sep 27; Oct 25 is past the 14-day window, fetched as margin but never shown.
    render(<BookingFlow {...props({ slots: remote(['2026-10-25T12:00:00Z']) })} />);
    // The mentor has hours, just none free in the window: never "hasn't opened any" (owner 2026-11-21).
    expect(screen.getByText('No open times in the next 2 weeks')).toBeInTheDocument();
    expect(screen.queryByText(/hasn’t opened any times/)).toBeNull();
  });

  it('clears the chosen time when another day is picked', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow
        {...props({ sessionTypeId: 'st2', slots: remote([...slots, '2026-10-06T09:00:00Z']) })}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    expect(screen.getByRole('button', { name: /^Request Mon, Sep 28/ })).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: 'Tue, Oct 6' }));
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('drops a day that has passed at midnight while the modal is open', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date('2026-09-27T23:59:30Z'));
      render(<BookingFlow {...props({ slots: remote(['2026-09-27T10:00:00Z', ...slots]) })} />);
      expect(screen.getByRole('radio', { name: 'Sun, Sep 27' })).toBeChecked();
      vi.setSystemTime(new Date('2026-09-28T00:00:30Z'));
      act(() => vi.advanceTimersByTime(60 * 1000));
      expect(screen.queryByRole('radio', { name: 'Sun, Sep 27' })).toBeNull();
      expect(screen.getByRole('radio', { name: 'Mon, Sep 28' })).toBeChecked();
    } finally {
      // Back to the file's pinned clock, pass or fail, so later tests see Sep 27.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
    }
  });

  it('shows only the days with times, soonest first, the first one chosen', () => {
    render(<BookingFlow {...props({ slots: remote([...slots, '2026-10-08T09:00:00Z']) })} />);
    const days = screen.getAllByRole('radio', { name: /^\w{3}, \w{3} \d+$/ });
    expect(days.map((d) => d.getAttribute('aria-label'))).toEqual([
      'Mon, Sep 28',
      'Tue, Sep 29',
      'Thu, Oct 8',
    ]);
    expect(days[0]).toBeChecked();
    // No empty days and no week pages.
    expect(screen.queryByRole('radio', { name: /Sun, Sep 27/ })).toBeNull();
    expect(screen.queryByText(/Next 7 days/)).toBeNull();
    expect(screen.getByText('Pick a day')).toBeInTheDocument();
  });

  it('opens on a given time: its day chosen, the time picked', () => {
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
    expect(screen.getByRole('radio', { name: 'Tue, Oct 6' })).toBeChecked();
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
    expect(screen.getByRole('radio', { name: 'Tue, Oct 6' })).toBeChecked();
    // A refetch after the viewer moved on doesn't pull them back.
    await user.click(screen.getByRole('radio', { name: 'Mon, Sep 28' }));
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote([...later]),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Mon, Sep 28' })).toBeChecked();
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
    expect(screen.getByText('That time was just taken. Here’s what’s open.')).toHaveAttribute(
      'role',
      'status',
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
    await pickOption(user, screen.getByRole('combobox'), 'st1');
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByRole('radio', { name: 'Mon, Sep 28' })).toBeInTheDocument();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
  });

  it('a first time weeks away is the first day shown: no empty week to page past', () => {
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-10-08T09:00:00Z']) })} />,
    );
    expect(screen.getByRole('radio', { name: 'Thu, Oct 8' })).toBeChecked();
    expect(screen.queryByText(/No open times this week/)).toBeNull();
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeInTheDocument();
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

  it('offers only days inside the session type’s window: 7 days, or 56', () => {
    const typed = (windowDays: number) => remote(sessionTypes.map((t) => ({ ...t, windowDays })));
    const two = remote(['2026-10-01T09:00:00Z', '2026-11-15T09:00:00Z']);
    const { unmount } = render(<BookingFlow {...props({ sessionTypes: typed(7), slots: two })} />);
    expect(screen.getByRole('radio', { name: 'Thu, Oct 1' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Nov 15/ })).toBeNull();
    unmount();
    render(<BookingFlow {...props({ sessionTypes: typed(56), slots: two })} />);
    expect(screen.getByRole('radio', { name: 'Sun, Nov 15' })).toBeInTheDocument();
  });

  it('a window that shrinks drops the days past its new end', () => {
    const typed = (windowDays: number) => remote(sessionTypes.map((t) => ({ ...t, windowDays })));
    const later = remote([...slots, '2026-10-20T09:00:00Z']);
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypes: typed(56), slots: later })} />,
    );
    expect(screen.getByRole('radio', { name: 'Tue, Oct 20' })).toBeInTheDocument();
    rerender(<BookingFlow {...props({ sessionTypes: typed(14), slots: later })} />);
    expect(screen.queryByRole('radio', { name: 'Tue, Oct 20' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Mon, Sep 28' })).toBeChecked();
  });

  it('opens on the questions with the remembered time (a guest back from onboarding)', () => {
    render(
      <BookingFlow
        {...props({
          slots: remote([...slots, '2026-10-06T09:00:00Z']),
          initialTime: '2026-10-06T09:00:00Z',
          startAfterTime: true,
        })}
      />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('starts from the grid when the remembered time is gone, and waits for Continue', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow
        {...props({
          sessionTypes: remote([sessionTypes[0]!]),
          initialTime: '2026-10-09T09:00:00Z',
          startAfterTime: true,
        })}
      />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    await user.click(screen.getAllByRole('radio', { name: /am|pm/ })[0]!);
    // A new pick stays on the grid: no jump past the time.
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
  });

  it('stays on the time step, ready to request, when the offering asks no questions', () => {
    render(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote([...slots, '2026-10-06T09:00:00Z']),
          initialTime: '2026-10-06T09:00:00Z',
          startAfterTime: true,
        })}
      />,
    );
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeChecked();
    expect(screen.getByRole('button', { name: /^Request Tue, Oct 6/ })).toBeEnabled();
  });

  it('starts from the time step when the remembered time turns up on another offering', () => {
    // A page stand-in: st2 (remembered) lacks the time; st1 (with questions) has it.
    function Page() {
      const [typeId, setTypeId] = useState('st2');
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: remote(typeId === 'st1' ? [...slots, '2026-10-06T09:00:00Z'] : slots),
            initialTime: '2026-10-06T09:00:00Z',
            startAfterTime: true,
          })}
        />
      );
    }
    render(<Page />);
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('says Book, not Request, when the offering confirms at once', () => {
    const instant = sessionTypes.map((t) => ({ ...t, requiresConfirmation: false }));
    render(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          sessionTypes: remote(instant),
          slots: remote([...slots, '2026-10-06T09:00:00Z']),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /^Book Tue, Oct 6/ })).toBeEnabled();
  });
});
