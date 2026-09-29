'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Remote } from '@/types/mentor';
import { deviceTimeZone } from '@/lib/utils/format';
import { emptyWeek, hhmm, type DayHours, type Slot } from '@/lib/utils/sessionTypeDraft';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

type AvailabilityRuleRead = components['schemas']['AvailabilityRuleRead'];

/** The mentor's Calendar hours: what "Use my Calendar availability" books into. */
export type WeeklyHours = {
  /** Sunday first (backend day_of_week 0 = Sunday), in `timeZone`. */
  days: DayHours[];
  /** The zone these hours are kept in (named wherever they're shown). */
  timeZone: string;
  /** The active rules in `timeZone`, so a save changes only what changed. */
  rules: AvailabilityRuleRead[];
  /** Active rules kept in another zone: not shown here, and never touched by a save. */
  otherZones: string[];
};

/**
 * "17:00:00" → 1020. An end at midnight is stored as 23:59:59 (the backend
 * refuses an end at or before the start, so 00:00 can't end a day) and reads
 * back as 1440, the end of the day.
 */
export function minutes(t: string, end: boolean): number {
  const [h = 0, m = 0] = t.split(':').map(Number);
  const v = h * 60 + m;
  if (end && (v === 0 || v === 1439)) return 1440;
  return v;
}

export function toWeeklyHours(rules: AvailabilityRuleRead[], fallbackZone: string): WeeklyHours {
  const active = rules.filter((r) => r.is_active);
  // The zone most of the hours are in (the device's when there are none).
  const counts = new Map<string, number>();
  for (const r of active) counts.set(r.timezone, (counts.get(r.timezone) ?? 0) + 1);
  const timeZone = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackZone;
  const mine = active.filter((r) => r.timezone === timeZone);
  const days = emptyWeek();
  const byDay: Slot[][] = Array.from({ length: 7 }, () => []);
  for (const r of mine)
    byDay[r.day_of_week]?.push([minutes(r.start_time, false), minutes(r.end_time, true)]);
  byDay.forEach((slots, i) => {
    if (slots.length) days[i] = { on: true, slots: slots.sort((a, b) => a[0] - b[0]) };
  });
  return {
    days,
    timeZone,
    rules: mine,
    otherZones: [...counts.keys()].filter((z) => z !== timeZone),
  };
}

type RuleKey = string;
const keyOf = (day: number, [a, b]: Slot): RuleKey => `${day}|${a}|${b}`;
const ruleKey = (r: AvailabilityRuleRead): RuleKey =>
  keyOf(r.day_of_week, [minutes(r.start_time, false), minutes(r.end_time, true)]);

/** What to delete and add to turn `rules` into `days`; unchanged hours are left alone. */
export function planHoursSave(rules: AvailabilityRuleRead[], days: DayHours[]) {
  const wanted = new Map<RuleKey, { day: number; slot: Slot }>();
  days.forEach((d, day) => {
    if (d.on) for (const slot of d.slots) wanted.set(keyOf(day, slot), { day, slot });
  });
  const remove = rules.filter((r) => !wanted.has(ruleKey(r)));
  for (const r of rules) wanted.delete(ruleKey(r));
  return { remove, add: [...wanted.values()] };
}

/** GET /users/{id}/availability/rules — the mentor's weekly hours. */
export function useWeeklyHours(userId: string | null): Remote<WeeklyHours> {
  const query = useQuery({
    queryKey: keys.weeklyHours(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/v1/users/{user_id}/availability/rules',
        {
          params: { path: { user_id: userId! } },
          signal,
        },
      );
      if (!data) throw apiError(response.status, error);
      return toWeeklyHours(data, deviceTimeZone());
    },
    staleTime: 60 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * Save the "Your weekly hours" modal: delete the hours that went, then add the
 * new ones (an overlap with one being removed would otherwise be refused).
 * Rules are separate requests, so a partial failure is possible: the hours are
 * re-read either way, and the error says to check them. A rule already gone
 * (404: removed by an earlier, partly failed save) counts as removed.
 */
export function useSaveWeeklyHours(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, { current: WeeklyHours; days: DayHours[] }>({
    mutationFn: async ({ current, days }) => {
      const { remove, add } = planHoursSave(current.rules, days);
      const path = { user_id: userId! };
      const removed = await Promise.all(
        remove.map((r) =>
          api
            .DELETE('/api/v1/users/{user_id}/availability/rules/{rule_id}', {
              params: { path: { ...path, rule_id: r.id } },
            })
            .then((x) => x.response.ok || x.response.status === 404)
            .catch(() => false),
        ),
      );
      const added = await Promise.all(
        add.map(({ day, slot: [a, b] }) =>
          api
            .POST('/api/v1/users/{user_id}/availability/rules', {
              params: { path },
              body: {
                day_of_week: day,
                start_time: hhmm(a),
                end_time: hhmm(b),
                timezone: current.timeZone,
                is_active: true,
              },
            })
            .then((x) => x.response.ok)
            .catch(() => false),
        ),
      );
      const results = [...removed, ...added];
      const failed = results.filter((x) => !x).length;
      if (failed) throw hoursError(failed === results.length);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.weeklyHours(userId ?? 'none') });
      // Slots, the profile's "Book {next open time}", cards' "Free {day}".
      void qc.invalidateQueries({ queryKey: ['booking'] });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
  });
  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** Our copy (PROVISIONAL — design request #7). */
export function hoursError(none: boolean): AppError {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return {
    kind: offline ? 'offline' : 'server',
    message: offline
      ? 'You’re offline. Your hours didn’t save. Try again when you reconnect.'
      : none
        ? 'Your hours didn’t save. Try again in a moment.'
        : 'Some of your hours didn’t save. Check them, then try again.',
  };
}
