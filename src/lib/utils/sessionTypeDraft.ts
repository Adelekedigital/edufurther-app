/**
 * The Session Types create/edit wizard's draft (Session Types.dc.html), as plain
 * data with pure functions: validation per step, the create body, the weekly
 * hours → per-type windows, and 422 pointers → the field and step that own them.
 */
import { DETAILS_COPY } from '@/lib/copy/sessionTypes';
import type { ApplicationStage, SessionIcon } from '@/types/sessionType';
import type { SessionTemplate } from './sessionTemplates';

export type Stage = ApplicationStage;

/** "Best for mentees who are…": the design's six chips, in its order, and their words. */
export const STAGE_LABELS: Record<Stage, string> = {
  exploring: 'Exploring',
  researching: 'Researching schools & scholarships',
  preparing_documents: 'Preparing documents',
  applying: 'Applying',
  interview_prep: 'Preparing for interview',
  awaiting_decision: 'Waiting for a decision',
};
export const STAGE_CHIPS = Object.keys(STAGE_LABELS) as Stage[];

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
  /** The saved question's id (editing); absent for a new one. */
  id?: string;
  text: string;
  kind: QuestionKind;
  required: boolean;
  /** Choice questions only: 2–10 options. A synced one's are the mentor's help areas, as read. */
  options: string[];
  /** Options come from the mentor's help areas (backend #540): single choice, none of its own. */
  synced?: boolean;
};

/** Minutes since midnight: [start, end). */
export type Slot = [number, number];
export type DayHours = { on: boolean; slots: Slot[] };

export type Draft = {
  name: string;
  description: string;
  /** Catalog offering codes, in the mentor's order, at most 3 (backend #9). */
  topics: string[];
  /** Several, in the order picked; empty = any stage (backend round 3 A). */
  stages: Stage[];
  /** null = automatic from the first topic. */
  icon: SessionIcon | null;
  questions: DraftQuestion[];
  durationMin: number;
  noticeHours: number;
  /**
   * default = inherit the mentor's length, notice, booking window, break and
   * approval (backend #13, round 3 B); custom = this type's own.
   */
  rules: 'default' | 'custom';
  windowDays: number;
  breakMin: number;
  /** default = the mentor's Calendar hours; custom = this type's own windows (backend #15). */
  hours: 'default' | 'custom';
  /** Sunday first (backend day_of_week 0 = Sunday). */
  days: DayHours[];
  /** Only with custom rules; inherit = the mentor's default. */
  approval: 'inherit' | 'on' | 'off';
  /** In both modes; inherit = the mentor's default (`/me/conferencing`, backend #535). */
  venue: Venue;
};

/** Where the call happens: a personal link is a default only, never a session's own. */
export type Venue = 'inherit' | 'daily' | 'google_meet';

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
/** Platform defaults when the mentor has set none (backend #13, round 3 B). */
export const PLATFORM_DURATION_MIN = 60;
export const PLATFORM_NOTICE_HOURS = 24;
export const PLATFORM_WINDOW_DAYS = 56;
/**
 * "Bookable up to" choices under the platform's cap: the presets that fit, and
 * the cap itself when it isn't one (a cap of 21 offers 7, 14 and 21 days).
 */
export function windowPresets(max = PLATFORM_WINDOW_DAYS): number[] {
  const fit = WINDOW_DAYS.filter((d) => d <= max);
  return fit.includes(max) ? fit : [...fit, max];
}
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
    stages: [],
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
    venue: 'inherit',
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
  | 'venue'
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

/**
 * A slot's problem, or null. `minLength`: the shortest session these hours
 * serve; a slot shorter than it can never be booked (product, 2026-10-01).
 */
export function slotError(slots: Slot[], k: number, minLength = 0): string | null {
  const [a, b] = slots[k]!;
  if (b <= a) return 'End time must be after the start time.';
  // TimeSlots.dc.html `scene="tooShort"` (design, 2026-10-02): checked before overlaps.
  if (b - a < minLength)
    return `Too short for your ${minLength}-min sessions. Make it at least ${minLength} min.`;
  const overlaps = slots.some(([c, e], j) => j !== k && a < e && c < b);
  return overlaps ? 'These hours overlap with another time on this day.' : null;
}

