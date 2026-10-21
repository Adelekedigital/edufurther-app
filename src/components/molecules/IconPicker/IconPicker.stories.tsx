import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IconPicker } from './IconPicker';
import { useState } from 'react';

const meta: Meta<typeof IconPicker> = { title: 'Molecules/IconPicker', component: IconPicker };
export default meta;
type Story = StoryObj;

export const SessionIconPicker: Story = {
  render: function Render() {
    const [v, setV] = useState<'lightbulb' | null>(null);
    return (
      <div style={{ height: 320 }}>
        <IconPicker
          value={v}
          auto="edit_document"
          onChange={(x) => setV(x as 'lightbulb' | null)}
        />
      </div>
    );
  },
};
