import { render, screen } from '@testing-library/react';
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
});
