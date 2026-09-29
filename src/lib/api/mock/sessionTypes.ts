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
    // Backend round 4 (#300): one featured per mentor; none scheduled for deletion.
    is_featured: false,
    pending_deletion: null,
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
type WindowRead = components['schemas']['AvailabilityRuleRead'];
const windows: Record<string, WindowRead[]> = {};
let windowSeq = 0;

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
  const b = w as Partial<WindowRead>;
  const row: WindowRead = {
    id: `${id}-w${++windowSeq}`,
    day_of_week: Number(b.day_of_week ?? 0),
    start_time: String(b.start_time ?? '09:00:00'),
    end_time: String(b.end_time ?? '10:00:00'),
    timezone: String(b.timezone ?? 'Africa/Lagos'),
    is_active: b.is_active ?? true,
  };
  (windows[id] ??= []).push(row);
  return { id: row.id };
}

export function mockWindows(id: string): WindowRead[] | null {
  return store.some((t) => t.id === id) ? (windows[id] ?? []) : null;
}

export function mockRemoveWindow(id: string, windowId: string): boolean {
  const list = windows[id] ?? [];
  const i = list.findIndex((w) => w.id === windowId);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

// ---- edit (Session Types PR 4) --------------------------------------------------

type Problem = { pointer: string; message: string };

/**
 * PATCH /me/session-types/{id}, validated like the backend (a subset): absent
 * keeps, null inherits (length, notice, window, break, approval), stages a list.
 */
export function mockEditSessionType(
  id: string,
  body: Record<string, unknown>,
): { status: 200 | 404 | 409 | 422; errors?: Problem[] } {
  const t = store.find((x) => x.id === id);
  if (!t) return { status: 404 };
  const errors: Problem[] = [];
  const has = (k: string) => k in body;
  if (has('name')) {
    const n = typeof body.name === 'string' ? body.name.trim() : '';
    if (!n || n.length > 200) errors.push({ pointer: '/name', message: 'invalid' });
    else if (store.some((x) => x.id !== id && x.name.toLowerCase() === n.toLowerCase()))
      return { status: 409 };
  }
  const range = (k: string, lo: number, hi: number) => {
    const v = body[k];
    if (has(k) && v !== null && !(typeof v === 'number' && v >= lo && v <= hi))
      errors.push({ pointer: `/${k}`, message: 'out of range' });
  };
  range('duration_minutes', 5, 480);
  range('min_notice_minutes', 1440, 4320);
  const stages = has('application_stages') ? body.application_stages : t.application_stages;
  if (has('application_stages')) {
    if (!Array.isArray(stages))
      errors.push({ pointer: '/application_stages', message: 'must be a list' });
    else if (new Set(stages).size !== stages.length)
      errors.push({ pointer: '/application_stages', message: 'no repeats' });
  }
  if (has('application_stages') && has('application_stage'))
    errors.push({ pointer: '/application_stage', message: 'send one of the two' });
  const label = has('custom_stage_label') ? body.custom_stage_label : t.custom_stage_label;
  const hasOther = Array.isArray(stages) && stages.includes('other');
  if (hasOther !== !!(typeof label === 'string' && label.trim()))
    errors.push({ pointer: '/custom_stage_label', message: 'required exactly with other' });
  const ids = has('service_offering_ids') ? body.service_offering_ids : undefined;
  if (Array.isArray(ids) && ids.length > 3)
    errors.push({ pointer: '/service_offering_ids', message: 'at most 3' });
  if (errors.length) return { status: 422, errors };

  const patch: Partial<Stored> = {};
  for (const k of [
    'name',
    'description',
    'duration_minutes',
    'min_notice_minutes',
    'icon',
    'is_active',
    'requires_booking_confirmation',
    'booking_window_days',
    'break_after_minutes',
    'custom_stage_label',
  ] as const)
    if (has(k)) Object.assign(patch, { [k]: body[k] });
  if (has('application_stages')) {
    patch.application_stages = stages as Stored['application_stages'];
    patch.application_stage = ((stages as string[])[0] ?? null) as Stored['application_stage'];
  }
  if (Array.isArray(ids)) {
    const offerings = ids.flatMap((oid) => {
      const o = OFFERINGS.find((x) => x.id === oid);
      return o?.code ? [{ code: o.code, display_name: o.display_name }] : [];
    });
    patch.service_offerings = offerings;
    patch.service_offering = offerings[0] ?? null;
  }
  Object.assign(t, patch);
  return { status: 200 };
}

let questionSeq = 0;
const reorder = (t: Stored) => t.questions.forEach((q, i) => (q.display_order = i));

export function mockAddQuestion(id: string, body: Record<string, unknown>): { id: string } | null {
  const t = store.find((x) => x.id === id);
  if (!t) return null;
  const qid = `${id}-nq${++questionSeq}`;
  t.questions.push({
    id: qid,
    question_text: String(body.question_text ?? ''),
    question_type: (body.question_type ?? 'free_text') as QuestionRead['question_type'],
    is_required: !!body.is_required,
    display_order: t.questions.length,
    allows_multiple: !!body.allows_multiple,
    options: ((body.options as { text: string }[] | undefined) ?? []).map((o, j) => ({
      id: `${qid}-o${j}`,
      text: o.text,
    })),
  } as QuestionRead);
  return { id: qid };
}

export function mockEditQuestion(id: string, qid: string, body: Record<string, unknown>): boolean {
  const q = store.find((x) => x.id === id)?.questions.find((x) => x.id === qid);
  if (!q) return false;
  for (const k of ['question_text', 'question_type', 'is_required', 'allows_multiple'] as const)
    if (k in body) Object.assign(q, { [k]: body[k] });
  if (Array.isArray(body.options))
    q.options = (body.options as { id?: string; text: string }[]).map((o, j) => ({
      id: o.id ?? `${qid}-e${++questionSeq}-${j}`,
      text: o.text,
    }));
  return true;
}

export function mockRemoveQuestion(id: string, qid: string): boolean {
  const t = store.find((x) => x.id === id);
  if (!t || !t.questions.some((q) => q.id === qid)) return false;
  t.questions = t.questions.filter((q) => q.id !== qid);
  reorder(t);
  return true;
}

/** PUT order: every live question once, else 422. */
export function mockOrderQuestions(id: string, order: unknown): 204 | 404 | 422 {
  const t = store.find((x) => x.id === id);
  if (!t) return 404;
  const ids = Array.isArray(order) ? (order as string[]) : [];
  const live = new Set(t.questions.map((q) => q.id));
  if (
    ids.length !== live.size ||
    new Set(ids).size !== ids.length ||
    !ids.every((x) => live.has(x))
  )
    return 422;
  t.questions = ids.map((x) => t.questions.find((q) => q.id === x)!);
  reorder(t);
  return 204;
}
