import { SESSION_TEMPLATES } from './sessionTemplates';
import {
  blankDraft,
  copyForField,
  defaultsSummary,
  draftFromTemplate,
  hasSlotErrors,
  emptyWeek,
  fieldForPointer,
  parseOptions,
  questionError,
  slotError,
  stepOf,
  toCreateBody,
  toWindows,
  validateStep,
  weeklySummary,
  type Draft,
} from './sessionTypeDraft';

const ids = { 'document-preparation': 'o4', 'school-selection': 'o1' };
const filled = (over: Partial<Draft> = {}): Draft => ({
  ...blankDraft(),
  name: ' SOP review ',
  description: 'Leave with a list.',
  topics: ['document-preparation'],
  ...over,
});

describe('validateStep', () => {
  it('step 1 needs a name, what mentees get and a topic; "other" needs its words', () => {
    expect(Object.keys(validateStep(blankDraft(), 1)).sort()).toEqual([
      'description',
      'name',
      'topics',
    ]);
    expect(validateStep(filled(), 1)).toEqual({});
    expect(validateStep(filled({ stage: 'other', customStage: ' ' }), 1).stage).toBeTruthy();
  });

  it('step 3 with dedicated hours needs a day on, and flags bad or overlapping slots', () => {
    const d = filled({ hours: 'custom' });
    expect(validateStep(d, 3).hours).toBeTruthy();
    d.days[3] = {
      on: true,
      slots: [
        [600, 540],
        [900, 1020],
        [960, 1080],
      ],
    };
    const e = validateStep(d, 3);
    expect(e['slot-3-0']).toBe('End time must be after the start time.');
    expect(e['slot-3-1']).toBe('These hours overlap with another time on this day.');
    expect(e.hours).toBeUndefined();
    expect(validateStep(filled(), 3)).toEqual({}); // Calendar hours: nothing to check
  });

  it('slotError: touching slots are fine, overlapping ones are not', () => {
    expect(
      slotError(
        [
          [540, 600],
          [600, 660],
        ],
        0,
      ),
    ).toBeNull();
    expect(
      slotError(
        [
          [540, 630],
          [600, 660],
        ],
        1,
      ),
    ).toMatch(/overlap/);
  });
});

describe('questions', () => {
  it('a choice needs two distinct options; text is always needed', () => {
    expect(questionError({ text: ' ', kind: 'free_text', options: [] })).toBe(
      'Write the question.',
    );
    expect(questionError({ text: 'When?', kind: 'single', options: ['Fall'] })).toMatch(
      /two options/,
    );
    expect(questionError({ text: 'When?', kind: 'multi', options: ['Yes', 'yes'] })).toMatch(
      /different/,
    );
    expect(questionError({ text: 'When?', kind: 'single', options: ['Yes', 'No'] })).toBeNull();
    expect(parseOptions(' Yes, ,No ')).toEqual(['Yes', 'No']);
  });
});

describe('toCreateBody', () => {
  it('maps the draft: minutes, topic ids, inherit as null, choices as multi_choice', () => {
    const body = toCreateBody(
      filled({
        topics: ['document-preparation', 'school-selection'],
        noticeHours: 48,
        icon: 'lightbulb',
        questions: [
          { key: 'a', text: 'Programs?', kind: 'free_text', required: true, options: [] },
          {
            key: 'b',
            text: 'Start?',
            kind: 'single',
            required: false,
            options: ['Fall', 'Spring'],
          },
          { key: 'c', text: 'Areas?', kind: 'multi', required: false, options: ['A', 'B'] },
        ],
      }),
      ids,
    );
    expect(body).toMatchObject({
      name: 'SOP review',
      // "Use my defaults": length and notice inherit too (backend round 3 B).
      duration_minutes: null,
      min_notice_minutes: null,
      service_offering_ids: ['o4', 'o1'],
      icon: 'lightbulb',
      requires_booking_confirmation: null,
      booking_window_days: null,
      break_after_minutes: null,
      custom_stage_label: null,
    });
    expect(body.questions[0]).toEqual({
      question_text: 'Programs?',
      question_type: 'free_text',
      is_required: true,
      display_order: 0,
    });
    expect(body.questions[1]).toMatchObject({
      question_type: 'multi_choice',
      allows_multiple: false,
    });
    expect(body.questions[2]).toMatchObject({
      allows_multiple: true,
      options: [{ text: 'A' }, { text: 'B' }],
    });
  });

  it('own rules and approval are sent; a custom stage carries its label', () => {
    const body = toCreateBody(
      filled({
        rules: 'custom',
        noticeHours: 48,
        windowDays: 14,
        breakMin: 10,
        approval: 'off',
        stage: 'other',
        customStage: ' Deferred ',
      }),
      ids,
    );
    expect(body).toMatchObject({
      duration_minutes: 60,
      min_notice_minutes: 2880,
      booking_window_days: 14,
      break_after_minutes: 10,
      requires_booking_confirmation: false,
      application_stage: 'other',
      custom_stage_label: 'Deferred',
    });
  });
});

