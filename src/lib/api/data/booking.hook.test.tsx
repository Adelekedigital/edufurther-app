import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRequestBooking, useSlots, useUploadIntakeFile } from './booking';

const POST = vi.fn();
const GET = vi.fn();
vi.mock('./http', () => ({
  api: {
    POST: (...args: unknown[]) => POST(...args),
    GET: (...args: unknown[]) => GET(...args),
  },
}));

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  POST.mockReset();
  GET.mockReset();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

const cv = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' });

describe('useUploadIntakeFile (POST /me/intake-files)', () => {
  it('sends the File itself as multipart, under `file`', async () => {
    POST.mockResolvedValue({
      data: { file_id: 'f1', filename: 'cv.pdf', size: 8, content_type: 'application/pdf' },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const { result } = renderHook(() => useUploadIntakeFile(), { wrapper });
    await expect(result.current(cv)).resolves.toEqual({ id: 'f1', name: 'cv.pdf', size: 8 });
    const [path, init] = POST.mock.calls[0]!;
    expect(path).toBe('/api/v1/me/intake-files');
    const form = init.bodySerializer(init.body);
    // FormData, not JSON: fetch sets the multipart boundary itself.
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('file')).toBe(cv);
  });

  it('refuses a file over 5 MB before sending it', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf');
    const { result } = renderHook(() => useUploadIntakeFile(), { wrapper });
    await expect(result.current(big)).rejects.toMatchObject({
      message: 'Upload a PDF or Word (.docx) file under 5 MB.',
    });
    expect(POST).not.toHaveBeenCalled();
  });

  it('a network failure is our copy', async () => {
    POST.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useUploadIntakeFile(), { wrapper });
    const e = await result.current(cv).catch((x: unknown) => x);
    expect((e as { message: string }).message).toMatch(/^We couldn’t upload it\. .* Try again\.$/);
    expect((e as { message: string }).message).not.toContain('Failed to fetch');
  });
});

describe('useRequestBooking: a 422 about the answers (backend answer_problems)', () => {
  const refuse = (errors: { pointer: string; message: string }[]) =>
    POST.mockResolvedValue({
      data: undefined,
      error: { type: 'about:blank', title: 'Unprocessable', status: 422, errors },
      response: new Response(null, { status: 422 }),
    });
  const send = async () => {
    const { result } = renderHook(() => useRequestBooking(), { wrapper });
    act(() =>
      result.current.request({
        mentorId: 'm1',
        sessionTypeId: 'st',
        startsAt: '2026-09-30T09:00:00Z',
        answers: { qa: { text: 'Fall' }, qf: { file: { id: 'f1', name: 'cv.pdf', size: 8 } } },
      }),
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    return result.current.error!;
  };

  it('an answer: under its question, in our words', async () => {
    refuse([{ pointer: '/answers/0/option_ids', message: 'server words' }]);
    expect(await send()).toMatchObject({
      questionId: 'qa',
      message: 'Check your answer to this question, then send again.',
    });
  });

  it('a file that can’t be used any more: asks for it again', async () => {
    refuse([{ pointer: '/answers/1/file_id', message: 'already used' }]);
    expect(await send()).toMatchObject({
      questionId: 'qf',
      fileGone: true,
      message: 'Upload the file again: that one can’t be used any more.',
    });
  });

  it('a required question unanswered: says so (not "time taken") and re-reads the questions', async () => {
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    refuse([{ pointer: '/answers', message: 'question q9 is required' }]);
    const e = await send();
    expect(e.message).toBe('Answer every required question (marked *), then send again.');
    expect(e.questionId).toBeUndefined();
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['booking', 'sessionTypes', 'm1'] }),
    );
  });

  it('a question no longer asked: the questions changed, re-read them', async () => {
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    refuse([{ pointer: '/answers/0/question_id', message: 'not a question this offering asks' }]);
    const e = await send();
    expect(e.message).toBe(
      'The questions for this session changed. Check your answers, then send again.',
    );
    expect(e.questionId).toBeUndefined();
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['booking', 'sessionTypes', 'm1'] }),
    );
  });

  it('the error keeps its identity across renders (review r2 of #62)', async () => {
    refuse([{ pointer: '/answers/1/file_id', message: 'already used' }]);
    const { result, rerender } = renderHook(() => useRequestBooking(), { wrapper });
    act(() =>
      result.current.request({
        mentorId: 'm1',
        sessionTypeId: 'st',
        startsAt: '2026-09-30T09:00:00Z',
        answers: { qa: { text: 'Fall' }, qf: { file: { id: 'f1', name: 'cv.pdf', size: 8 } } },
      }),
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    const first = result.current.error;
    rerender();
    expect(result.current.error).toBe(first);
  });

  it('a 422 about the time is still the time', async () => {
    refuse([{ pointer: '/starts_at', message: 'not offered' }]);
    expect((await send()).message).toBe('That time isn’t available any more. Pick another time.');
  });
});

