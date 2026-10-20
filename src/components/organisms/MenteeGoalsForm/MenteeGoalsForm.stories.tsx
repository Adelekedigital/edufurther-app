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

function Goals({
  initial,
  startOpen,
  errors = [],
  dirtyStart = false,
  saving = false,
  saveError = null,
}: {
  initial: MenteeGoalValues;
  startOpen: boolean;
  errors?: GoalsGap[];
  dirtyStart?: boolean;
  saving?: boolean;
  saveError?: string | null;
}) {
  const [open, setOpen] = useState(startOpen);
  const [values, setValues] = useState(initial);
  const [query, setQuery] = useState('');
  const dirty = dirtyStart || JSON.stringify(values) !== JSON.stringify(initial);
  const q = query.trim().toLowerCase();
  return (
    <MenteeGoalsForm
      open={open}
      summary={{
        title: 'Master’s in Public health',
        meta: 'United Kingdom, Canada · 2 schools · 2 help topics',
      }}
      onEdit={() => setOpen(true)}
      onCollapse={() => setOpen(false)}
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
      dirty={dirty}
      saving={saving}
      formError={errors.length > 0}
      saveError={saveError}
      onCancel={() => setValues(initial)}
      onSave={() => setOpen(false)}
    />
  );
}

/** A saved goal: the summary card first (owner, option a). */
export const Summary: Story = { render: () => <Goals initial={FILLED} startOpen={false} /> };

/** No goal yet: the fields are open, origin prefilled from where they live. */
export const OpenEmpty: Story = { render: () => <Goals initial={EMPTY} startOpen /> };

export const OpenFilled: Story = { render: () => <Goals initial={FILLED} startOpen /> };

/** Save with every gap: the form line and each field's error. */
export const Errors: Story = {
  render: () => (
    <Goals
      initial={{ ...EMPTY, originId: '' }}
      startOpen
      dirtyStart
      errors={['origin', 'degree', 'field', 'countries', 'help']}
    />
  ),
};

export const Saving: Story = {
  render: () => <Goals initial={FILLED} startOpen dirtyStart saving />,
};

export const SaveFailed: Story = {
  render: () => (
    <Goals
      initial={FILLED}
      startOpen
      dirtyStart
      saveError="We couldn’t save your goals. Your changes are still here. Try again."
    />
  ),
};

/** Three countries (the cap) and ten schools (the cap). */
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
      startOpen
    />
  ),
};
