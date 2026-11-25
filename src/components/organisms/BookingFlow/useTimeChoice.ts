import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_HORIZON_DAYS, dayKey, groupSlotsByDay, visibleDays } from '@/lib/utils/slots';
import { useMinuteClock } from '@/lib/utils/useMinuteClock';
import type { Remote, SessionType } from '@/types/mentor';

type Args = {
  types: SessionType[];
  session: SessionType | null;
  slots: Remote<string[]>;
  /** The zone the times open in (saved, else the device's). */
  initialZone: string;
  initialTime?: string | null;
  requestDone: boolean;
  onSessionTypeChange: (id: string) => void;
};

/**
 * The time step's state: the zone, the day, the chosen time, and the search
 * for the time the flow was opened on.
 */
export function useTimeChoice(a: Args) {
  const { types, session } = a;
  // The day the viewer picked (YYYY-MM-DD in their zone), or null → the first open day.
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [picked_, setTime] = useState<string | null>(null);
  const [zone, setZone] = useState(a.initialZone);

  // As far ahead as this type can be booked (its window).
  const horizon = session?.windowDays ?? DEFAULT_HORIZON_DAYS;
  // Grouped in the zone the viewer picked, so changing it regroups the days.
  // "Today" moves on at midnight even if nothing else re-renders the modal.
  const clock = useMinuteClock();
  const today = dayKey(clock.toISOString(), zone);
  // Only the window's days on screen: the fetch has a margin either side (slotWindow).
  const days = useMemo(
    () => visibleDays(groupSlotsByDay(a.slots.data ?? [], zone), zone, clock, horizon),
    // `today` stands in for the clock: the result only changes when the date does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a.slots.data, zone, today, horizon],
  );
  // Only the days with times, soonest first, across the whole window (owner
  // 2026-11-21, replacing 7-day pages with empty days greyed out).
  const openDays = useMemo(() => days.filter((d) => d.slots.length > 0), [days]);
  const chosen = openDays.findIndex((d) => d.date === dayChoice);
  const dayAt = chosen >= 0 ? chosen : 0;
  // Open on the requested time (the profile's "Book {time}"). That time is the
  // mentor's earliest across all offerings and can be minutes stale, so each
  // offering is tried in turn; if none still has it, the flow says so and
  // falls back to the first. State is adjusted during render (React's "state
  // from props" pattern); switching offering is the page's, so it's an effect.
  const [seek, setSeek] = useState<{ done: boolean; tried: string[]; errored: string[] }>(() => ({
    done: !a.initialTime,
    tried: [],
    errored: [],
  }));
  if (!seek.done && a.initialTime && session) {
    const id = session.id;
    const retried = seek.errored.includes(id);
    if (a.slots.data && (!seek.tried.includes(id) || retried)) {
      // Loaded (or loaded after a failed attempt): look for the time here.
      const at = Date.parse(a.initialTime);
      const hit = days.flatMap((d) => d.slots).find((s) => Date.parse(s.startsAt) === at);
      const errored = seek.errored.filter((x) => x !== id);
      if (hit) {
        setSeek({ done: true, tried: seek.tried, errored });
        setDayChoice(dayKey(hit.startsAt, zone));
        setTime(hit.startsAt);
      } else setSeek({ done: false, tried: [...new Set([...seek.tried, id])], errored });
    } else if (a.slots.error && !seek.tried.includes(id)) {
      // A failed load is not "the time is gone": remembered, and re-checked
      // if a retry succeeds.
      setSeek({ done: false, tried: [...seek.tried, id], errored: [...seek.errored, id] });
    }
  }
  const seekNext = seek.done ? undefined : types.find((t) => !seek.tried.includes(t.id));
  const allTried = !seek.done && types.length > 0 && !seekNext;
  const firstTypeId = types[0]?.id;
  // Still looking, or about to fall back to the first offering: hold the
  // skeleton so another offering's grid never flashes.
  const seeking =
    !seek.done && !!session && (!allTried || (!!firstTypeId && session.id !== firstTypeId));
  // Every offering loaded and none had it: the only case the note may claim.
  const initialMissed = allTried && seek.errored.length === 0;
  const onTypeChange = a.onSessionTypeChange;
  useEffect(() => {
    if (!session) return;
    if (seekNext && seek.tried.includes(session.id)) onTypeChange(seekNext.id);
    else if (allTried && firstTypeId && session.id !== firstTypeId) onTypeChange(firstTypeId);
  }, [seekNext, allTried, firstTypeId, session, seek.tried, onTypeChange]);

  // A chosen time only counts while the grid still offers it: slots reload after
  // a conflict, and a time someone else took must not stay selected.
  const time =
    picked_ && (a.requestDone || days.some((d) => d.slots.some((x) => x.startsAt === picked_)))
      ? picked_
      : null;

  return {
    zone,
    setZone,
    days: openDays,
    dayAt,
    time,
    setTime,
    seeking,
    initialMissed,
    chooseDay: (i: number) => {
      setDayChoice(openDays[i]!.date);
      setTime(null);
    },
    /** The viewer chose another type: stop looking for the requested time, start over on it. */
    reset: () => {
      setSeek((s) => ({ ...s, done: true }));
      setDayChoice(null);
      setTime(null);
    },
  };
}
