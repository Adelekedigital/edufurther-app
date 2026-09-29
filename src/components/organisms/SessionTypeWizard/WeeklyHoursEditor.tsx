import { DayHoursRow } from '@/components/molecules/DayHoursRow/DayHoursRow';
import { DAY_NAMES, slotError, type DayHours, type Slot } from '@/lib/utils/sessionTypeDraft';

type WeeklyHoursEditorProps = {
  days: DayHours[];
  onChange: (days: DayHours[]) => void;
};

const copy = (days: DayHours[]) =>
  days.map((d) => ({ ...d, slots: d.slots.map((s) => [...s] as Slot) }));

/**
 * A session type's own weekly hours (TimeSlots.dc.html `variant="list"`,
 * behaviour from its script): Add hours starts an hour after the day's last
 * slot; removing the last slot turns the day off; Copy to all days copies to
 * the days that are on.
 */
export function WeeklyHoursEditor({ days, onChange }: WeeklyHoursEditorProps) {
  const update = (fn: (d: DayHours[]) => void) => {
    const next = copy(days);
    fn(next);
    onChange(next);
  };
  return (
    <div>
      {days.map((day, i) => (
        <DayHoursRow
          key={DAY_NAMES[i]}
          day={DAY_NAMES[i]!}
          hours={day}
          errors={day.slots.map((_, k) => slotError(day.slots, k))}
          onToggle={(on) => update((d) => void (d[i]!.on = on))}
          onSlot={(k, s) => update((d) => void (d[i]!.slots[k] = s))}
          onRemove={(k) =>
            update((d) => {
              if (d[i]!.slots.length > 1) d[i]!.slots.splice(k, 1);
              else d[i]!.on = false;
            })
          }
          onAdd={() =>
            update((d) => {
              const end = Math.max(...d[i]!.slots.map((s) => s[1]));
              const a = Math.min(end + 60, 1380);
              d[i]!.slots.push([a, Math.min(a + 60, 1440)]);
            })
          }
          onCopyAll={() =>
            update((d) => {
              d.forEach((x, j) => {
                if (j !== i && x.on) x.slots = d[i]!.slots.map((s) => [...s] as Slot);
              });
            })
          }
        />
      ))}
    </div>
  );
}
