import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import { PreviewUserRow } from './PreviewUserRow';

const amara: PreviewUser = {
  id: 'u-1',
  email: 'amara.okafor@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee',
};

const renderRow = (props: Partial<Parameters<typeof PreviewUserRow>[0]> = {}) => {
  const onPick = vi.fn();
  render(
    <ul role="listbox" aria-label="Users">
      <PreviewUserRow
        id="r-0"
        user={amara}
        selected={false}
        active={false}
        onPick={onPick}
        {...props}
      />
    </ul>,
  );
  return { onPick, row: screen.getByRole('option') };
};

describe('PreviewUserRow', () => {
  it('an option: the email over "Name · Role", not selected', () => {
    const { row } = renderRow();
    expect(row).toHaveAttribute('id', 'r-0');
    expect(row).toHaveAttribute('aria-selected', 'false');
    expect(row).toHaveTextContent('amara.okafor@example.com');
    expect(row).toHaveTextContent('Amara Okafor · Mentee');
    // The check is a Material Symbols ligature: its name is its text.
    expect(row).not.toHaveTextContent('check');
  });

  it('the person being previewed: aria-selected and a check', () => {
    const { row } = renderRow({ selected: true, user: { ...amara, role: 'mentor' } });
    expect(row).toHaveAttribute('aria-selected', 'true');
    expect(row).toHaveTextContent('Amara Okafor · Mentor');
    expect(row).toHaveTextContent('check');
  });

  it('a click picks that user', async () => {
    const { row, onPick } = renderRow();
    await userEvent.click(row);
    expect(onPick).toHaveBeenCalledWith(amara);
  });

  it('pressing a row does not take focus from the search field', () => {
    render(<input aria-label="Search" />);
    const { row } = renderRow();
    const search = screen.getByRole('textbox', { name: 'Search' });
    search.focus();
    const down = fireEvent.mouseDown(row);
    expect(down).toBe(false); // default prevented
    expect(search).toHaveFocus();
  });
});
