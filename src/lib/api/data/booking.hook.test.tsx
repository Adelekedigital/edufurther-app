import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRequestBooking, useUploadIntakeFile } from './booking';

const POST = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...args: unknown[]) => POST(...args) } }));

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  POST.mockReset();
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

  it('a 422 about the time is still the time', async () => {
    refuse([{ pointer: '/starts_at', message: 'not offered' }]);
    expect((await send()).message).toBe('That time isn’t available any more. Pick another time.');
  });
});