/** Up to the next half hour, the time lists' step. */
const toStep = (m: number) => Math.ceil(m / 30) * 30;

/**
 * The shortest session booked into the Calendar hours: the mentor's default
 * length and each live type's that follows those hours; a type with its own
 * windows books there instead (#146). Reads return the resolved length.
 * Types or defaults not known yet (loading, or failed; `undefined`): 0, so
 * nothing valid is refused on a guess (review of the hours PR, Codex on #148).
 * A default that's known but unset (`null`) is the platform's.
 */
export function shortestLength(
  defaultMin: number | null | undefined,
  types:
    readonly { durationMin: number; isLive: boolean; usesOwnWindows: boolean }[] | null | undefined,
): number {
  if (!types || defaultMin === undefined) return 0;
  const live = types.filter((t) => t.isLive && !t.usesOwnWindows).map((t) => t.durationMin);
  return Math.min(defaultMin ?? PLATFORM_DURATION_MIN, ...live);
}

/**
 * End times for a slot starting at `start`: from start + `minLength` (on the
 * half hour) to midnight. `current` stays listed when it's shorter, so a saved
 * slot still shows; its error says why. No minimum: every time, as before.
 */
export function endOptions(start: number, minLength: number, current: number) {
  if (minLength <= 0) return TIME_OPTIONS;
  const from = toStep(start + minLength);
  return TIME_OPTIONS.filter((o) => Number(o.value) >= from || Number(o.value) === current);
}

/**
 * Start times with room for a `minLength` session before midnight; `current`
 * stays listed. No minimum: every time, as before.
 */
export function startOptions(minLength: number, current: number) {
  if (minLength <= 0) return TIME_OPTIONS;
  const last = 1440 - toStep(minLength);
  return TIME_OPTIONS.filter((o) => Number(o.value) <= last || Number(o.value) === current);
}

/**
 * A slot whose start moved to `start` (TimeSlots.dc.html `setFrom`): it keeps
 * its length, never shorter than a session, and ends by midnight.
 */
export function moveStart([a, b]: Slot, start: number, minLength: number): Slot {
  const len = Math.max(toStep(minLength), b - a, 30);
  return [start, Math.min(start + len, 1440)];
}

/** A day switched on: a slot too short for a session gets its end moved to fit one. */
export function fitSlot([a, b]: Slot, minLength: number): Slot {
  return minLength > 0 && b - a < minLength ? [a, Math.min(toStep(a + minLength), 1440)] : [a, b];
}

/** This type's length: its own with custom rules, else the mentor's default. */
export const typeLength = (d: Pick<Draft, 'rules' | 'durationMin'>, defaultMin?: number | null) =>
  d.rules === 'custom' ? d.durationMin : (defaultMin ?? PLATFORM_DURATION_MIN);

/** A new slot's length (design `add`): the shortest session, on the half hour; an hour with no minimum. */
export const newSlotLength = (minLength: number) => (minLength > 0 ? toStep(minLength) : 60);

/**
 * Step 1's required fields left blank, in the order they're drawn (design
 * `stepError`). A field that's filled but wrong (too long, refused by the
 * server) isn't one: "Fill in the required fields" would be untrue for it.
 */
export function step1Missing(d: Draft): FieldKey[] {
  const missing: FieldKey[] = [];
  if (!d.name.trim()) missing.push('name');
  if (!d.description.trim()) missing.push('description');
  if (d.topics.length === 0) missing.push('topics');
  return missing;
}

/** `minLength`: the type's length, which its own hours must fit (step 3). */
export function validateStep(d: Draft, step: 1 | 2 | 3, minLength = 0): FieldErrors {
  const e: FieldErrors = {};
  if (step === 1) {
    if (!d.name.trim()) e.name = 'Give your session a name.';
    else if (d.name.trim().length > NAME_MAX)
      e.name = `Keep the name under ${NAME_MAX} characters.`;
    if (!d.description.trim()) e.description = 'Say what mentees get from this session.';
    if (d.topics.length === 0) e.topics = 'Pick at least one topic.';
  }
  if (step === 3 && d.hours === 'custom') {
    const on = d.days.filter((x) => x.on);
    if (on.length === 0) e.hours = 'Turn on at least one day, or use your weekly availability.';
    d.days.forEach((day, i) => {
      if (!day.on) return;
      day.slots.forEach((_, k) => {
        const msg = slotError(day.slots, k, minLength);
        if (msg) e[`slot-${i}-${k}`] = msg;
      });
    });
  }
  return e;
}

