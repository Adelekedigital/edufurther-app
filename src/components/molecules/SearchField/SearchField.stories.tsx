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
