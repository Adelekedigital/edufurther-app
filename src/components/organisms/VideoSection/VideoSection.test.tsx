import { render, screen } from '@testing-library/react';
import { VideoSection } from './VideoSection';

describe('VideoSection', () => {
  it('draws its own heading on a page', () => {
    render(<VideoSection provider="daily" onPick={vi.fn()} customUrl={null} />);
    expect(screen.getByRole('heading', { name: 'Video for sessions' })).toBeInTheDocument();
  });

  it('inside a modal, the modal’s title stands in for its heading', () => {
    render(<VideoSection provider="daily" onPick={vi.fn()} customUrl={null} heading={false} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('radiogroup', { name: 'Video provider' })).toBeInTheDocument();
  });
});
