import type { components } from '@/lib/api/generated/schema';
import { addDays } from '@/lib/utils/slots';

type ExceptionRead = components['schemas']['AvailabilityExceptionRead'];

/** In-memory availability exceptions for the mock (ENABLE_MOCK_API=1): one block of three days. */
const start = addDays(new Date().toISOString().slice(0, 10), 10);
let seq = 1;
export const exceptions: ExceptionRead[] = [
  {
    id: `ex-${seq++}`,
    type: 'block',
    start_date: start,
    end_date: addDays(start, 3),
    start_time: null,
    end_time: null,
    timezone: 'Africa/Lagos',
    reason: null,
  },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** POST: dates as YYYY-MM-DD, end after start (exclusive), times both or neither. */
export function addException(body: Record<string, unknown>): { status: number; json: unknown } {
  const { type, start_date, end_date, start_time = null, end_time = null, timezone } = body;
  const bad =
    (type !== 'block' && type !== 'override') ||
    typeof start_date !== 'string' ||
    typeof end_date !== 'string' ||
    !DATE.test(start_date) ||
    !DATE.test(end_date) ||
    end_date <= start_date ||
    (start_time === null) !== (end_time === null) ||
    typeof timezone !== 'string';
  if (bad)
    return {
      status: 422,
      json: { type: 'about:blank', title: 'Unprocessable Content', status: 422 },
    };
  const row: ExceptionRead = {
    id: `ex-${seq++}`,
    type,
    start_date,
    end_date,
    start_time: start_time as string | null,
    end_time: end_time as string | null,
    timezone,
    reason: (body.reason as string | null) ?? null,
  };
  exceptions.push(row);
  return { status: 201, json: row };
}

export function removeException(id: string): number {
  const i = exceptions.findIndex((e) => e.id === id);
  if (i < 0) return 404;
  exceptions.splice(i, 1);
  return 204;
}
