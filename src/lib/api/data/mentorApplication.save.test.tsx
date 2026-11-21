import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { keys } from './keys';
import { cachedMe, type UserRead } from './me';
import { toMentorApplication } from './mentorApplicationStatus';
import { meEntry, seedMe } from './_test/meEntry';
import type { MentorAnswers, MentorApplicationState, SchoolDraft } from '@/types/mentorOnboarding';
import {
  DECIDED,
  INCOMPLETE,
  introChatKey,
  useSaveMentorStep,
  useSubmitMentorApplication,
} from './mentorApplication';

const GET = vi.fn();
const POST = vi.fn();
const PATCH = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    PUT: (...a: unknown[]) => PUT(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));

let levels: { status: 'ready' | 'loading' | 'error'; levels: { id: string; code: string }[] };
const retryLevels = vi.fn();
vi.mock('./catalog', () => ({
  useCountries: () => ({ countries: [], status: 'ready', retry: vi.fn() }),
  useDegreeLevels: () => ({ ...levels, retry: retryLevels }),
}));
vi.mock('./mentors', () => ({
  useTopics: () => ({
    topics: [{ id: 'o-docs', slug: 'document-preparation', label: 'Document preparation' }],
  }),
}));
const saveHours = vi.fn();
vi.mock('./weeklyHours', () => ({
  useWeeklyHours: () => ({ data: null }),
  useSaveWeeklyHours: () => ({ save: saveHours }),
  toWeeklyHours: (_r: unknown, timeZone: string) => ({ days: [], timeZone, rules: [] }),
}));

const ok = (status = 200, data?: unknown) =>
  Promise.resolve({ data, response: new Response(null, { status }) });
const fail = (status: number, error?: unknown) =>
  Promise.resolve({ error, response: new Response(null, { status }) });

const school = (over: Partial<SchoolDraft> = {}): SchoolDraft => ({
  key: 'new-1',
  id: null,
  school: 'University of Lagos',
  institutionId: 'inst-1',
  catalogCountryId: 'c-ng',
  countryId: '',
  countryOpen: false,
  degree: 'bachelors',
  field: 'Microbiology',
  start: '2011',
  end: '2015',
  current: true,
  ...over,
});

const answers = (a: Partial<MentorAnswers> = {}): MentorAnswers => ({
  helpIds: ['o-docs'],
  schools: [school()],
  photoUrl: '/p.png',
  originId: 'c-ng',
  linkedin: 'linkedin.com/in/x',
  about: '',
  aboutDrafted: false,
  aboutPromptVersion: null,
  days: [0],
  from: 1080,
  to: 1260,
  timeZone: 'Africa/Lagos',
  timeZoneFallback: false,
  ...a,
});

const state = { hasProfile: true, hasIntroChat: false } as MentorApplicationState;

let saved: Record<string, unknown>[];
const savedEntry = (id: string) => ({
  id,
  school_name_raw: 'University of Lagos',
  institution: { id: 'inst-1', name: 'University of Lagos', country: { code: 'NG' } },
  degree_level: { id: 'dl-bachelors', code: 'bachelors' },
  degree_abbreviation: 'Bachelor’s',
  study_course: 'Microbiology',
  date_start: '2011-01-01',
  date_end: '2015-12-31',
  is_most_recent: true,
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  levels = { status: 'ready', levels: [{ id: 'dl-bachelors', code: 'bachelors' }] };
  saved = [];
  for (const m of [GET, POST, PATCH, PUT, DELETE, saveHours, retryLevels]) m.mockReset();
  GET.mockImplementation((path: string) => {
    if (path === '/api/v1/users/{user_id}/education') return ok(200, { data: saved });
    if (path === '/api/v1/me/session-types') return ok(200, { data: [] });
    return ok(200, {});
  });
  POST.mockImplementation((path: string) =>
    path === '/api/v1/users/{user_id}/education'
      ? ok(201, { id: 'e-new' })
      : ok(201, { id: 'st-1' }),
  );
  PATCH.mockImplementation(() => ok());
  PUT.mockImplementation(() => ok());
  DELETE.mockImplementation(() => ok(204));
  saveHours.mockResolvedValue(undefined);
});

