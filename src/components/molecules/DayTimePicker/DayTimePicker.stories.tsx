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

/** A week with two empty days (disabled, no dot). */
export const PickingATime: Story = {
  render: function Render() {
    const [day, setDay] = useState(0);
    const [time, setTime] = useState<string | null>(null);
    const [week, setWeek] = useState(0);
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const date = addDays('2026-09-27', i);
      return {
        date,
        slots:
          i === 1 || i === 4
            ? []
            : [9, 13, 16].slice(0, 3 - (i % 3)).map((h) => ({ startsAt: `${date}T${h}:00:00Z` })),
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
          week={{
            label: week === 0 ? 'Next 7 days · Sep 27 – Oct 3' : 'Oct 4 – Oct 10',
            canPrev: week > 0,
            canNext: week < 3,
            onPrev: () => setWeek(week - 1),
            onNext: () => setWeek(week + 1),
          }}
        />
      </div>
    );
  },
};
