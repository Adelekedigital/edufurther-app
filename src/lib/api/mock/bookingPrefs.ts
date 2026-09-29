/**
 * PHASE A MOCK STATE for the mentor's booking preferences and weekly hours,
 * served by app/api/mock/… only when ENABLE_MOCK_API=1. Kept in memory for
 * the server's lifetime. Values are the design's samples (Session Types.dc.html
 * `sharedDefs` and `W`): 60 min, 24 hrs, 2 weeks, 15 min break, approve each;
 * Mon, Tue, Thu, Fri 5–8 pm and Sat 9 am–1 pm.
 */
import type { components } from '@/lib/api/generated/schema';

type AvailabilityRuleRead = components['schemas']['AvailabilityRuleRead'];

const ZONE = 'Africa/Lagos';

export const prefs = {
  // PENDING BACKEND (round 3 B): the two default_* fields.
  default_duration_minutes: 60 as number | null,
  default_min_notice_minutes: 1440 as number | null,
  booking_window_days: 14 as number | null,
  break_after_minutes: 15 as number | null,
  requires_booking_confirmation: true,
};

let seq = 0;
const rule = (day: number, start: string, end: string): AvailabilityRuleRead => ({
  id: `rule-${++seq}`,
  day_of_week: day,
  start_time: `${start}:00`,
  end_time: `${end}:00`,
  timezone: ZONE,
  is_active: true,
});

export const rules: AvailabilityRuleRead[] = [
  rule(1, '17:00', '20:00'),
  rule(2, '17:00', '20:00'),
  rule(4, '17:00', '20:00'),
  rule(5, '17:00', '20:00'),
  rule(6, '09:00', '13:00'),
];

const mins = (t: string) => {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
};

/** POST: 422 on a bad body or an end before the start; 409 on an overlap (as the backend). */
export function addRule(body: Record<string, unknown>): { status: number; json: unknown } {
  const day = body.day_of_week;
  const start = body.start_time;
  const end = body.end_time;
  if (
    typeof day !== 'number' ||
    day < 0 ||
    day > 6 ||
    typeof start !== 'string' ||
    typeof end !== 'string'
  )
    return { status: 422, json: problem(422, 'Validation failed') };
  const a = mins(start);
  // As the backend: 00:00 can't end a day (end <= start is refused); 23:59:59 does.
  const b = mins(end);
  if (b <= a) return { status: 422, json: problem(422, 'Validation failed') };
  const overlap = rules.some(
    (r) => r.is_active && r.day_of_week === day && a < mins(r.end_time) && mins(r.start_time) < b,
  );
  if (overlap) return { status: 409, json: problem(409, 'Overlapping availability') };
  const created = rule(day, start.slice(0, 5), end.slice(0, 5));
  created.end_time = end.length === 5 ? `${end}:00` : end;
  if (typeof body.timezone === 'string') created.timezone = body.timezone;
  rules.push(created);
  return { status: 201, json: { id: created.id } };
}

export function removeRule(id: string): number {
  const i = rules.findIndex((r) => r.id === id);
  if (i < 0) return 404;
  rules.splice(i, 1);
  return 200;
}

export function problem(status: number, title: string) {
  return { type: 'about:blank', title, status };
}
