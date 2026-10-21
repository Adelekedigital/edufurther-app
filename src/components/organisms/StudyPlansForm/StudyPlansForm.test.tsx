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

function Harness({
  onChange,
  fields,
}: {
  onChange?: (a: PlanAnswers) => void;
  fields?: string[] | null;
}) {
  const [value, setValue] = useState(EMPTY_PLANS);
  return (
    <StudyPlansForm
      countries={countries}
      fields={fields}
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
    ).toHaveAccessibleDescription('Choose from the list, or type it if it’s not there.');
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

  it('suggests the catalog’s fields once they load, and the short list until then', () => {
    const options = () =>
      [...document.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'));
    const { unmount } = render(<Harness fields={null} />);
    expect(options()).toContain('Computer Science');
    unmount();
    render(<Harness fields={['Law', 'Data Science']} />);
    expect(options()).toEqual(['Law', 'Data Science']);
  });

  it('the destination hint links "Settings" to Settings › Goals, in a new tab', () => {
    render(<Harness />);
    const link = screen.getByRole('link', { name: 'Settings (opens in a new tab)' });
    expect(link).toHaveAttribute('href', '/settings/goals');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.closest('p')).toHaveTextContent(
      'Pick one for now. You can add more later in Settings.',
    );
  });
});
