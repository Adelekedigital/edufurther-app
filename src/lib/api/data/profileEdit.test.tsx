import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { introProblems, useProfileEdit, type IntroEdit } from './profileEdit';
import { keys } from './keys';

const PATCH = vi.fn();
vi.mock('./http', () => ({ api: { PATCH: (...a: unknown[]) => PATCH(...a) } }));

const ok = { data: {}, error: undefined, response: new Response(null) };
const fail = (status: number, error: unknown = {}) => ({
  data: undefined,
  error,
  response: new Response(null, { status }),
});
const before: IntroEdit = { firstName: 'Gbenga', lastName: 'Elufisan', headline: 'PhD Sociology' };

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useProfileEdit('u1'), { wrapper });
  return { ...view, spy };
}

beforeEach(() => PATCH.mockReset());
afterEach(() => {
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
});

describe('introProblems', () => {
  it('a first name is required; a last name can’t be emptied once set', () => {
    expect(introProblems(before, { ...before, firstName: '  ' })).toEqual({
      firstName: 'Add your first name.',
    });
    expect(introProblems(before, { ...before, lastName: '' })).toEqual({
      lastName: 'Your last name can’t be empty.',
    });
    expect(introProblems({ ...before, lastName: '' }, { ...before, lastName: '' })).toEqual({});
  });
});

describe('useProfileEdit', () => {
  it('sends only what changed: names to /profile, the headline to /mentor-profile', async () => {
    PATCH.mockResolvedValue(ok);
    const { result, spy } = setup();
    const done = vi.fn();
    act(() =>
      result.current.saveIntro(before, { ...before, firstName: ' Ade ', headline: 'MSc' }, done),
    );
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenNthCalledWith(1, '/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { first_name: 'Ade' },
    });
    expect(PATCH).toHaveBeenNthCalledWith(2, '/api/v1/users/{user_id}/mentor-profile', {
      params: { path: { user_id: 'u1' } },
      body: { headline: 'MSc' },
    });
    // Anything listing this mentor, and the viewer's own name, refetch.
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.viewer.all });
  });

  it('a blank headline clears it; nothing else is sent', async () => {
    PATCH.mockResolvedValue(ok);
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.saveIntro(before, { ...before, headline: '   ' }, done));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(PATCH.mock.calls[0]![1].body).toEqual({ headline: null });
  });

  it('a blank first name is caught before anything is sent', async () => {
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.saveIntro(before, { ...before, firstName: '' }, done));
    await waitFor(() => expect(result.current.introErrors.firstName).toBe('Add your first name.'));
    expect(PATCH).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });

  it('a 422 puts our copy under the field its pointer names', async () => {
    PATCH.mockResolvedValue(fail(422, { errors: [{ pointer: '/headline', message: 'x' }] }));
    const { result } = setup();
    act(() => result.current.saveIntro(before, { ...before, headline: 'too long' }, vi.fn()));
    await waitFor(() =>
      expect(result.current.introErrors.headline).toBe('Keep your headline under 300 characters.'),
    );
    expect(result.current.introErrors.general).toBeUndefined();
  });

  it('anything else is one general line; offline says so at once', async () => {
    onlineManager.setOnline(false);
    // Offline as the app sees it: the browser says so, and the request fails.
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    PATCH.mockResolvedValue(fail(503));
    const { result } = setup();
    act(() => result.current.saveIntro(before, { ...before, firstName: 'Ade' }, vi.fn()));
    await waitFor(() => expect(result.current.introErrors.general).toMatch(/offline/));
    expect(PATCH).toHaveBeenCalledTimes(1);
  });

  it('About: trimmed, blank clears it, a failure says so', async () => {
    PATCH.mockResolvedValueOnce(ok).mockResolvedValueOnce(fail(500));
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.saveAbout('  Hello  ', done));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH.mock.calls[0]![1].body).toEqual({ about_me: 'Hello' });
    act(() => result.current.saveAbout('   ', vi.fn()));
    await waitFor(() => expect(result.current.aboutError).toBe('That didn’t save. Try again.'));
    expect(PATCH.mock.calls[1]![1].body).toEqual({ about_me: null });
  });
});
