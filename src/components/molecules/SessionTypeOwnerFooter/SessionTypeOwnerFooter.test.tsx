import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTypeOwnerFooter } from './SessionTypeOwnerFooter';

describe('SessionTypeOwnerFooter', () => {
  it('names each control by the type, and each does its one thing', async () => {
    const h = { onHide: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
    const user = userEvent.setup();
    render(<SessionTypeOwnerFooter name="SOP review" {...h} />);
    const sw = screen.getByRole('switch', { name: 'Visible to mentees: SOP review' });
    expect(sw).toBeChecked();
    await user.click(sw);
    expect(h.onHide).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Edit SOP review' }));
    expect(h.onEdit).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete SOP review' }));
    expect(h.onDelete).toHaveBeenCalled();
  });
});
