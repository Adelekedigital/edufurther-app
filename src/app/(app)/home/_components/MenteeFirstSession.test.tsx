import { render, screen } from '@testing-library/react';
import { MenteeFirstSession } from './MenteeFirstSession';

describe('MenteeFirstSession', () => {
  it('shows the monthly free-session count and the Find a mentor CTA', () => {
    render(<MenteeFirstSession credits={4} />);
    expect(screen.getByText('4 free sessions this month')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Book your first session' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toBeInTheDocument();
  });

  it('singularises one session', () => {
    render(<MenteeFirstSession credits={1} />);
    expect(screen.getByText('1 free session this month')).toBeInTheDocument();
  });

  it('hides the credit line when there are none or it is unknown', () => {
    const { rerender } = render(<MenteeFirstSession credits={0} />);
    expect(screen.queryByText(/free session/)).not.toBeInTheDocument();
    rerender(<MenteeFirstSession credits={null} />);
    expect(screen.queryByText(/free session/)).not.toBeInTheDocument();
  });
});
