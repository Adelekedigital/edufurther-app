import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  toAdminEducation,
  toAdminMentorDetail,
  toAdminMentorRow,
  isSelfPausedError,
  useAddAdminNote,
  useAdminMentor,
  useAdminMentors,
  useApproveMentor,
  useBulkApprove,
  useDeclineMentor,
  usePauseMentor,
  useResumeMentor,
} from './adminMentors';
import { ApiError, apiError } from './errors';
import type { components } from '@/lib/api/generated/schema';

type WireMentorRow = components['schemas']['AdminMentorRowRead'];
type WireMentorDetail = components['schemas']['AdminMentorRead'];

const GET = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));

const okRes = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });
const failRes = (status: number) => ({
  data: undefined,
  error: {},
  response: new Response(null, { status }),
});

const row: WireMentorRow = {
  user_id: 'm1',
  first_name: 'Jimoh',
  last_name: 'Marko',
  avatar_url: null,
  cover_color: null,
  handle: 'jimoh-marko',
  email: 'jimoh@example.com',
  submitted_at: '2026-10-19T10:00:00Z',
  approved_at: null,
  decided_at: null,
  paused_at: null,
  paused_by: null,
  paused_reason: null,
  decline_reason: null,
  waiting_days: 7,
  first_school: { name: 'University of Toronto', country: 'Canada' },
  completed_sessions: 0,
  upcoming_sessions: 0,
  show_up_rate: 45,
  show_up_tier: 'at_risk',
};

const detail: WireMentorDetail = {
  user_id: 'm1',
  first_name: 'Jimoh',
  last_name: 'Marko',
  avatar_url: null,
  cover_color: null,
  handle: 'jimoh-marko',
  email: 'jimoh@example.com',
  status: 'not_approved',
  waiting_days: null,
  decline_reason: 'No school',
  paused_at: null,
  paused_by: null,
  paused_reason: null,
  submitted_at: '2026-10-19T10:00:00Z',
  approved_at: null,
  decided_at: '2026-10-21T10:00:00Z',
  linkedin_url: 'https://linkedin.com/in/jimoh',
  timezone: 'Africa/Lagos',
  headline: '  ',
  about: 'About me',
  education: [],
  help_areas: [{ id: 'o1', code: 'program-selection', display_name: 'Program selection' }],
  weekly_hours: [1, 3].map((d) => ({
    id: `r${d}`,
    day_of_week: d,
    start_time: '18:00:00',
    end_time: '21:00:00',
    timezone: 'Africa/Lagos',
    is_active: true,
  })) as WireMentorDetail['weekly_hours'],
  stats: { completed: 1, upcoming: 2, missed_by_mentor: 0, show_up_rate: null, show_up_tier: null },
  recent_bookings: Array.from({ length: 7 }, (_, i) => ({
    id: `b${i}`,
    mentee_first_name: 'Amara',
    mentee_last_name: 'Okafor',
    starts_at: '2026-10-20T10:00:00Z',
    outcome: 'completed' as const,
  })),
  paused: null,
  declined: { at: '2026-10-21T10:00:00Z', reason: 'No school' },
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function withClient() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const w = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { w, spy };
}

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
});

