import { DayHoursRow } from '@/components/molecules/DayHoursRow/DayHoursRow';
import {
  DAY_NAMES,
  fitSlot,
  moveStart,
  newSlotLength,
  slotError,
  type DayHours,
  type Slot,
} from '@/lib/utils/sessionTypeDraft';

type WeeklyHoursEditorProps = {
  days: DayHours[];
  onChange: (days: DayHours[]) => void;
  /** compact: the weekly-hours modal (TimeSlots.dc.html `compact`). */
  variant?: 'list' | 'compact';
  /**
   * The shortest session these hours serve (TimeSlots.dc.html `minLen`): end
   * times start that long after the start, a moved start keeps the slot's
   * length, new slots are that long, and a shorter slot is an error. 0 = no
   * minimum.
   */
  minLength?: number;
};

const copy = (days: DayHours[]) =>
  days.map((d) => ({ ...d, slots: d.slots.map((s) => [...s] as Slot) }));

/**
 * A session type's own weekly hours (TimeSlots.dc.html `variant="list"`,
 * behaviour from its script): Add hours starts an hour after the day's last
 * slot; removing the last slot turns the day off; Copy to all days copies to
 * the days that are on.
 */
export function WeeklyHoursEditor({
  days,
  onChange,
  variant = 'list',
  minLength = 0,
}: WeeklyHoursEditorProps) {
  const len = newSlotLength(minLength);
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
          variant={variant}
          day={DAY_NAMES[i]!}
          hours={day}
          minLength={minLength}
          errors={day.slots.map((_, k) => slotError(day.slots, k, minLength))}
          onToggle={(on) =>
            update((d) => {
              d[i]!.on = on;
              // A day switched on gets slots long enough to book.
              if (on) d[i]!.slots = d[i]!.slots.map((s) => fitSlot(s, minLength));
            })
          }
          onSlot={(k, s) =>
            update((d) => {
              // A moved start moves the slot, keeping its length (design `setFrom`);
              // a picked end stays as picked.
              const old = d[i]!.slots[k]!;
              d[i]!.slots[k] = s[0] !== old[0] ? moveStart(old, s[0], minLength) : s;
            })
          }
          onRemove={(k) =>
            update((d) => {
              if (d[i]!.slots.length > 1) d[i]!.slots.splice(k, 1);
              else d[i]!.on = false;
            })
          }
          onAdd={() =>
            update((d) => {
              const end = Math.max(...d[i]!.slots.map((s) => s[1]));
              // An hour after the last slot, earlier only to fit before midnight,
              // never inside it: a slot too short to fit shows its error.
              const a = Math.max(end, Math.min(end + 60, 1440 - len));
              d[i]!.slots.push([a, Math.min(a + len, 1440)]);
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
