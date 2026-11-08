import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoticeDialog } from './NoticeDialog';

describe('NoticeDialog', () => {
  const setup = () => {
    const onClose = vi.fn();
    render(
      <NoticeDialog title="Read only" icon="visibility" okLabel="Got it" onClose={onClose}>
        You’re previewing as <strong>Amara Okafor</strong>, so nothing was saved.
      </NoticeDialog>,
    );
    return { onClose };
  };

  it('an alertdialog named by its title and described by its message', () => {
    setup();
    const dialog = screen.getByRole('alertdialog', { name: 'Read only' });
    expect(dialog).toHaveAccessibleDescription(
      'You’re previewing as Amara Okafor, so nothing was saved.',
    );
  });

  it('a single "Got it" closes it', async () => {
    const { onClose } = setup();
    const ok = screen.getByRole('button', { name: 'Got it' });
    await userEvent.click(ok);
    expect(onClose).toHaveBeenCalled();
    // The only action besides the close ×, if the shell draws one.
    const others = screen
      .getAllByRole('button')
      .filter((b) => b !== ok && !/close/i.test(b.getAttribute('aria-label') ?? ''));
    expect(others).toHaveLength(0);
  });

  it('Escape closes it too', async () => {
    const { onClose } = setup();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
