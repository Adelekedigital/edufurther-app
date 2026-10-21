import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChoiceChips } from './ChoiceChips';

const meta: Meta<typeof ChoiceChips> = { title: 'Molecules/ChoiceChips', component: ChoiceChips };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection' },
  { slug: 'interview-preparation', label: 'Interview preparation' },
  { slug: 'document-preparation', label: 'Document preparation' },
  { slug: 'scholarships-financial-aid', label: 'Scholarships & financial aid' },
];

export const Choices: Story = {
  render: function Render() {
    const [sel, setSel] = useState(['document-preparation', 'school-selection']);
    return (
      <ChoiceChips
        label="Topics"
        max={3}
        selected={sel}
        onToggle={(v) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))}
        options={TOPICS.map((t) => ({ value: t.slug, label: t.label }))}
      />
    );
  },
};
