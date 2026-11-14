import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEGAL_LINKS } from '@/lib/config/auth';
import { CONSENT_COPY as C } from '@/lib/copy/consent';
import { ConsentBanner } from './ConsentBanner';

function setup(signedIn = false) {
  const props = { onAccept: vi.fn(), onDecline: vi.fn(), onClose: vi.fn() };
  const utils = render(
    <>
      <ConsentBanner {...props} signedIn={signedIn} />
      <button type="button">After</button>
    </>,
  );
  return { ...props, ...utils };
}

describe('ConsentBanner', () => {
  it('is a region named by its short question, not a dialog', () => {
    setup();
    expect(screen.getByRole('region', { name: C.short })).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('collapsed, it shows only the short question: under 12 words, the full text hidden', () => {
    setup();
    expect(C.short.split(/\s+/).length).toBeLessThanOrEqual(12);
    expect(screen.getByText(C.body)).not.toBeVisible();
  });

  it('"Learn more" opens the full text in place and closes it, with aria-expanded; focus stays on it', async () => {
    setup();
    const more = screen.getByRole('button', { name: C.more });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(more.getAttribute('aria-controls')!);
    expect(panel).toHaveTextContent(C.body);
    expect(panel).not.toBeVisible();

    await userEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(more).toHaveAccessibleName(C.less);
    expect(panel).toBeVisible();
    expect(more).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toBeVisible();
  });

  it('tells a member where to change it later; a guest, with no Settings, is not told', () => {
    const { rerender } = setup(true);
    expect(screen.getByText(`${C.body} ${C.change}`)).toBeInTheDocument();
    rerender(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('region')).not.toHaveTextContent(C.change);
  });

  it('links to the privacy policy in a new tab', () => {
    setup();
    const link = screen.getByRole('link', { name: `${C.privacy} (opens in a new tab)` });
    expect(link).toHaveAttribute('href', LEGAL_LINKS.privacy);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('the X is named for what it does and calls onClose only', async () => {
    const { onClose, onDecline, onAccept } = setup();
    await userEvent.click(screen.getByRole('button', { name: C.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('Escape answers nothing: it is not a dialog', async () => {
    const { onClose, onDecline, onAccept } = setup();
    screen.getByRole('button', { name: C.decline }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('reaches every control in reading order by keyboard, and never traps focus', async () => {
    const { onAccept, onDecline } = setup();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: C.close })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: C.more })).toHaveFocus();
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
