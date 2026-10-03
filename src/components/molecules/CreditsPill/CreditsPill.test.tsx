import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditsPill } from './CreditsPill';

const pill = (left: number, onClick = vi.fn()) => {
  render(
    <CreditsPill
      credits={{
        left,
        monthlyLeft: left,
        monthlyTotal: 3,
        bonus: [],
        monthlyLapses: true,
        resetsOn: 'Nov 1',
      }}
      expanded={false}
      controls="credits"
      onClick={onClick}
    />,
  );
  return screen.getByRole('button');
};

describe('CreditsPill', () => {
  it('reads in full and shows "3 credits"', () => {
    const b = pill(3);
    expect(b).toHaveAccessibleName('3 credits left, resets Nov 1');
    expect(b).toHaveTextContent(/3\s*credits/);
    expect(b).toHaveAttribute('aria-expanded', 'false');
  });

  it('"1 credit", singular', () => {
    expect(pill(1)).toHaveTextContent(/1\s*credit$/);
  });

  it('none: "No credits", no number', () => {
    const b = pill(0);
    expect(b).toHaveTextContent('No credits');
    expect(b).not.toHaveTextContent('0');
    expect(b).toHaveAccessibleName('No credits left, resets Nov 1');
  });

  it('opens "Your credits"', async () => {
    const onClick = vi.fn();
    await userEvent.click(pill(3, onClick));
    expect(onClick).toHaveBeenCalled();
  });
});
