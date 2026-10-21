import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TopicFilter } from './TopicFilter';

const meta: Meta<typeof TopicFilter> = { title: 'Molecules/TopicFilter', component: TopicFilter };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection' },
  { slug: 'interview-preparation', label: 'Interview preparation' },
  { slug: 'document-preparation', label: 'Document preparation' },
  { slug: 'scholarships-financial-aid', label: 'Scholarships & financial aid' },
];

export const Picking: Story = {
  render: function Render() {
    const [sel, setSel] = useState(['document-preparation']);
    return (
      <TopicFilter
        heading="What do you need help with?"
        topics={TOPICS}
        selected={sel}
        onToggle={(s) => setSel((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}
        showClear={sel.length > 0}
        onClear={() => setSel([])}
      />
    );
  },
};

export const Loading: Story = {
  render: () => (
    <TopicFilter
      heading="Loading"
      topics={[]}
      selected={[]}
      onToggle={fn()}
      showClear={false}
      onClear={fn()}
      isLoading
    />
  ),
};

/** Offline: the chips show but cannot be changed. */
export const Offline: Story = {
  render: () => (
    <TopicFilter
      heading="Offline"
      topics={TOPICS}
      selected={['document-preparation']}
      onToggle={fn()}
      showClear
      onClear={fn()}
      disabled
    />
  ),
};
