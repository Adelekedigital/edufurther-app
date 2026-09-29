import { blankDraft, type Draft, type DraftQuestion } from './sessionTypeDraft';
import { planQuestions, toPatchBody, type SavedQuestion } from './sessionTypeEdit';

const ids = { 'document-preparation': 'o4', 'school-selection': 'o1' };
const saved: Draft = {
  ...blankDraft(),
  name: 'SOP review',
  description: 'Line by line.',
  topics: ['document-preparation'],
  stages: ['drafting_stage'],
};

describe('toPatchBody (only what changed)', () => {
  it('an untouched draft sends nothing', () => {
    expect(toPatchBody({ ...saved }, saved, ids)).toEqual({});
  });

  it('sends each changed field, in the API’s shape', () => {
    const d: Draft = {
      ...saved,
      name: ' SOP review+ ',
      topics: ['document-preparation', 'school-selection'],
      stages: ['drafting_stage', 'other'],
      customStage: 'Deferred',
    };
    expect(toPatchBody(d, saved, ids)).toEqual({
      name: 'SOP review+',
      service_offering_ids: ['o4', 'o1'],
      application_stages: ['drafting_stage', 'other'],
      custom_stage_label: 'Deferred',
    });
  });

  it('switching to own rules sends them; switching back sends null (inherit)', () => {
    const own: Draft = { ...saved, rules: 'custom', durationMin: 45, noticeHours: 48 };
    expect(toPatchBody(own, saved, ids)).toMatchObject({
      duration_minutes: 45,
      min_notice_minutes: 2880,
    });
    expect(toPatchBody(saved, own, ids)).toMatchObject({
      duration_minutes: null,
      min_notice_minutes: null,
      booking_window_days: null,
      break_after_minutes: null,
    });
  });
});

const sq = (id: string, over: Partial<SavedQuestion> = {}): SavedQuestion => ({
  id,
  text: `Q ${id}`,
  kind: 'free_text',
  required: false,
  options: [],
  ...over,
});
const dq = (q: SavedQuestion, over: Partial<DraftQuestion> = {}): DraftQuestion => ({
  key: q.id,
  id: q.id,
  text: q.text,
  kind: q.kind,
  required: q.required,
  options: q.options.map((o) => o.text),
  ...over,
});

describe('planQuestions', () => {
  const a = sq('a');
  const b = sq('b', {
    kind: 'single',
    options: [
      { id: 'b1', text: 'Fall' },
      { id: 'b2', text: 'Spring' },
    ],
  });

  it('untouched: nothing', () => {
    expect(planQuestions([dq(a), dq(b)], [a, b])).toEqual({
      remove: [],
      update: [],
      add: [],
      reorder: false,
    });
  });

  it('removed, changed (options keep their ids by text), added, reordered', () => {
    const plan = planQuestions(
      [
        dq(b, { required: true, options: ['spring', 'Summer'] }),
        { key: 'n1', text: 'New one?', kind: 'free_text', required: false, options: [] },
      ],
      [a, b],
    );
    expect(plan.remove).toEqual(['a']);
    expect(plan.update).toEqual([
      {
        id: 'b',
        body: {
          is_required: true,
          // "spring" matches "Spring" (case aside): its id is kept; "Fall" goes; "Summer" is new.
          options: [{ id: 'b2', text: 'spring' }, { text: 'Summer' }],
        },
      },
    ]);
    expect(plan.add).toEqual([
      {
        key: 'n1',
        body: {
          question_text: 'New one?',
          question_type: 'free_text',
          is_required: false,
          display_order: 1,
        },
      },
    ]);
    expect(plan.reorder).toBe(true);
  });

  it('a kind change sends the type (and options for a choice)', () => {
    const plan = planQuestions([dq(a, { kind: 'multi', options: ['X', 'Y'] })], [a]);
    expect(plan.update[0]!.body).toEqual({
      question_type: 'multi_choice',
      allows_multiple: true,
      options: [{ text: 'X' }, { text: 'Y' }],
    });
  });

  it('only moving questions reorders, with no other request', () => {
    expect(planQuestions([dq(b), dq(a)], [a, b])).toEqual({
      remove: [],
      update: [],
      add: [],
      reorder: true,
    });
  });
});