describe('toWindows', () => {
  it('one window per slot on the days that are on, Sunday = 0, midnight end as 23:59:59', () => {
    const d = blankDraft();
    d.days[0] = { on: true, slots: [[1320, 1440]] };
    d.days[3] = {
      on: true,
      slots: [
        [540, 600],
        [1020, 1110],
      ],
    };
    d.days[5] = { on: false, slots: [[540, 600]] };
    expect(toWindows(d.days, 'Africa/Lagos')).toEqual([
      {
        day_of_week: 0,
        start_time: '22:00:00',
        end_time: '23:59:59',
        timezone: 'Africa/Lagos',
        is_active: true,
      },
      {
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '10:00:00',
        timezone: 'Africa/Lagos',
        is_active: true,
      },
      {
        day_of_week: 3,
        start_time: '17:00:00',
        end_time: '18:30:00',
        timezone: 'Africa/Lagos',
        is_active: true,
      },
    ]);
  });
});

describe('templates', () => {
  it('pre-fill the name, description, topic, length and questions', () => {
    const d = draftFromTemplate(SESSION_TEMPLATES[0]!);
    expect(d).toMatchObject({
      name: 'SOP draft review',
      topics: ['document-preparation'],
      durationMin: 60,
    });
    expect(d.questions.map((q) => q.kind)).toEqual(['free_text', 'file_upload']);
    expect(new Set(d.questions.map((q) => q.key)).size).toBe(2);
  });

  it('a template with its own length starts with its own rules, so the length holds', () => {
    expect(draftFromTemplate(SESSION_TEMPLATES[0]!).rules).toBe('default'); // 60 min
    const visa = draftFromTemplate(SESSION_TEMPLATES[1]!);
    expect(visa).toMatchObject({ durationMin: 45, rules: 'custom' });
    expect(toCreateBody(visa, {}).duration_minutes).toBe(45);
  });
});

describe('summaries (Session Types.dc.html, rulesFlow=inline)', () => {
  it('the defaults line: the mentor’s values, the platform’s where unset', () => {
    expect(
      defaultsSummary({
        durationMin: 60,
        noticeHours: 24,
        windowDays: 14,
        breakMin: 15,
        requiresApproval: true,
      }),
    ).toBe(
      '60 min sessions · at least 24 hours notice · bookable up to 2 weeks ahead · 15 min break · you approve each request',
    );
    expect(
      defaultsSummary({
        durationMin: null,
        noticeHours: null,
        windowDays: null,
        breakMin: null,
        requiresApproval: false,
      }),
    ).toBe(
      '60 min sessions · at least 24 hours notice · bookable up to 8 weeks ahead · no break · instant confirm',
    );
  });

  it('the weekly line: Monday first, short times, null with no hours', () => {
    const week = emptyWeek();
    week[0] = { on: true, slots: [[600, 660]] }; // Sunday
    week[1] = {
      on: true,
      slots: [
        [1020, 1200],
        [1230, 1290],
      ],
    };
    week[3] = { on: false, slots: [[540, 600]] }; // off: not shown
    expect(weeklySummary(week)).toBe('Mon 5 pm–8 pm, 8:30 pm–9:30 pm · Sun 10 am–11 am');
    expect(weeklySummary(emptyWeek())).toBeNull();
  });

  it('hours that end first or overlap block a save; days that are off don’t count', () => {
    const week = emptyWeek();
    week[2] = { on: true, slots: [[600, 540]] };
    expect(hasSlotErrors(week)).toBe(true);
    week[2] = { on: false, slots: [[600, 540]] };
    expect(hasSlotErrors(week)).toBe(false);
  });
});

describe('422 pointers → the owning field and step', () => {
  it.each([
    ['/name', 'name', 1],
    ['/service_offering_ids', 'topics', 1],
    ['/service_offering_ids/3', 'topics', 1],
    ['/custom_stage_label', 'stage', 1],
    ['/questions/2/options/0/text', 'question-2', 2],
    ['/questions', 'questions', 2],
    ['/booking_window_days', 'rules', 3],
  ] as const)('%s → %s (step %i)', (pointer, field, step) => {
    const f = fieldForPointer(pointer)!;
    expect(f).toBe(field);
    expect(stepOf(f)).toBe(step);
    expect(copyForField(f)).not.toMatch(/pointer|\//);
  });

  it('a pointer we do not own is the request as a whole', () => {
    expect(fieldForPointer('/query/limit')).toBeNull();
  });
});
