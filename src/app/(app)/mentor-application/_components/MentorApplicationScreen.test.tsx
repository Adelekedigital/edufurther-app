import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentorApplication } from '@/lib/api/data/mentorApplicationStatus';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));

let viewer: { kind: string; id?: string; retry?: () => void };
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({ viewer, member: viewer.kind === 'member' ? viewer : null }),
}));

let app: { data: MentorApplication | null; isLoading: boolean; error: unknown; retry: () => void };
const markSeen = vi.fn();
const continueAsMentee = vi.fn();
vi.mock('@/lib/api/data/mentorApplicationStatus', () => ({
  useMentorApplication: () => app,
  useMarkApprovedSeen: () => ({ markSeen, isPending: false }),
  useContinueAsMentee: () => ({ continueAsMentee, isPending: false, error: null }),
}));

const week = emptyWeek().map((d, i) =>
  i >= 1 && i <= 5 ? { on: true, slots: [[1080, 1260]] } : d,
);
vi.mock('@/lib/api/data/weeklyHours', () => ({
  useWeeklyHours: (id: string | null) => ({
    data: id ? { days: week, timeZone: 'Africa/Lagos' } : null,
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useOwnSessionTypes: () => ({
    data: [{ id: 'st 1', name: 'Intro chat' }],
    isLoading: false,
    error: null,
  }),
}));

const { MentorApplicationScreen } = await import('./MentorApplicationScreen');

const person = { firstName: 'Gbenga', fullName: 'Gbenga Ekundayo', email: 'gbenga@example.com' };
const remote = (data: MentorApplication | null) => ({
  data,
  isLoading: !data,
  error: null,
  retry: vi.fn(),
});

beforeEach(() => {
  viewer = { kind: 'member', id: 'u1' };
  replace.mockReset();
  push.mockReset();
  markSeen.mockReset();
  continueAsMentee.mockReset();
});

describe('MentorApplicationScreen (PRD F3, "Where people land")', () => {
  it('approved, not seen: the real hours and Intro chat, marked seen once', async () => {
    app = remote({ stage: 'approved', seen: false, ...person });
    const { rerender } = render(<MentorApplicationScreen />);
    expect(
      screen.getByText('Mon–Fri, 6:00 pm – 9:00 pm (Africa/Lagos). Change them any time.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/session-types/st%201/edit',
    );
    rerender(<MentorApplicationScreen />);
    await waitFor(() => expect(markSeen).toHaveBeenCalledOnce());
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps the approved screen after /me says seen (what it shows is decided once)', () => {
    app = remote({ stage: 'approved', seen: false, ...person });
    const { rerender } = render(<MentorApplicationScreen />);
    app = remote({ stage: 'approved', seen: true, ...person });
    rerender(<MentorApplicationScreen />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('You’re in, Gbenga.');
    expect(replace).not.toHaveBeenCalled();
  });

  it('approved and seen: the dashboard with the toast', () => {
    app = remote({ stage: 'approved', seen: true, ...person });
    render(<MentorApplicationScreen />);
    expect(replace).toHaveBeenCalledWith('/dashboard?toast=approved');
    expect(markSeen).not.toHaveBeenCalled();
  });

  it('not sent yet, or no profile: back to the steps', () => {
    app = remote({ stage: 'unsubmitted' });
    const { unmount } = render(<MentorApplicationScreen />);
    expect(replace).toHaveBeenCalledWith('/onboarding/mentor');
    unmount();
    app = remote({ stage: 'none' });
    render(<MentorApplicationScreen />);
    expect(replace).toHaveBeenLastCalledWith('/onboarding/mentor');
  });

  it('a guest signs in and comes back here', () => {
    viewer = { kind: 'guest' };
    app = remote(null);
    render(<MentorApplicationScreen />);
    expect(replace).toHaveBeenCalledWith('/login?next=%2Fmentor-application');
  });

  it('error before empty: a failed read offers a retry', async () => {
    app = { data: null, isLoading: false, error: { kind: 'server' }, retry: vi.fn() };
    render(<MentorApplicationScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(app.retry).toHaveBeenCalled();
  });

  it('declined: Continue as a mentee saves the role, then goes', async () => {
    app = remote({
      stage: 'declined',
      note: 'Add the PhD.',
      reviewedAt: '2026-10-14T15:30:00Z',
      ...person,
    });
    continueAsMentee.mockResolvedValue(undefined);
    render(<MentorApplicationScreen />);
    expect(screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')).toContain(
      encodeURIComponent('(Gbenga Ekundayo)'),
    );
    await userEvent.click(screen.getByRole('link', { name: 'Continue as a mentee' }));
    expect(continueAsMentee).toHaveBeenCalledOnce();
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
