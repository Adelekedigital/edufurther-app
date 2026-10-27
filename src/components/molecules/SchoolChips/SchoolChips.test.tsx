import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { optionLabels, pickOption } from '@/test-utils/select';
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
function Schools({
  initial = [] as GoalSchool[],
  max = 10,
  status = 'ready' as 'loading' | 'error' | 'ready',
}) {
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
      results={
        status === 'ready' && q.length >= 2
          ? CATALOGUE.filter((c) => c.name.toLowerCase().includes(q))
          : []
      }
      status={status}
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
    await pickOption(userEvent, field(), 'inst-1');
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue('');
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

  it('the Use row keeps the typed name too', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'Lagos Business School');
    await pickOption(userEvent, field(), 'Use “Lagos Business School”');
    expect(added).toEqual([school('Lagos Business School')]);
  });

  it('leaving the field keeps the typed name in it, not as a chip', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'Lagos');
    await userEvent.tab();
    expect(added).toEqual([]);
    expect(field()).toHaveValue('Lagos');
    await userEvent.type(field(), ' Uni');
    await userEvent.click(document.body);
    expect(added).toEqual([]);
  });

  it('Add with the list open adds the typed name once and keeps focus in the field', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'Lagos');
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(added).toEqual([school('Lagos')]);
    expect(field()).toHaveFocus();
  });

  it('says when the search failed, and still keeps a typed name', async () => {
    render(<Schools status="error" />);
    await userEvent.type(field(), 'toron');
    // In the list, and said in the field's own status region.
    expect(screen.getAllByText(COPY.searchFailed)).toHaveLength(2);
    await userEvent.keyboard('{Enter}');
    expect(added).toEqual([school('toron')]);
  });

  it('one letter searches nothing yet: only the Use row, and Enter keeps it', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'L');
    expect(await optionLabels(userEvent, field())).toEqual(['Use “L”']);
    await userEvent.keyboard('{Enter}');
    expect(added).toEqual([school('L')]);
  });

  it('Enter after Escape closed the list still keeps the typed name', async () => {
    render(<Schools />);
    await userEvent.type(field(), 'Lagos{Escape}');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Enter}');
    expect(added).toEqual([school('Lagos')]);
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
