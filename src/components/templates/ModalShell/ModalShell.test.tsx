import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalShell } from './ModalShell';

const sheet = {
  caption: 'Step 1 of 2',
  heading: 'Pick a date and time',
  leading: { icon: 'close' as const, label: 'Close', onClick: vi.fn() },
  showClose: false,
};

describe('ModalShell', () => {
  it('keeps focus inside when the layout switches between sheet and modal', () => {
    const { rerender } = render(
      <ModalShell title="Book" onClose={vi.fn()} sheet={sheet} footer={<button>Next</button>}>
        <p>Body</p>
      </ModalShell>,
    );
    const dialog = () => screen.getByRole('dialog');
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);

    // Viewport crosses 768px: the caller drops `sheet`, a new dialog element mounts.
    rerender(
      <ModalShell title="Book" onClose={vi.fn()}>
        <p>Body</p>
      </ModalShell>,
    );
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);

    rerender(
      <ModalShell title="Book" onClose={vi.fn()} sheet={sheet} footer={<button>Next</button>}>
        <p>Body</p>
      </ModalShell>,
    );
    expect(dialog()).toContainElement(document.activeElement as HTMLElement);
  });

  it('a toned icon sits above the title and stays out of the accessible name', () => {
    render(
      <ModalShell
        title="Session type published"
        icon="check_circle"
        tone="success"
        onClose={vi.fn()}
      >
        <p>Body</p>
      </ModalShell>,
    );
    expect(screen.getByRole('dialog', { name: 'Session type published' })).toBeInTheDocument();
    expect(document.querySelector('.icon-success')).toHaveTextContent('check_circle');
  });

  describe('contained', () => {
    it('makes the sheet a bottom sheet: content-sized, lighter scrim, a grab handle', () => {
      render(
        <ModalShell
          title="Cancel this booking?"
          onClose={vi.fn()}
          sheet={sheet}
          contained
          footer={<button>Yes, cancel session</button>}
        >
          <p>Body</p>
        </ModalShell>,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('sheet', 'contained');
      expect(dialog.parentElement).toHaveClass('sheetRoot', 'containedRoot');
      expect(document.querySelector('.overlay')).toHaveClass('overlaySheet');
      // The handle is decoration: the leading button dismisses it, not a drag.
      const grabber = document.querySelector('.grabber');
      expect(grabber).toBeInTheDocument();
      expect(grabber).toHaveAttribute('aria-hidden');
      // Named by the sheet's heading, not by anything the handle adds.
      expect(screen.getByRole('dialog', { name: 'Pick a date and time' })).toBe(dialog);
      // Still the pinned footer, so the action stays reachable while the body scrolls.
      expect(document.querySelector('.sheetFooter')).toContainElement(
        screen.getByRole('button', { name: 'Yes, cancel session' }),
      );
    });

    it('leaves the full-screen sheet exactly as it was', () => {
      render(
        <ModalShell title="Book" onClose={vi.fn()} sheet={sheet} footer={<button>Next</button>}>
          <p>Body</p>
        </ModalShell>,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('sheet');
      expect(dialog).not.toHaveClass('contained');
      expect(dialog.parentElement).not.toHaveClass('containedRoot');
      expect(document.querySelector('.overlay')).not.toHaveClass('overlaySheet');
      expect(document.querySelector('.grabber')).toBeNull();
    });

    it('does nothing without sheet — the centred modal is unchanged', () => {
      render(
        <ModalShell title="Cancel this booking?" onClose={vi.fn()} contained>
          <p>Body</p>
        </ModalShell>,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('dialog');
      expect(dialog).not.toHaveClass('contained');
      expect(dialog.parentElement).not.toHaveClass('containedRoot', 'sheetRoot');
      expect(document.querySelector('.overlay')).not.toHaveClass('overlaySheet');
      expect(document.querySelector('.grabber')).toBeNull();
    });

    it('a tap on the dimmed page does not discard a typed reason', async () => {
      const onClose = vi.fn();
      render(
        <ModalShell title="Cancel this booking?" onClose={onClose} sheet={sheet} contained>
          <textarea aria-label="What happened?" />
        </ModalShell>,
      );
      await userEvent.type(screen.getByLabelText('What happened?'), 'A clash');
      await userEvent.click(document.querySelector('.overlay') as HTMLElement);
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText('What happened?')).toHaveValue('A clash');
    });
  });
});

describe('ModalShell mobile="sheet" (Modal.dc.html `mobile`)', () => {
  it('keeps the centred header and icon, and marks the dialog for the phone sheet', () => {
    render(
      <ModalShell title="Locked" icon="lock" size="sm" mobile="sheet" onClose={vi.fn()}>
        <p>Body</p>
      </ModalShell>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Locked' });
    expect(dialog.className).toMatch(/phoneSheet/);
    expect(dialog.querySelector('[class*="withIcon"] > span')).toHaveTextContent('lock');
    expect(dialog.querySelector('[class*="phoneGrabber"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('the default stays full screen on phones: no sheet class, no grabber', () => {
    render(
      <ModalShell title="Plain" onClose={vi.fn()}>
        <p>Body</p>
      </ModalShell>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Plain' });
    expect(dialog.className).not.toMatch(/phoneSheet/);
    expect(dialog.querySelector('[class*="phoneGrabber"]')).toBeNull();
  });
});

describe('ModalShell title (Modal.dc.html)', () => {
  it('balances its lines, so no word sits alone on the second', () => {
    const css = readFileSync(join(__dirname, 'ModalShell.module.css'), 'utf8');
    const title = css.match(/(?:^|\n)\.title\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(title).toMatch(/text-wrap:\s*balance/);
  });
});

describe('ModalShell describedBy', () => {
  it('describes the dialog by an element in its body, after the subtitle', () => {
    const { rerender } = render(
      <ModalShell title="Delete?" alert describedBy="warn" onClose={vi.fn()}>
        <p id="warn">Everything goes.</p>
      </ModalShell>,
    );
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('Everything goes.');
    rerender(
      <ModalShell title="Delete?" subtitle="Read this." alert describedBy="warn" onClose={vi.fn()}>
        <p id="warn">Everything goes.</p>
      </ModalShell>,
    );
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      'Read this. Everything goes.',
    );
  });
});
