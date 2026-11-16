import { StrictMode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
import { noteProfileSource, takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';
import { recordProfileShare, recordProfileVisit } from '@/lib/api/data/profileLinks';
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

// The visit's own record: its network side is profileLinks.test.ts.
vi.mock('@/lib/api/data/profileLinks', () => ({
  recordProfileVisit: vi.fn(),
  recordProfileShare: vi.fn(),
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
  const arrive = (search: string) => {
    window.history.replaceState(null, '', `/mentors/gbenga${search}`);
    h.search = new URLSearchParams(search);
  };
  const referrer = (value: string) =>
    Object.defineProperty(document, 'referrer', { value, configurable: true });

  beforeEach(() => {
    vi.mocked(recordProfileVisit).mockClear();
    h.sessionTypesRemote = remote(sessionTypes);
    h.profile = state({ data: { ...fullProfile, sessionTypes } });
    referrer('');
    arrive('');
  });
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

  it('an outside referrer is sent as its bare host', () => {
    referrer('https://l.instagram.com:443/?u=https%3A%2F%2Fedufurther.org');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toMatchObject({ referrerHost: 'l.instagram.com' });
  });

  it('a page of this app is not a referrer', () => {
    referrer(`${window.location.origin}/explore`);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(visits()[0]![1]).toEqual({ via: null, referrerHost: undefined });
  });
});

describe('MentorProfileScreen: a share of the profile, recorded beside link_shared', () => {
  const shares = () => vi.mocked(recordProfileShare).mock.calls;
  const openShare = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    return screen.findByRole('dialog', { name: /^Share .+’s profile$/ });
  };

  beforeEach(() => {
    vi.mocked(recordProfileShare).mockClear();
    h.profile = state({ data: fullProfile });
  });
  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('Copy: the link carries via=copy, and a copy is recorded', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(await openShare(user)).getByRole('button', { name: 'Copy link' }));
    expect(writeText.mock.calls[0]![0]).toMatch(/\?via=copy$/);
    expect(shares()).toEqual([[fullProfile.mentor.id, 'copy']]);
  });

  it('the share sheet: the link carries via=share, and a native share is recorded', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(await openShare(user)).getByRole('button', { name: 'Share' }));
    expect((share.mock.calls[0]![0] as ShareData).url).toMatch(/\?via=share$/);
    expect(shares()).toEqual([[fullProfile.mentor.id, 'native']]);
  });

  it('a dismissed share sheet records nothing', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(within(await openShare(user)).getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalled();
    expect(shares()).toEqual([]);
  });
});
