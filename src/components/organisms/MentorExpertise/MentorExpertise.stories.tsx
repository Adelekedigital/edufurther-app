import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { AwardList } from './AwardList';
import { GuideCountriesCard } from './GuideCountriesCard';
import { TopicsCard } from './TopicsCard';

/** Mentor Settings.dc.html, the Expertise tab (`isExpertise`, expertiseEdit=modal). */
const meta: Meta = { title: 'Settings/Mentor expertise', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection' },
  { slug: 'scholarships', label: 'Scholarships and financial aid' },
  { slug: 'documents', label: 'Document preparation' },
  { slug: 'interviews', label: 'Interview preparation' },
];
const COMMON = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Netherlands',
  'Ireland',
  'Australia',
  'France',
].map((label) => ({ id: label, label }));
const AWARDS = [
  {
    id: 'a1',
    title: 'Chevening Scholarship',
    meta: 'UK Government · 2019',
    funding: 'full' as const,
  },
  {
    id: 'a2',
    title: 'Graduate assistantship',
    meta: 'Mississippi State University · 2021',
    funding: 'partial' as const,
  },
  { id: 'a3', title: 'Dean’s list', meta: '2018', funding: null },
];

function Guide({ initial }: { initial: string[] }) {
  const [sel, setSel] = useState(COMMON.filter((c) => initial.includes(c.label)));
  return (
    <GuideCountriesCard
      common={COMMON}
      selected={sel}
      onToggle={(c) =>
        setSel((s) => (s.some((x) => x.id === c.id) ? s.filter((x) => x.id !== c.id) : [...s, c]))
      }
      query=""
      onQueryChange={fn()}
      results={[]}
      status="ready"
      full={sel.length >= 8}
    />
  );
}

function Tab({ topics = TOPICS, awards = AWARDS }) {
  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TopicsCard topics={topics} onEdit={fn()} />
      <Guide initial={['United States', 'United Kingdom']} />
      <AwardList
        status="ready"
        rows={awards}
        onAdd={fn()}
        onEdit={fn()}
        onDelete={fn()}
        onRetry={fn()}
      />
    </div>
  );
}

export const Filled: Story = { render: () => <Tab /> };

export const Empty: Story = { render: () => <Tab topics={[]} awards={[]} /> };

export const CountriesFull: Story = {
  render: () => <Guide initial={COMMON.map((c) => c.label)} />,
};

export const AwardsLoading: Story = {
  render: () => (
    <AwardList
      status="loading"
      rows={[]}
      onAdd={fn()}
      onEdit={fn()}
      onDelete={fn()}
      onRetry={fn()}
    />
  ),
};

export const AwardsLoadFailed: Story = {
  render: () => (
    <AwardList status="error" rows={[]} onAdd={fn()} onEdit={fn()} onDelete={fn()} onRetry={fn()} />
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => <Tab />,
};