const educationPosts = () =>
  POST.mock.calls.filter(([p]) => p === '/api/v1/users/{user_id}/education');

describe('useSaveMentorStep: education', () => {
  it('hands back each new school’s id, and a save with that id edits nothing new', async () => {
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    const onSaved = vi.fn();
    await result.current.save('education', answers(), state, onSaved);
    expect(onSaved).toHaveBeenCalledWith('new-1', 'e-new');

    // Back, then Continue again: the school now carries its id.
    saved = [savedEntry('e-new')];
    POST.mockClear();
    await result.current.save('education', answers({ schools: [school({ id: 'e-new' })] }), state);
    expect(DELETE).not.toHaveBeenCalled();
    expect(educationPosts()).toHaveLength(0);
  });

  it('plans against a fresh read, so a stale cache never adds the school twice', async () => {
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    // The first POST landed (id kept by the form), the /me refetch then failed.
    saved = [savedEntry('e-new')];
    await result.current.save('education', answers({ schools: [school({ id: 'e-new' })] }), state);
    expect(educationPosts()).toHaveLength(0);
  });

  it('never saves without the degree levels: no school is written with no level', async () => {
    levels = { status: 'loading', levels: [] };
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    await expect(result.current.save('education', answers(), state)).rejects.toBeTruthy();
    expect(educationPosts()).toHaveLength(0);
    expect(retryLevels).toHaveBeenCalled();
  });

  it('keeps a saved month and abbreviation the step can’t show', async () => {
    saved = [
      {
        ...savedEntry('e1'),
        degree_abbreviation: 'BSc',
        date_start: '2011-09-01',
        date_end: '2015-06-30',
      },
    ];
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    await result.current.save(
      'education',
      answers({ schools: [school({ id: 'e1', key: 'e1' })] }),
      state,
    );
    expect(
      PATCH.mock.calls.filter(([p]) => p === '/api/v1/users/{user_id}/education/{entry_id}'),
    ).toHaveLength(0);
  });
});

