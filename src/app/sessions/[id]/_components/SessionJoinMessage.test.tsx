import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { at, setupSessionJoinHarness } from './sessionJoin.harness';
import { SessionJoinScreen } from './SessionJoinScreen';

// The lobby through its phases: before the window, open, during and after the call,
// and back from the entry route. Shares sessionJoin.harness with SessionJoinScreen.test.tsx.

// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('next/navigation', async () => (await import('./sessionJoin.harness')).mocks.navigation());
vi.mock('@/lib/api/data/viewer', async () =>
  (await import('./sessionJoin.harness')).mocks.viewer(),
);
vi.mock('@/lib/api/data/sessionRoom', async () =>
  (await import('./sessionJoin.harness')).mocks.sessionRoom(),
);
vi.mock('@/lib/api/data/sessionAnswers', async () =>
  (await import('./sessionJoin.harness')).mocks.sessionAnswers(),
);
vi.mock('@/lib/api/data/bookingActions', async () =>
  (await import('./sessionJoin.harness')).mocks.bookingActions(),
);
vi.mock('@/lib/api/data/moveSession', async () =>
  (await import('./sessionJoin.harness')).mocks.moveSession(),
);
vi.mock('@/lib/api/data/booking', async (orig) =>
  (await import('./sessionJoin.harness')).mocks.booking(await orig()),
);
vi.mock('@/lib/api/data/reviewableSessions', async () =>
  (await import('./sessionJoin.harness')).mocks.reviewableSessions(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./sessionJoin.harness')).mocks.reviewWrite(),
);
vi.mock('@/app/_reviews/ReviewDialog', async () =>
  (await import('./sessionJoin.harness')).mocks.reviewDialog(),
);
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', async () =>
  (await import('./sessionJoin.harness')).mocks.bookingLauncher(),
);
vi.mock('@/lib/api/data/privateFiles', async () =>
  (await import('./sessionJoin.harness')).mocks.privateFiles(),
);
vi.mock('@/lib/api/data/missedReason', async () =>
  (await import('./sessionJoin.harness')).mocks.missedReason(),
);

vi.mock('@/lib/config/messages', () => ({ MESSAGES_LIVE: true }));
vi.mock('@/app/_shell/SendMessageLauncher', () => ({
  SendMessageLauncher: ({ to }: { to: { firstName: string } | null }) =>
    to ? <div role="dialog" aria-label={`SendMessage to ${to.firstName}`} /> : null,
}));

setupSessionJoinHarness();

describe('the lobby’s “Message {First}” (PRD Messages)', () => {
  it('under the other person only, opening SendMessage for them', async () => {
    vi.setSystemTime(at('15:15:00'));
    render(<SessionJoinScreen id="b1" />);
    const buttons = screen.getAllByRole('button', { name: /^Message / });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Message Amara');
    vi.useRealTimers();
    await userEvent.click(buttons[0]!);
    expect(screen.getByRole('dialog', { name: 'SendMessage to Amara' })).toBeInTheDocument();
  });
});
