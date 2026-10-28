import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RadioChips } from './RadioChips';

const meta: Meta = { title: 'Molecules/RadioChips' };
export default meta;
type Story = StoryObj;

const DEGREES = [
  { value: 'bachelors', label: 'Bachelor’s' },
  { value: 'masters', label: 'Master’s' },
  { value: 'mba', label: 'MBA' },
  { value: 'doctorate', label: 'PhD' },
];

function Choice({ initial = '', invalid = false }: { initial?: string; invalid?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <RadioChips
      label="Applying for"
      options={DEGREES}
      value={value}
      onChange={setValue}
      invalid={invalid}
    />
  );
}

/** Nothing chosen: Tab lands on the first chip. */
export const NoneChosen: Story = { render: () => <Choice /> };
export const Chosen: Story = { render: () => <Choice initial="mba" /> };
export const Invalid: Story = { render: () => <Choice invalid /> };
/** Messages' All / Unread filter: the dark pills, not a required choice. */
export const DarkFilter: Story = {
  render: function Render() {
    const [value, setValue] = useState('all');
    return (
      <RadioChips
        label="Filter"
        look="dark"
        required={false}
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread (3)' },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
/** 390px: the chips wrap. */
export const Narrow: Story = {
  render: () => (
    <div style={{ maxWidth: 240 }}>
      <Choice initial="masters" />
    </div>
  ),
};
