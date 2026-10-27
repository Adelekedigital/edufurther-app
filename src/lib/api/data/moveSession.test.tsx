import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { IntakeQuestion, SessionType } from '@/types/mentor';
import {
  carryAnswers,
  takeMoveFailure,
  useMoveSession,
  type MoveCallbacks,
  type MoveRequest,
} from './moveSession';

// Mocked at the client's edge (`./http`), as the other data-layer suites do:
// every request the move makes goes through `api.GET` / `api.POST`, routed
// here by path, so the order and the payloads are the assertions.
type Reply = { data?: unknown; error?: unknown; response: Response };
const calls: { method: string; path: string; init: Record<string, unknown> }[] = [];
let routes: Record<string, (init: Record<string, unknown>) => Reply | Promise<Reply>>;
const handle = (method: string) => (path: string, init: Record<string, unknown>) => {
  calls.push({ method, path, init });
  const r = routes[`${method} ${path}`];
  if (!r) throw new Error(`unrouted ${method} ${path}`);
  return r(init);
};
vi.mock('./http', () => ({
  api: {
    GET: (path: string, init: Record<string, unknown>) => handle('GET')(path, init),
    POST: (path: string, init: Record<string, unknown>) => handle('POST')(path, init),
  },
}));

const ok = (data: unknown = {}): Reply => ({
  data,
  response: { ok: true, status: 200, blob: async () => new Blob(['%PDF']) } as unknown as Response,
});
const fail = (status: number, body: unknown = {}): Reply => ({
  error: body,
  response: { ok: false, status, headers: new Headers() } as unknown as Response,
});

const TYPES = 'GET /api/v1/users/{user_id}/session-types';
const ANSWERS = 'GET /api/v1/sessions/{session_id}/answers';
const FILE = 'GET /api/v1/intake-files/{file_id}';
const UPLOAD = 'POST /api/v1/me/intake-files';
const SLOTS = 'GET /api/v1/users/{user_id}/availability/slots';
const CANCEL = 'POST /api/v1/sessions/{session_id}/cancel';
const BOOK = 'POST /api/v1/sessions';

const Q: IntakeQuestion[] = [
  { id: 'q-text', label: 'Goal', kind: 'text', required: true, options: [] },
  {
    id: 'q-pick',
    label: 'Area',
    kind: 'multi',
    required: false,
    options: [
      { id: 'o1', label: 'Scholarships' },
      { id: 'o2', label: 'Visas' },
    ],
  },
  { id: 'q-cv', label: 'CV', kind: 'file', required: false, options: [] },
];
const TYPE: SessionType = {
  id: 'st1',
  name: '1:1 call',
  durationMin: 30,
  description: '',
  windowDays: 30,
  requiresConfirmation: false,
  questions: Q,
};

/** The same type as `GET /users/{id}/session-types` sends it, read fresh before the cancel. */
const questionRead = (q: IntakeQuestion, i: number) => ({
  id: q.id,
  question_text: q.label,
  question_type:
    q.kind === 'file' ? 'file_upload' : q.kind === 'text' ? 'free_text' : 'multi_choice',
  is_required: q.required,
  display_order: i,
  allows_multiple: q.kind === 'multi',
  options: q.options.map((o) => ({ id: o.id, text: o.label })),
});
const typeRead = (over: Partial<SessionType> = {}) => {
  const t = { ...TYPE, ...over };
  return {
    id: t.id,
    name: t.name,
    duration_minutes: t.durationMin,
    description: t.description,
    booking_window_days: t.windowDays,
    requires_booking_confirmation: t.requiresConfirmation,
    questions: t.questions.map(questionRead),
  };
};

const answerRead = (over: Record<string, unknown>) => ({
  question_text: 'x',
  retired: false,
  answered: true,
  ...over,
});
const CV = {
  id: 'f-old',
  filename: 'cv.pdf',
  content_type: 'application/pdf',
  size: 4,
  available: true,
};
const OLD = [
  answerRead({ question_id: 'q-text', question_type: 'free_text', text: ' Masters in the UK ' }),
  answerRead({
    question_id: 'q-pick',
    question_type: 'multi_choice',
    options: [{ id: 'o2', text: 'Visas' }],
  }),
  answerRead({ question_id: 'q-cv', question_type: 'file_upload', file: CV }),
];

