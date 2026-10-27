import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { useHighlightOnPress } from './useHighlightOnPress';

function Field({ onRow, active }: { onRow: (v: string | null) => void; active?: string }) {
  const field = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const highlighted = useHighlightOnPress(field, button);
  return (
    <>
      <input ref={field} aria-label="Field" aria-activedescendant={active} />
      <ul>
        <li id="row-0" data-value="a">
          A
        </li>
        <li id="row-1">Use typed</li>
      </ul>
      <button ref={button} type="button" onClick={(e) => onRow(highlighted(e))}>
        Add
      </button>
    </>
  );
}

describe('useHighlightOnPress', () => {
  it('a click reads the highlighted option', async () => {
    const onRow = vi.fn();
    render(<Field onRow={onRow} active="row-0" />);
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onRow).toHaveBeenCalledWith('a');
  });

  it('null for a row with no value, nothing highlighted, or a keyboard click', async () => {
    const onRow = vi.fn();
    const { rerender } = render(<Field onRow={onRow} active="row-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    rerender(<Field onRow={onRow} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    rerender(<Field onRow={onRow} active="row-0" />);
    screen.getByRole('button', { name: 'Add' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onRow.mock.calls).toEqual([[null], [null], [null]]);
  });
});
