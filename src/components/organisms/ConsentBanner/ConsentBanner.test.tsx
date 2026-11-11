import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEGAL_LINKS } from '@/lib/config/auth';
import { CONSENT_COPY as C } from '@/lib/copy/consent';
import { ConsentBanner } from './ConsentBanner';

describe('ConsentBanner', () => {
  it('is a region named by its title, not a dialog', () => {
    render(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} />);
    const region = screen.getByRole('region', { name: C.title });
    expect(region).toHaveTextContent(C.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('tells a member where to change it later; a guest, with no Settings, is not told', () => {
    const { rerender } = render(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} signedIn />);
    expect(screen.getByRole('region')).toHaveTextContent(`${C.body} ${C.change}`);
    rerender(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByRole('region')).not.toHaveTextContent(C.change);
  });

  it('links to the privacy policy in a new tab', () => {
    render(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} />);
    const link = screen.getByRole('link', { name: `${C.privacy} (opens in a new tab)` });
    expect(link).toHaveAttribute('href', LEGAL_LINKS.privacy);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('reaches Decline, then Accept, by keyboard, and never traps focus', async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <>
        <ConsentBanner onAccept={onAccept} onDecline={onDecline} />
        <button type="button">After</button>
      </>,
    );
    await userEvent.tab();
    expect(screen.getByRole('link')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: C.decline })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onDecline).toHaveBeenCalledTimes(1);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: C.accept })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onAccept).toHaveBeenCalledTimes(1);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });
});
