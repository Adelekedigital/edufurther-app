import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MentorApplicationStatus } from './MentorApplicationStatus';

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
        integrationsHref="/integrations"
        dashboardHref="/dashboard"
        celebrate
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'You’re in, Gbenga. Let’s get you booked.',
    );
    expect(screen.getByRole('link', { name: 'Check hours' })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/integrations');
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