const BOOKING = sampleBookingFor({
  id: 'b1',
  side: 'mentee',
  status: 'confirmed',
  sessionTypeId: 'st1',
  other: sampleParty({ id: 'mentor-1', name: 'Amara Okafor', firstName: 'Amara' }),
});
const STARTS = '2026-10-09T18:00:00Z';

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  calls.length = 0;
  takeMoveFailure();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal('crypto', { ...crypto, randomUUID: () => 'key-1' });
  routes = {
    [TYPES]: () => ok({ data: [typeRead()], next_cursor: null }),
    [ANSWERS]: () => ok({ data: OLD, next_cursor: null }),
    [FILE]: () => ok(),
    [UPLOAD]: () =>
      ok({ file_id: 'f-new', filename: 'cv.pdf', size: 4, content_type: 'application/pdf' }),
    [SLOTS]: () => ok({ data: [{ start: STARTS }] }),
    [CANCEL]: () => ok({ cancelled: true }),
    [BOOK]: () => ok({ id: 'b-new', status: 'confirmed' }),
  };
});

const request = (over: Partial<MoveRequest> = {}): MoveRequest => ({
  booking: BOOKING,
  sessionType: TYPE,
  startsAt: STARTS,
  message: 'Hi Amara, I can’t make it.',
  ...over,
});
const callbacks = (): MoveCallbacks => ({ onMoved: vi.fn(), onBookFailed: vi.fn() });

async function runMove(over: Partial<MoveRequest> = {}) {
  const hook = renderHook(() => useMoveSession(), { wrapper });
  const cb = callbacks();
  await act(() => hook.result.current.move(request(over), cb));
  return { result: hook.result, cb, hook };
}

const sent = (key: string) => calls.filter((c) => `${c.method} ${c.path}` === key);
const nothingChanged = () => {
  expect(sent(CANCEL)).toHaveLength(0);
  expect(sent(BOOK)).toHaveLength(0);
};

