import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { IntakeQuestion, SessionType } from '@/types/mentor';
import { carryAnswers, useMoveSession, type MoveCallbacks } from './moveSession';

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

const ANSWERS = 'GET /api/v1/sessions/{session_id}/answers';
const FILE = 'GET /api/v1/intake-files/{file_id}';
const UPLOAD = 'POST /api/v1/me/intake-files';
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

const answerRead = (over: Record<string, unknown>) => ({
  question_text: 'x',
  retired: false,
  answered: true,
  ...over,
});
const OLD = [
  answerRead({ question_id: 'q-text', question_type: 'free_text', text: ' Masters in the UK ' }),
  answerRead({
    question_id: 'q-pick',
    question_type: 'multi_choice',
    options: [
      { id: 'o2', text: 'Visas' },
      { id: 'gone', text: 'Removed option' },
    ],
  }),
  answerRead({
    question_id: 'q-cv',
    question_type: 'file_upload',
    file: {
      id: 'f-old',
      filename: 'cv.pdf',
      content_type: 'application/pdf',
      size: 4,
      available: true,
    },
  }),
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
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal('crypto', { ...crypto, randomUUID: () => 'key-1' });
  routes = {
    [ANSWERS]: () => ok({ data: OLD, next_cursor: null }),
    [FILE]: () => ok(),
    [UPLOAD]: () =>
      ok({ file_id: 'f-new', filename: 'cv.pdf', size: 4, content_type: 'application/pdf' }),
    [CANCEL]: () => ok({ cancelled: true }),
    [BOOK]: () => ok({ id: 'b-new', status: 'confirmed' }),
  };
});

async function runMove(message = 'Hi Amara, I can’t make it.') {
  const { result } = renderHook(() => useMoveSession(), { wrapper });
  const cb: MoveCallbacks = { onMoved: vi.fn(), onBookFailed: vi.fn() };
  await act(() =>
    result.current.move({ booking: BOOKING, sessionType: TYPE, startsAt: STARTS, message }, cb),
  );
  return { result, cb };
}

const sent = (key: string) => calls.filter((c) => `${c.method} ${c.path}` === key);

describe('a move that goes through', () => {
  it('prepares, cancels, then books, in that order, and lands on the new session', async () => {
    const { result, cb } = await runMove();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      ANSWERS,
      FILE,
      UPLOAD,
      CANCEL,
      BOOK,
    ]);
    expect(cb.onMoved).toHaveBeenCalledWith('b-new');
    expect(cb.onBookFailed).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('cancels as a scheduling conflict, with the message as the reason text', async () => {
    await runMove('Hi Amara, I’ve moved it.');
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
        // Only options the question still has.
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

  it('a second press while the first runs is dropped: one cancel, one booking', async () => {
    let release!: () => void;
    routes[CANCEL] = () => new Promise((r) => (release = () => r(ok({ cancelled: true }))));
    const { result } = renderHook(() => useMoveSession(), { wrapper });
    const cb: MoveCallbacks = { onMoved: vi.fn(), onBookFailed: vi.fn() };
    const req = { booking: BOOKING, sessionType: TYPE, startsAt: STARTS, message: 'm' };
    let first!: Promise<void>;
    act(() => {
      first = result.current.move(req, cb);
    });
    await act(async () => {
      await result.current.move(req, cb);
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
  const nothingChanged = () => {
    expect(sent(CANCEL)).toHaveLength(0);
    expect(sent(BOOK)).toHaveLength(0);
  };

  it('the old answers can’t be read', async () => {
    routes[ANSWERS] = () => fail(500);
    const { result, cb } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'failed' });
    expect(cb.onMoved).not.toHaveBeenCalled();
    nothingChanged();
  });

  it('the old file can’t be downloaded', async () => {
    routes[FILE] = () => fail(404);
    const { result } = await runMove();
    expect(result.current.error).toMatchObject({ stage: 'prepare', reason: 'failed' });
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

describe('a booking that fails after the cancel', () => {
  it('says so through onBookFailed, never onMoved, and leaves no dialog error', async () => {
    routes[BOOK] = () => fail(409);
    const { result, cb } = await runMove();
    expect(sent(CANCEL)).toHaveLength(1);
    expect(cb.onBookFailed).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'That time was just taken. Pick another time.' }),
    );
    expect(cb.onMoved).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
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
        file: {
          id: 'f',
          filename: 'cv.pdf',
          content_type: 'application/pdf',
          size: 1,
          available: false,
        },
      }),
    ] as Parameters<typeof carryAnswers>[0];
    const r = carryAnswers(old, Q);
    expect(Object.keys(r.answers)).toEqual(['q-text', 'q-pick']);
    expect(r.files).toEqual({});
    expect(r.missing).toBe(false);
  });

  it('an answer in another form than the question takes now is not carried', () => {
    const asFile = Q.map((q) => (q.id === 'q-text' ? { ...q, kind: 'file' as const } : q));
    expect(carryAnswers(OLD as Parameters<typeof carryAnswers>[0], asFile).missing).toBe(true);
  });
});
