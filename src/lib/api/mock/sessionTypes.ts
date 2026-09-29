/**
 * MOCK of the mentor's own session types (/me/session-types and …/questions),
 * served by app/api/mock/… only when ENABLE_MOCK_API=1. An in-memory store, so
 * the Live switch and delete stick until the server restarts. Samples are the
 * design's (Session Types.dc.html `fromScene`), re-keyed to catalog offerings.
 */
import type { components } from '@/lib/api/generated/schema';
import { OFFERINGS } from './fixtures';

type OwnSessionTypeRead = components['schemas']['OwnSessionTypeRead'];
type QuestionRead = components['schemas']['QuestionRead'];

type Stored = OwnSessionTypeRead & { questions: QuestionRead[]; bookedCount: number };

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
      ...topics('application-documents'),
      application_stage: 'drafting_stage',
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
      ...topics('visa-and-interview'),
      questions: [q('q4', 'Which embassy and date?', 'free_text', true)],
      bookedCount: 0,
    },
  ];
}

let store: Stored[] = seed();

export function mockOwnSessionTypes(): OwnSessionTypeRead[] {
  return store.map(({ questions: _q, bookedCount: _b, ...t }) => t);
}

export function mockQuestions(id: string): QuestionRead[] | null {
  return store.find((t) => t.id === id)?.questions ?? null;
}

export function mockPatchSessionType(
  id: string,
  patch: Partial<OwnSessionTypeRead>,
): OwnSessionTypeRead | null {
  const t = store.find((x) => x.id === id);
  if (!t) return null;
  Object.assign(t, patch);
  const { questions: _q, bookedCount: _b, ...out } = t;
  return out;
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
