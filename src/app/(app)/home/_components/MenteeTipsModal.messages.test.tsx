import { render, screen } from '@testing-library/react';
import { MenteeTipsModal } from './MenteeTipsModal';

vi.mock('@/lib/config/messages', () => ({ MESSAGES_LIVE: true }));

describe('MenteeTipsModal with Messages on', () => {
  it('Share drafts early says to send them in a message (design messageBtn show)', () => {
    render(<MenteeTipsModal onClose={() => {}} />);
    expect(
      screen.getByText(
        'Send your CV or statement in a message before the session so your mentor can read it first.',
      ),
    ).toBeInTheDocument();
  });
});
