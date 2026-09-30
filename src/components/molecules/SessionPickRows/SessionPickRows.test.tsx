import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SessionPickRows, type PickRow } from './SessionPickRows';

const rows: PickRow[] = [
  { id: 'a', type: 'SOP review', date: 'Sep 19' },
  { id: 'b', type: 'Scholarship strategy', date: 'Sep 12' },
  { id: 'c', type: 'SOP review', date: 'Sep 5' },
  { id: 'd', type: 'Program shortlist', date: 'Aug 29' },
  { id: 'e', type: 'Visa interview prep', date: 'Aug 22' },
];

function Harness({ list = rows }: { list?: PickRow[] }) {
  const [v, setV] = useState<string | null>(list[0]!.id);
  return (
    <SessionPickRows label="Which session is this about?" rows={list} value={v} onChange={setV} />
  );
}

describe('SessionPickRows', () => {
  it('a labelled radio group; the picked row is checked and the only tab stop', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Which session is this about?' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });

  it('three show; "Show 2 more" reveals the rest and moves focus to the first of them', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Show 2 more' }));
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /more/ })).toBeNull();
    await new Promise((r) => requestAnimationFrame(r));
    expect(radios[3]).toHaveFocus();
  });

  it('arrows move and pick; Home and End jump', async () => {
    const user = userEvent.setup();
    render(<Harness list={rows.slice(0, 3)} />);
    const radios = screen.getAllByRole('radio');
    radios[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{End}');
    expect(radios[2]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowUp}');
    expect(radios[2]).toHaveFocus();
  });

  it('three or fewer: no "Show more"', () => {
    render(<Harness list={rows.slice(0, 3)} />);
    expect(screen.queryByRole('button', { name: /more/ })).toBeNull();
  });
});
