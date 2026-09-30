import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
vi.mock('@/lib/api/data/avatar', async () =>
  (await import('./profileScreen.harness')).mocks.avatar(),
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

describe('MentorProfileScreen — ?book= links, gated like Book (review of #81)', () => {
  beforeEach(() => {
    h.sessionTypesRemote = remote(sessionTypes);
    h.profile = state({ data: profile });
  });
  afterEach(() => vi.restoreAllMocks());

  it('offline, the link waits (the page stays), then opens once back online', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    withLink(`book=${second.id}`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    online.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('dialog')).toHaveTextContent(`Book ${second.name}`);
  });

  it('a viewer who can’t book yet (account setup) gets the page, not the modal', () => {
    h.viewerUnlinked = true;
    withLink(`book=${second.id}`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga', { scroll: false });
  });

  it('closing the modal doesn’t bring it back, and the link is handled once', async () => {
    const user = userEvent.setup();
    withLink(`book=${second.id}`);
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    // The URL hasn't caught up yet (the harness keeps ?book=): still no reopen.
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('a profile that isn’t there drops the link', () => {
    h.profile = state({ notFound: true });
    h.similarRemote = { data: [], isLoading: false, error: null, retry: vi.fn() };
    withLink(`book=${second.id}`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga', { scroll: false });
  });
});

describe('MentorProfileScreen — not taking bookings (design reply #58, live design)', () => {
  // No promise of messaging: it isn't built (Codex on PR 102).
  const body = `${profile.mentor.firstName} isn’t taking bookings right now. You can still explore similar mentors.`;

  it('the header says so, the aside has the note, and nothing offers Book', () => {
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    const aside = screen.getByRole('complementary');
    const note = within(aside).getByRole('region', { name: 'Not taking bookings' });
    expect(note).toHaveTextContent(body);
    expect(screen.queryByRole('button', { name: /Book/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Book a session' })).toBeNull();
  });

  it('the Sessions tab shows the empty state, counted as none, instead of the types', () => {
    withLink('tab=sessions');
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (0)' })).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { name: 'Not taking bookings' })).toBeInTheDocument();
    expect(within(panel).getByText(body)).toBeInTheDocument();
    expect(within(panel).queryByText(second.name)).toBeNull();
  });

  it('with no visible types the tab is still there, saying so', () => {
    withLink('tab=sessions');
    h.profile = state({ data: { ...profile, takingBookings: false, sessionTypes: [] } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(within(screen.getByRole('tabpanel')).getByText(body)).toBeInTheDocument();
  });

  it('the owner sees none of that; with no visible type their bar says what mentees see', () => {
    h.profile = state({
      data: {
        ...fullProfile,
        takingBookings: false,
        owner: { approval: 'approved', listed: true, setupNeeded: ['session_type'] },
      },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(body)).toBeNull();
    expect(
      screen.getByText(
        'Mentees see “Not taking bookings” on your profile. Turn on a session type to take bookings again.',
      ),
    ).toBeInTheDocument();
  });

  it('a pending owner’s bar keeps the approval message (it comes first)', () => {
    h.profile = state({
      data: {
        ...fullProfile,
        takingBookings: false,
        owner: { approval: 'pending', listed: true, setupNeeded: ['session_type'] },
      },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText('Only you can see this until your profile is approved.'),
    ).toBeInTheDocument();
  });

  it('a mentor viewing keeps the read-only session list, with no note (review of PR 102)', () => {
    h.viewerIsMentor = true;
    withLink('tab=sessions');
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('tab', { name: `Sessions (${profile.sessionTypes.length})` }),
    ).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText(second.name)).toBeInTheDocument();
    expect(screen.queryByText(body)).toBeNull();
  });

  it('the aside isn’t named for booking when it only says bookings are closed (review of PR 102)', () => {
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('complementary')).toHaveAccessibleName(/^Availability/);
  });
});
