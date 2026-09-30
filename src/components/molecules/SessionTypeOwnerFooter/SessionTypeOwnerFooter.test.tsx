import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTypeOwnerFooter } from './SessionTypeOwnerFooter';

const handlers = () => ({ onToggle: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() });

describe('SessionTypeOwnerFooter', () => {
  it('names each control by the type, and each does its one thing', async () => {
    const h = handlers();
    const user = userEvent.setup();
    render(<SessionTypeOwnerFooter name="SOP review" visible {...h} pending={null} />);
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP review' }));
    expect(h.onToggle).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('button', { name: 'Edit SOP review' }));
    expect(h.onEdit).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete SOP review' }));
    expect(h.onDelete).toHaveBeenCalled();
  });

  it('scheduled for deletion: the note and "Keep it" replace the controls', async () => {
    const onKeep = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionTypeOwnerFooter
        name="SOP review"
        visible={false}
        {...handlers()}
        pending={{ note: 'Hidden from mentees. Deleted within the hour.', onKeep, keeping: false }}
      />,
    );
    expect(screen.getByText('Hidden from mentees. Deleted within the hour.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Keep it: SOP review' }));
    expect(onKeep).toHaveBeenCalled();
  });
});
