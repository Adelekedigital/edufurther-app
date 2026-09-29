'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Remote } from '@/types/mentor';
import { deviceTimeZone } from '@/lib/utils/format';
import { emptyWeek, type DayHours, type Slot } from '@/lib/utils/sessionTypeDraft';
import { apiError, normaliseError } from './errors';
import { api } from './http';

type AvailabilityRuleRead = components['schemas']['AvailabilityRuleRead'];

/** The mentor's Calendar hours: what "Use my Calendar availability" books into. */
export type WeeklyHours = {
  /** Sunday first (backend day_of_week 0 = Sunday). */
  days: DayHours[];
  /** The zone the hours are kept in: the rules' own, else this device's. */
  timeZone: string;
  /** The active rules as read, so a save changes only what changed. */
  rules: AvailabilityRuleRead[];
};

const weeklyKey = (userId: string | null) => ['weeklyHours', userId ?? 'none'] as const;

/** "17:00:00" → 1020; "00:00" as an end is midnight at the end of the day. */
function minutes(t: string, end: boolean): number {
  const [h = 0, m = 0] = t.split(':').map(Number);
  const v = h * 60 + m;
  return end && v === 0 ? 1440 : v;
}
const hhmm = (m: number) =>
  m >= 1440
    ? '00:00'
    : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function toWeeklyHours(rules: AvailabilityRuleRead[], fallbackZone: string): WeeklyHours {
  const active = rules.filter((r) => r.is_active);
  const days = emptyWeek();
  const byDay: Slot[][] = Array.from({ length: 7 }, () => []);
  for (const r of active)
    byDay[r.day_of_week]?.push([minutes(r.start_time, false), minutes(r.end_time, true)]);
  byDay.forEach((slots, i) => {
    if (slots.length) days[i] = { on: true, slots: slots.sort((a, b) => a[0] - b[0]) };
  });
  return { days, timeZone: active[0]?.timezone ?? fallbackZone, rules: active };
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
    queryKey: weeklyKey(userId),
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
 * re-read either way, and the error says to check them.
 */
export function useSaveWeeklyHours(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, { current: WeeklyHours; days: DayHours[] }>({
    mutationFn: async ({ current, days }) => {
      const { remove, add } = planHoursSave(current.rules, days);
      const ok = (p: Promise<{ response: Response }>) =>
        p.then((r) => r.response.ok).catch(() => false);
      const path = { user_id: userId! };
      const removed = await Promise.all(
        remove.map((r) =>
          ok(
            api.DELETE('/api/v1/users/{user_id}/availability/rules/{rule_id}', {
              params: { path: { ...path, rule_id: r.id } },
            }),
          ),
        ),
      );
      const added = await Promise.all(
        add.map(({ day, slot: [a, b] }) =>
          ok(
            api.POST('/api/v1/users/{user_id}/availability/rules', {
              params: { path },
              body: {
                day_of_week: day,
                start_time: hhmm(a),
                end_time: hhmm(b),
                timezone: current.timeZone,
                is_active: true,
              },
            }),
          ),
        ),
      );
      if ([...removed, ...added].some((x) => !x)) throw hoursError(add.length + remove.length);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: weeklyKey(userId) });
      void qc.invalidateQueries({ queryKey: ['booking'] });
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
function hoursError(changes: number): AppError {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return {
    kind: offline ? 'offline' : 'server',
    message: offline
      ? 'You’re offline. Your hours didn’t save. Try again when you reconnect.'
      : changes > 1
        ? 'Some of your hours didn’t save. Check them, then try again.'
        : 'Your hours didn’t save. Try again in a moment.',
  };
}
