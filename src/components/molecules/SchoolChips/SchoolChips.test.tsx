import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { GoalSchool } from '@/types/settings';
import { SchoolChips } from './SchoolChips';

const CATALOGUE = [
  { id: 'inst-1', name: 'University of Toronto' },
  { id: 'inst-2', name: 'University College London' },
];
const COPY = {
  add: 'Add a school',
  addButton: 'Add',
  remove: (n: string) => `Remove ${n}`,
  searching: 'Searching…',
  searchFailed: 'We couldn’t search schools.',
  full: 'You’ve added 10 schools, the most you can add.',
};
const school = (label: string, institutionId: string | null = null): GoalSchool => ({
  institutionId,
  raw: label,
  label,
});

let added: GoalSchool[] = [];
function Schools({ initial = [] as GoalSchool[], max = 10 }) {
  const [schools, setSchools] = useState(initial);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  return (
    <SchoolChips
      schools={schools}
      onAdd={(s) => {
        added.push(s);
        setSchools((l) => [...l, s]);
      }}
      onRemove={(i) => setSchools((l) => l.filter((_, j) => j !== i))}
      query={query}
      onQueryChange={setQuery}
      results={q.length >= 2 ? CATALOGUE.filter((c) => c.name.toLowerCase().includes(q)) : []}
      status="ready"
      max={max}
      maxChars={120}
      copy={COPY}
    />
  );
}

const field = () => screen.getByRole('combobox', { name: COPY.add });

beforeEach(() => {
  added = [];
});

describe('SchoolChips', () => {
  it('a picked match is linked to the catalogue', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'toron');
    await userEvent.click(screen.getByRole('option', { name: 'University of Toronto' }));
    expect(added).toEqual([
      { institutionId: 'inst-1', raw: 'University of Toronto', label: 'University of Toronto' },
    ]);
    expect(
      screen.getByRole('button', { name: 'Remove University of Toronto' }),
    ).toBeInTheDocument();
  });

  it('a name nothing matches is kept as typed, unlinked', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'Lagos Business School{Enter}');
    expect(added).toEqual([school('Lagos Business School')]);
  });

  it('the same school twice is not added', async () => {
    render(<Schools initial={[school('Lagos Business School')]} />);
    await userEvent.type(field(), 'lagos business school{Enter}');
    expect(added).toEqual([]);
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
  });

  it('at the limit the field goes read-only, keeps focus and says why', async () => {
    render(<Schools initial={[school('One')]} max={2} />);
    await userEvent.type(field(), 'Two{Enter}');
    expect(field()).toHaveAttribute('aria-disabled', 'true');
    expect(field()).toHaveFocus();
    expect(screen.getByText(COPY.full)).toBeInTheDocument();
  });

  it('removing a chip moves focus to the next one, or the field after the last', async () => {
    render(<Schools initial={[school('One'), school('Two')]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove One' }));
    expect(screen.getByRole('button', { name: 'Remove Two' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Two' }));
    expect(field()).toHaveFocus();
  });
});
