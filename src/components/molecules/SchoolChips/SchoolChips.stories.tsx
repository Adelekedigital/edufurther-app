import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { GoalSchool } from '@/types/settings';
import { SchoolChips } from './SchoolChips';

const meta: Meta = { title: 'Molecules/SchoolChips' };
export default meta;
type Story = StoryObj;

const CATALOGUE = [
  { id: 'inst-1', name: 'University of Toronto' },
  { id: 'inst-2', name: 'University College London' },
  { id: 'inst-3', name: 'University of Oxford' },
];
const COPY = {
  add: 'Add a school',
  addButton: 'Add',
  remove: (n: string) => `Remove ${n}`,
  searching: 'Searching…',
  searchFailed: 'We couldn’t search schools. You can still add the name as you typed it.',
  full: 'You’ve added 10 schools, the most you can add.',
};
const school = (label: string, institutionId: string | null = null): GoalSchool => ({
  institutionId,
  raw: label,
  label,
});

function Schools({
  initial,
  status = 'ready',
}: {
  initial: GoalSchool[];
  status?: 'loading' | 'error' | 'ready';
}) {
  const [schools, setSchools] = useState(initial);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  return (
    <div style={{ maxWidth: 560 }}>
      <SchoolChips
        schools={schools}
        onAdd={(s) => setSchools((l) => [...l, s])}
        onRemove={(i) => setSchools((l) => l.filter((_, j) => j !== i))}
        query={query}
        onQueryChange={setQuery}
        results={
          status === 'ready' && q.length >= 2
            ? CATALOGUE.filter((c) => c.name.toLowerCase().includes(q))
            : []
        }
        status={status}
        max={10}
        maxChars={120}
        copy={COPY}
      />
    </div>
  );
}

export const Empty: Story = { render: () => <Schools initial={[]} /> };
export const Some: Story = {
  render: () => (
    <Schools
      initial={[school('University of Toronto', 'inst-1'), school('Lagos Business School')]}
    />
  ),
};
/** Search failing: type two letters; the typed name can still be added. */
export const SearchFailed: Story = { render: () => <Schools initial={[]} status="error" /> };
/** Ten schools with long typed names: the field goes read-only and says why. */
export const Full: Story = {
  render: () => (
    <Schools
      initial={Array.from({ length: 10 }, (_, i) =>
        school(`A school with quite a long typed name, number ${i + 1}`),
      )}
    />
  ),
};
