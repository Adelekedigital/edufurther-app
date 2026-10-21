import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TimezonePicker } from './TimezonePicker';

const meta: Meta<typeof TimezonePicker> = {
  title: 'Molecules/TimezonePicker',
  component: TimezonePicker,
};
export default meta;
type Story = StoryObj;

/** The device zone is offered when it differs from the chosen one. */
export const Choosing: Story = {
  render: function Render() {
    const [zone, setZone] = useState('Africa/Lagos');
    return (
      <div style={{ maxWidth: 480 }}>
        <TimezonePicker value={zone} onChange={setZone} deviceZone="Europe/London" />
      </div>
    );
  },
};
