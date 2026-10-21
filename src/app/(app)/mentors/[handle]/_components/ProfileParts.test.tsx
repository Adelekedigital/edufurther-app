import { render, screen } from '@testing-library/react';
import { NotTakingEmpty, NotTakingNote, ProfileSkeleton } from './ProfileParts';

describe('ProfileParts', () => {
  it('the aside note points to similar mentors below (Mentor Profile.dc.html `notTakingBody`)', () => {
    render(<NotTakingNote firstName="Aisha" />);
    expect(screen.getByRole('region', { name: 'Not taking bookings' })).toHaveTextContent(
      'Aisha isn’t taking bookings right now. Explore similar mentors below.',
    );
  });

  it('the Sessions tab says it without pointing anywhere', () => {
    render(<NotTakingEmpty firstName="Aisha" />);
    expect(screen.getByRole('heading', { name: 'Not taking bookings' })).toBeInTheDocument();
    expect(screen.getByText('Aisha isn’t taking bookings right now.')).toBeInTheDocument();
    expect(screen.queryByText(/Explore similar mentors/)).toBeNull();
  });

  it('the skeleton’s main and aside blocks take the cards’ xl radius', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile');
    expect(container.querySelector('.skBlock')).toHaveClass('xl');
    expect(container.querySelector('.skAside')).toHaveClass('xl');
  });
});
