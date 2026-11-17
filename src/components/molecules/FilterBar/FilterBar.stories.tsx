import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/atoms/Button/Button';
import { SearchField } from '../SearchField/SearchField';
import { FilterBar } from './FilterBar';

const meta: Meta<typeof FilterBar> = { title: 'Molecules/FilterBar', component: FilterBar };
export default meta;
type Story = StoryObj;

const TO = [
  { value: 'all', label: 'Everyone' },
  { value: 'mentor', label: 'Mentors' },
  { value: 'mentee', label: 'Mentees' },
];

/** `fixed` (Admin.dc.html Mentors): 200px filters, the count on the right. */
export const Fixed: Story = {
  render: function Render() {
    const [to, setTo] = useState('all');
    return (
      <FilterBar
        label="Filter mentors"
        fields={[
          {
            key: 'to',
            label: 'Goes to',
            options: TO,
            value: to,
            changed: to !== 'all',
            onChange: setTo,
          },
        ]}
        count="4 mentors"
        clearLabel="Clear filters"
        active={to !== 'all'}
        onClear={() => setTo('all')}
      />
    );
  },
};

/** With the list's actions after the count (Mentors: Export CSV). */
export const WithActions: Story = {
  render: () => (
    <FilterBar
      label="Filter mentors"
      fields={[
        {
          key: 'to',
          label: 'Goes to',
          options: TO,
          value: 'all',
          changed: false,
          onChange: () => {},
        },
      ]}
      count="4 mentors"
      clearLabel="Clear filters"
      active={false}
      onClear={() => {}}
      actions={
        <Button variant="secondary-outlined" size="small" icon="download">
          Export CSV
        </Button>
      }
    />
  ),
};

/** `fill` with a search lead (Admin Emails.dc.html); a changed filter wears the blue look. */
export const WithSearch: Story = {
  render: function Render() {
    const [q, setQ] = useState('');
    const [to, setTo] = useState('mentor');
    return (
      <FilterBar
        layout="fill"
        label="Search and filter emails"
        lead={
          <SearchField
            labelled="filter"
            compact
            radius="sm"
            label="Search"
            placeholder="Email name or what triggers it"
            value={q}
            onChange={setQ}
            onClear={() => setQ('')}
          />
        }
        fields={[
          {
            key: 'to',
            label: 'Goes to',
            options: TO,
            value: to,
            changed: to !== 'all',
            onChange: setTo,
          },
        ]}
        count="Showing 12 of 28"
        liveCount
        clearLabel="Clear filters"
        active={!!q || to !== 'all'}
        onClear={() => {
          setQ('');
          setTo('all');
        }}
      />
    );
  },
};
