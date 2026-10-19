import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  MentorApplicationStatus,
  calendarRow,
  type CalendarConnectState,
} from './MentorApplicationStatus';

const declined = {
  state: 'declined' as const,
  firstName: 'Gbenga',
  email: 'gbenga@example.com',
  note: 'Add the PhD to LinkedIn.',
  reviewDate: 'Oct 14, 2026',
  mailto: 'mailto:support@edufurther.org?subject=x&body=y',
  menteeHref: '/onboarding/mentee',
  menteePending: false,
  menteeFailed: false,
};

describe('MentorApplicationStatus', () => {
  it('in review: the three steps and Edit, heading focused', () => {
    render(
      <MentorApplicationStatus
        state="pending"
        email="gbenga@example.com"
        editHref="/onboarding/mentor"
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1, name: 'Your application is in review' });
    expect(h1).toHaveFocus();
    expect(
      screen.getByText('We’ll email you at gbenga@example.com when there’s an update.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Edit my application' })).toHaveAttribute(
      'href',
      '/onboarding/mentor',
    );
  });

  it('approved: the summary rows, Connect, one button, and confetti', () => {
    render(
      <MentorApplicationStatus
        state="approved"
        firstName="Gbenga"
        summary={[
          {
            icon: 'schedule',
            title: 'Weekly hours drafted',
            body: 'Mon–Fri',
            link: { label: 'Check hours', href: '/calendar' },
          },
          {
            icon: 'travel_explore',
            title: 'You’re listed on Explore',
            body: 'Mentees can find and book you straight away.',
          },
        ]}
        calendar={{ state: 'idle', onConnect: () => {} }}
        dashboardHref="/dashboard"
        celebrate
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'You’re in, Gbenga. Let’s get you booked.',
    );
    expect(screen.getByRole('link', { name: 'Check hours' })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.getByTestId('confetti')).toHaveAttribute('aria-hidden');
  });

  it('not approved: the note with its date, Contact us mailto, and the mentee line', async () => {
    const onContinueAsMentee = vi.fn();
    render(<MentorApplicationStatus {...declined} onContinueAsMentee={onContinueAsMentee} />);
    expect(screen.getByText('Add the PhD to LinkedIn.').closest('blockquote')).not.toBeNull();
    expect(screen.getByText('Oct 14, 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      declined.mailto,
    );
    expect(screen.getByText('We also sent this to gbenga@example.com.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Continue as a mentee' }));
    expect(onContinueAsMentee).toHaveBeenCalledOnce();
  });

  it('not approved: says when the switch failed; no note card without a note', () => {
    render(
      <MentorApplicationStatus
        {...declined}
        note={null}
        menteeFailed
        onContinueAsMentee={() => {}}
      />,
    );
    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('That didn’t go through.');
  });

  it('error: a retry; loading: announced, nothing else', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<MentorApplicationStatus state="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<MentorApplicationStatus state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your application…');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('calendarRow: the Google Calendar row connects in place', () => {
  const row = (state: CalendarConnectState, email?: string | null) =>
    calendarRow({ state, email, onConnect: () => {} });

  it('offers nothing until the connection is read, then Connect', () => {
    expect(row('loading').action).toEqual({ kind: 'none' });
    expect(row('idle')).toMatchObject({
      title: 'Connect Google Calendar',
      optional: '(optional)',
      action: { kind: 'button', label: 'Connect' },
    });
  });

  it('says Connecting… while the popup is open, still a button in the tab order', () => {
    expect(row('busy').action).toMatchObject({
      kind: 'button',
      busy: true,
      busyLabel: 'Connecting…',
    });
  });

  it('once connected: a new title, the account when known, and a status instead of a button', () => {
    expect(row('connected', 'g@x.com')).toEqual({
      title: 'Google Calendar connected',
      body: 'Connected as g@x.com. We hide times you’re already busy.',
      action: { kind: 'status', label: 'Connected' },
    });
    expect(row('connected', null).body).toBe(
      'We hide times you’re already busy. Event details stay private.',
    );
    expect(row('connected').optional).toBeUndefined();
  });

  it('a broken grant asks to reconnect, in the warn tone', () => {
    expect(row('revoked')).toMatchObject({
      body: 'Google Calendar needs reconnecting. Access was removed or has expired.',
      tone: 'warn',
      action: { label: 'Reconnect' },
    });
    expect(row('broken').body).toBe('Google Calendar needs reconnecting.');
  });

  it.each([
    ['blocked', 'Your browser blocked the pop-up.'],
    ['nothingConnected', 'Nothing was connected.'],
    ['offline', 'You’re offline.'],
    ['failed', 'We couldn’t start connecting.'],
  ] as const)('%s says what happened and offers Try again', (state, start) => {
    const r = row(state);
    expect(r.body.startsWith(start)).toBe(true);
    expect(r).toMatchObject({ tone: 'warn', action: { kind: 'button', label: 'Try again' } });
  });

  it('not set up here: explains, offers no control', () => {
    expect(row('unavailable')).toMatchObject({
      body: 'Connecting a calendar isn’t available yet.',
      action: { kind: 'none' },
    });
  });

  it('a failed read offers to check again, never Connect', () => {
    const onRetryCheck = vi.fn();
    const r = calendarRow({ state: 'checkFailed', onConnect: () => {}, onRetryCheck });
    expect(r).toMatchObject({
      body: 'We couldn’t check whether your calendar is connected.',
      tone: 'warn',
      action: { kind: 'button', label: 'Try again', onClick: onRetryCheck },
    });
    // While that read runs again: busy, like Integrations' Try again.
    expect(
      calendarRow({ state: 'checkFailed', onConnect: () => {}, onRetryCheck, retrying: true })
        .action,
    ).toMatchObject({ busy: true, busyLabel: 'Checking…' });
  });
});

describe('MentorApplicationStatus: the calendar action', () => {
  const approved = (state: CalendarConnectState, onConnect = vi.fn()) => (
    <MentorApplicationStatus
      state="approved"
      firstName="Gbenga"
      summary={[]}
      calendar={{ state, email: 'g@x.com', onConnect }}
      dashboardHref="/dashboard"
      celebrate={false}
    />
  );

  it('Connect calls onConnect; busy does not call it twice', async () => {
    const onConnect = vi.fn();
    const { rerender } = render(approved('idle', onConnect));
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(onConnect).toHaveBeenCalledOnce();
    rerender(approved('busy', onConnect));
    const busy = screen.getByRole('button', { name: 'Connecting…' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(busy);
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it('keeps focus on the row when Connect gives way to Connected', async () => {
    const { rerender } = render(approved('idle'));
    screen.getByRole('button', { name: 'Connect' }).focus();
    rerender(approved('busy'));
    rerender(approved('connected'));
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveTextContent('Google Calendar connected');
  });

  it('connected shows a status, not a button', () => {
    render(approved('connected'));
    expect(screen.getByText('Google Calendar connected')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect/i })).toBeNull();
  });
});
