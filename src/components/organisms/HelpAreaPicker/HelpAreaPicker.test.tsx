import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpAreaPicker } from './HelpAreaPicker';

// Catalog order, deliberately not the design's.
const options = [
  { id: 'o-int', slug: 'interview-preparation', label: 'Interview preparation' },
  { id: 'o-doc', slug: 'document-preparation', label: 'Document preparation' },
  { id: 'o-sch', slug: 'school-selection', label: 'School selection' },
  { id: 'o-prg', slug: 'program-selection', label: 'Program selection' },
  { id: 'o-tst', slug: 'test-preparation', label: 'Test preparation' },
  { id: 'o-fun', slug: 'scholarships-financial-aid', label: 'Scholarships' },
];

function Harness({ extra = [] as typeof options, initial = [] as string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <HelpAreaPicker
      options={[...options, ...extra]}
      value={value}
      onChange={setValue}
      limit={3}
      label="What would you like help with?"
    />
  );
}

const card = (name: RegExp) => screen.getByRole('button', { name });

describe('HelpAreaPicker', () => {
  it('shows the catalog offerings in the design’s order, with its copy', () => {
    render(<Harness />);
    const group = screen.getByRole('group', { name: 'What would you like help with?' });
    const titles = Array.from(group.querySelectorAll('button')).map(
      (b) => b.querySelector(':scope > span:nth-child(2)')?.textContent,
    );
    expect(titles).toEqual([
      'Find a program',
      'Test preparation',
      'Document preparation',
      'Find the right school',
      'Scholarship guidance',
      'Interview and visa preparation',
    ]);
    expect(card(/Find a program/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an offering it has no copy for by its catalog name, last', () => {
    render(
      <Harness extra={[{ id: 'o-new', slug: 'career-guidance', label: 'Career guidance' }]} />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toHaveAccessibleName('Career guidance');
  });

  it('caps the picks at 3 and re-enables the rest on unpicking', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(card(/Find a program/));
    await user.click(card(/Test preparation/));
    await user.click(card(/Document preparation/));
    expect(card(/Find a program/)).toHaveAttribute('aria-pressed', 'true');

    const school = card(/Find the right school/);
    expect(school).toHaveAttribute('aria-disabled', 'true');
    await user.click(school);
    expect(school).toHaveAttribute('aria-pressed', 'false');

    await user.click(card(/Test preparation/));
    expect(school).not.toHaveAttribute('aria-disabled');
    await user.click(school);
    expect(school).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not count saved ids the catalog no longer has towards the limit', () => {
    render(<Harness initial={['gone-1', 'gone-2', 'gone-3']} />);
    expect(card(/Find a program/)).not.toHaveAttribute('aria-disabled');
  });
});
