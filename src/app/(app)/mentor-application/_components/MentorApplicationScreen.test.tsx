import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentorApplication } from '@/lib/api/data/mentorApplicationStatus';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';

const replace = vi.fn();
const push = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => '/mentor-application',
  useSearchParams: () => new URLSearchParams(search),
}));

let viewer: { kind: string; id?: string; retry?: () => void };
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({ viewer, member: viewer.kind === 'member' ? viewer : null }),
}));

let app: {
  data: MentorApplication | null;
  isLoading: boolean;
  error: unknown;
  retry: () => void;
  fresh: boolean;
};
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
let hoursFail = false;
vi.mock('@/lib/api/data/weeklyHours', () => ({
  useWeeklyHours: (id: string | null) => ({
    data: id && !hoursFail ? { days: week, timeZone: 'Africa/Lagos' } : null,
    isLoading: false,
    error: hoursFail ? { kind: 'server' } : null,
  }),
}));
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useOwnSessionTypes: () => ({
    data: [{ id: 'st 1', name: 'Intro chat' }],
    isLoading: false,
    error: null,
  }),
}));

let calendar: {
  data: unknown;
  isLoading: boolean;
  error: unknown;
  retry: () => void;
  retrying: boolean;
};
vi.mock('@/lib/api/data/calendarConnection', () => ({ useCalendarConnection: () => calendar }));
let connectState: { kind: string } = { kind: 'idle' };
const connectFn = vi.fn();
let onConnected: () => void = () => {};
vi.mock('@/app/_shell/useCalendarConnect', () => ({
  useCalendarConnect: (_id: unknown, _c: unknown, announce: () => void) => {
    onConnected = announce;
    return { state: connectState, connect: connectFn, unavailable: false, dismiss: vi.fn() };
  },
}));

const { MentorApplicationScreen, calendarStateOf } = await import('./MentorApplicationScreen');

const person = { firstName: 'Gbenga', fullName: 'Gbenga Ekundayo', email: 'gbenga@example.com' };
const remote = (data: MentorApplication | null, fresh = true) => ({
  data,
  isLoading: !data,
  error: null,
  retry: vi.fn(),
  fresh,
});

beforeEach(() => {
  viewer = { kind: 'member', id: 'u1' };
  search = '';
  hoursFail = false;
  calendar = { data: null, isLoading: false, error: null, retry: vi.fn(), retrying: false };
  connectState = { kind: 'idle' };
  connectFn.mockReset();
  replace.mockReset();
  push.mockReset();
  markSeen.mockReset();
  continueAsMentee.mockReset();
});

describe('MentorApplicationScreen (PRD F3, "Where people land")', () => {
  it('straight after submit (?sent=1): "Application sent, {First}", then the address drops ?sent', async () => {
    search = 'sent=1';
    app = remote({ stage: 'pending', ...person });
    render(<MentorApplicationScreen />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Application sent, Gbenga' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'We’ll review your background and email you at gbenga@example.com when there’s an update.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit my application' })).toBeInTheDocument();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/mentor-application', { scroll: false }),
    );
  });

  it('any later visit (no ?sent): "Your application is in review"', async () => {
    app = remote({ stage: 'pending', ...person });
    render(<MentorApplicationScreen />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your application is in review' }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

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

  it('waits for a fresh read: a cached one may predate approved-seen', () => {
    app = remote({ stage: 'approved', seen: false, ...person }, false);
    const { rerender } = render(<MentorApplicationScreen />);
    expect(screen.getByText('Loading your application…')).toBeInTheDocument();
    expect(markSeen).not.toHaveBeenCalled();
    app = remote({ stage: 'approved', seen: true, ...person });
    rerender(<MentorApplicationScreen />);
    expect(replace).toHaveBeenCalledWith('/dashboard?toast=approved');
    expect(markSeen).not.toHaveBeenCalled();
  });

  it('a failed hours read only leaves its row out', () => {
    hoursFail = true;
    app = remote({ stage: 'approved', seen: false, ...person });
    render(<MentorApplicationScreen />);
    expect(screen.queryByText('Weekly hours drafted')).toBeNull();
    expect(screen.getByText('Intro chat is ready to book')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('an account that can’t be read as a member goes to /; a failed viewer offers a retry', async () => {
    viewer = { kind: 'unlinked' };
    app = remote(null);
    const { unmount } = render(<MentorApplicationScreen />);
    expect(replace).toHaveBeenCalledWith('/');
    unmount();
    const retry = vi.fn();
    viewer = { kind: 'error', retry };
    render(<MentorApplicationScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
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
    app = { data: null, isLoading: false, error: { kind: 'server' }, retry: vi.fn(), fresh: true };
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

describe('MentorApplicationScreen: Google Calendar connects in place', () => {
  it('Connect starts the popup flow; success is announced in the row’s words', async () => {
    app = remote({ stage: 'approved', seen: false, ...person });
    render(<MentorApplicationScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(connectFn).toHaveBeenCalledOnce();
    act(() => onConnected());
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(
      'Google Calendar connected. Your busy times are now hidden from your booking page.',
    );
  });

  it('a mentor already connected sees Connected, never Connect', () => {
    calendar = {
      data: {
        connectedAt: 'x',
        status: 'active',
        lastSyncedAt: null,
        fault: null,
        accountEmail: 'g@x.com',
      },
      isLoading: false,
      error: null,
      retry: vi.fn(),
      retrying: false,
    };
    app = remote({ stage: 'approved', seen: false, ...person });
    render(<MentorApplicationScreen />);
    expect(
      screen.getByText('Connected as g@x.com. We hide times you’re already busy.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
  });

  it('a failure line is announced as it appears', () => {
    connectState = { kind: 'blocked' };
    app = remote({ stage: 'approved', seen: false, ...person });
    render(<MentorApplicationScreen />);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Your browser blocked the pop-up.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('calendarStateOf', () => {
  const conn = (over: object = {}) => ({
    connectedAt: 'x',
    status: 'active' as const,
    lastSyncedAt: null,
    fault: null,
    accountEmail: null,
    ...over,
  });
  const at = (data: unknown, isLoading: boolean, kind: string, unavailable = false) =>
    calendarStateOf({ data: data as never, isLoading }, { state: { kind } as never, unavailable });

  it('busy wins, then loading, then a connection over any old notice', () => {
    expect(at(conn(), false, 'busy')).toBe('busy');
    expect(at(null, true, 'idle')).toBe('loading');
    expect(at(conn(), false, 'blocked')).toBe('connected');
    expect(at(conn({ status: 'error', fault: 'revoked' }), false, 'idle')).toBe('revoked');
    expect(at(conn({ status: 'error', fault: 'unknown' }), false, 'idle')).toBe('broken');
  });

  it('with nothing connected: unavailable, the last attempt, or idle', () => {
    expect(at(null, false, 'idle', true)).toBe('unavailable');
    expect(at(null, false, 'nothingConnected')).toBe('nothingConnected');
    expect(at(null, false, 'idle')).toBe('idle');
  });
});
