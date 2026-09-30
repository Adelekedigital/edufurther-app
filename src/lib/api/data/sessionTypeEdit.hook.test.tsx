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

// Through a variable, so the fixture compiles with and without LookupRef.id (backend #305).
const DOCS = { id: 'off-docs', code: 'document-preparation', display_name: 'Document preparation' };
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
  service_offering: DOCS,
  service_offerings: [DOCS],
  application_stage: 'drafting_stage',
  application_stages: ['drafting_stage'],
  custom_stage_label: null,
  icon: null,
  requires_booking_confirmation: null,
  booking_window_days: null,
  effective_booking_window_days: 56,
  break_after_minutes: null,
  is_featured: false,
  pending_deletion: null,
  booked_count: 0,
  last_booked_ends_at: null,
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

  it('a window saved above a cap lowered since opens at the capped value', () => {
    const d = toDraft(
      saved({ read: read({ booking_window_days: 56, effective_booking_window_days: 14 }) }),
      defaults,
    );
    expect(d.windowDays).toBe(14);
  });

  it('any rule of its own: "Set rules for this session", the inherited ones at the mentor’s values', () => {
    const d = toDraft(
      saved({
        read: read({
          duration_minutes: 45,
          duration_inherited: false,
          requires_booking_confirmation: false,
          // Inherited: the backend resolves it to the mentor's 14 days.
          effective_booking_window_days: 14,
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
    ).resolves.toMatchObject({ failed: [] });
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
    ).resolves.toMatchObject({ failed: ['questions'] });
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

describe('useSaveSessionType — a retry after a partial save (review of #67)', () => {
  let qc: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    for (const f of [PATCH, POST, DELETE, PUT, GET]) f.mockReset();
    qc = new QueryClient();
  });

  it('the second Save sends no question again when only the hours failed', async () => {
    PATCH.mockImplementation(() => reply(200, { updated: true }));
    PUT.mockImplementation(() => reply(204));
    let hoursFail = true;
    POST.mockImplementation((path: string) =>
      path.endsWith('/questions')
        ? reply(201, { id: 'qb' })
        : hoursFail
          ? reply(500)
          : reply(201, { id: 'w1' }),
    );
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    const d = toDraft(saved(), defaults);
    const days = d.days.map((x) => ({ ...x }));
    days[2] = { on: true, slots: [[540, 600]] };
    const draft = {
      ...d,
      hours: 'custom' as const,
      days,
      questions: [
        ...d.questions,
        { key: 'new', text: 'Deadline?', kind: 'free_text' as const, required: false, options: [] },
      ],
    };
    const first = await result.current.save({
      id: 'st1',
      draft,
      saved: d,
      savedQuestions: saved().questions,
      savedWindows: [],
      offeringIds: {},
      timeZone: 'Africa/Lagos',
    });
    expect(first.failed).toEqual(['hours']);
    expect(first.newIds).toEqual({ new: 'qb' });
    expect(first.saved.questions.map((q) => q.id)).toEqual(['qa', 'qb']);

    // As the form does: the draft carries the new id; the baseline is what saved.
    for (const f of [PATCH, POST, DELETE, PUT]) f.mockClear();
    hoursFail = false;
    const withIds = {
      ...draft,
      questions: draft.questions.map((q) =>
        first.newIds[q.key] ? { ...q, id: first.newIds[q.key] } : q,
      ),
    };
    const second = await result.current.save({
      id: 'st1',
      draft: withIds,
      saved: withIds,
      savedQuestions: first.saved.questions,
      savedWindows: first.saved.windows,
      offeringIds: {},
      timeZone: 'Africa/Lagos',
    });
    expect(second.failed).toEqual([]);
    expect(PATCH).not.toHaveBeenCalled();
    expect(DELETE).not.toHaveBeenCalled();
    expect(PUT).not.toHaveBeenCalled();
    // Only the hours, once.
    expect(POST).toHaveBeenCalledTimes(1);
    expect(POST.mock.calls[0]![0]).toBe('/api/v1/me/session-types/{session_type_id}/windows');
  });

  it('an answered option the change removes (409) is said on that question', async () => {
    PATCH.mockImplementation((path: string) =>
      path.endsWith('{question_id}') ? reply(409) : reply(200, { updated: true }),
    );
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    const base = saved({
      questions: [
        {
          id: 'qs',
          text: 'For?',
          kind: 'single',
          required: true,
          options: [
            { id: 'o1', text: 'Masters' },
            { id: 'o2', text: 'PhD' },
          ],
        },
      ],
    });
    const d = toDraft(base, defaults);
    const r = await result.current.save({
      id: 'st1',
      draft: { ...d, questions: [{ ...d.questions[0]!, options: ['Masters', 'MBA'] }] },
      saved: d,
      savedQuestions: base.questions,
      savedWindows: [],
      offeringIds: {},
      timeZone: 'Africa/Lagos',
    });
    expect(r.failed).toEqual(['questions']);
    expect(r.questionErrors).toEqual({
      qs: 'A booking already chose an option you removed or changed. Keep it, then save again.',
    });
  });

  it('hours kept in another zone are neither shown nor deleted; new ones go in the shown zone', async () => {
    PATCH.mockImplementation(() => reply(200, { updated: true }));
    POST.mockImplementation(() => reply(201, { id: 'w9' }));
    DELETE.mockImplementation(() => reply(200));
    const w = (id: string, day: number, zone: string, active = true) => ({
      id,
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '10:00:00',
      timezone: zone,
      is_active: active,
    });
    const base = saved({
      windows: [
        w('a', 1, 'Africa/Lagos'),
        w('b', 2, 'Africa/Lagos'),
        w('c', 3, 'Europe/London'),
        w('d', 4, 'Africa/Lagos', false),
      ],
    });
    const d = toDraft(base, defaults);
    expect(d.days[3]!.on).toBe(false); // London's Wednesday isn't shown
    expect(d.days[4]!.on).toBe(false); // an inactive one isn't either
    const days = d.days.map((x) => ({ ...x }));
    days[5] = { on: true, slots: [[540, 600]] };
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    await result.current.save({
      id: 'st1',
      draft: { ...d, name: 'X', days },
      saved: d,
      savedQuestions: base.questions,
      savedWindows: base.windows,
      offeringIds: {},
      timeZone: 'America/New_York',
    });
    expect(DELETE).not.toHaveBeenCalled();
    expect(POST.mock.calls[0]![1].body).toMatchObject({ day_of_week: 5, timezone: 'Africa/Lagos' });
  });

  it('"Use my Calendar availability" removes every dedicated window, whatever its zone (review r2)', async () => {
    PATCH.mockImplementation(() => reply(200, { updated: true }));
    DELETE.mockImplementation(() => reply(200));
    const w = (id: string, zone: string) => ({
      id,
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '10:00:00',
      timezone: zone,
      is_active: true,
    });
    const base = saved({
      windows: [w('a', 'Africa/Lagos'), w('b', 'Africa/Lagos'), w('c', 'Europe/London')],
    });
    const d = toDraft(base, defaults);
    expect(d.hours).toBe('custom');
    const { result } = renderHook(() => useSaveSessionType(), { wrapper });
    const r = await result.current.save({
      id: 'st1',
      draft: { ...d, hours: 'default' },
      saved: d,
      savedQuestions: base.questions,
      savedWindows: base.windows,
      offeringIds: {},
      timeZone: 'Africa/Lagos',
    });
    expect(DELETE.mock.calls.map((c) => c[1].params.path.window_id).sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(r.saved.windows).toEqual([]);
  });
});

describe('copyName', () => {
  it('"(copy)", then "(copy 2)" …, never a name already used', async () => {
    const { copyName } = await import('./sessionTypeEdit');
    expect(copyName('SOP review', ['SOP review'])).toBe('SOP review (copy)');
    expect(copyName('SOP review', ['SOP review', 'sop review (COPY)'])).toBe('SOP review (copy 2)');
  });
});

describe('useDuplicateSessionType', () => {
  it('creates "(copy)" with the questions, copies the hours, then hides it; says what failed', async () => {
    const { useDuplicateSessionType } = await import('./sessionTypeEdit');
    for (const f of [PATCH, POST, DELETE, PUT, GET]) f.mockReset();
    GET.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? reply(200, { data: [read()], next_cursor: null })
        : path.endsWith('/questions')
          ? reply(200, {
              data: [
                {
                  id: 'qa',
                  question_text: 'Which programs?',
                  question_type: 'free_text',
                  is_required: true,
                  display_order: 0,
                  allows_multiple: false,
                  options: [],
                },
              ],
              next_cursor: null,
            })
          : reply(200, {
              data: [
                {
                  id: 'w1',
                  day_of_week: 2,
                  start_time: '17:00:00',
                  end_time: '20:00:00',
                  timezone: 'Africa/Lagos',
                  is_active: true,
                },
              ],
              next_cursor: null,
            }),
    );
    POST.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? reply(201, { id: 'st2', question_ids: ['q9'] })
        : reply(500),
    );
    PATCH.mockImplementation(() => reply(200, { updated: true }));
    const qc = new QueryClient();
    const { result } = renderHook(() => useDuplicateSessionType(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    const d = await result.current.duplicate({
      id: 'st1',
      takenNames: ['SOP review'],
      offeringIds: { 'document-preparation': 'o4' },
    });
    expect(d).toEqual({ id: 'st2', name: 'SOP review (copy)', failed: ['hours'] });
    const create = POST.mock.calls.find((c) => c[0] === '/api/v1/me/session-types')![1].body;
    expect(create).toMatchObject({
      name: 'SOP review (copy)',
      service_offering_ids: ['o4'],
      // Inherited rules stay inherited on the copy.
      duration_minutes: null,
      questions: [{ question_text: 'Which programs?', is_required: true }],
    });
    expect(PATCH.mock.calls[0]![1]).toMatchObject({
      params: { path: { session_type_id: 'st2' } },
      body: { is_active: false },
    });
  });
});

describe('useDuplicateSessionType — review of #74', () => {
  const wrap = () => {
    const qc = new QueryClient();
    return function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };
  };
  const list = (over: Partial<SavedSessionType['read']> = {}) => ({
    data: [read(over)],
    next_cursor: null,
  });
  const serve = (over: Partial<SavedSessionType['read']> = {}, windows: unknown[] = []) =>
    GET.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? reply(200, list(over))
        : reply(200, { data: path.endsWith('/questions') ? [] : windows, next_cursor: null }),
    );
  const run = async (offeringIds: Record<string, string> = { 'document-preparation': 'o4' }) => {
    const { useDuplicateSessionType } = await import('./sessionTypeEdit');
    const { result } = renderHook(() => useDuplicateSessionType(), { wrapper: wrap() });
    return result.current.duplicate({ id: 'st1', takenNames: ['SOP review'], offeringIds });
  };
  beforeEach(() => {
    for (const f of [PATCH, POST, DELETE, PUT, GET]) f.mockReset();
    PATCH.mockImplementation(() => reply(200, { updated: true }));
  });

  it('what the original inherits stays inherited, what it sets stays set — no fallbacks', async () => {
    serve({
      duration_inherited: true,
      min_notice_inherited: false,
      min_notice_minutes: 2880,
      break_after_minutes: 10,
    });
    POST.mockImplementation(() => reply(201, { id: 'st2', question_ids: [] }));
    await run();
    expect(POST.mock.calls[0]![1].body).toMatchObject({
      duration_minutes: null,
      min_notice_minutes: 2880,
      booking_window_days: null,
      break_after_minutes: 10,
      requires_booking_confirmation: null,
      application_stages: ['drafting_stage'],
    });
  });

  it('a window saved above a cap lowered since is copied as it applies, so the copy is accepted', async () => {
    serve({ booking_window_days: 56, effective_booking_window_days: 14 });
    POST.mockImplementation(() => reply(201, { id: 'st2', question_ids: [] }));
    await run();
    expect(POST.mock.calls[0]![1].body).toMatchObject({ booking_window_days: 14 });
  });

  it('hidden straight after the create, before any hours are copied', async () => {
    const order: string[] = [];
    serve({}, [
      {
        id: 'w1',
        day_of_week: 2,
        start_time: '17:00:00',
        end_time: '20:00:00',
        timezone: 'Europe/London',
        is_active: true,
      },
    ]);
    POST.mockImplementation((path: string) => {
      order.push(path.endsWith('/windows') ? 'hours' : 'create');
      return path.endsWith('/windows')
        ? reply(201, { id: 'w9' })
        : reply(201, { id: 'st2', question_ids: [] });
    });
    PATCH.mockImplementation(() => (order.push('hide'), reply(200, { updated: true })));
    await expect(run()).resolves.toMatchObject({ failed: [] });
    expect(order).toEqual(['create', 'hide', 'hours']);
    expect(POST.mock.calls[1]![1].body).toMatchObject({ timezone: 'Europe/London' });
  });

  it('a read that fails sends nothing; a refused create sends nothing more', async () => {
    GET.mockImplementation(() => reply(500));
    await expect(run()).rejects.toMatchObject({
      message: expect.stringMatching(/^We couldn’t duplicate it\./),
    });
    expect(POST).not.toHaveBeenCalled();
    serve();
    POST.mockImplementation(() =>
      Promise.resolve({
        data: undefined,
        error: { errors: [] },
        response: new Response(null, { status: 422 }),
      }),
    );
    await expect(run()).rejects.toBeTruthy();
    expect(PATCH).not.toHaveBeenCalled();
    expect(POST).toHaveBeenCalledTimes(1);
  });

  it('says so when it couldn’t hide the copy, or match its topics', async () => {
    serve();
    POST.mockImplementation(() => reply(201, { id: 'st2', question_ids: [] }));
    PATCH.mockImplementation(() => reply(500));
    await expect(run({})).resolves.toMatchObject({ failed: ['topics', 'hidden'] });
  });

  it('a stale label without "other" isn’t sent; choice and text questions keep their shape', async () => {
    GET.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? reply(
            200,
            list({ application_stages: ['drafting_stage'], custom_stage_label: 'Old label' }),
          )
        : path.endsWith('/questions')
          ? reply(200, {
              data: [
                {
                  id: 'q1',
                  question_text: 'Why?',
                  question_type: 'free_text',
                  is_required: true,
                  display_order: 0,
                  allows_multiple: false,
                  options: [],
                },
                {
                  id: 'q2',
                  question_text: 'For?',
                  question_type: 'multi_choice',
                  is_required: true,
                  display_order: 1,
                  allows_multiple: false,
                  options: [
                    { id: 'o1', text: 'MSc' },
                    { id: 'o2', text: 'PhD' },
                  ],
                },
                {
                  id: 'q3',
                  question_text: 'Parts?',
                  question_type: 'multi_choice',
                  is_required: false,
                  display_order: 2,
                  allows_multiple: true,
                  options: [
                    { id: 'o3', text: 'A' },
                    { id: 'o4', text: 'B' },
                  ],
                },
              ],
              next_cursor: null,
            })
          : reply(200, { data: [], next_cursor: null }),
    );
    POST.mockImplementation(() => reply(201, { id: 'st2', question_ids: [] }));
    await run();
    const body = POST.mock.calls[0]![1].body;
    expect(body.custom_stage_label).toBeNull();
    expect(body.questions).toEqual([
      { question_text: 'Why?', question_type: 'free_text', is_required: true, display_order: 0 },
      {
        question_text: 'For?',
        question_type: 'multi_choice',
        is_required: true,
        display_order: 1,
        allows_multiple: false,
        options: [{ text: 'MSc' }, { text: 'PhD' }],
      },
      {
        question_text: 'Parts?',
        question_type: 'multi_choice',
        is_required: false,
        display_order: 2,
        allows_multiple: true,
        options: [{ text: 'A' }, { text: 'B' }],
      },
    ]);
  });
});
