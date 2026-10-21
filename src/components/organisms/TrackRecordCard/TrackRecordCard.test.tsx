import { render, screen } from '@testing-library/react';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { TrackRecordCard } from './TrackRecordCard';

const withRating = (rating: number, reviewCount: number) => ({
  ...fullProfile,
  mentor: { ...fullProfile.mentor, rating, reviewCount },
});

describe('TrackRecordCard — Top-rated (P7: 4.8+ from 10+ reviews)', () => {
  it('4.8 from 10 reviews: the badge, above "Mentees keep coming back"', () => {
    render(<TrackRecordCard profile={withRating(4.8, 10)} />);
    const badge = screen.getByText('Top-rated');
    const title = screen.getByText('Mentees keep coming back');
    expect(badge.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('9 reviews: no badge', () => {
    render(<TrackRecordCard profile={withRating(4.9, 9)} />);
    expect(screen.queryByText('Top-rated')).toBeNull();
  });

  it('4.7 from many reviews: no badge', () => {
    render(<TrackRecordCard profile={withRating(4.7, 40)} />);
    expect(screen.queryByText('Top-rated')).toBeNull();
  });
});
