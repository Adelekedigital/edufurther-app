import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DayHoursRow } from './DayHoursRow';

const meta: Meta<typeof DayHoursRow> = { title: 'Molecules/DayHoursRow', component: DayHoursRow };
export default meta;
type Story = StoryObj;

export const DayHours: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <DayHoursRow
        day="Monday"
        hours={{ on: false, slots: [[540, 600]] }}
        errors={[null]}
        onToggle={fn()}
        onSlot={fn()}
        onRemove={fn()}
        onAdd={fn()}
        onCopyAll={fn()}
      />
      <DayHoursRow
        day="Wednesday"
        hours={{ on: true, slots: [[1020, 1200]] }}
        errors={[null]}
        onToggle={fn()}
        onSlot={fn()}
        onRemove={fn()}
        onAdd={fn()}
        onCopyAll={fn()}
      />
      <DayHoursRow
        day="Thursday"
        hours={{
          on: true,
          slots: [
            [540, 780],
            [720, 840],
          ],
        }}
        errors={[
          'These hours overlap with another time on this day.',
          'These hours overlap with another time on this day.',
        ]}
        onToggle={fn()}
        onSlot={fn()}
        onRemove={fn()}
        onAdd={fn()}
        onCopyAll={fn()}
      />
    </div>
  ),
};

/** TimeSlots compact rows (the weekly-hours modal): off, one slot, two with an overlap. */

export const DayHoursCompact: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      {(
        [
          ['Sunday', { on: false, slots: [[540, 600]] }, [null]],
          ['Monday', { on: true, slots: [[1020, 1200]] }, [null]],
          [
            'Saturday',
            {
              on: true,
              slots: [
                [540, 780],
                [720, 840],
              ],
            },
            [
              'These hours overlap with another time on this day.',
              'These hours overlap with another time on this day.',
            ],
          ],
        ] as const
      ).map(([day, hours, errors]) => (
        <DayHoursRow
          key={day}
          variant="compact"
          day={day}
          hours={{ on: hours.on, slots: hours.slots.map((s) => [...s] as [number, number]) }}
          errors={[...errors]}
          onToggle={fn()}
          onSlot={fn()}
          onRemove={fn()}
          onAdd={fn()}
          onCopyAll={fn()}
        />
      ))}
    </div>
  ),
};

/** Row "⋯" menu (Session Types.dc.html): open it; Delete is red, after a divider. */
