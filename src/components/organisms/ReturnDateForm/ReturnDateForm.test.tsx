import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReturnDateForm } from './ReturnDateForm';

const setup = (booked: { day: string; mentee: string | null }[] = []) => {
  const onSave = vi.fn();
  render(
    <ReturnDateForm
      today="2026-10-01"
      booked={booked}
      saving={false}
      error={null}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  );
  return { onSave, user: userEvent.setup() };
};

describe('ReturnDateForm', () => {
  it('a preset sets the return day and says when the reminder comes', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('radio', { name: '1 week' }));
    expect(screen.getByRole('radio', { name: '1 week' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('We’ll remind you on Thu, Oct 8 to switch back.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set as busy' }));
    expect(onSave).toHaveBeenCalledWith('2026-10-08');
  });

  it('Pick a date waits for a day, from tomorrow on', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Pick a date' }));
    expect(screen.getByRole('button', { name: 'Set as busy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Thursday, October 1(,|$)/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.click(screen.getByRole('button', { name: /^Saturday, October 10/ }));
    await user.click(screen.getByRole('button', { name: 'Set as busy' }));
    expect(onSave).toHaveBeenCalledWith('2026-10-10');
  });

  it('the chips are a radiogroup: arrow keys move and pick', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: '1 week' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '2 weeks' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '2 weeks' })).toHaveAttribute('aria-checked', 'true');
  });

  it('says a session inside the busy stretch stays booked, naming the mentee', async () => {
    const { user } = setup([
      { day: '2026-10-04', mentee: 'Taofeeq' },
      { day: '2026-11-20', mentee: 'Ada' },
    ]);
    await user.click(screen.getByRole('radio', { name: '1 week' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session with Taofeeq on Sun, Oct 4 stays booked. Busy only stops new bookings.',
    );
  });

  it('Not sure yet covers every booked session from today on', async () => {
    const { onSave, user } = setup([
      { day: '2026-10-04', mentee: 'Taofeeq' },
      { day: '2026-11-20', mentee: 'Ada' },
    ]);
    await user.click(screen.getByRole('radio', { name: 'Not sure yet' }));
    expect(
      screen.getByText('You’ll stay busy until you switch yourself back.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your sessions on Sun, Oct 4 and Fri, Nov 20 stay booked.',
    );
    await user.click(screen.getByRole('button', { name: 'Set as busy' }));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('a new choice tells the page (it clears a failed save’s message)', async () => {
    const onEdit = vi.fn();
    render(
      <ReturnDateForm
        today="2026-10-01"
        booked={[]}
        saving={false}
        error="Pick a return date after today."
        onCancel={vi.fn()}
        onEdit={onEdit}
        onSave={vi.fn()}
      />,
    );
    await userEvent.setup().click(screen.getByRole('radio', { name: '2 weeks' }));
    expect(onEdit).toHaveBeenCalled();
  });
});