describe('a move that goes through', () => {
  it('reads the type fresh, prepares, checks the time, cancels, then books', async () => {
    const { result, cb } = await runMove();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      TYPES,
      ANSWERS,
      FILE,
      UPLOAD,
      SLOTS,
      CANCEL,
      BOOK,
    ]);
    // Confirmed straight away: the new session's page.
    expect(cb.onMoved).toHaveBeenCalledWith('b-new', true);
    expect(cb.onBookFailed).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('a request (approval on) says so, so the page can open it in Bookings', async () => {
    routes[TYPES] = () =>
      ok({ data: [typeRead({ requiresConfirmation: true })], next_cursor: null });
    routes[BOOK] = () => ok({ id: 'b-new', status: 'pending_mentor_approval' });
    const { cb } = await runMove({ sessionType: { ...TYPE, requiresConfirmation: true } });
    expect(cb.onMoved).toHaveBeenCalledWith('b-new', false);
  });

  it('cancels as a scheduling conflict, with the message as the reason text', async () => {
    await runMove({ message: 'Hi Amara, I’ve moved it.' });
    expect(sent(CANCEL)[0]!.init).toMatchObject({
      params: { path: { session_id: 'b1' } },
      body: { reason_code: 'scheduling_conflict', reason_text: 'Hi Amara, I’ve moved it.' },
    });
  });

  it('books the same session type at the picked time, with the answers carried over', async () => {
    await runMove();
    expect(sent(BOOK)[0]!.init.body).toEqual({
      session_type_id: 'st1',
      starts_at: STARTS,
      answers: [
        { question_id: 'q-text', text: 'Masters in the UK' },
        { question_id: 'q-pick', option_ids: ['o2'] },
        // The new upload, never the old file: a used file can't answer another booking.
        { question_id: 'q-cv', file_id: 'f-new' },
      ],
    });
  });

  it('uploads the old file again under its own name and type', async () => {
    await runMove();
    expect(sent(FILE)[0]!.init).toMatchObject({ params: { path: { file_id: 'f-old' } } });
    const file = (sent(UPLOAD)[0]!.init.body as { file: File }).file;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('cv.pdf');
    expect(file.type).toBe('application/pdf');
  });

  it('checks the picked time against a fresh /slots read for this mentor and type', async () => {
    await runMove();
    expect(sent(SLOTS)[0]!.init).toMatchObject({
      params: {
        path: { user_id: 'mentor-1' },
        query: { session_type_id: 'st1', start: '2026-10-07', end: '2026-10-12' },
      },
    });
  });

  it('a second press while the first runs is dropped: one cancel, one booking', async () => {
    let release!: () => void;
    routes[CANCEL] = () => new Promise((r) => (release = () => r(ok({ cancelled: true }))));
    const { result } = renderHook(() => useMoveSession(), { wrapper });
    const cb = callbacks();
    let first!: Promise<void>;
    act(() => {
      first = result.current.move(request(), cb);
    });
    await act(async () => {
      await result.current.move(request(), cb);
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await act(async () => {
      release();
      await first;
    });
    expect(sent(CANCEL)).toHaveLength(1);
    expect(sent(BOOK)).toHaveLength(1);
  });
});

describe('a failure before the cancel changes nothing', () => {
  it.each([ANSWERS, TYPES, SLOTS])('%s can’t be read', async (route) => {
    routes[route] = () => fail(500);
    const { result, cb } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'failed' });
    expect(cb.onMoved).not.toHaveBeenCalled();
    nothingChanged();
  });

  it('too many uploads waiting (409, MAX_PENDING_UPLOADS)', async () => {
    routes[UPLOAD] = () => fail(409);
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({
      stage: 'prepare',
      reason: 'upload',
      error: {
        message: 'You have too many files waiting to be used in a booking. Try again tomorrow.',
      },
    });
    nothingChanged();
  });

  it('ten uploads an hour (429, INTAKE_UPLOADS_PER_HOUR)', async () => {
    routes[UPLOAD] = () => fail(429);
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'upload' });
    expect(result.current.error?.error.message).toMatch(/uploaded a lot of files in the last hour/);
    nothingChanged();
  });

  it('a required question the old booking never answered: no upload, no cancel', async () => {
    routes[ANSWERS] = () => ok({ data: OLD.slice(1), next_cursor: null });
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'questionsChanged' });
    expect(sent(UPLOAD)).toHaveLength(0);
    nothingChanged();
  });

  it('the questions changed since the dialog opened: the fresh form decides', async () => {
    const added: IntakeQuestion = {
      id: 'q-new',
      label: 'New',
      kind: 'text',
      required: true,
      options: [],
    };
    routes[TYPES] = () => ok({ data: [typeRead({ questions: [...Q, added] })], next_cursor: null });
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'questionsChanged' });
    nothingChanged();
  });

  it('the mentor stopped offering the session type', async () => {
    routes[TYPES] = () => ok({ data: [], next_cursor: null });
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'sessionChanged' });
    nothingChanged();
  });

  it('approval was switched since the dialog opened: the wording on screen is out of date', async () => {
    routes[TYPES] = () =>
      ok({ data: [typeRead({ requiresConfirmation: true })], next_cursor: null });
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'sessionChanged' });
    nothingChanged();
  });

  it('the picked time was taken meanwhile: stops before the cancel and refreshes the times', async () => {
    routes[SLOTS] = () => ok({ data: [{ start: '2026-10-10T14:00:00Z' }] });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'slotTaken' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['booking', 'slots', 'mentor-1'] });
    nothingChanged();
  });

  it('a required file that retention removed has its own reason', async () => {
    routes[TYPES] = () =>
      ok({
        data: [
          typeRead({ questions: Q.map((q) => (q.id === 'q-cv' ? { ...q, required: true } : q)) }),
        ],
        next_cursor: null,
      });
    routes[ANSWERS] = () =>
      ok({
        data: [
          ...OLD.slice(0, 2),
          answerRead({
            question_id: 'q-cv',
            question_type: 'file_upload',
            file: { ...CV, available: false },
          }),
        ],
        next_cursor: null,
      });
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'fileUnavailable' });
    nothingChanged();
  });

  it('a file that is gone when downloaded has the same reason', async () => {
    routes[FILE] = () => fail(404);
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'fileUnavailable' });
    nothingChanged();
  });

  it('the cancel is refused: the error as built, and no booking', async () => {
    routes[CANCEL] = () => fail(409, { type: '/problems/conflict' });
    const { result, cb } = await runMove();
    expect(result.current.error).toMatchObject({
      stage: 'cancel',
      error: { message: 'This booking changed while you were looking.' },
    });
    expect(sent(BOOK)).toHaveLength(0);
    expect(cb.onBookFailed).not.toHaveBeenCalled();
  });
});

describe('answers that won’t carry over', () => {
  const withDropped = () =>
    ok({
      data: [
        ...OLD,
        answerRead({
          question_id: 'q-old',
          question_type: 'free_text',
          text: 'Gone now',
          retired: true,
        }),
      ],
      next_cursor: null,
    });

  it('says so before anything changes; pressing again moves it anyway', async () => {
    routes[ANSWERS] = withDropped;
    const { result, cb } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'answersDropped' });
    nothingChanged();
    await act(() => result.current.move(request({ acceptDropped: true }), cb));
    expect(sent(CANCEL)).toHaveLength(1);
    expect(cb.onMoved).toHaveBeenCalledWith('b-new', true);
  });

  it('a choice that is no longer offered counts too', async () => {
    routes[ANSWERS] = () =>
      ok({
        data: [
          OLD[0],
          answerRead({
            question_id: 'q-pick',
            question_type: 'multi_choice',
            options: [
              { id: 'o2', text: 'Visas' },
              { id: 'gone', text: 'Removed' },
            ],
          }),
          OLD[2],
        ],
        next_cursor: null,
      });
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'answersDropped' });
  });
});