/** A question the editor can save: text, and 2+ distinct options for a choice. */
export function questionError(
  q: Pick<DraftQuestion, 'text' | 'kind' | 'options' | 'synced'>,
): string | null {
  if (!q.text.trim()) return 'Write the question.';
  // A synced question's options are the help areas, however many: nothing to check.
  if (!q.synced && (q.kind === 'single' || q.kind === 'multi')) {
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

export const hhmm = (m: number) => {
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
  const custom = d.rules === 'custom';
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    // null = the mentor's default, resolved when read (backend round 3 B).
    duration_minutes: custom ? d.durationMin : null,
    // Minutes are whole; hours may not be (a stored 2000 min is 33.3 hrs).
    min_notice_minutes: custom ? Math.round(d.noticeHours * 60) : null,
    service_offering_ids: d.topics.map((c) => offeringIds[c]).filter((x): x is string => !!x),
    // The six only (backend PR 543 removed the single stage and the custom label).
    application_stages: d.stages,
    icon: d.icon,
    requires_booking_confirmation: !custom || d.approval === 'inherit' ? null : d.approval === 'on',
    booking_window_days: custom ? d.windowDays : null,
    break_after_minutes: custom ? d.breakMin : null,
    // Either mode: null follows the mentor's default (backend #535).
    meeting_venue: d.venue === 'inherit' ? null : d.venue,
    questions: d.questions.map(toQuestionWrite),
  };
}

/** One question as the API takes it (create, or a new one on edit). */
export function toQuestionWrite(q: DraftQuestion, i: number) {
  const choice = q.kind === 'single' || q.kind === 'multi';
  // Its options are the help areas, filled on every read: none are sent (backend #540).
  if (q.synced)
    return {
      question_text: q.text.trim(),
      question_type: 'multi_choice' as const,
      is_required: q.required,
      display_order: i,
      allows_multiple: q.kind === 'multi',
      options_source: 'help_areas' as const,
    };
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
}

// ---- 422 errors[] (backend #5) → our copy on the right field ------------------

const COPY: Partial<Record<FieldKey, string>> = {
  name: 'Check the name: it may be too long, or you already have a session with this name.',
  description: 'Check the description.',
  topics: 'Pick up to three topics.',
  stage: 'Check the stage.',
  rules: 'Check the length and booking rules.',
  hours: 'Check the hours.',
  venue: 'Choose where the call happens.',
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
      return 'topics';
    case 'application_stages':
      return 'stage';
    case 'questions':
      return idx !== undefined && /^\d+$/.test(idx) ? `question-${Number(idx)}` : 'questions';
    case 'duration_minutes':
    case 'min_notice_minutes':
    case 'booking_window_days':
    case 'break_after_minutes':
    case 'requires_booking_confirmation':
      return 'rules';
    case 'meeting_venue':
      return 'venue';
    default:
      return null;
  }
}

/** Our copy for a field the server refused; never the server's `message`. */
export function copyForField(field: FieldKey): string {
  if (field.startsWith('question-')) return 'Check this question and its options.';
  return COPY[field] ?? 'Check this field.';
}

// ---- summaries (Session Types.dc.html, rulesFlow=inline) ------------------------

/** The mentor's booking preferences; null = not set (the platform's applies). */
export type BookingDefaults = {
  durationMin: number | null;
  noticeHours: number | null;
  windowDays: number | null;
  breakMin: number | null;
  requiresApproval: boolean;
  /** The platform's longest window, a setting that can change (backend #309); absent: 56. */
  maxWindowDays?: number;
  /** The platform's window for a mentor who sets none; absent: 56. */
  platformWindowDays?: number;
  /**
   * Hours before a session an unanswered request expires: a platform setting
   * (RESPONSE_WINDOW_HOURS). Absent until the backend sends it.
   */
  responseWindowHours?: number;
};

