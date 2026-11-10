import { StrictMode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
import { noteProfileSource, takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';
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

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

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