describe('mappers', () => {
  it('maps a row, keeping the backend tier as it is', () => {
    const r = toAdminMentorRow(row);
    expect(r).toMatchObject({
      id: 'm1',
      name: 'Jimoh Marko',
      firstName: 'Jimoh',
      initials: 'JM',
      waitingDays: 7,
      school: { name: 'University of Toronto', country: 'Canada' },
      showUpTier: 'atRisk',
    });
    // The tier is read, not recomputed from the rate.
    expect(toAdminMentorRow({ ...row, show_up_tier: 'on_track' }).showUpTier).toBe('onTrack');
  });

  it('falls back to the email for a person with no name', () => {
    const r = toAdminMentorRow({ ...row, first_name: null, last_name: null });
    expect(r.name).toBe('jimoh@example.com');
    expect(r.initials).toBe('J');
  });

  it('maps the drawer: status, blanks to null, hours lines, five bookings', () => {
    const d = toAdminMentorDetail(detail);
    expect(d.status).toBe('notApproved');
    expect(d.headline).toBeNull();
    expect(d.helpAreas).toEqual(['Program selection']);
    expect(d.hours).toEqual(['Mon, Wed, 6:00 pm – 9:00 pm']);
    expect(d.hoursZone).toBe('Africa/Lagos');
    expect(d.recentBookings).toHaveLength(5);
    expect(d.recentBookings[0]!.mentee).toBe('Amara Okafor');
    expect(d.declined?.reason).toBe('No school');
  });

  it('a pause or decline with no date keeps who and why', () => {
    const d = toAdminMentorDetail({
      ...detail,
      status: 'paused',
      declined: null,
      paused: { at: null, by: 'mentor', reason: null },
    });
    expect(d.paused).toEqual({ at: null, by: 'mentor', reason: null });
    expect(
      toAdminMentorDetail({ ...detail, declined: { at: null, reason: 'Why' } }).declined,
    ).toEqual({ at: null, reason: 'Why' });
  });

  it('a booking mentee with no name reads as a deleted user', () => {
    const d = toAdminMentorDetail({
      ...detail,
      recent_bookings: [
        { ...detail.recent_bookings[0]!, mentee_first_name: null, mentee_last_name: null },
      ],
    });
    expect(d.recentBookings[0]).toMatchObject({ mentee: 'Deleted user', menteeFirstName: '' });
  });

  it('a LinkedIn link renders only as https on linkedin.com', () => {
    const at = (u: string) => toAdminMentorDetail({ ...detail, linkedin_url: u }).linkedinUrl;
    expect(at('https://www.linkedin.com/in/jimoh')).toBe('https://www.linkedin.com/in/jimoh');
    expect(at('javascript:alert(1)')).toBeNull();
    expect(at('http://www.linkedin.com/in/jimoh')).toBeNull();
  });

  it('no hours: no lines and no zone', () => {
    const d = toAdminMentorDetail({ ...detail, weekly_hours: [] });
    expect(d.hours).toEqual([]);
    expect(d.hoursZone).toBeNull();
  });

  it('maps a degree with its school country, current when it has no end', () => {
    const e = toAdminEducation({
      id: 'e1',
      school_name_raw: 'uoft',
      institution: {
        id: 'i',
        name: 'University of Toronto',
        country: { code: 'CA', display_name: 'Canada' },
      },
      degree_abbreviation: 'PhD',
      study_course: 'Public Health',
      date_start: '2023-09-01',
      date_end: null,
      is_most_recent: true,
    } as Parameters<typeof toAdminEducation>[0]);
    expect(e).toMatchObject({
      degree: 'PhD',
      course: 'Public Health',
      school: 'University of Toronto',
      country: 'Canada',
      start: '2023',
      end: null,
      current: true,
    });
  });
});

