/**
 * The Session Types create/edit wizard's draft (Session Types.dc.html), as plain
 * data with pure functions: validation per step, the create body, the weekly
 * hours → per-type windows, and 422 pointers → the field and step that own them.
 */
import type { SessionIcon } from '@/types/sessionType';
import type { SessionTemplate } from './sessionTemplates';

export type Stage =
  | 'early_exploration'
  | 'drafting_stage'
  | 'post_submission'
  | 'revisions'
  | 'interviewing'
  | 'other';

/** Design chip labels ("Best for mentees who are…"). `other` carries the mentor's own words. */
export const STAGE_LABELS: Record<Exclude<Stage, 'other'>, string> = {
  early_exploration: 'Exploring options',
  drafting_stage: 'Drafting',
  post_submission: 'Submitted, waiting',
  revisions: 'Revising',
  interviewing: 'Interviewing',
};

export type QuestionKind = 'free_text' | 'file_upload' | 'single' | 'multi';
export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  free_text: 'Short answer',
  single: 'Single choice',
  multi: 'Multiple choice',
  file_upload: 'File upload',
};

export type DraftQuestion = {
  /** Stable key for React and reordering; the server id once saved. */
  key: string;
  text: string;
  kind: QuestionKind;
  required: boolean;
  /** Choice questions only: 2–10 options. */
  options: string[];
};

/** Minutes since midnight: [start, end). */
export type Slot = [number, number];
export type DayHours = { on: boolean; slots: Slot[] };

export type Draft = {
  name: string;
  description: string;
  /** Catalog offering codes, in the mentor's order, at most 3 (backend #9). */
  topics: string[];
  stage: Stage | null;
  /** The mentor's own stage, when `stage` is `other`. */
  customStage: string;
  /** null = automatic from the first topic. */
  icon: SessionIcon | null;
  questions: DraftQuestion[];
  durationMin: number;
  noticeHours: number;
  /** default = inherit the mentor's booking window and break (backend #13). */
  rules: 'default' | 'custom';
  windowDays: number;
  breakMin: number;
  /** default = the mentor's Calendar hours; custom = this type's own windows (backend #15). */
  hours: 'default' | 'custom';
  /** Sunday first (backend day_of_week 0 = Sunday). */
  days: DayHours[];
  approval: 'inherit' | 'on' | 'off';
};

export const MAX_TOPICS = 3;
export const MAX_QUESTIONS = 5;
export const NAME_MAX = 200;
export const DESCRIPTION_MAX = 500;
export const OPTION_MAX = 10;

/** Session Types.dc.html rule options; window weeks are sent as days (backend #13). */
export const DURATIONS = [30, 45, 60, 90];
/** The platform floor is 24 hours (backend reply #14): the design's 6 hours is dropped. */
export const NOTICE_HOURS = [24, 48, 72];
export const WINDOW_DAYS = [7, 14, 28, 56];
export const BREAKS = [0, 10, 15, 30];
/** Platform defaults when the mentor has set none (backend #13). */
export const PLATFORM_WINDOW_DAYS = 56;
export const PLATFORM_BREAK_MIN = 0;

const DEFAULT_SLOT: Slot = [540, 600];
export const emptyWeek = (): DayHours[] =>
  Array.from({ length: 7 }, () => ({ on: false, slots: [[...DEFAULT_SLOT] as Slot] }));

/** TimeSlots.dc.html: "9:00 am" … every 30 minutes, plus midnight at the end of the day. */
export function timeLabel(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
export const TIME_OPTIONS = [
  ...Array.from({ length: 48 }, (_, n) => ({ value: String(n * 30), label: timeLabel(n * 30) })),
  { value: '1440', label: '12:00 am' },
];
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

let seq = 0;
export const newKey = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

export function blankDraft(): Draft {
  return {
    name: '',
    description: '',
    topics: [],
    stage: null,
    customStage: '',
    icon: null,
    questions: [],
    durationMin: 60,
    noticeHours: 24,
    rules: 'default',
    windowDays: 28,
    breakMin: 15,
    hours: 'default',
    days: emptyWeek(),
    approval: 'inherit',
  };
}

export function draftFromTemplate(t: SessionTemplate): Draft {
  return {
    ...blankDraft(),
    name: t.name,
    description: t.description,
    topics: [t.topic],
    durationMin: t.durationMin,
    questions: t.questions.map((q) => ({
      key: newKey(),
      text: q.text,
      kind: q.type,
      required: q.required,
      options: [],
    })),
  };
}

// ---- validation ---------------------------------------------------------------

export type FieldKey =
  | 'name'
  | 'description'
  | 'topics'
  | 'stage'
  | 'questions'
  | 'rules'
  | 'hours'
  | `question-${number}`
  | `slot-${number}-${number}`;
export type FieldErrors = Partial<Record<FieldKey, string>>;

/** Which step owns a field (for jumping to the first error). */
export function stepOf(field: FieldKey): 1 | 2 | 3 {
  if (field === 'name' || field === 'description' || field === 'topics' || field === 'stage')
    return 1;
  if (field === 'questions' || field.startsWith('question-')) return 2;
  return 3;
}

export function slotError(slots: Slot[], k: number): string | null {
  const [a, b] = slots[k]!;
  if (b <= a) return 'End time must be after the start time.';
  const overlaps = slots.some(([c, e], j) => j !== k && a < e && c < b);
  return overlaps ? 'These hours overlap with another time on this day.' : null;
}

export function validateStep(d: Draft, step: 1 | 2 | 3): FieldErrors {
  const e: FieldErrors = {};
  if (step === 1) {
    if (!d.name.trim()) e.name = 'Give your session a name.';
    else if (d.name.trim().length > NAME_MAX)
      e.name = `Keep the name under ${NAME_MAX} characters.`;
    if (!d.description.trim()) e.description = 'Say what mentees get from this session.';
    if (d.topics.length === 0) e.topics = 'Pick at least one topic.';
    if (d.stage === 'other' && !d.customStage.trim()) e.stage = 'Name the stage, or pick another.';
  }
  if (step === 3 && d.hours === 'custom') {
    const on = d.days.filter((x) => x.on);
    if (on.length === 0) e.hours = 'Turn on at least one day, or use your Calendar availability.';
    d.days.forEach((day, i) => {
      if (!day.on) return;
      day.slots.forEach((_, k) => {
        const msg = slotError(day.slots, k);
        if (msg) e[`slot-${i}-${k}`] = msg;
      });
    });
  }
  return e;
}

/** A question the editor can save: text, and 2+ distinct options for a choice. */
export function questionError(q: Pick<DraftQuestion, 'text' | 'kind' | 'options'>): string | null {
  if (!q.text.trim()) return 'Write the question.';
  if (q.kind === 'single' || q.kind === 'multi') {
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return 'Add at least two options.';
    if (opts.length > OPTION_MAX) return `Use at most ${OPTION_MAX} options.`;
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length)
      return 'Each option must be different.';
  }
  return null;
}

