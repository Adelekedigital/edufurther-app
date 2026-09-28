import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardSteps } from './WizardSteps';

const STEPS = ['Core details', 'Intake questions', 'Scheduling', 'Review'];

describe('WizardSteps', () => {
  it('marks the current step, and locks steps past the furthest reached', async () => {
    const onSelect = vi.fn();
    render(
      <WizardSteps
        label="Create a session type"
        steps={STEPS}
        current={2}
        reached={2}
        onSelect={onSelect}
      />,
    );
    const step = (name: RegExp) => screen.getByRole('button', { name });
    expect(screen.getByRole('navigation', { name: 'Create a session type' })).toBeInTheDocument();
    expect(step(/Intake questions/)).toHaveAttribute('aria-current', 'step');
    expect(step(/Core details/)).toHaveAccessibleName('Core details, done');
    expect(step(/Scheduling/)).toBeDisabled();
    expect(step(/Review/)).toBeDisabled();

    const user = userEvent.setup();
    await user.click(step(/Core details/));
    expect(onSelect).toHaveBeenCalledWith(1);
    await user.click(step(/Review/));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('back on an earlier step, later reached steps stay open and read as done', () => {
    render(<WizardSteps label="Edit" steps={STEPS} current={1} reached={4} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Review, done' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Core details/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('the step on screen is never disabled, even past what was reached', () => {
    render(<WizardSteps label="Create" steps={STEPS} current={3} reached={1} onSelect={vi.fn()} />);
    const current = screen.getByRole('button', { name: /Scheduling/ });
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(current).toBeEnabled();
    expect(screen.getByRole('button', { name: /Review/ })).toBeDisabled();
  });
});
