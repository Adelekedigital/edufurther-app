import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { blankDraft, type Draft } from '@/lib/utils/sessionTypeDraft';
import { toDraft, useSaveSessionType, type SavedSessionType } from './sessionTypeEdit';

const PATCH = vi.fn();
const POST = vi.fn();
const DELETE = vi.fn();
const PUT = vi.fn();
const GET = vi.fn();
vi.mock('./http', () => ({
  api: {
    PATCH: (...a: unknown[]) => PATCH(...a),
    POST: (...a: unknown[]) => POST(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
    PUT: (...a: unknown[]) => PUT(...a),
    GET: (...a: unknown[]) => GET(...a),
  },
}));
const reply = (status: number, data?: unknown) =>
  Promise.resolve({ data, error: undefined, response: new Response(null, { status }) });

const read = (over: Partial<SavedSessionType['read']> = {}): SavedSessionType['read'] => ({
  id: 'st1',
  name: 'SOP review',
  description: 'Line by line.',
  duration_minutes: 60,
  min_notice_minutes: 1440,
  duration_inherited: true,
  min_notice_inherited: true,
  meeting_venue: 'daily',
  is_active: true,
  service_offering: { code: 'document-preparation', display_name: 'Document preparation' },
  service_offerings: [{ code: 'document-preparation', display_name: 'Document preparation' }],
  application_stage: 'drafting_stage',
  application_stages: ['drafting_stage'],
  custom_stage_label: null,
  icon: null,
  requires_booking_confirmation: null,
  booking_window_days: null,
  break_after_minutes: null,
  ...over,
});
const saved = (over: Partial<SavedSessionType> = {}): SavedSessionType => ({
  read: read(),
  questions: [
    { id: 'qa', text: 'Which programs?', kind: 'free_text', required: true, options: [] },
  ],
  windows: [],
  ...over,
});
const defaults = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 14,
  breakMin: 10,
  requiresApproval: true,
};

describe('toDraft (a saved type as the form opens it)', () => {
  it('inherits everything: "Use my defaults", Calendar hours', () => {
    expect(toDraft(saved(), defaults)).toMatchObject({
      name: 'SOP review',
      topics: ['document-preparation'],
      stages: ['drafting_stage'],
      rules: 'default',
      hours: 'default',
      approval: 'inherit',
      questions: [{ id: 'qa', key: 'qa', text: 'Which programs?', kind: 'free_text' }],
    });
  });

  it('any rule of its own: "Set rules for this session", the inherited ones at the mentor’s values', () => {
    const d = toDraft(
      saved({
        read: read({
          duration_minutes: 45,
          duration_inherited: false,
          requires_booking_confirmation: false,
        }),
      }),
      defaults,
    );
    expect(d).toMatchObject({
      rules: 'custom',
      durationMin: 45,
      noticeHours: 24,
      windowDays: 14,
      breakMin: 10,
      approval: 'off',
    });
  });

  it('dedicated hours: "Set dedicated hours" with them', () => {
    const d = toDraft(
      saved({
        windows: [
          {
            id: 'w1',
            day_of_week: 3,
            start_time: '17:00:00',
            end_time: '23:59:59',
            timezone: 'Africa/Lagos',
            is_active: true,
          },
        ],
      }),
      defaults,
    );
    expect(d.hours).toBe('custom');
    expect(d.days[3]).toEqual({ on: true, slots: [[1020, 1440]] });
  });
});

describe('useSaveSessionType', () => {
  let qc: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    for (const f of [PATCH, POST, DELETE, PUT]) f.mockReset();
    qc = new QueryClient();
  });
  const base = (): Draft => toDraft(saved(), defaults);
  const vars = (draft: Draft) => ({
    id: 'st1',
    draft,
    saved: base(),
    savedQuestions: saved().questions,
    savedWindows: [],
    offeringIds: { 'document-preparation': 'o4' },
    timeZone: 'Africa/Lagos',
  });

  it('sends only what changed: the name, a new question, the order', async () => {
    PATCH.mockImplementation(() => reply(200, { updated: true }));
    POST.mockImplementation(() => reply(201, { id: 'qb' }));
    PUT.mockImplementation(() => reply(204));
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    const d = base();
    await expect(
      result.current.save(
        vars({
          ...d,
          name: 'SOP review+',
          questions: [
            { key: 'new', text: 'Deadline?', kind: 'free_text', required: false, options: [] },
            ...d.questions,
          ],
        }),
      ),
    ).resolves.toEqual({ failed: [] });
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(PATCH.mock.calls[0]![1].body).toEqual({ name: 'SOP review+' });
    expect(POST.mock.calls[0]![0]).toBe('/api/v1/me/session-types/{session_type_id}/questions');
    expect(PUT.mock.calls[0]![1].body).toEqual({ question_ids: ['qb', 'qa'] });
    expect(DELETE).not.toHaveBeenCalled();
  });

  it('a refused PATCH sends nothing else and maps to the field, in our words', async () => {
    PATCH.mockImplementation(() =>
      Promise.resolve({
        data: undefined,
        error: { errors: [{ pointer: '/application_stages', message: 'server words' }] },
        response: new Response(null, { status: 422 }),
      }),
    );
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    const e = await result.current
      .save(vars({ ...base(), stages: ['revisions'], questions: [] }))
      .catch((x: unknown) => x);
    expect(e).toMatchObject({
      message: 'Some details need another look.',
      fields: { stage: expect.any(String) },
    });
    expect(DELETE).not.toHaveBeenCalled();
    expect(POST).not.toHaveBeenCalled();
  });

  it('questions or hours that didn’t save come back as such (the type saved)', async () => {
    PATCH.mockImplementation(() => reply(200, { updated: true }));
    DELETE.mockImplementation(() => reply(500));
    POST.mockImplementation(() => reply(201, { id: 'w1' }));
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    const d = base();
    const days = d.days.map((x) => ({ ...x }));
    days[2] = { on: true, slots: [[540, 600]] };
    await expect(
      result.current.save(vars({ ...d, name: 'X', questions: [], hours: 'custom', days })),
    ).resolves.toEqual({ failed: ['questions'] });
  });
});

describe('useSavedSessionType', () => {
  it('a type that isn’t theirs is "not found", and its questions and hours aren’t asked for', async () => {
    const { useSavedSessionType } = await import('./sessionTypeEdit');
    GET.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? reply(200, { data: [read()], next_cursor: null })
        : reply(200, { data: [], next_cursor: null }),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSavedSessionType('someone-elses', true), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.error?.kind).toBe('notFound'));
    expect(GET).toHaveBeenCalledTimes(1);
  });
});
