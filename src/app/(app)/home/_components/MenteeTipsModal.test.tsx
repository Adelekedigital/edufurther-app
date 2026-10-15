import { render, screen } from '@testing-library/react';
import { MenteeTipsModal } from './MenteeTipsModal';

describe('MenteeTipsModal', () => {
  it('shows the four session tips, and the third no longer names Messages', () => {
    render(<MenteeTipsModal onClose={() => {}} />);
    expect(screen.getByText('Tips for great sessions')).toBeInTheDocument();
    for (const t of ['Take notes', 'Bring two questions', 'Share drafts early', 'Follow up']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    // Messages isn't built, so the "share drafts" tip must not reference it.
    expect(screen.queryByText(/Messages/)).not.toBeInTheDocument();
  });
});
