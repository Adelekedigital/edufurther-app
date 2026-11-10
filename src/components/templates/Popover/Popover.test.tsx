import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const phone = vi.hoisted(() => ({ on: false }));
vi.mock('@/lib/utils/useMediaQuery', () => ({ useMediaQuery: () => phone.on }));

const { Popover } = await import('./Popover');

function Harness() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={trigger} type="button" onClick={() => setOpen((o) => !o)}>
        Open
      </button>
      {open && (
        <Popover title="Alerts" id="p" triggerRef={trigger} onClose={() => setOpen(false)}>
          <button type="button">Inside</button>
        </Popover>
      )}
    </div>
  );
}

beforeEach(() => {
  phone.on = false;
});

describe('Popover', () => {
  it('desktop: a non-modal dialog named by its heading, focused on open', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Alerts' });
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(dialog).toHaveAttribute('id', 'p');
    expect(dialog).toHaveFocus();
  });

  it('desktop: Escape closes and returns focus to the trigger', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('phones: the shared bottom sheet, modal, with a close button', async () => {
    phone.on = true;
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const sheet = screen.getByRole('dialog', { name: 'Alerts' });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    // The trigger's aria-controls points at the sheet on phones too.
    expect(sheet).toHaveAttribute('id', 'p');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
