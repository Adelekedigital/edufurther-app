import { render, screen } from '@testing-library/react';
import { MentorProof } from './MentorProof';

describe('MentorProof', () => {
  it('shows the rating when there are reviews', () => {
    render(<MentorProof rating={4.9} reviewCount={11} completedSessions={23} />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText(/\(11 reviews\) · 23 sessions/)).toBeInTheDocument();
  });
  it('never shows an empty star rating for a new mentor', () => {
    render(<MentorProof rating={null} reviewCount={0} completedSessions={0} />);
    expect(screen.getByText('New to EduFurther')).toBeInTheDocument();
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });
  it('an established mentor without reviews is not "new" (backend reply #6)', () => {
    render(<MentorProof rating={null} reviewCount={0} completedSessions={12} />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(screen.queryByText('New to EduFurther')).not.toBeInTheDocument();
  });
});
