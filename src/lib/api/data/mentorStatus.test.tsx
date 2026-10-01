import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { ApiError } from './errors';
import { statusError, toMentorStatus, usePause } from './mentorStatus';

const POST = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => POST(...a) } }));
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('toMentorStatus', () => {
  it('busy only when the mentor paused themselves', () => {
    expect(
      toMentorStatus({
        listing_status: 'unlisted',
        paused_by_mentor: true,
        return_on: '2026-10-16',
      }),
    ).toEqual({ listed: false, pausedByMentor: true, returnOn: '2026-10-16' });
    // An admin unlisting: not busy, and no fields yet (before backend #324) read as false/null.
    expect(toMentorStatus({ listing_status: 'unlisted' })).toEqual({
      listed: false,
      pausedByMentor: false,
      returnOn: null,
    });
  });
});

describe('statusError', () => {
  it('maps the backend’s refusals to our copy', () => {
    expect(statusError(new ApiError(409), true).message).toMatch(/taken off the listing/);
    expect(statusError(new ApiError(422), true).message).toBe('Pick a return date after today.');
    expect(statusError(new ApiError(500), true).message).toBe(
      'We couldn’t set you as busy. Try again.',
    );
    expect(statusError(new ApiError(500), false).message).toBe(
      'We couldn’t set you as available. Try again.',
    );
  });
});

describe('usePause', () => {
  beforeEach(() => POST.mockReset());
  it('sends the return date (null for "Not sure yet")', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const { result } = renderHook(() => usePause('m1'), { wrapper });
    await result.current.pause({ returnOn: '2026-10-16' });
    expect(POST.mock.calls[0]![1]).toMatchObject({
      params: { path: { user_id: 'm1' } },
      body: { return_on: '2026-10-16' },
    });
    await result.current.pause({ returnOn: null });
    expect(POST.mock.calls[1]![1].body).toEqual({ return_on: null });
  });
  it('a 409 is our admin-unlisted copy', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 409 }), error: {} });
    const { result } = renderHook(() => usePause('m1'), { wrapper });
    await expect(result.current.pause({ returnOn: null })).rejects.toMatchObject({ status: 409 });
  });
});