/** Every default resolved: the mentor's, else the platform's. */
export function resolveDefaults(d: BookingDefaults) {
  return {
    durationMin: d.durationMin ?? PLATFORM_DURATION_MIN,
    noticeHours: d.noticeHours ?? PLATFORM_NOTICE_HOURS,
    windowDays: d.windowDays ?? d.platformWindowDays ?? PLATFORM_WINDOW_DAYS,
    breakMin: d.breakMin ?? PLATFORM_BREAK_MIN,
    requiresApproval: d.requiresApproval,
  };
}

/** Hours as shown: a stored 2000 min is "33.3", not 33.333333333333336 (review r3 of #60). */
export const hoursLabel = (h: number) => String(Number(h.toFixed(1)));
export const windowLabel = (days: number) =>
  days % 7 === 0 ? `${days / 7} week${days === 7 ? '' : 's'}` : `${days} days`;
export const breakLabel = (m: number) => (m ? `${m} min` : 'None');

/**
 * The design's choices, plus the stored value when it isn't one of them (set
 * elsewhere, e.g. 21 days): a native select would otherwise show its first
 * option while keeping the real value (review of #60).
 */
const choices = (list: number[], label: (n: number) => string) => (current: number) =>
  (list.includes(current) ? list : [...list, current].sort((a, b) => a - b)).map((n) => ({
    value: String(n),
    label: label(n),
  }));
export const durationOptions = choices(DURATIONS, (m) => `${m} min`);
/** Choices under the platform's cap (the mentor's defaults carry it). */
export const windowOptions = (current: number, max?: number) =>
  choices(windowPresets(max), windowLabel)(current);
export const breakOptions = choices(BREAKS, breakLabel);
/** Design `t`: "5 pm", "5:30 pm". */
export function shortTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}

/** A day mentees can book: on, with at least one range. */
export const isOpenDay = (d: DayHours | undefined): d is DayHours => !!d?.on && d.slots.length > 0;

/** The week as summaries read it, Monday first (day indexes, Sunday = 0). */
export const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

/** Design `wk`, Monday first: "Mon 5 pm–8 pm · Sat 9 am–1 pm"; null when there are none. */
export function weeklySummary(days: DayHours[]): string | null {
  const parts = MONDAY_FIRST.flatMap((i) => {
    const day = days[i];
    if (!isOpenDay(day)) return [];
    const times = day.slots.map(([a, b]) => `${shortTime(a)}–${shortTime(b)}`).join(', ');
    return [`${DAY_NAMES[i]!.slice(0, 3)} ${times}`];
  });
  return parts.length ? parts.join(' · ') : null;
}

/** Any slot that ends before it starts, overlaps or is too short: the hours can't be saved. */
export function hasSlotErrors(days: DayHours[], minLength = 0): boolean {
  return days.some(
    (d) => d.on && d.slots.some((_, k) => slotError(d.slots, k, minLength) !== null),
  );
}

/** "Set rules for this session" starts from the mentor's own values (review of #60). */
export function customFrom(d: BookingDefaults) {
  const r = resolveDefaults(d);
  return {
    durationMin: r.durationMin,
    noticeHours: r.noticeHours,
    windowDays: r.windowDays,
    breakMin: r.breakMin,
  };
}

/**
 * A template's length ("45 min") holds only as this type's own rule when it
 * isn't the mentor's default length: then it starts in "Set rules for this
 * session", seeded from the mentor's defaults, with the template's length.
 */
export function applyTemplateLength(
  d: Draft,
  templateMin: number,
  defaults: BookingDefaults,
): Draft {
  if (templateMin === resolveDefaults(defaults).durationMin) return d;
  return { ...d, ...customFrom(defaults), rules: 'custom', durationMin: templateMin };
}

/** "Exploring, Applying", or "All stages". */
export function stagesLabel(d: Pick<Draft, 'stages'>): string {
  return d.stages.map((s) => STAGE_LABELS[s]).join(', ') || DETAILS_COPY.anyStage;
}
