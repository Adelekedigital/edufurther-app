import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { educationBody, educationPatch, useAwardEdit, useEducationEdit } from './profileEntries';
import { keys } from './keys';

const POST = vi.fn();
const PATCH = vi.fn();
const DELETE = vi.fn();
vi.mock('./http', () => ({
  api: {
    POST: (...a: unknown[]) => POST(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));

const ok = { data: {}, error: undefined, response: new Response(null) };
const fail = (status: number) => ({
  data: undefined,
  error: {},
  response: new Response(null, { status }),
});
const award = { title: 'Fulbright', org: 'Stanford', year: 2022, funding: null };

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useAwardEdit('u1'), { wrapper }), spy };
}

beforeEach(() => {
  POST.mockReset();
  PATCH.mockReset();
  DELETE.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('useAwardEdit', () => {
  it('adds one, then refetches the profile before closing', async () => {
    POST.mockResolvedValue(ok);
    const { result, spy } = setup();
    const done = vi.fn();
    act(() => result.current.addAward({ ...award, funding: 'full' }, done));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(POST).toHaveBeenCalledWith('/api/v1/users/{user_id}/awards', {
      params: { path: { user_id: 'u1' } },
      body: { title: 'Fulbright', institution: 'Stanford', year: 2022, funding: 'full' },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
  });

  it('an edit sends only what changed; clearing funding sends null', async () => {
    PATCH.mockResolvedValue(ok);
    const { result } = setup();
    const done = vi.fn();
    act(() =>
      result.current.editAward(
        'a1',
        { ...award, funding: 'partial' },
        { ...award, org: 'MIT', funding: null },
        done,
      ),
    );
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/awards/{award_id}', {
      params: { path: { user_id: 'u1', award_id: 'a1' } },
      body: { institution: 'MIT', funding: null },
    });
  });

  it('removes one; one that’s already gone counts as removed', async () => {
    DELETE.mockResolvedValue(fail(404));
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.removeAward('a1', done));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(DELETE).toHaveBeenCalledWith('/api/v1/users/{user_id}/awards/{award_id}', {
      params: { path: { user_id: 'u1', award_id: 'a1' } },
    });
  });

  it('failures say so in our words, and don’t close', async () => {
    POST.mockResolvedValue(fail(500));
    DELETE.mockResolvedValue(fail(500));
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.addAward(award, done));
    await waitFor(() => expect(result.current.error).toBe('That didn’t save. Try again.'));
    act(() => result.current.removeAward('a1', done));
    await waitFor(() => expect(result.current.error).toBe('We couldn’t delete it. Try again.'));
    expect(done).not.toHaveBeenCalled();
  });
});

describe('education bodies', () => {
  const v = {
    school: 'UCL',
    degree: 'MSc',
    course: 'Public Health',
    start: 2023,
    end: 2024,
    current: true,
  };
  it('the abbreviation and derived level; years as Jan 1; Other says neither', () => {
    expect(educationBody(v, 'dl-masters')).toEqual({
      school_name_raw: 'UCL',
      degree_abbreviation: 'MSc',
      degree_level_id: 'dl-masters',
      study_course: 'Public Health',
      date_start: '2023-01-01',
      date_end: '2024-01-01',
      is_most_recent: true,
    });
    const other = educationBody({ ...v, degree: 'Other' }, null);
    expect(other.degree_abbreviation).toBeNull();
    expect(other.degree_level_id).toBeNull();
  });

  it('an edit keeps a saved month and day while the year stands, and sends only changes', () => {
    const saved = {
      id: 'e1',
      values: v,
      dateStart: '2023-08-15',
      dateEnd: '2024-05-15',
      levelId: 'dl-masters',
    };
    const before = educationBody(v, 'dl-masters', saved);
    const after = educationBody({ ...v, end: 2025, course: 'Epidemiology' }, 'dl-masters', saved);
    expect(before.date_start).toBe('2023-08-15');
    expect(educationPatch(before, after)).toEqual({
      study_course: 'Epidemiology',
      date_end: '2025-01-01',
    });
  });
});

describe('useEducationEdit', () => {
  function setupEdu() {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return { ...renderHook(() => useEducationEdit('u1'), { wrapper }), spy };
  }

  it('adds, edits and removes, refetching the profile and the owner’s list', async () => {
    POST.mockResolvedValue(ok);
    PATCH.mockResolvedValue(ok);
    DELETE.mockResolvedValue(ok);
    const { result, spy } = setupEdu();
    const done = vi.fn();
    const body = educationBody(
      { school: 'UCL', degree: 'BA', course: 'History', start: 2019, end: 2022, current: false },
      'dl-undergraduate',
    );
    act(() => result.current.addEducation(body, done));
    await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    expect(POST).toHaveBeenCalledWith('/api/v1/users/{user_id}/education', {
      params: { path: { user_id: 'u1' } },
      body,
    });
    act(() => result.current.editEducation('e1', { study_course: 'Law' }, done));
    await waitFor(() => expect(done).toHaveBeenCalledTimes(2));
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/education/{entry_id}', {
      params: { path: { user_id: 'u1', entry_id: 'e1' } },
      body: { study_course: 'Law' },
    });
    act(() => result.current.removeEducation('e1', done));
    await waitFor(() => expect(done).toHaveBeenCalledTimes(3));
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.education('u1') });
  });
});
