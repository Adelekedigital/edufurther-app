import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

function Dialog({ name, onClose, children }: { name: string; onClose: () => void; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return (
    <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
      <button type="button">{name} control</button>
      {children}
    </div>
  );
}

describe('stacked dialogs', () => {
  it('Escape closes only the innermost, so the one underneath keeps its place', async () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();
    render(
      <Dialog name="panel" onClose={closeOuter}>
        <Dialog name="viewer" onClose={closeInner} />
      </Dialog>,
    );
    await userEvent.keyboard('{Escape}');
    expect(closeInner).toHaveBeenCalledTimes(1);
    // The bug this guards: below 1100px the bookings panel is a dialog too, and
    // one Escape used to close the file viewer and the panel together.
    expect(closeOuter).not.toHaveBeenCalled();
  });

  it('once the inner one is gone, Escape reaches the outer one again', async () => {
    const closeOuter = vi.fn();
    function Stack() {
      const [inner, setInner] = useState(true);
      return (
        <Dialog name="panel" onClose={closeOuter}>
          {inner && <Dialog name="viewer" onClose={() => setInner(false)} />}
        </Dialog>
      );
    }
    render(<Stack />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'viewer' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(closeOuter).toHaveBeenCalledTimes(1);
  });

  it('the page stays scroll-locked while any dialog is open, and is given back once', async () => {
    document.body.style.overflow = 'scroll';
    function Stack() {
      const [inner, setInner] = useState(true);
      const [outer, setOuter] = useState(true);
      return outer ? (
        <Dialog name="panel" onClose={() => setOuter(false)}>
          {inner && <Dialog name="viewer" onClose={() => setInner(false)} />}
        </Dialog>
      ) : null;
    }
    render(<Stack />);
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    // The viewer closed; the panel is still open, so the page must stay locked.
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('Tab stays inside the innermost dialog', async () => {
    render(
      <Dialog name="panel" onClose={vi.fn()}>
        <Dialog name="viewer" onClose={vi.fn()} />
      </Dialog>,
    );
    const inner = screen.getByRole('button', { name: 'viewer control' });
    inner.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(inner);
  });
});
