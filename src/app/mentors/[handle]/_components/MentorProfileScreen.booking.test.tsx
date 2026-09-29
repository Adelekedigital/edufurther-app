import { render, screen, within } from '@testing-library/react';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, remote, replace, state } from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./profileScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./profileScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/reviews', async () =>
  (await import('./profileScreen.harness')).mocks.reviews(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./profileScreen.harness')).mocks.reviewWrite(),
);
vi.mock('@/lib/api/data/similar', async () =>
  (await import('./profileScreen.harness')).mocks.similar(),
);
vi.mock('@/lib/api/data/profile', async () =>
  (await import('./profileScreen.harness')).mocks.profile(),
);
vi.mock('@/lib/api/data/cover', async () =>
  (await import('./profileScreen.harness')).mocks.cover(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);

const withLink = (qs: string) => {
  h.search = new URLSearchParams(qs);
};
// A profile with every fixture session type, so ?book= can pick the second.
const profile = { ...fullProfile, sessionTypes };
const second = sessionTypes[1]!;

describe('MentorProfileScreen — ?book= links', () => {
  beforeEach(() => {
    h.sessionTypesRemote = remote(sessionTypes);
  });

  it('opens booking on that session type, then drops the parameter (others stay)', () => {
    withLink(`tab=sessions&book=${second.id}&utm_source=x`);
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('dialog')).toHaveTextContent(`Book ${second.name}`);
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?tab=sessions&utm_source=x', {
      scroll: false,
    });
  });

  it('waits until it knows who is looking', () => {
    withLink(`book=${second.id}`);
    h.viewerLoading = true;
    h.profile = state({ data: profile });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    h.viewerLoading = false;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it.each([
    ['an unknown or hidden type', () => withLink('book=nope')],
    [
      'the owner',
      () => {
        withLink(`book=${second.id}`);
        h.profile = state({
          data: { ...profile, owner: { approval: 'approved', listed: true } },
        });
      },
    ],
    [
      'a mentor looking (mentors can’t book)',
      () => {
        withLink(`book=${second.id}`);
        h.viewerIsMentor = true;
      },
    ],
    [
      'a mentor not taking bookings',
      () => {
        withLink(`book=${second.id}`);
        h.profile = state({ data: { ...profile, takingBookings: false } });
      },
    ],
  ])('is ignored for %s: the page just opens, and the parameter goes', (_why, arrange) => {
    h.profile = state({ data: profile });
    arrange();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga', { scroll: false });
  });
});

describe('MentorProfileScreen — not taking bookings (backend #301)', () => {
  it('says so in the header, and nothing anywhere offers Book', () => {
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    // A status, not a greyed button (product, 2026-09-29).
    expect(screen.getByText('Not taking bookings')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Book/ })).toBeNull();
    expect(screen.getByText('Not taking bookings right now.')).toBeInTheDocument();
  });

  it('the Sessions tab keeps the session types, without Book', () => {
    withLink('tab=sessions');
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText(second.name)).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Book/ })).toBeNull();
  });

  it('with nothing visible to book, the booking card still says why', () => {
    h.profile = state({ data: { ...profile, takingBookings: false, sessionTypes: [] } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Not taking bookings right now.')).toBeInTheDocument();
  });

  it('the owner sees none of it (their own pending profile reports false too)', () => {
    h.profile = state({
      data: {
        ...fullProfile,
        takingBookings: false,
        owner: { approval: 'pending', listed: true },
      },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText('Not taking bookings')).toBeNull();
    expect(screen.queryByText('Not taking bookings right now.')).toBeNull();
  });
});
