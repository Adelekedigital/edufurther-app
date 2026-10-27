import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Select } from '@/components/atoms/Select/Select';
import { ModalShell } from './ModalShell';

// The shared Select inside a dialog (PRD fix 9): the list stays in the
// dialog, a pick keeps focus on the field, and Escape closes only the list.

const lengths = [
  { value: '30', label: '30 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
];

function Plain() {
  const [v, setV] = useState('60');
  return (
    <>
      <label htmlFor="len">Session length</label>
      <Select id="len" options={lengths} value={v} onChange={(e) => setV(e.target.value)} />
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'Session length' });
const listbox = () => screen.getByRole('listbox');

describe('Select in a dialog', () => {
  it('Escape closes the list, not the dialog; the next Escape closes the dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalShell title="Edit" onClose={onClose}>
        <Plain />
      </ModalShell>,
    );
    await user.click(field());
    expect(listbox()).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toContainElement(listbox());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(field()).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('a pick inside the dialog keeps focus on the field', async () => {
    const user = userEvent.setup();
    render(
      <ModalShell title="Edit" onClose={vi.fn()}>
        <Plain />
      </ModalShell>,
    );
    await user.click(field());
    await user.click(screen.getByRole('option', { name: '90 min' }));
    expect(field()).toHaveValue('90');
    expect(field()).toHaveFocus();
  });
});
