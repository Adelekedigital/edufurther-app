import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { similarMentors } from '@/components/organisms/SimilarMentorsCard/similar.fixture';
import type { MentorProfile } from '@/types/mentor';
import {
  h,
  state,
  replace,
  similarArgs,
  sessionTypesArgs,
  coverSave,
  coverUpload,
  coverPick,
  idle,
} from './profileScreen.harness';
import { MentorProfileScreen, suggestionsLine } from './MentorProfileScreen';

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

describe('MentorProfileScreen — the four states', () => {
  it('loading', () => {
    h.profile = state({ isLoading: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile');
  });

  it('error, with a retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    h.profile = state({ error: { kind: 'server', message: 'x' }, retry });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('We couldn’t load this profile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('not found with nobody to suggest sends people back to Explore', () => {
    h.profile = state({ notFound: true });
    h.similarRemote = { data: [], isLoading: false, error: null, retry: vi.fn() };
    render(<MentorProfileScreen handle="nobody" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'This mentor profile isn’t available' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
    expect(screen.queryByRole('heading', { name: 'Mentors with similar expertise' })).toBeNull();
  });

  it('not found, and the suggestions failed: the same way back, no section', () => {
    h.profile = state({ notFound: true });
    h.similarRemote = {
      data: null,
      isLoading: false,
      error: { kind: 'server', message: 'x' },
      retry: vi.fn(),
    };
    render(<MentorProfileScreen handle="nobody" />);
    expect(screen.getByRole('link', { name: 'Explore mentors' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mentors with similar expertise' })).toBeNull();
  });

  it('not found suggests mentors with similar expertise (#38)', () => {
    h.profile = state({ notFound: true });
    render(<MentorProfileScreen handle="hidden-mentor" />);
    expect(similarArgs).toHaveBeenLastCalledWith('hidden-mentor', true);
    // The page's title; the section and its cards sit under it (review of #69).
    expect(
      screen.getByRole('heading', { level: 1, name: 'This mentor profile isn’t available' }),
    ).toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Mentors with similar expertise' });
    expect(section).toHaveTextContent(
      'They help with statement of purpose, scholarships & funding, and visa and interview.',
    );
    expect(within(section).getAllByRole('article')).toHaveLength(similarMentors.length);
    expect(within(section).getByRole('link', { name: 'Explore all mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
    // The big button gives way to the section's.
    expect(screen.queryByRole('link', { name: 'Explore mentors' })).toBeNull();
  });

  it('while the suggestions load, their place is held', () => {
    h.profile = state({ notFound: true });
    h.similarRemote = { data: null, isLoading: true, error: null, retry: vi.fn() };
    render(<MentorProfileScreen handle="hidden-mentor" />);
    const section = screen.getByRole('region', { name: 'Mentors with similar expertise' });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(within(section).queryAllByRole('article')).toHaveLength(0);
  });

  it('a suggested mentor books in the same booking modal, for that mentor (review of #69)', async () => {
    const user = userEvent.setup();
    h.profile = state({ notFound: true });
    render(<MentorProfileScreen handle="hidden-mentor" />);
    await user.click(screen.getByRole('button', { name: 'Book session with Oluwakemi' }));
    const dialog = screen.getByRole('dialog');
    expect(sessionTypesArgs).toHaveBeenLastCalledWith('s1');
    expect(dialog).toHaveTextContent('Oluwakemi Olayinka');
    // Another mentor's page is worth a link (the profile's own mentor gets none).
    expect(within(dialog).getByRole('link', { name: /View profile/ })).toHaveAttribute(
      'href',
      '/mentors/oluwakemi-olayinka',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionTypesArgs).toHaveBeenLastCalledWith(null);
    // Another suggestion: the booking follows.
    await user.click(screen.getByRole('button', { name: 'See availability' }));
    expect(sessionTypesArgs).toHaveBeenLastCalledWith('s2');
    expect(screen.getByRole('dialog')).toHaveTextContent('Muhammad Kabir Musa');
  });

  it('a suggested booking closes, and stops fetching, if the viewer turns out to be a mentor', async () => {
    const user = userEvent.setup();
    h.profile = state({ notFound: true });
    const { rerender } = render(<MentorProfileScreen handle="hidden-mentor" />);
    await user.click(screen.getByRole('button', { name: 'Book session with Oluwakemi' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    h.viewerIsMentor = true;
    rerender(<MentorProfileScreen handle="hidden-mentor" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionTypesArgs).toHaveBeenLastCalledWith(null);
  });

  it('a found profile asks for no suggestions when a mentor is looking', () => {
    h.viewerIsMentor = true;
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(similarArgs).toHaveBeenLastCalledWith('gbenga', false);
  });

  it('a mentor looking sees the suggestions with View profile, not Book', () => {
    h.viewerIsMentor = true;
    h.profile = state({ notFound: true });
    render(<MentorProfileScreen handle="hidden-mentor" />);
    const section = screen.getByRole('region', { name: 'Mentors with similar expertise' });
    expect(within(section).queryByRole('button', { name: /^Book/ })).toBeNull();
    expect(within(section).getAllByRole('link', { name: /^View profile/ })).toHaveLength(
      similarMentors.length,
    );
  });

  it('content: header, Book, and the tab in the URL', async () => {
    const user = userEvent.setup();
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book a session' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'Sessions (1)' }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?tab=sessions', { scroll: false });
  });

  it('keeps a shared link’s other parameters when the tab changes (review of #21)', async () => {
    const user = userEvent.setup();
    h.search = new URLSearchParams('utm_source=linkedin');
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('tab', { name: 'Sessions (1)' }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?utm_source=linkedin&tab=sessions', {
      scroll: false,
    });
  });

  it('opens on the Sessions tab from ?tab=sessions', () => {
    h.search = new URLSearchParams('tab=sessions');
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — the mentor on their own page', () => {
  it('shows the owner bar and no way to book themselves', () => {
    h.profile = state({
      data: { ...fullProfile, owner: { approval: 'pending', listed: true } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText('Only you can see this until your profile is approved.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book a session' })).not.toBeInTheDocument();
  });

  it('changes their cover: colour, topic icons and an image', async () => {
    h.profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: true } } });
    const user = userEvent.setup();
    const { container } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Change cover' }));
    await user.click(screen.getByRole('radio', { name: 'Peach' }));
    expect(coverPick).toHaveBeenLastCalledWith('peach');
    await user.click(screen.getByRole('switch', { name: 'Show my topics on the cover' }));
    expect(coverSave).toHaveBeenLastCalledWith({ art: 'icons' });
    // The data layer checks the file (tested there); the page hands it over.
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const ok = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(input, ok);
    expect(coverUpload).toHaveBeenCalledWith(ok);
  });

  it('a visitor gets no cover tools', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Change cover' })).not.toBeInTheDocument();
  });

  it('tells a declined mentor their profile wasn’t approved (review of #21; design reply #42)', () => {
    h.profile = state({ data: { ...fullProfile, owner: { approval: 'declined', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText(
        'Your profile wasn’t approved, so only you can see it. Contact support to find out what to change.',
      ),
    ).toBeInTheDocument();
  });

  it('says an unlisted profile is hidden', () => {
    h.profile = state({ data: { ...fullProfile, owner: { approval: 'approved', listed: false } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Your profile is unlisted. Only you can see it.')).toBeInTheDocument();
  });

  it('keeps a loaded profile on screen when a background refetch fails (review of #21)', () => {
    h.profile = state({ data: fullProfile, error: { kind: 'offline', message: 'x' } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gbenga Elufisan' })).toBeInTheDocument();
    expect(screen.queryByText('We couldn’t load this profile')).not.toBeInTheDocument();
  });

  it('knows the owner by id even before the owner-only fields arrive', () => {
    h.profile = state({
      data: { ...fullProfile, mentor: { ...fullProfile.mentor, id: 'viewer-1' } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/You’re viewing your own profile./)).toBeInTheDocument();
  });
});

describe('MentorProfileScreen — new mentors (design reply #45)', () => {
  const newMentor = (sessions: number, over: Partial<MentorProfile> = {}): MentorProfile => ({
    ...fullProfile,
    mentor: {
      ...fullProfile.mentor,
      completedSessions: sessions,
      reviewCount: 0,
      rating: null,
      nextAvailableState: 'open',
      nextAvailableAt: '2026-09-28T13:00:00Z',
    },
    ...over,
  });

  it('invites mentees under 3 sessions, with the move and the award, and not from 3', () => {
    h.profile = state({ data: newMentor(2) });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('heading', { name: 'Be one of Gbenga’s first mentees' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Made the move you’re planning.')).toBeInTheDocument();
    expect(screen.getByText('Got funded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Book .* · / })).toBeInTheDocument();
    unmount();
    h.profile = state({ data: newMentor(3) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
  });

  it('"Book {time}" opens the booking modal with that time picked', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
    try {
      const user = userEvent.setup();
      h.sessionTypesRemote = {
        ...idle,
        data: [
          {
            id: 'st1',
            name: 'General mentorship',
            durationMin: 60,
            description: '',
            questions: [],
          },
        ],
      };
      h.slotsRemote = { ...idle, data: ['2026-09-28T09:00:00Z', '2026-09-28T13:00:00Z'] };
      h.profile = state({ data: newMentor(0) });
      render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: /^Book .* · / }));
      // The card's time (13:00Z) is picked, not the day's first (09:00Z):
      // the footer reads "Request {the card's time}".
      const cardTime = screen.getByRole('button', { name: /^Book .* · / }).textContent!.slice(5);
      expect(
        within(screen.getByRole('dialog')).getByRole('button', { name: `Request ${cardTime}` }),
      ).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers no Book when the mentor has no session types', () => {
    h.profile = state({ data: newMentor(0, { sessionTypes: [] }) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/first mentees/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Book .* · / })).not.toBeInTheDocument();
  });

  it('shows the owner what mentees see, and "Share your profile" opens the share menu', async () => {
    const user = userEvent.setup();
    h.profile = state({ data: newMentor(1, { owner: { approval: 'approved', listed: true } }) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByRole('heading', { name: 'Mentees see you as a new mentor' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share your profile' }));
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
  });

  it('does not nudge sharing a profile mentees can’t see (review of #25)', () => {
    for (const owner of [
      { approval: 'pending' as const, listed: true },
      { approval: 'declined' as const, listed: true },
      { approval: 'approved' as const, listed: false },
    ]) {
      h.profile = state({ data: newMentor(0, { owner }) });
      const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
      expect(screen.queryByRole('button', { name: 'Share your profile' })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('suggestionsLine', () => {
  const at = (n: number) => similarMentors.slice(0, n);
  it('names up to three shared topics, commas keeping each whole', () => {
    expect(suggestionsLine(at(0))).toBe('Other mentors you can explore.');
    expect(suggestionsLine(at(1))).toBe('They help with statement of purpose.');
    expect(suggestionsLine(at(2))).toBe(
      'They help with statement of purpose, and scholarships & funding.',
    );
    expect(suggestionsLine(at(3))).toBe(
      'They help with statement of purpose, scholarships & funding, and visa and interview.',
    );
  });
  it('says a shared topic once', () => {
    const twice = [
      similarMentors[0]!,
      { ...similarMentors[1]!, sharedTopic: 'Statement of purpose' },
    ];
    expect(suggestionsLine(twice)).toBe('They help with statement of purpose.');
  });
});
