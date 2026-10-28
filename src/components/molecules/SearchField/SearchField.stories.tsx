import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SearchField } from './SearchField';

const meta: Meta<typeof SearchField> = { title: 'Molecules/SearchField', component: SearchField };
export default meta;
type Story = StoryObj;

export const Searching: Story = {
  render: function Render() {
    const [q, setQ] = useState('');
    return (
      <div style={{ maxWidth: 720 }}>
        <SearchField
          label="Search mentors"
          placeholder="Search mentors by name, school or program"
          value={q}
          onChange={setQ}
          onClear={() => setQ('')}
        />
      </div>
    );
  },
};

/** `labelled`: the label above the field, no glyph (Admin.dc.html "Find a mentee"). */
export const Labelled: Story = {
  render: function Render() {
    const [q, setQ] = useState('');
    return (
      <div style={{ maxWidth: 420 }}>
        <SearchField
          labelled
          label="Find a mentee"
          placeholder="Email, name or user ID"
          value={q}
          onChange={setQ}
          onClear={() => setQ('')}
        />
      </div>
    );
  },
};

/** `compact` + `radius="md"`: Messages' list search, 40px on desktop (44px on phones). */
export const Compact: Story = {
  render: function Render() {
    const [q, setQ] = useState('');
    return (
      <div style={{ maxWidth: 308 }}>
        <SearchField
          compact
          radius="md"
          label="Search messages"
          placeholder="Search by name or school"
          value={q}
          onChange={setQ}
          onClear={() => setQ('')}
        />
      </div>
    );
  },
};
