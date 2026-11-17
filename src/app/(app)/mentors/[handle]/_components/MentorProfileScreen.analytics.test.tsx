import { StrictMode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
import { noteProfileSource, takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';
import { profileShared, recordProfileVisit } from '@/lib/api/data/profileLinks';
import { resetProfileVisitsForTests } from './useProfileViewed';
import { h, remote, state } from './profileScreen.harness';
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
vi.mock('@/lib/api/data/freeSoon', async () =>
  (await import('./profileScreen.harness')).mocks.freeSoon(),
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

// The visit's and the share's own records: their network side is profileLinks.test.ts.
vi.mock('@/lib/api/data/profileLinks', () => ({
  recordProfileVisit: vi.fn(),
  profileShared: vi.fn(),
}));

vi.mock('@/lib/analytics/track', async (orig) => ({
  ...(await orig<typeof import('@/lib/analytics/track')>()),
  track: vi.fn(),
}));

const views = () => vi.mocked(track).mock.calls.filter(([e]) => e === 'mentor_profile_viewed');

describe('MentorProfileScreen: mentor_profile_viewed (PRD 30)', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
    h.sessionTypesRemote = remote(sessionTypes);
    h.profile = state({ data: { ...fullProfile, sessionTypes } });
  });

  it('once per visit, StrictMode and re-renders included; direct with no in-app source', () => {
    const { rerender } = render(
      <StrictMode>
        <MentorProfileScreen handle="gbenga" />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <MentorProfileScreen handle="gbenga" />
      </StrictMode>,
    );
    expect(views()).toEqual([['mentor_profile_viewed', { source: 'direct' }]]);
  });

  it('carries the source the linking surface noted', () => {
    noteProfileSource('explore', '/mentors/gbenga');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(views()).toEqual([['mentor_profile_viewed', { source: 'explore' }]]);
  });

  it('a source noted on an id link counts when the 308 opens the profile by slug', () => {
    noteProfileSource('bookings', `/mentors/${fullProfile.mentor.id}?book=t-1`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(views()).toEqual([['mentor_profile_viewed', { source: 'bookings' }]]);
  });

  it('invite_link when the URL carries the invite context', () => {
    h.search = new URLSearchParams('ref=invite');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(views()).toEqual([['mentor_profile_viewed', { source: 'invite_link' }]]);
  });

  it('waits for the profile and for who is looking', () => {
    h.profile = state({ isLoading: true });
    h.viewerLoading = true;
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    expect(views()).toEqual([]);
    h.profile = state({ data: { ...fullProfile, sessionTypes } });
    h.viewerLoading = false;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(views()).toHaveLength(1);
  });

  it('a similar mentor followed from the aside is a similar_mentors visit', () => {
    render(<MentorProfileScreen handle="gbenga" />);
    const card = screen.getByRole('region', { name: 'Similar mentors' });
    const aside = card.closest('aside')!;
    const link = within(aside).getAllByRole('link', { name: /Oluwakemi/ })[0]!;
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    expect(takeProfileSource('oluwakemi-olayinka', new URLSearchParams())).toBe('similar_mentors');
  });
});

describe('MentorProfileScreen: the visit, recorded with its channel and referrer', () => {
  const visits = () => vi.mocked(recordProfileVisit).mock.calls;
  /** The address bar and the router's params, as a link opened them. */
  const arrive = (search: string, path = '/mentors/gbenga') => {
    window.history.replaceState(null, '', `${path}${search}`);
    h.search = new URLSearchParams(search);
  };
  const referrer = (value: string) =>
    Object.defineProperty(document, 'referrer', { value, configurable: true });
  /** The URL the browser itself loaded (the navigation entry). */
  const loadedAt = (path: string) =>
    vi
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([{ name: `${window.location.origin}${path}` } as PerformanceEntry]);

  beforeEach(() => {
    vi.mocked(recordProfileVisit).mockClear();
    resetProfileVisitsForTests();
    h.sessionTypesRemote = remote(sessionTypes);
    h.profile = state({ data: { ...fullProfile, sessionTypes } });
    referrer('');
    arrive('');
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(() => {
    referrer('');
    window.history.replaceState(null, '', '/');
  });

  it('once per view, StrictMode and re-renders included, by the mentor’s id', () => {
    const { rerender } = render(
      <StrictMode>
        <MentorProfileScreen handle="gbenga" />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <MentorProfileScreen handle="gbenga" />
      </StrictMode>,
    );
    expect(visits()).toEqual([[fullProfile.mentor.id, { via: null, referrerHost: undefined }]]);
  });

  it('waits for the profile to load', () => {
    h.profile = state({ isLoading: true });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toEqual([]);
    h.profile = state({ data: { ...fullProfile, sessionTypes } });
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toHaveLength(1);
  });

  it('carries the link’s via, then takes it out of the address bar, keeping the rest', () => {
    arrive('?via=copy&tab=reviews');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toMatchObject({ via: 'copy' });
    expect(window.location.pathname).toBe('/mentors/gbenga');
    expect(window.location.search).toBe('?tab=reviews');
  });

  it('passes an unknown via on as it came: the server decides what it keeps', () => {
    arrive('?via=newsletter');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toMatchObject({ via: 'newsletter' });
    expect(window.location.search).toBe('');
  });

  it('the owner’s own look is no visit, and via still leaves their address bar', () => {
    arrive('?via=copy&tab=reviews');
    h.profile = state({
      data: { ...fullProfile, sessionTypes, owner: { approval: 'approved', listed: true } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toEqual([]);
    expect(window.location.search).toBe('?tab=reviews');
  });

  it('the signed-in mentor on their own id is no visit either', () => {
    h.viewerIsMentor = true;
    h.viewerExtra = { id: fullProfile.mentor.id };
    arrive('?via=share', `/mentors/${fullProfile.mentor.id}`);
    render(<MentorProfileScreen handle={fullProfile.mentor.id} />);
    expect(visits()).toEqual([]);
    expect(window.location.search).toBe('');
  });

  it('an outside referrer is sent as its bare host', () => {
    referrer('https://l.instagram.com:443/?u=https%3A%2F%2Fedufurther.org');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toMatchObject({ referrerHost: 'l.instagram.com' });
  });

  it.each([
    ['a page of this app', () => `${window.location.origin}/explore`],
    ['the landing site', () => 'https://www.edufurther.org/mentors'],
  ])('%s is not a referrer', (_name, from) => {
    referrer(from());
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toEqual({ via: null, referrerHost: undefined });
  });

  it('the referrer is for the profile the browser loaded, not one opened from it', () => {
    referrer('https://www.linkedin.com/feed/');
    loadedAt('/mentors/gbenga');
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toMatchObject({ referrerHost: 'www.linkedin.com' });
    unmount();
    // A click inside the app to another mentor: the same page load, the same referrer.
    arrive('', '/mentors/oluwakemi');
    h.profile = state({
      data: { ...fullProfile, sessionTypes, mentor: { ...fullProfile.mentor, id: 'm-other' } },
    });
    render(<MentorProfileScreen handle="oluwakemi" />);
    expect(visits()).toHaveLength(2);
    expect(visits()[1]).toEqual(['m-other', { via: null, referrerHost: undefined }]);
  });

  it('a profile reached inside the app after loading another page gets no referrer', () => {
    referrer('https://www.linkedin.com/feed/');
    loadedAt('/explore');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toEqual({ via: null, referrerHost: undefined });
  });

  it('back from Google sign-in on a fresh load: never referred by Google', () => {
    // The accepted trade-off: a fresh load may count again, but with no referrer.
    referrer('https://accounts.google.com/');
    loadedAt('/mentors/gbenga');
    arrive(`?book=${sessionTypes[0]!.id}`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toEqual([[fullProfile.mentor.id, { via: null, referrerHost: undefined }]]);
  });

  it('back to the same profile on the same page load (the email code, Back): one visit', () => {
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    unmount();
    arrive(`?book=${sessionTypes[0]!.id}`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toHaveLength(1);
  });

  it('nothing about the visit goes on the device (no consent yet)', () => {
    const local = vi.spyOn(localStorage, 'setItem');
    const session = vi.spyOn(sessionStorage, 'setItem');
    const proto = vi.spyOn(Storage.prototype, 'setItem');
    arrive('?via=copy');
    referrer('https://www.linkedin.com/');
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    unmount();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toHaveLength(1);
    expect(local).not.toHaveBeenCalled();
    expect(session).not.toHaveBeenCalled();
    expect(proto).not.toHaveBeenCalled();
  });

  it('a visit recorded over half an hour ago is a new one', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    unmount();
    vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 60_000);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()).toHaveLength(2);
  });
});

describe('MentorProfileScreen: a share of the profile, counted through profileShared', () => {
  const shares = () => vi.mocked(profileShared).mock.calls;
  const openShare = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    return screen.findByRole('dialog', { name: /^Share .+’s profile$/ });
  };
  const linkShared = () => vi.mocked(track).mock.calls.filter(([e]) => e === 'link_shared');

  beforeEach(() => {
    vi.mocked(profileShared).mockClear();
    vi.mocked(track).mockClear();
    h.profile = state({ data: fullProfile });
  });
  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('Copy: the link carries via=copy, and one copy is counted', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(await openShare(user)).getByRole('button', { name: 'Copy link' }));
    expect(writeText.mock.calls[0]![0]).toMatch(/\?via=copy$/);
    expect(shares()).toEqual([[fullProfile.mentor.id, 'copy', false]]);
    // The panel sends no link_shared of its own beside it.
    expect(linkShared()).toEqual([]);
  });

  it('the share sheet: the link carries via=share, and a native share is counted', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(await openShare(user)).getByRole('button', { name: 'Share' }));
    expect((share.mock.calls[0]![0] as ShareData).url).toMatch(/\?via=share$/);
    expect(shares()).toEqual([[fullProfile.mentor.id, 'native', false]]);
  });

  it('a dismissed share sheet counts nothing', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(await openShare(user)).getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalled();
    expect(shares()).toEqual([]);
  });
});
