import { useState } from 'react';
import { addDays } from '@/lib/utils/slots';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DayTimePicker } from './DayTimePicker';

const meta: Meta<typeof DayTimePicker> = {
  title: 'Molecules/DayTimePicker',
  component: DayTimePicker,
};
export default meta;
type Story = StoryObj;

/** The open days only, each with how many times it has; ‹ › scroll the row. */
export const PickingATime: Story = {
  render: function Render() {
    const [day, setDay] = useState(0);
    const [time, setTime] = useState<string | null>(null);
    const days = [0, 3, 4, 5, 7, 10, 11, 14].map((n, i) => {
      const date = addDays('2026-11-25', n);
      return {
        date,
        slots: [9, 13, 16].slice(0, 3 - (i % 3)).map((h) => ({ startsAt: `${date}T${h}:00:00Z` })),
      };
    });
    return (
      <div style={{ maxWidth: 480 }}>
        <DayTimePicker
          days={days}
          dayIndex={day}
          onDayChange={setDay}
          time={time}
          onTimeChange={setTime}
          timeZone="Africa/Lagos"
        />
      </div>
    );
  },
};
