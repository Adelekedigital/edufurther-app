import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { ApiError } from './errors';
import { statusError, toMentorStatus, usePause, useResume } from './mentorStatus';

const POST = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => POST(...a) } }));
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('toMentorStatus', () => {
  it('busy only when the mentor paused themselves', () => {
    expect(
      toMentorStatus({
        approval_status: 'approved',
        listing_status: 'unlisted',
        paused_by_mentor: true,
        return_on: '2026-10-16',
      }),
    ).toEqual({ approved: true, listed: false, pausedByMentor: true, returnOn: '2026-10-16' });
    // An admin unlisting: not busy, and no fields yet (before backend #324) read as false/null.
    expect(toMentorStatus({ approval_status: 'approved', listing_status: 'unlisted' })).toEqual({
      approved: true,
      listed: false,
      pausedByMentor: false,
      returnOn: null,
    });
  });
  it('an applicant in review or declined is not approved', () => {
    for (const approval_status of ['pending', 'declined'] as const)
      expect(toMentorStatus({ approval_status, listing_status: 'unlisted' }).approved).toBe(false);
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

  it('offline names what didn’t happen: busy or available', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(statusError(new TypeError('Failed to fetch'), true).message).toBe(
      'You’re offline, so we couldn’t set you as busy. Try again when you reconnect.',
    );
    expect(statusError(new TypeError('Failed to fetch'), false).message).toBe(
      'You’re offline, so we couldn’t set you as available. Try again when you reconnect.',
    );
    online.mockRestore();
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

describe('useResume', () => {
  beforeEach(() => POST.mockReset());
  it('resumes, and refreshes the viewer, status, slots and cards', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useResume('m1'), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await result.current.resume();
    expect(POST.mock.calls[0]![0]).toBe('/api/v1/users/{user_id}/mentor-profile/resume');
    const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]!.queryKey));
    expect(keys).toEqual(
      expect.arrayContaining([
        '["viewer"]',
        '["booking"]',
        '["mentors"]',
        '["calendar","status","m1"]',
      ]),
    );
  });
  it('a failure is our copy', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 500 }), error: {} });
    const { result } = renderHook(() => useResume('m1'), { wrapper });
    await expect(result.current.resume()).rejects.toMatchObject({
      message: 'We couldn’t set you as available. Try again.',
    });
  });
});

describe('offline', () => {
  beforeEach(() => {
    POST.mockReset().mockRejectedValue(new TypeError('Failed to fetch'));
    onlineManager.setOnline(false);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  });
  afterEach(() => {
    onlineManager.setOnline(true);
    vi.restoreAllMocks();
  });
  // A paused mutation never settles, so the offline copy could never show.
  it('going busy fails at once with the offline copy, rather than waiting to reconnect', async () => {
    const { result } = renderHook(() => usePause('m1'), { wrapper });
    await expect(result.current.pause({ returnOn: null })).rejects.toMatchObject({
      message: 'You’re offline, so we couldn’t set you as busy. Try again when you reconnect.',
    });
  });
  it('going back fails at once with the offline copy', async () => {
    const { result } = renderHook(() => useResume('m1'), { wrapper });
    await expect(result.current.resume()).rejects.toMatchObject({
      message: 'You’re offline, so we couldn’t set you as available. Try again when you reconnect.',
    });
  });
});
