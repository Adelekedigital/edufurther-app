'use client';

import { useState } from 'react';
import type { WeeklyHours } from '@/lib/api/data/weeklyHours';
import { emptyWeek, hasSlotErrors, type DayHours } from '@/lib/utils/sessionTypeDraft';

type Draft = { days: DayHours[]; timeZone: string };

/** A week as it would be saved: the slots of the days that are on. */
const asSaved = (days: DayHours[]) => JSON.stringify(days.map((d) => (d.on ? d.slots : null)));

/** The two weeks would save the same rules. */
export const sameWeek = (a: DayHours[], b: DayHours[]) => asSaved(a) === asSaved(b);

/**
 * Calendar's weekly hours and zone as edited, over what's saved. Edits stay in
 * the draft until "Save changes"; a zone change counts only when there are
 * hours to move. `clash` is a slot overlapping hours kept in another zone (the
 * backend compares clock times on a weekday whatever the zone).
 */
export function useHoursDraft(saved: WeeklyHours | null, deviceZone: string) {
  const [draft, setDraft] = useState<Draft | null>(null);
  // After a save, the draft stays on screen until the hours are read back, so
  // the old ones never flash in between.
  const [savedFrom, setSavedFrom] = useState<WeeklyHours | null>(null);
  if (savedFrom && saved !== savedFrom) {
    setSavedFrom(null);
    setDraft(null);
  }
  const days = draft?.days ?? saved?.days ?? emptyWeek();
  const timeZone = draft?.timeZone ?? saved?.timeZone ?? deviceZone;
  const anyHours = days.some((d) => d.on);
  const dirty =
    !!draft &&
    !savedFrom &&
    !!saved &&
    (!sameWeek(draft.days, saved.days) || (draft.timeZone !== saved.timeZone && anyHours));
  const clash = (saved?.otherSlots ?? []).find((o) =>
    days[o.day]?.on ? days[o.day]!.slots.some(([a, b]) => a < o.slot[1] && o.slot[0] < b) : false,
  );
  return {
    days,
    timeZone,
    dirty,
    slotErrors: hasSlotErrors(days),
    clash: clash ?? null,
    setDays: (next: DayHours[]) => setDraft({ days: next, timeZone }),
    setTimeZone: (zone: string) => setDraft({ days, timeZone: zone }),
    discard: () => setDraft(null),
    /** The save went through: drop the draft once the saved hours are read back. */
    markSaved: () => setSavedFrom(saved),
  };
}
