import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockOutForm, saveBlockLabel } from './BlockOutForm';

describe('saveBlockLabel (Calendar v2)', () => {
  it('says what the save will do', () => {
    expect(saveBlockLabel(['a'], ['a'])).toBe('Select dates to block');
    expect(saveBlockLabel([], ['a'])).toBe('Block 1 date');
    expect(saveBlockLabel(['a'], ['a', 'b', 'c'])).toBe('Block 2 dates');
    expect(saveBlockLabel(['a', 'b'], ['a'])).toBe('Save blocked dates');
    expect(saveBlockLabel(['a'], ['b'])).toBe('Save blocked dates');
  });
});

const setup = (booked: { day: string; mentee: string | null }[], initial: string[] = []) => {
  const onSave = vi.fn();
  render(
    <BlockOutForm
      today="2026-10-01"
      initial={initial}
      booked={booked}
      saving={false}
      error={null}
      onSave={onSave}
    />,
  );
  return { onSave, user: userEvent.setup() };
};

describe('BlockOutForm', () => {
  it('picks days and saves the draft', async () => {
    const { onSave, user } = setup([]);
    await user.click(screen.getByRole('button', { name: /Monday, October 12/ }));
    await user.click(screen.getByRole('button', { name: /Tuesday, October 13/ }));
    await user.click(screen.getByRole('button', { name: 'Block 2 dates' }));
    expect(onSave).toHaveBeenCalledWith(['2026-10-12', '2026-10-13']);
  });

  it('names the mentee when a picked day has their session (design copy)', async () => {
    const { user } = setup([{ day: '2026-10-04', mentee: 'Taofeeq' }]);
    expect(screen.queryByText(/Blocking the day/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /October 4, session booked/ }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'You have a session with Taofeeq on Sun, Oct 4. Blocking the day won’t cancel it.',
    );
  });

  it('lists the days when sessions fall on several newly picked days', async () => {
    const { user } = setup([
      { day: '2026-10-04', mentee: 'Taofeeq' },
      { day: '2026-10-06', mentee: 'Ada' },
    ]);
    await user.click(screen.getByRole('button', { name: /October 4, session booked/ }));
    await user.click(screen.getByRole('button', { name: /October 6, session booked/ }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'You have sessions on Sun, Oct 4 and Tue, Oct 6. Blocking these days won’t cancel them.',
    );
  });

  it('a past day can be reached but not picked', async () => {
    const onSave = vi.fn();
    render(
      <BlockOutForm
        today="2026-10-15"
        initial={[]}
        booked={[]}
        saving={false}
        error={null}
        onSave={onSave}
      />,
    );
    const past = screen.getByRole('button', { name: /^Wednesday, October 14/ });
    expect(past).toHaveAttribute('aria-disabled', 'true');
    await userEvent.setup().click(past);
    expect(screen.getByRole('button', { name: 'Select dates to block' })).toBeDisabled();
  });

  it('a day blocked already isn’t a new clash (design `hitDays`)', () => {
    setup([{ day: '2026-10-04', mentee: 'Taofeeq' }], ['2026-10-04']);
    expect(screen.queryByText(/Blocking the day/)).toBeNull();
  });

  it('after a failed save the button retries, and picking a day tells the page', async () => {
    const onEdit = vi.fn();
    render(
      <BlockOutForm
        today="2026-10-01"
        initial={[]}
        booked={[]}
        saving={false}
        error="We couldn’t save your blocked dates. Try again."
        onEdit={onEdit}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t save your blocked dates.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /Monday, October 12/ }));
    expect(onEdit).toHaveBeenCalled();
  });
});
