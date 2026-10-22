import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatFreeDay } from '@/lib/utils/format';
import { sessionTypes } from '../ProfileHeader/profile.fixture';
import { SessionTypeList, SessionTypeListSkeleton } from './SessionTypeList';

describe('SessionTypeList', () => {
  it('Book opens that type; a block says why and disables it', async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SessionTypeList
        timeZone="UTC"
        sessionTypes={sessionTypes}
        onBook={onBook}
        bookBlocked={null}
        canBook
      />,
    );
    await user.click(screen.getAllByRole('button', { name: 'Book session' })[1]!);
    expect(onBook).toHaveBeenCalledWith(sessionTypes[1]!.id);
    rerender(
      <SessionTypeList
        timeZone="UTC"
        sessionTypes={sessionTypes}
        onBook={onBook}
        bookBlocked="Booking needs a connection"
        canBook
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Booking needs a connection' })[0]).toBeDisabled();
  });

  it('drawn but off (the owner’s "View as mentee"): labels as usual, disabled', () => {
    render(
      <SessionTypeList
        timeZone="UTC"
        sessionTypes={sessionTypes}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook
        bookDisabled
      />,
    );
    const books = screen.getAllByRole('button', { name: 'Book session' });
    expect(books).toHaveLength(sessionTypes.length);
    for (const b of books) expect(b).toBeDisabled();
  });

  it('no Book for someone who can’t book', () => {
    render(
      <SessionTypeList
        timeZone="UTC"
        sessionTypes={sessionTypes}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook={false}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('each card says how it books, after the length and stage chips', () => {
    render(
      <SessionTypeList
        timeZone="UTC"
        sessionTypes={sessionTypes}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook
      />,
    );
    const cards = screen.getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('60 minflagDraftinghow_to_regRequest to book');
    expect(cards[1]).toHaveTextContent('45 minboltInstant booking');
  });

  it('a card whose booking mode isn’t known yet shows no label', () => {
    const [first] = sessionTypes;
    render(
      <SessionTypeList
        timeZone="UTC"
        sessionTypes={[{ ...first!, requiresConfirmation: undefined }]}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook
      />,
    );
    expect(screen.queryByText(/Request to book|Instant booking/)).toBeNull();
  });

  describe('the next free time (Mentor Profile.dc.html `ss.nextText`, backend 526)', () => {
    const at = '2026-09-30T03:00:00Z';
    const card = (over: Partial<(typeof sessionTypes)[number]>) => [
      { ...sessionTypes[0]!, nextAvailableAt: at, nextAvailableState: 'open' as const, ...over },
    ];
    const now = new Date('2026-09-28T12:00:00Z');
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now);
    });
    afterEach(() => vi.useRealTimers());

    it('open: the time leads the footer, in the profile’s zone', () => {
      render(
        <SessionTypeList
          sessionTypes={card({})}
          timeZone="America/Chicago"
          onBook={vi.fn()}
          bookBlocked={null}
          canBook
        />,
      );
      // 03:00 UTC on the 30th is still the 29th in Chicago: "tomorrow", not Wed.
      expect(screen.getByText(formatFreeDay(at, 'America/Chicago', now))).toBeInTheDocument();
      expect(screen.getByText('Free tomorrow')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
    });

    it('none and refreshing (unknown): no time and no "no times" line, Book stays', () => {
      for (const nextAvailableState of ['none', 'unknown'] as const) {
        const { unmount } = render(
          <SessionTypeList
            sessionTypes={card({ nextAvailableAt: null, nextAvailableState })}
            timeZone="UTC"
            onBook={vi.fn()}
            bookBlocked={null}
            canBook
          />,
        );
        expect(screen.queryByText(/^Free /)).toBeNull();
        expect(screen.queryByText(/no (open )?times/i)).toBeNull();
        expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
        unmount();
      }
    });

    it('shown in the owner’s "View as mentee" too; never on the owner’s own cards', () => {
      const { unmount } = render(
        <SessionTypeList
          sessionTypes={card({})}
          timeZone="UTC"
          onBook={vi.fn()}
          bookBlocked={null}
          canBook
          bookDisabled
        />,
      );
      // Read in UTC this time: the 30th is two days out.
      expect(screen.getByText('Free Wed')).toBeInTheDocument();
      unmount();
      render(
        <SessionTypeList
          owner={{
            cards: card({}),
            onHide: vi.fn(),
            onEdit: vi.fn(),
            onDelete: vi.fn(),
            newHref: '/session-types/new',
          }}
        />,
      );
      expect(screen.queryByText(/^Free /)).toBeNull();
    });
  });

  it('the skeleton: card-sized blocks in the list’s grid, announced once', () => {
    const { container } = render(
      <SessionTypeListSkeleton count={2} label="Loading your sessions" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading your sessions');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('ul')?.className).toMatch(/grid/);
  });
});
