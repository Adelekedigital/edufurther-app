/**
 * MOCK of the mentor's own session types (/me/session-types and …/questions),
 * served by app/api/mock/… only when ENABLE_MOCK_API=1. An in-memory store, so
 * the Live switch and delete stick until the server restarts. Samples are the
 * design's (Session Types.dc.html `fromScene`), re-keyed to catalog offerings.
 */
import { prefs } from './bookingPrefs';
import type { components } from '@/lib/api/generated/schema';
import { OFFERINGS } from './fixtures';

type OwnSessionTypeRead = components['schemas']['OwnSessionTypeRead'];
type QuestionRead = components['schemas']['QuestionRead'];

/**
 * Stored as sent: a null length or notice follows the mentor's default (backend
 * round 3 B), resolved on every read, so a change of default reaches it.
 */
type Stored = Omit<
  OwnSessionTypeRead,
  'duration_minutes' | 'min_notice_minutes' | 'duration_inherited' | 'min_notice_inherited'
> & {
  duration_minutes: number | null;
  min_notice_minutes: number | null;
  questions: QuestionRead[];
  bookedCount: number;
};

/** The read: the type's own value, else the mentor's default, else the platform's. */
function resolve({ questions: _q, bookedCount: _b, ...t }: Stored): OwnSessionTypeRead {
  return {
    ...t,
    duration_minutes: t.duration_minutes ?? prefs.default_duration_minutes ?? 60,
    min_notice_minutes: t.min_notice_minutes ?? prefs.default_min_notice_minutes ?? 1440,
    duration_inherited: t.duration_minutes === null,
    min_notice_inherited: t.min_notice_minutes === null,
  };
}

const offering = (code: string) => {
  const o = OFFERINGS.find((x) => x.code === code)!;
  return { code, display_name: o.display_name };
};
// Backend #9 (merging): `service_offerings[]`, whose first is `service_offering`.
// Spread from a variable so it compiles against the spec before and after.
const topics = (code: string) => {
  const one = offering(code);
  const extra = { service_offerings: [one] };
  return { service_offering: one, ...extra };
};
// `allows_multiple` / `options` are backend #12 (merging): carried already, and
// asserted so the mock compiles against the spec before and after it ships.
const q = (id: string, text: string, type: QuestionRead['question_type'], required: boolean) =>
  ({
    id,
    question_text: text,
    question_type: type,
    is_required: required,
    display_order: 0,
    allows_multiple: false,
    options: [],
  }) as QuestionRead;

function seed(): Stored[] {
  const base = {
    meeting_venue: 'daily' as const,
    application_stage: null,
    application_stages: [],
    custom_stage_label: null,
    icon: null,
    requires_booking_confirmation: null,
    // Backend #13 (merging): null = inherit. In a spread variable, so the mock
    // compiles against the spec before and after it ships.
    booking_window_days: null,
    break_after_minutes: null,
    min_notice_minutes: 1440,
  };
  return [
    {
      ...base,
      id: 'mst-sop',
      name: 'SOP draft review',
      description:
        'We’ll work through your statement of purpose together, focusing on how your story fits the program and the strength of your opening. You’ll leave with a prioritized revision list and clarity on your next draft.',
      duration_minutes: 60,
      is_active: true,
      ...topics('document-preparation'),
      application_stage: 'drafting_stage',
      application_stages: ['drafting_stage'],
      questions: [
        q('q1', 'Which programs are you applying to?', 'free_text', true),
        q('q2', 'Upload your current SOP draft (PDF or Word)', 'file_upload', false),
      ],
      // Deleting it is refused (backend #4): two sessions are still booked.
      bookedCount: 2,
    },
    {
      ...base,
      id: 'mst-shortlist',
      name: 'Program shortlist',
      description:
        'Narrow your list to programs that fit your research and fund international students.',
      duration_minutes: 30,
      is_active: true,
      ...topics('program-selection'),
      questions: [q('q3', 'Which programs are you considering?', 'free_text', true)],
      bookedCount: 0,
    },
    {
      ...base,
      id: 'mst-visa',
      name: 'Visa interview prep',
      description:
        'A mock visa interview with honest notes on what to tighten before the real one.',
      duration_minutes: 45,
      is_active: false,
      ...topics('interview-preparation'),
      questions: [q('q4', 'Which embassy and date?', 'free_text', true)],
      bookedCount: 0,
    },
  ];
}

let store: Stored[] = seed();

export function mockOwnSessionTypes(): OwnSessionTypeRead[] {
  return store.map(resolve);
}

export function mockQuestions(id: string): QuestionRead[] | null {
  return store.find((t) => t.id === id)?.questions ?? null;
}

export function mockPatchSessionType(
  id: string,
  patch: Partial<Stored>,
): OwnSessionTypeRead | null {
  const t = store.find((x) => x.id === id);
  if (!t) return null;
  Object.assign(t, patch);
  return resolve(t);
}

/** 'gone' | 'booked' (with the count) | 'deleted'. */
export function mockDeleteSessionType(
  id: string,
): { result: 'gone' } | { result: 'booked'; count: number } | { result: 'deleted' } {
  const t = store.find((x) => x.id === id);
  if (!t) return { result: 'gone' };
  if (t.bookedCount > 0) return { result: 'booked', count: t.bookedCount };
  store = store.filter((x) => x.id !== id);
  return { result: 'deleted' };
}

