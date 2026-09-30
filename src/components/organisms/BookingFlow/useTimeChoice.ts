import { useEffect, useMemo, useState } from 'react';
import { formatDay } from '@/lib/utils/format';
import {
  DEFAULT_HORIZON_DAYS,
  dayKey,
  groupSlotsByDay,
  visibleDays,
  weekIndexOf,
  weekOfDays,
  weeksIn,
} from '@/lib/utils/slots';
import type { Remote, SessionType } from '@/types/mentor';

type Args = {
  types: SessionType[];
  session: SessionType | null;
  slots: Remote<string[]>;
  deviceZone: string;
  initialTime?: string | null;
  requestDone: boolean;
  onSessionTypeChange: (id: string) => void;
};

/**
 * The time step's state: the zone, the week page and day, the chosen time, and
 * the search for the time the flow was opened on.
 */
export function useTimeChoice(a: Args) {
  const { types, session } = a;
  const [weekState, setWeek] = useState(0);
  // The day the viewer picked (YYYY-MM-DD in their zone), or null → the week's first open day.
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [picked_, setTime] = useState<string | null>(null);
  const [zone, setZone] = useState(a.deviceZone);

  // As far ahead as this type can be booked (its window), a week at a time.
  const horizon = session?.windowDays ?? DEFAULT_HORIZON_DAYS;
  const weeks = weeksIn(horizon);
  // A window that shrank (types refetched) never leaves the page past its end.
  if (weekState > weeks - 1) setWeek(weeks - 1);
  // This render uses the clamped page too: the queued update only lands next.
  const week = Math.min(weekState, weeks - 1);
  // Grouped in the zone the viewer picked, so changing it regroups the days.
  // "Today" moves on at midnight even if nothing else re-renders the modal.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const today = dayKey(new Date(clock).toISOString(), zone);
  // Only the window's days on screen: the fetch has a margin either side (slotWindow).
  const days = useMemo(
    () => visibleDays(groupSlotsByDay(a.slots.data ?? [], zone), zone, new Date(clock), horizon),
    // `today` stands in for the clock: the result only changes when the date does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a.slots.data, zone, today, horizon],
  );
  // Seven days at a time, always starting today (product, 2026-09-27); ‹ › move
  // through the type's booking window. Empty days stay on show, disabled.
  const weekDays = useMemo(
    () => weekOfDays(days, week, zone, new Date(clock), horizon),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, week, zone, today, horizon],
  );
  const chosen = weekDays.findIndex((d) => d.date === dayChoice && d.slots.length > 0);
  const firstOpen = weekDays.findIndex((d) => d.slots.length > 0);
  const dayAt = chosen >= 0 ? chosen : firstOpen >= 0 ? firstOpen : null;
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
      const w = hit ? weekIndexOf(hit.startsAt, zone, new Date(clock)) : -1;
      const errored = seek.errored.filter((x) => x !== id);
      if (hit && w >= 0 && w < weeks) {
        setSeek({ done: true, tried: seek.tried, errored });
        setWeek(w);
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

  // An empty week's way on (design reply #40): the next week with any time,
  // "Show Oct 11 – Oct 17". Only worked out when the week on screen is empty.
  const weekEmpty = firstOpen < 0 && days.length > 0;
  const nextOpen = useMemo(() => {
    if (!weekEmpty) return null;
    for (let w = week + 1; w < weeks; w++) {
      const ds = weekOfDays(days, w, zone, new Date(clock), horizon);
      if (ds.some((d) => d.slots.length > 0))
        return {
          week: w,
          label: `Show ${formatDay(ds[0]!.date).date} – ${formatDay(ds.at(-1)!.date).date}`,
        };
    }
    return null;
    // `today` stands in for the clock, as for weekDays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEmpty, days, week, zone, today, weeks, horizon]);
  // Nothing later but something earlier: say so, not "Check back soon" (review of #26).
  const earlierOpen = weekEmpty && !nextOpen && week > 0;

  const weekLabel = (() => {
    const from = formatDay(weekDays[0]!.date).date;
    const to = formatDay(weekDays.at(-1)!.date).date;
    // A window under a week has fewer days on its only page: say how many.
    return week === 0 ? `Next ${weekDays.length} days · ${from} – ${to}` : `${from} – ${to}`;
  })();
  const moveWeek = (to: number) => {
    setWeek(to);
    setDayChoice(null);
    // Like changing the day: a time from another week must not stay chosen.
    setTime(null);
  };
  // A chosen time only counts while the grid still offers it: slots reload after
  // a conflict, and a time someone else took must not stay selected.
  const time =
    picked_ && (a.requestDone || days.some((d) => d.slots.some((x) => x.startsAt === picked_)))
      ? picked_
      : null;

  return {
    zone,
    setZone,
    days,
    weekDays,
    dayAt,
    time,
    setTime,
    seeking,
    initialMissed,
    chooseDay: (i: number) => {
      setDayChoice(weekDays[i]!.date);
      setTime(null);
    },
    week: {
      label: weekLabel,
      canPrev: week > 0,
      canNext: week < weeks - 1,
      onPrev: () => moveWeek(week - 1),
      onNext: () => moveWeek(week + 1),
      nextOpen: nextOpen ? { label: nextOpen.label, onClick: () => moveWeek(nextOpen.week) } : null,
      emptyHint: nextOpen
        ? 'Try later dates.'
        : earlierOpen
          ? 'Try earlier dates.'
          : 'Check back soon.',
    },
    /** The viewer chose another type: stop looking for the requested time, start over on it. */
    reset: () => {
      setSeek((s) => ({ ...s, done: true }));
      setWeek(0);
      setDayChoice(null);
      setTime(null);
    },
  };
}