describe('uploads within one dialog', () => {
  it('a second attempt reuses the files the first one uploaded', async () => {
    routes[CANCEL] = () => fail(500);
    const { result, cb } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'cancel' });
    routes[CANCEL] = () => ok({ cancelled: true });
    await act(() => result.current.move(request(), cb));
    expect(sent(UPLOAD)).toHaveLength(1);
    expect(sent(BOOK)[0]!.init.body).toMatchObject({
      answers: expect.arrayContaining([{ question_id: 'q-cv', file_id: 'f-new' }]),
    });
  });

  it('closing the dialog (reset) forgets them', async () => {
    routes[CANCEL] = () => fail(500);
    const { result, cb } = await runMove();
    act(() => result.current.reset());
    routes[CANCEL] = () => ok({ cancelled: true });
    await act(() => result.current.move(request(), cb));
    expect(sent(UPLOAD)).toHaveLength(2);
  });
});

describe('a booking that fails after the cancel', () => {
  it.each([
    [fail(409), 'taken'],
    [fail(422, { errors: [{ pointer: '/answers' }] }), 'questions'],
    [fail(500), 'other'],
  ] as const)('says why through onBookFailed (%#), never onMoved', async (reply, why) => {
    routes[BOOK] = () => reply;
    const { result, cb } = await runMove();
    expect(sent(CANCEL)).toHaveLength(1);
    expect(cb.onBookFailed).toHaveBeenCalledWith(expect.objectContaining({ why }));
    expect(cb.onMoved).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });
});

describe('leaving the page mid-move', () => {
  /** Holds `route` until the page has unmounted, then lets it answer `reply`. */
  async function leaveDuring(route: string, reply: Reply) {
    let release!: () => void;
    routes[route] = () => new Promise((r) => (release = () => r(reply)));
    const hook = renderHook(() => useMoveSession(), { wrapper });
    const cb = callbacks();
    let run!: Promise<void>;
    act(() => {
      run = hook.result.current.move(request(), cb);
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    hook.unmount();
    await act(async () => {
      release();
      await run;
    });
    return cb;
  }

  it('before the cancel: nothing is canceled or booked', async () => {
    const cb = await leaveDuring(SLOTS, ok({ data: [{ start: STARTS }] }));
    nothingChanged();
    expect(cb.onMoved).not.toHaveBeenCalled();
  });

  it('after the cancel, booked: no navigation from a page that has gone', async () => {
    const cb = await leaveDuring(BOOK, ok({ id: 'b-new', status: 'confirmed' }));
    expect(sent(CANCEL)).toHaveLength(1);
    expect(cb.onMoved).not.toHaveBeenCalled();
    expect(takeMoveFailure()).toBeNull();
  });

  it('after the cancel, refused: the failure outlives the page for Bookings to say', async () => {
    const cb = await leaveDuring(BOOK, fail(409));
    expect(cb.onBookFailed).not.toHaveBeenCalled();
    expect(takeMoveFailure()).toMatchObject({ booking: { id: 'b1' }, why: 'taken' });
    // Said once.
    expect(takeMoveFailure()).toBeNull();
  });
});

describe('carrying answers onto today’s form', () => {
  it('leaves out retired and unasked questions, and a file that retention removed', () => {
    const old = [
      ...OLD.slice(0, 2),
      answerRead({ question_id: 'q-old', question_type: 'free_text', text: 'gone', retired: true }),
      answerRead({
        question_id: 'q-cv',
        question_type: 'file_upload',
        file: { ...CV, available: false },
      }),
    ] as Parameters<typeof carryAnswers>[0];
    const r = carryAnswers(old, Q);
    expect(Object.keys(r.answers)).toEqual(['q-text', 'q-pick']);
    expect(r.files).toEqual({});
    expect(r.missing).toBe(false);
    expect(r.fileMissing).toBe(false);
    expect(r.dropped).toBe(2);
  });

  it('an answer in another form than the question takes now is not carried', () => {
    const asFile = Q.map((q) => (q.id === 'q-text' ? { ...q, kind: 'file' as const } : q));
    expect(carryAnswers(OLD as Parameters<typeof carryAnswers>[0], asFile).missing).toBe(true);
  });
});