/** "Options, separated by commas" → a clean list. */
export function parseOptions(input: string): string[] {
  return input
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

// ---- to the API ---------------------------------------------------------------

const hhmm = (m: number) => {
  // The API's times are wall-clock `HH:MM:SS`; midnight at the end of a day is 23:59:59.
  if (m >= 1440) return '23:59:59';
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
};

/** Custom hours → per-type windows (backend #15), in the mentor's zone. */
export function toWindows(days: DayHours[], timezone: string) {
  return days.flatMap((day, i) =>
    day.on
      ? day.slots.map(([a, b]) => ({
          day_of_week: i,
          start_time: hhmm(a),
          end_time: hhmm(b),
          timezone,
          is_active: true,
        }))
      : [],
  );
}

/** POST /me/session-types body (backend #1 questions, #9 topics, #13 rules, #16 approval, #18 icon). */
export function toCreateBody(d: Draft, offeringIds: Record<string, string>) {
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    duration_minutes: d.durationMin,
    min_notice_minutes: d.noticeHours * 60,
    service_offering_ids: d.topics.map((c) => offeringIds[c]).filter((x): x is string => !!x),
    application_stage: d.stage,
    custom_stage_label: d.stage === 'other' ? d.customStage.trim() : null,
    icon: d.icon,
    requires_booking_confirmation: d.approval === 'inherit' ? null : d.approval === 'on',
    booking_window_days: d.rules === 'custom' ? d.windowDays : null,
    break_after_minutes: d.rules === 'custom' ? d.breakMin : null,
    questions: d.questions.map((q, i) => {
      const choice = q.kind === 'single' || q.kind === 'multi';
      return {
        question_text: q.text.trim(),
        question_type: choice ? ('multi_choice' as const) : (q.kind as 'free_text' | 'file_upload'),
        is_required: q.required,
        display_order: i,
        ...(choice
          ? {
              allows_multiple: q.kind === 'multi',
              options: q.options.map((o) => ({ text: o.trim() })).filter((o) => o.text),
            }
          : {}),
      };
    }),
  };
}

// ---- 422 errors[] (backend #5) → our copy on the right field ------------------

const COPY: Partial<Record<FieldKey, string>> = {
  name: 'Check the name: it may be too long, or you already have a session with this name.',
  description: 'Check the description.',
  topics: 'Pick up to three topics.',
  stage: 'Check the stage.',
  rules: 'Check the length and booking rules.',
  hours: 'Check the hours.',
};

/** JSON Pointer → field. Unknown pointers are the request as a whole (null). */
export function fieldForPointer(pointer: string): FieldKey | null {
  const [, head, idx] = pointer.split('/');
  switch (head) {
    case 'name':
      return 'name';
    case 'description':
      return 'description';
    case 'service_offering_ids':
    case 'service_offering_id':
      return 'topics';
    case 'application_stage':
    case 'custom_stage_label':
      return 'stage';
    case 'questions':
      return idx !== undefined && /^\d+$/.test(idx) ? `question-${Number(idx)}` : 'questions';
    case 'duration_minutes':
    case 'min_notice_minutes':
    case 'booking_window_days':
    case 'break_after_minutes':
    case 'requires_booking_confirmation':
      return 'rules';
    default:
      return null;
  }
}

/** Our copy for a field the server refused; never the server's `message`. */
export function copyForField(field: FieldKey): string {
  if (field.startsWith('question-')) return 'Check this question and its options.';
  return COPY[field] ?? 'Check this field.';
}