// ---- create (backend #1, #2) --------------------------------------------------

type CreateBody = {
  name?: unknown;
  duration_minutes?: unknown;
  min_notice_minutes?: unknown;
  service_offering_ids?: unknown;
  questions?: unknown;
  [k: string]: unknown;
};
const replays = new Map<string, { body: string; result: unknown }>();
const windows: Record<string, unknown[]> = {};

/** Validate like the backend (a subset): 422 errors[] with JSON pointers, 409 on a used name. */
export function mockCreateSessionType(
  body: CreateBody,
  key: string | null,
):
  | { status: 201; json: { id: string; question_ids: string[] }; replayed: boolean }
  | { status: 409 | 422; json: Record<string, unknown> } {
  const raw = JSON.stringify(body);
  if (key && replays.has(key)) {
    const r = replays.get(key)!;
    if (r.body !== raw)
      return {
        status: 422,
        json: { type: 'about:blank', title: 'Idempotency key reused', status: 422, errors: [] },
      };
    return {
      status: 201,
      json: r.result as { id: string; question_ids: string[] },
      replayed: true,
    };
  }
  const errors: { pointer: string; message: string }[] = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 200) errors.push({ pointer: '/name', message: 'invalid' });
  const ids = Array.isArray(body.service_offering_ids) ? body.service_offering_ids : [];
  if (ids.length > 3) errors.push({ pointer: '/service_offering_ids', message: 'at most 3' });
  const qs = Array.isArray(body.questions) ? body.questions : [];
  if (qs.length > 5) errors.push({ pointer: '/questions', message: 'at most 5' });
  // Stages (backend round 3 A): a list, never null, no repeats, not with the
  // single field; `other` needs its label, and only `other` may have one.
  const stages = body.application_stages;
  if ('application_stages' in body && !Array.isArray(stages))
    errors.push({ pointer: '/application_stages', message: 'must be a list' });
  else if (Array.isArray(stages) && new Set(stages).size !== stages.length)
    errors.push({ pointer: '/application_stages', message: 'no repeats' });
  if ('application_stages' in body && 'application_stage' in body)
    errors.push({ pointer: '/application_stage', message: 'send one of the two' });
  const hasOther = Array.isArray(stages) && stages.includes('other');
  const label = typeof body.custom_stage_label === 'string' ? body.custom_stage_label.trim() : '';
  if (hasOther !== !!label)
    errors.push({ pointer: '/custom_stage_label', message: 'required exactly with other' });
  if (errors.length)
    return {
      status: 422,
      json: {
        type: 'about:blank',
        title: 'Unprocessable Content',
        status: 422,
        detail: 'x',
        errors,
      },
    };
  if (store.some((t) => t.name.toLowerCase() === name.toLowerCase()))
    return { status: 409, json: { type: 'about:blank', title: 'Conflict', status: 409 } };

  const id = `mst-${Date.now().toString(36)}`;
  const offerings = ids.flatMap((oid) => {
    const o = OFFERINGS.find((x) => x.id === oid);
    return o?.code ? [{ code: o.code, display_name: o.display_name }] : [];
  });
  const questions = qs.map((q, i) => {
    const w = q as {
      question_text: string;
      question_type: QuestionRead['question_type'];
      is_required?: boolean;
      allows_multiple?: boolean;
      options?: { text: string }[];
    };
    return {
      id: `${id}-q${i}`,
      question_text: w.question_text,
      question_type: w.question_type,
      is_required: !!w.is_required,
      display_order: i,
      allows_multiple: !!w.allows_multiple,
      options: (w.options ?? []).map((o, j) => ({ id: `${id}-q${i}-o${j}`, text: o.text })),
    } as QuestionRead;
  });
  const extra = {
    service_offerings: offerings,
    booking_window_days: body.booking_window_days ?? null,
    break_after_minutes: body.break_after_minutes ?? null,
  };
  store.push({
    id,
    name,
    description: (body.description as string | null) ?? null,
    // null or absent = the mentor's default (backend round 3 B), resolved on read.
    duration_minutes: body.duration_minutes == null ? null : Number(body.duration_minutes),
    min_notice_minutes: body.min_notice_minutes == null ? null : Number(body.min_notice_minutes),
    meeting_venue: 'daily',
    is_active: true,
    service_offering: offerings[0] ?? null,
    application_stages: (Array.isArray(stages)
      ? stages
      : []) as OwnSessionTypeRead['application_stages'],
    application_stage: ((Array.isArray(stages) ? stages[0] : body.application_stage) ??
      null) as OwnSessionTypeRead['application_stage'],
    custom_stage_label: (body.custom_stage_label as string | null) ?? null,
    icon: (body.icon as OwnSessionTypeRead['icon']) ?? null,
    requires_booking_confirmation: (body.requires_booking_confirmation as boolean | null) ?? null,
    ...extra,
    questions,
    bookedCount: 0,
  } as Stored);
  const result = { id, question_ids: questions.map((q) => q.id) };
  if (key) replays.set(key, { body: raw, result });
  return { status: 201, json: result, replayed: false };
}

export function mockAddWindow(id: string, w: unknown): { id: string } | null {
  if (!store.some((t) => t.id === id)) return null;
  (windows[id] ??= []).push(w);
  return { id: `${id}-w${windows[id]!.length}` };
}
