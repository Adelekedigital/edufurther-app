import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY_PLANS } from '@/lib/utils/onboardingAnswers';
import type { PlanAnswers } from '@/types/onboarding';
import { StudyPlansForm } from './StudyPlansForm';

const countries = [
  { id: 'ca', label: 'Canada' },
  { id: 'gh', label: 'Ghana' },
  { id: 'ng', label: 'Nigeria' },
  { id: 'gb', label: 'United Kingdom' },
  { id: 'us', label: 'United States' },
];

function Harness({ onChange }: { onChange?: (a: PlanAnswers) => void }) {
  const [value, setValue] = useState(EMPTY_PLANS);
  return (
    <StudyPlansForm
      countries={countries}
      value={value}
      onChange={(a) => {
        setValue(a);
        onChange?.(a);
      }}
    />
  );
}

describe('StudyPlansForm', () => {
  it('labels and hints each question', () => {
    render(<Harness />);
    expect(
      screen.getByRole('combobox', { name: 'Where are you from?' }),
    ).toHaveAccessibleDescription('We look for mentors who made the same move.');
    expect(
      screen.getByRole('combobox', { name: 'What are you applying for?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'What do you want to study?' }),
    ).toHaveAccessibleDescription('Pick a suggestion or type your own.');
  });

  it('lists the design’s destinations first, then "Not sure yet", then the rest', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Where do you want to study?' }));
    const names = within(screen.getAllByRole('listbox').at(-1)!)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(names).toEqual([
      'United States',
      'United Kingdom',
      'Canada',
      'Not sure yet',
      'Ghana',
      'Nigeria',
    ]);
  });

  it('keeps MBA as the mentee chose it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'What are you applying for?' }),
      'MBA',
    );
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ degree: 'mba' }));
  });
});
