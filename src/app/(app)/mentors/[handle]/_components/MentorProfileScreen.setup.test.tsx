import { render, screen } from '@testing-library/react';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { flags, resetFlags } from '@/app/_shell/lockedPage.harness';
import { h, replace, state } from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
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
vi.mock('@/lib/api/data/freeze', async () =>
  (await import('./profileScreen.harness')).mocks.freeze(),
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

const own = { ...fullProfile, owner: { approval: 'pending' as const, listed: false } };
const unsubmitted = { isMentee: false, isMentor: true, mentorStage: 'unsubmitted' } as const;

beforeEach(() => {
  resetFlags();
  replace.mockReset();
});

describe('MentorProfileScreen: the owner in setup (owner, 2026-10-20)', () => {
  it('a mentor who never sent their application goes to mentor onboarding, never the editor', () => {
    h.viewerIsMentor = true;
    h.viewerExtra = unsubmitted;
    h.profile = state({ data: own });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(replace).toHaveBeenCalledWith('/onboarding/mentor');
    expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: own.mentor.name })).toBeNull();
  });

  it('their own id in the URL detours at once: never the loading, not-found or error page', () => {
    h.viewerIsMentor = true;
    h.viewerExtra = unsubmitted;
    for (const p of [
      state({ isLoading: true }),
      state({ notFound: true }),
      state({ error: { kind: 'server', message: 'x' } }),
    ]) {
      replace.mockReset();
      h.profile = p;
      const { container, unmount } = render(<MentorProfileScreen handle="viewer-1" />);
      expect(replace).toHaveBeenCalledWith('/onboarding/mentor');
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('a malformed handle (left undecoded by the page) never crashes the owner check', () => {
    h.viewerExtra = unsubmitted;
    h.profile = state({ notFound: true });
    expect(() => render(<MentorProfileScreen handle="%E0" />)).not.toThrow();
  });

  it('a visitor in setup still sees someone else’s profile', () => {
    h.viewerExtra = { onboardingComplete: false };
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(replace).not.toHaveBeenCalledWith('/onboarding');
    expect(screen.getByRole('heading', { level: 1, name: fullProfile.mentor.name })).toBeVisible();
  });

  it('a mentor in review keeps their profile to edit', () => {
    h.viewerIsMentor = true;
    h.viewerExtra = { mentorStage: 'pending' };
    h.profile = state({ data: own });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('with mentor onboarding off, the owner keeps their profile', () => {
    flags.mentor = false;
    h.viewerIsMentor = true;
    h.viewerExtra = unsubmitted;
    h.profile = state({ data: own });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });
});
