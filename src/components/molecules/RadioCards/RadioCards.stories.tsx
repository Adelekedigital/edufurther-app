import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RadioCards } from './RadioCards';

const meta: Meta<typeof RadioCards> = { title: 'Molecules/RadioCards', component: RadioCards };
export default meta;
type Story = StoryObj;

export const RadioCardGroup: Story = {
  render: function Render() {
    const [v, setV] = useState<'default' | 'custom'>('default');
    return (
      <div style={{ maxWidth: 840 }}>
        <RadioCards
          label="Hours for this session"
          value={v}
          onChange={setV}
          options={[
            {
              value: 'default',
              label: 'Use my Calendar availability',
              description:
                'Mentees book this session in the weekly hours you set in Calendar. Changes there apply here too.',
            },
            {
              value: 'custom',
              label: 'Set dedicated hours',
              description:
                'Offer this session only at its own times, e.g. evenings for visa prep. Your Calendar hours stay as they are.',
            },
          ]}
        />
      </div>
    );
  },
};
