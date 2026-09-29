import {
  bookingError,
  isAnswered,
  keyForAttempt,
  questionForPointer,
  toAnswers,
  toSessionType,
  uploadError,
} from './booking';
import { ApiError, apiError, normaliseError } from './errors';

describe('booking errors (POST /sessions)', () => {
  it('tells insufficient credit apart from a slot taken meanwhile', () => {
    const credit = normaliseError(
      apiError(409, { type: 'https://api.edufurther.com/problems/insufficient-credit' }),
    );
    expect(credit.kind).toBe('noCredit');
    expect(normaliseError(apiError(409, { type: 'about:blank' })).kind).toBe('conflict');
    expect(normaliseError(apiError(409, undefined)).kind).toBe('conflict');
  });

  it('words each case for booking, never with the server’s detail', () => {
    const e = (status: number, body?: unknown) =>
      bookingError(normaliseError(apiError(status, body)));
    expect(e(401).message).toBe('Log in to book this session.');
    expect(e(409).message).toMatch(/just taken/);
    expect(e(422, { detail: 'starts_at 2026… not in grid' }).message).toMatch(/isn’t available/);
    expect(e(422, { detail: 'secret' }).message).not.toMatch(/secret/);
    expect(e(409, { type: '/problems/insufficient-credit' }).message).toMatch(/out of credits/);
    expect(e(500).message).toMatch(/Try again/);
  });
});

describe('keyForAttempt (Idempotency-Key per booking attempt)', () => {
  let n = 0;
  const newKey = () => `k${++n}`;

  it('reuses the key when the same request is retried', () => {
    const first = keyForAttempt(null, 'A', newKey);
    expect(keyForAttempt(first, 'A', newKey).key).toBe(first.key);
  });

  it('mints a new key for a different time or offering', () => {
    const first = keyForAttempt(null, 'A', newKey);
    expect(keyForAttempt(first, 'B', newKey).key).not.toBe(first.key);
  });
});

describe('toSessionType', () => {
  it('maps the offering and asks no questions until the backend ships them', () => {
    // Fields the spec adds as required (#9 topics, #268 questions), spread so the
    // fixture compiles before and after they ship.
    const later = { service_offerings: [], questions: [] };
    const t = toSessionType({
      id: 'st',
      name: 'CV review',
      description: null,
      duration_minutes: 45,
      min_notice_minutes: 1440,
      meeting_venue: 'google_meet',
      ...later,
    });
    expect(t).toEqual({
      id: 'st',
      name: 'CV review',
      durationMin: 45,
      description: '',
      questions: [],
    });
  });
});

describe('intake questions (backend #268, #12, #282)', () => {
  const question = (
    id: string,
    order: number,
    type: 'free_text' | 'file_upload' | 'multi_choice',
    multiple = false,
  ) => ({
    id,
    question_text: `Q ${id}`,
    question_type: type,
    is_required: id === 'a',
    display_order: order,
    allows_multiple: multiple,
    options: type === 'multi_choice' ? [{ id: `${id}1`, text: 'One' }] : [],
  });

  it('maps every kind, in display order', () => {
    const t = toSessionType({
      id: 'st',
      name: 'CV review',
      description: 'x',
      duration_minutes: 45,
      min_notice_minutes: 1440,
      meeting_venue: 'google_meet',
      service_offerings: [],
      questions: [
        question('d', 3, 'multi_choice', true),
        question('a', 0, 'file_upload'),
        question('c', 2, 'multi_choice'),
        question('b', 1, 'free_text'),
      ],
    });
    expect(t.questions.map((q) => [q.id, q.kind, q.required])).toEqual([
      ['a', 'file', true],
      ['b', 'text', false],
      ['c', 'single', false],
      ['d', 'multi', false],
    ]);
    expect(t.questions[2]!.options).toEqual([{ id: 'c1', label: 'One' }]);
  });

  it('sends one form per answer and leaves unanswered questions out', () => {
    const answers = {
      a: { file: { id: 'f1', name: 'cv.pdf', size: 10 } },
      b: { text: '  Fall intake  ' },
      c: { optionIds: ['c1'] },
      d: { optionIds: [] },
      e: { text: '   ' },
    };
    expect(toAnswers(answers)).toEqual([
      { question_id: 'a', file_id: 'f1' },
      { question_id: 'b', text: 'Fall intake' },
      { question_id: 'c', option_ids: ['c1'] },
    ]);
    expect([answers.d, answers.e, undefined].map(isAnswered)).toEqual([false, false, false]);
  });

  it('a 422 on /answers/{i} names the question that answer was for', () => {
    const sent = [
      { question_id: 'a', file_id: 'f1' },
      { question_id: 'c', option_ids: ['c1'] },
    ];
    expect(questionForPointer({ errors: [{ pointer: '/answers/1/option_ids/0' }] }, sent)).toBe(
      'c',
    );
    expect(questionForPointer({ errors: [{ pointer: '/starts_at' }] }, sent)).toBeUndefined();
    expect(questionForPointer(null, sent)).toBeUndefined();
  });

  it('upload refusals in our words, by status — never the server’s', () => {
    const msg = (s: number) => uploadError(new ApiError(s, 'server text')).message;
    expect(msg(413)).toBe('Upload a PDF or Word (.docx) file under 5 MB.');
    expect(msg(422)).toBe('Upload a PDF or Word (.docx) file under 5 MB.');
    expect(msg(409)).toMatch(/too many files/);
    expect(msg(401)).toBe('Log in to upload a file.');
    expect(msg(500)).toMatch(/aren’t available right now/);
    for (const s of [409, 413, 422, 500]) expect(msg(s)).not.toContain('server text');
  });
});
