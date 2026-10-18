import { render, screen, within } from '@testing-library/react';
import { SentState } from './SentState';

const mentor = { firstName: 'Chidi', initials: 'CN', tone: 1 as const, photoUrl: null };
const base = {
  mentor,
  sessionName: 'Build your university shortlist',
  picked: 'Mon, Oct 19 · 9:00 am',
  month: 'Oct',
  day: '19',
};

describe('SentState', () => {
  it('a request: waiting for the mentor, and what happens next', () => {
    render(<SentState {...base} confirmed={false} />);
    expect(screen.getByRole('heading', { name: 'Request sent to Chidi' })).toBeInTheDocument();
    expect(
      screen.getByText('We’re holding this time for you while Chidi reviews your request.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Waiting for Chidi')).toBeInTheDocument();
    expect(screen.getByText('Build your university shortlist')).toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'What happens next' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining('Request sent'),
      expect.stringContaining('Chidi accepts or declines'),
      expect.stringContaining('Join your session'),
    ]);
    // Messages isn't built, and emails never carry the call link: neither is promised.
    expect(screen.queryByText(/confirmation email/)).toBeNull();
    expect(screen.queryByText(/message them/i)).toBeNull();
  });

  it('an instant booking: confirmed, with its own next steps', () => {
    render(<SentState {...base} confirmed />);
    expect(screen.getByRole('heading', { name: 'You’re booked with Chidi' })).toBeInTheDocument();
    expect(
      screen.getByText('Mon, Oct 19 · 9:00 am is confirmed. You’ll find it in Bookings.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Prepare for your session')).toBeInTheDocument();
    expect(screen.queryByText(/accepts or declines/)).toBeNull();
  });

  it('never mentions answers when the offering asked no questions', () => {
    const { unmount } = render(<SentState {...base} confirmed={false} answered={false} />);
    expect(screen.getByText('Chidi has your request.')).toBeInTheDocument();
    expect(screen.queryByText(/answers/)).toBeNull();
    unmount();
    render(<SentState {...base} confirmed answered={false} />);
    expect(screen.getByText('Chidi has it in their Bookings too.')).toBeInTheDocument();
    expect(screen.queryByText(/answers/)).toBeNull();
  });
});
