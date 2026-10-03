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

  describe('the mentee booking limits (backend #342)', () => {
    const e = (type: string) => normaliseError(apiError(409, { type }));
    const worded = (type: string) => bookingError(e(type));

    it('each refusal gets its own kind — none of them is a plain conflict', () => {
      expect(e('/problems/booking-overlap').kind).toBe('bookingOverlap');
      expect(e('/problems/booking-with-mentor-exists').kind).toBe('bookingWithMentorExists');
      expect(e('/problems/booking-limit-reached').kind).toBe('bookingLimitReached');
    });

    it('a problem type we do not know still reads as a conflict', () => {
      expect(e('/problems/something-new').kind).toBe('conflict');
    });

    it('none of them says "pick another time" — another time is refused the same way', () => {
      for (const type of [
        '/problems/booking-overlap',
        '/problems/booking-with-mentor-exists',
        '/problems/booking-limit-reached',
      ])
        expect(worded(type).message).not.toMatch(/another time|just taken/i);
    });

    it('none of them suggests cancelling, as the owner required', () => {
      for (const type of [
        '/problems/booking-overlap',
        '/problems/booking-with-mentor-exists',
        '/problems/booking-limit-reached',
      ])
        expect(worded(type).message).not.toMatch(/cancel/i);
    });

    it('says what is actually in the way', () => {
      expect(worded('/problems/booking-overlap').message).toBe(
        'This time overlaps with another session you have.',
      );
      expect(worded('/problems/booking-limit-reached').message).toMatch(
        /already have 2 sessions pending or coming up/,
      );
      expect(worded('/problems/booking-with-mentor-exists').message).toMatch(
        /pending or coming up with this mentor/,
      );
    });

    it('never shows the server’s own detail', () => {
      expect(
        bookingError(normaliseError(apiError(409, { type: '/problems/booking-overlap', detail: 'secret' })))
          .message,
      ).not.toMatch(/secret/);
    });
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
    const later = {
      service_offerings: [],
      questions: [],
      is_featured: false,
      booking_window_days: 56,
    };
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
      windowDays: 56,
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
      booking_window_days: 56,
      is_featured: false,
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