describe('useSaveMentorStep: hours', () => {
  it('makes the Intro chat as the starter, with its two questions, one synced to the help areas (backend PR 540)', async () => {
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    await result.current.save('hours', answers(), state);
    const call = POST.mock.calls.find(([p]) => p === '/api/v1/me/session-types');
    expect((call?.[1] as { body: unknown }).body).toMatchObject({
      name: 'Intro chat',
      is_starter: true,
      application_stages: ['exploring'],
      questions: [
        {
          question_text: 'What would you like to talk about?',
          question_type: 'free_text',
          is_required: false,
        },
        {
          question_text: 'Which area do you need help with most?',
          question_type: 'multi_choice',
          allows_multiple: false,
          is_required: true,
          options_source: 'help_areas',
        },
      ],
    });
    const second = (call?.[1] as { body: { questions: object[] } }).body.questions[1]!;
    expect(second).not.toHaveProperty('options');
  });

  it('the time zone saved with the hours is in the one /me at once, and /me is read again', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedMe(qc, 'auth-1', meEntry({ timezone: 'UTC' }));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSaveMentorStep('u1'), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await result.current.save('hours', answers({ timeZone: 'Africa/Lagos' }), state);
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { timezone: 'Africa/Lagos' },
    });
    expect(cachedMe(qc)!.timezone).toBe('Africa/Lagos');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.viewer.meAll });
  });

  it('a mentor helping in more than 3 areas: the Intro chat covers the first 3 (the API refuses more)', async () => {
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    const six = ['o-1', 'o-2', 'o-3', 'o-4', 'o-5', 'o-6'];
    await result.current.save('hours', answers({ helpIds: six }), state);
    const call = POST.mock.calls.find(([p]) => p === '/api/v1/me/session-types');
    const body = (call?.[1] as { body: { service_offering_ids: string[] } }).body;
    expect(body.service_offering_ids).toEqual(['o-1', 'o-2', 'o-3']);
  });

  const introKey = () => {
    const call = POST.mock.calls.find(([p]) => p === '/api/v1/me/session-types');
    return (call?.[1] as { params: { header: Record<string, string> } }).params.header[
      'Idempotency-Key'
    ];
  };

  it('uses one Intro chat key per attempt: the same on a retry, new after the help areas change', async () => {
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    PUT.mockImplementationOnce(() => fail(503));
    await expect(result.current.save('hours', answers(), state)).rejects.toBeTruthy();
    const first = introKey();
    expect(first).toMatch(/^intro-chat-u1-/);

    POST.mockClear();
    await result.current.save('hours', answers(), state);
    expect(introKey()).toBe(first);

    POST.mockClear();
    await result.current.save('hours', answers({ helpIds: ['o-docs', 'o-school'] }), state);
    expect(introKey()).not.toBe(first);
    expect(introKey()).toMatch(/^intro-chat-u1-/);
  });

  it('checks for an existing Intro chat itself, and makes none when there is one', async () => {
    GET.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? ok(200, { data: [{ name: 'Intro chat' }] })
        : ok(200, {}),
    );
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    await result.current.save('hours', answers(), state);
    expect(POST.mock.calls.some(([p]) => p === '/api/v1/me/session-types')).toBe(false);
  });

  it('a renamed starter still counts as the Intro chat: none is made (local review)', async () => {
    GET.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types'
        ? ok(200, { data: [{ name: 'First chat', is_starter: true }] })
        : ok(200, {}),
    );
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    await result.current.save('hours', answers(), state);
    expect(POST.mock.calls.some(([p]) => p === '/api/v1/me/session-types')).toBe(false);
  });

  it('a 409 (a starter is already there) doesn’t fail the step (local review)', async () => {
    POST.mockImplementation((path: string) =>
      path === '/api/v1/me/session-types' ? fail(409) : ok(200, {}),
    );
    const { result } = renderHook(() => useSaveMentorStep('u1'), { wrapper });
    await expect(result.current.save('hours', answers(), state)).resolves.not.toThrow();
  });

  it('builds the key from the user and the attempt', () => {
    expect(introChatKey('u1', 'a1')).toBe('intro-chat-u1-a1');
  });
});

describe('useSubmitMentorApplication', () => {
  it('names what’s missing on an incomplete refusal', async () => {
    POST.mockImplementation(() =>
      fail(409, { type: INCOMPLETE, missing: ['avatar', 'availability'] }),
    );
    const { result } = renderHook(() => useSubmitMentorApplication(), { wrapper });
    await expect(result.current.submit()).rejects.toMatchObject({
      missing: ['avatar', 'availability'],
    });
  });

  it('tells a decided application apart from an incomplete one', async () => {
    POST.mockImplementation(() => fail(409, { type: DECIDED }));
    const { result } = renderHook(() => useSubmitMentorApplication(), { wrapper });
    await expect(result.current.submit()).rejects.toMatchObject({ type: DECIDED });
  });

  it('the one /me says submitted as soon as it resolves, so neither the status page nor the form reads "unsubmitted"', async () => {
    POST.mockImplementation(() =>
      ok(200, { submitted_at: '2026-10-18T10:00:00Z', approval_status: 'pending' }),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedMe(
      qc,
      'auth-1',
      meEntry({
        mentor_profile: {
          approval_status: 'pending',
          submitted_at: null,
        } as UserRead['mentor_profile'],
      }),
    );
    expect(toMentorApplication(cachedMe(qc)!).stage).toBe('unsubmitted');
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSubmitMentorApplication(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
    await result.current.submit();
    expect(cachedMe(qc)!.mentor_profile!.submitted_at).toBe('2026-10-18T10:00:00Z');
    expect(toMentorApplication(cachedMe(qc)!).stage).toBe('pending');
    // And everyone's /me (the shell's routing too) is read again.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.viewer.all });
  });
});
