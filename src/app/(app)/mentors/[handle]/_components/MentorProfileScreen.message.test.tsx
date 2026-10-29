import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
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

vi.mock('@/lib/config/messages', () => ({ MESSAGES_LIVE: true }));
vi.mock('@/app/_shell/SendMessageLauncher', () => ({
  SendMessageLauncher: ({ to }: { to: { firstName: string; role: string } | null }) =>
    to ? <div role="dialog" aria-label={`SendMessage to ${to.firstName} (${to.role})`} /> : null,
}));

const profile = (canMessage: boolean) => ({ ...fullProfile, sessionTypes, canMessage });

describe('MentorProfileScreen: Message (PRD Messages)', () => {
  beforeEach(() => {
    h.sessionTypesRemote = remote(sessionTypes);
  });

  it('a connected mentee: Message beside Book, opening SendMessage for this mentor', async () => {
    h.profile = state({ data: profile(true) });
    render(<MentorProfileScreen handle="gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'Message' }));
    expect(
      screen.getByRole('dialog', { name: 'SendMessage to Gbenga (mentor)' }),
    ).toBeInTheDocument();
  });

  it('not connected (no can_message): none', () => {
    h.profile = state({ data: profile(false) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Message' })).not.toBeInTheDocument();
  });

  it('a mentor or a guest: none, whatever the read says', () => {
    h.viewerIsMentor = true;
    h.profile = state({ data: profile(true) });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Message' })).not.toBeInTheDocument();
    unmount();
    h.viewerIsMentor = false;
    h.isGuest = true;
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Message' })).not.toBeInTheDocument();
  });
});