const DAY = 86_400_000;
describe('useSlots: the request follows the session type’s window (backend #309)', () => {
  const typeRow = (id: string, window: number) => ({
    id,
    name: id,
    description: null,
    duration_minutes: 60,
    min_notice_minutes: 1440,
    booking_window_days: window,
    questions: [],
  });

  it('waits for the types, then asks for the window plus a day, within the backend’s limit', async () => {
    let answerTypes!: () => void;
    GET.mockImplementation((path: string) =>
      path.endsWith('/session-types')
        ? new Promise(
            (res) =>
              (answerTypes = () =>
                res({
                  data: { data: [typeRow('short', 7), typeRow('long', 56)], next_cursor: null },
                  error: undefined,
                  response: new Response(null, { status: 200 }),
                })),
          )
        : Promise.resolve({
            data: { data: [], next_cursor: null },
            error: undefined,
            response: new Response(null, { status: 200 }),
          }),
    );
    const { rerender } = renderHook(({ type }) => useSlots('m1', type, 'Africa/Lagos'), {
      wrapper,
      initialProps: { type: 'long' },
    });
    await waitFor(() => expect(GET).toHaveBeenCalledTimes(1));
    // No slots request while the window is unknown.
    expect(GET.mock.calls.some(([p]) => String(p).endsWith('/slots'))).toBe(false);
    await act(async () => answerTypes());
    const range = () => {
      const call = GET.mock.calls.filter(([p]) => String(p).endsWith('/slots')).pop()!;
      const { start, end } = call[1].params.query as { start: string; end: string };
      return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY;
    };
    await waitFor(() => expect(range()).toBe(57));
    // The backend refuses more than its maximum window (56) plus one day.
    expect(range()).toBeLessThanOrEqual(56 + 1);
    rerender({ type: 'short' });
    await waitFor(() => expect(range()).toBe(8));
  });

  it('a range the backend refuses reloads the types, and the new window asks again', async () => {
    let window = 56;
    let slotCalls = 0;
    GET.mockImplementation((path: string) => {
      if (path.endsWith('/session-types'))
        return Promise.resolve({
          data: { data: [typeRow('t', window)], next_cursor: null },
          error: undefined,
          response: new Response(null, { status: 200 }),
        });
      slotCalls++;
      // The maximum was lowered to 14 after the types were cached.
      if (slotCalls === 1) {
        window = 14;
        return Promise.resolve({
          data: undefined,
          error: {},
          response: new Response(null, { status: 422 }),
        });
      }
      return Promise.resolve({
        data: { data: [], next_cursor: null },
        error: undefined,
        response: new Response(null, { status: 200 }),
      });
    });
    renderHook(() => useSlots('m1', 't', 'Africa/Lagos'), { wrapper });
    const ranges = () =>
      GET.mock.calls
        .filter(([p]) => String(p).endsWith('/slots'))
        .map(([, o]) => {
          const { start, end } = o.params.query as { start: string; end: string };
          return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY;
        });
    await waitFor(() => expect(ranges()).toEqual([57, 15]));
  });

  it('opening the flow reads the types again: a cached, since-raised window isn’t used', async () => {
    // Cached with 14 days; the platform default has since gone up to 56.
    qc.setQueryData(
      ['booking', 'sessionTypes', 'm1'],
      [{ id: 't', name: 't', durationMin: 60, description: '', questions: [], windowDays: 14 }],
    );
    GET.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('/session-types')
          ? {
              data: { data: [typeRow('t', 56)], next_cursor: null },
              error: undefined,
              response: new Response(null, { status: 200 }),
            }
          : {
              data: { data: [], next_cursor: null },
              error: undefined,
              response: new Response(null, { status: 200 }),
            },
      ),
    );
    renderHook(() => useSlots('m1', 't', 'Africa/Lagos'), { wrapper });
    const ranges = () =>
      GET.mock.calls
        .filter(([p]) => String(p).endsWith('/slots'))
        .map(([, o]) => {
          const { start, end } = o.params.query as { start: string; end: string };
          return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY;
        });
    await waitFor(() => expect(ranges()).toEqual([57]));
  });
});