describe('reads', () => {
  it('asks for the tab by its wire name', async () => {
    GET.mockResolvedValue(okRes({ data: [row], next_cursor: null }));
    const { result } = renderHook(() => useAdminMentors('a1', 'notApproved'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(GET).toHaveBeenCalledWith('/api/v1/admin/mentors', {
      params: { query: { tab: 'not_approved' } },
      signal: expect.anything(),
    });
    expect(result.current.data?.[0]?.name).toBe('Jimoh Marko');
  });

  it('never asks without an admin', () => {
    renderHook(() => useAdminMentors(null, 'applications'), { wrapper });
    renderHook(() => useAdminMentor('a1', null), { wrapper });
    expect(GET).not.toHaveBeenCalled();
  });

  it('a failed read is an ApiError with its status', async () => {
    GET.mockResolvedValue(failRes(500));
    const { result } = renderHook(() => useAdminMentor('a1', 'm1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe('writes', () => {
  it('approve and decline use the decision call; decline always sends the comment', async () => {
    POST.mockResolvedValue(okRes({ decided: true }));
    const { w, spy } = withClient();
    const a = renderHook(() => useApproveMentor(), { wrapper: w });
    await act(() => a.result.current.mutateAsync('m1'));
    expect(POST).toHaveBeenLastCalledWith('/api/v1/admin/mentors/{user_id}/decision', {
      params: { path: { user_id: 'm1' }, query: { approve: true } },
      body: {},
    });
    const d = renderHook(() => useDeclineMentor(), { wrapper: w });
    await act(() => d.result.current.mutateAsync({ id: 'm1', reason: 'Why' }));
    expect(POST).toHaveBeenLastCalledWith('/api/v1/admin/mentors/{user_id}/decision', {
      params: { path: { user_id: 'm1' }, query: { approve: false } },
      body: { reason: 'Why' },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['admin'] });
  });

  it('pause sends the reason, resume lists again', async () => {
    POST.mockResolvedValue(okRes({ changed: true }));
    const { w } = withClient();
    const p = renderHook(() => usePauseMentor(), { wrapper: w });
    await act(() => p.result.current.mutateAsync({ id: 'm1', reason: 'No-shows' }));
    expect(POST).toHaveBeenLastCalledWith('/api/v1/admin/mentors/{user_id}/listing', {
      params: { path: { user_id: 'm1' }, query: { listed: false } },
      body: { reason: 'No-shows' },
    });
    const r = renderHook(() => useResumeMentor(), { wrapper: w });
    await act(() => r.result.current.mutateAsync('m1'));
    expect(POST).toHaveBeenLastCalledWith('/api/v1/admin/mentors/{user_id}/listing', {
      params: { path: { user_id: 'm1' }, query: { listed: true } },
      body: {},
    });
  });

  it('bulk approve returns approved and failed', async () => {
    POST.mockResolvedValue(okRes({ approved: ['m1'], failed: ['m2'] }));
    const { w } = withClient();
    const b = renderHook(() => useBulkApprove(), { wrapper: w });
    let out: unknown;
    await act(async () => {
      out = await b.result.current.mutateAsync(['m1', 'm2']);
    });
    expect(POST).toHaveBeenCalledWith('/api/v1/admin/mentors/approvals', {
      body: { user_ids: ['m1', 'm2'] },
    });
    expect(out).toEqual({ approved: ['m1'], failed: ['m2'] });
  });

  it('adds a note and maps it', async () => {
    POST.mockResolvedValue(
      okRes(
        {
          id: 'n1',
          body: 'Hi',
          created_at: '2026-10-20T10:00:00Z',
          author: {
            user_id: 'a1',
            first_name: 'Kemi',
            last_name: 'Ade',
            avatar_url: null,
            cover_color: null,
          },
        },
        201,
      ),
    );
    const { w } = withClient();
    const n = renderHook(() => useAddAdminNote('m1'), { wrapper: w });
    let out: { author: { name: string } } | undefined;
    await act(async () => {
      out = await n.result.current.mutateAsync('Hi');
    });
    expect(out?.author.name).toBe('Kemi Ade');
  });

  it('a refused write rejects with its status and still refreshes the lists', async () => {
    POST.mockResolvedValue(failRes(404));
    const { w, spy } = withClient();
    const a = renderHook(() => useApproveMentor(), { wrapper: w });
    await expect(a.result.current.mutateAsync('m1')).rejects.toMatchObject({ status: 404 });
    // The row may have moved meanwhile: the stale one must go.
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['admin'] }));
  });

  it('bulk approve sends 50 ids a call and merges the answers', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `m${i}`);
    POST.mockImplementation(async (_path: string, init: { body: { user_ids: string[] } }) =>
      okRes({ approved: init.body.user_ids.slice(1), failed: init.body.user_ids.slice(0, 1) }),
    );
    const { w } = withClient();
    const b = renderHook(() => useBulkApprove(), { wrapper: w });
    let out: { approved: string[]; failed: string[] } | undefined;
    await act(async () => {
      out = await b.result.current.mutateAsync(ids);
    });
    expect(POST).toHaveBeenCalledTimes(2);
    expect(POST.mock.calls[0]![1].body.user_ids).toHaveLength(50);
    expect(POST.mock.calls[1]![1].body.user_ids).toEqual(['m50']);
    expect(out?.failed).toEqual(['m0', 'm50']);
    expect(out?.approved).toHaveLength(49);
  });

  it('the self-paused 409 is told apart from any other refusal', async () => {
    const self = apiError(409, { type: '/problems/mentor-paused-themselves', title: 'x' });
    expect(isSelfPausedError(self)).toBe(true);
    expect(isSelfPausedError(apiError(409, { type: '/problems/other' }))).toBe(false);
    expect(isSelfPausedError(new Error('x'))).toBe(false);
    // End to end through the hook: the problem body's type survives.
    POST.mockResolvedValue({
      data: undefined,
      error: { type: '/problems/mentor-paused-themselves', title: 'Conflict', status: 409 },
      response: new Response(null, { status: 409 }),
    });
    const { w } = withClient();
    const r = renderHook(() => useResumeMentor(), { wrapper: w });
    const e = await r.result.current.mutateAsync('m1').catch((x: unknown) => x);
    expect(isSelfPausedError(e)).toBe(true);
  });
});
