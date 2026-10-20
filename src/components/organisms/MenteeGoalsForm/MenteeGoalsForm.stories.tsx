import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { GoalsGap } from '@/lib/copy/settings';
import type { MenteeGoalValues } from '@/types/settings';
import { MenteeGoalsForm } from './MenteeGoalsForm';

const meta: Meta = { title: 'Organisms/MenteeGoalsForm', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Netherlands',
  'Ireland',
  'Australia',
  'France',
  'Nigeria',
  'Ghana',
  'Kenya',
  'Sweden',
].map((label) => ({ id: label.toLowerCase().replace(/\s/g, '-'), label }));

const TOPICS = [
  ['program-selection', 'Program selection'],
  ['test-preparation', 'Test preparation'],
  ['document-preparation', 'Document preparation'],
  ['school-selection', 'School selection'],
  ['scholarships-financial-aid', 'Scholarships and financial aid'],
  ['interview-preparation', 'Interview preparation'],
].map(([slug, label]) => ({ id: slug!, slug: slug!, label: label! }));

const SCHOOLS = [
  { id: 'inst-1', name: 'University of Toronto' },
  { id: 'inst-2', name: 'University College London' },
  { id: 'inst-3', name: 'London School of Hygiene & Tropical Medicine' },
];

const EMPTY: MenteeGoalValues = {
  originId: 'nigeria',
  degree: '',
  field: '',
  countryIds: [],
  schools: [],
  needIds: [],
};
const FILLED: MenteeGoalValues = {
  originId: 'nigeria',
  degree: 'masters',
  field: 'Public health',
  countryIds: ['united-kingdom', 'canada'],
  schools: [
    { institutionId: 'inst-1', raw: 'University of Toronto', label: 'University of Toronto' },
    {
      institutionId: 'inst-3',
      raw: 'London School of Hygiene & Tropical Medicine',
      label: 'London School of Hygiene & Tropical Medicine',
    },
  ],
  needIds: ['document-preparation', 'school-selection'],
};

function Goals({ initial, errors = [] }: { initial: MenteeGoalValues; errors?: GoalsGap[] }) {
  const [values, setValues] = useState(initial);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  return (
    <MenteeGoalsForm
      values={values}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      errors={errors}
      countries={COUNTRIES}
      topics={TOPICS}
      schools={{
        query,
        onQueryChange: setQuery,
        results: q.length >= 2 ? SCHOOLS.filter((s) => s.name.toLowerCase().includes(q)) : [],
        status: 'ready',
      }}
    />
  );
}

/** A saved goal: the two cards, always open (the save bar is the page's). */
export const Filled: Story = { render: () => <Goals initial={FILLED} /> };

/** No goal yet, origin prefilled from where they live. "Not sure yet" is on: no countries. */
export const Empty: Story = { render: () => <Goals initial={EMPTY} /> };

/** Save with every gap: each field's error (the form line is in the save bar). */
export const Errors: Story = {
  render: () => (
    <Goals initial={{ ...EMPTY, originId: '' }} errors={['origin', 'degree', 'field', 'help']} />
  ),
};

/** Three countries (the cap; "Not sure yet" stays usable) and ten schools (the cap). */
export const Full: Story = {
  render: () => (
    <Goals
      initial={{
        ...FILLED,
        countryIds: ['united-kingdom', 'canada', 'germany'],
        schools: Array.from({ length: 10 }, (_, i) => ({
          institutionId: null,
          raw: `A school with quite a long typed name, number ${i + 1}`,
          label: `A school with quite a long typed name, number ${i + 1}`,
        })),
      }}
    />
  ),
};
