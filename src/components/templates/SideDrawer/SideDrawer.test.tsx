import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SideDrawer } from './SideDrawer';

function Host({ footer = false }: { footer?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open Amara
      </button>
      <SideDrawer
        open={open}
        title="Credits for Amara Okafor"
        onClose={() => setOpen(false)}
        header={<h2>Amara Okafor</h2>}
        footer={footer ? <button type="button">Approve</button> : undefined}
      >
        <button type="button">Add 1 credit</button>
      </SideDrawer>
    </>
  );
}

describe('SideDrawer', () => {
  it('renders nothing while closed', () => {
    render(<Host />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a modal dialog named by its title, focus moved inside', async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Amara' }));
    const dialog = screen.getByRole('dialog', { name: 'Credits for Amara Okafor' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('heading', { name: 'Amara Okafor' })).toBeInTheDocument();
  });

  it.each([
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    ['Close', async () => userEvent.click(screen.getByRole('button', { name: 'Close' }))],
    [
      'the backdrop',
      async () => {
        const backdrop = screen.getByRole('dialog').previousElementSibling as HTMLElement;
        await userEvent.click(backdrop);
      },
    ],
  ])('%s closes it and focus goes back to the opener', async (_name, close) => {
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Open Amara' });
    await userEvent.click(opener);
    await close();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside, footer included', async () => {
    render(<Host footer />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Amara' }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 5; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('locks the page scroll while open and gives it back', async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Amara' }));
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});
