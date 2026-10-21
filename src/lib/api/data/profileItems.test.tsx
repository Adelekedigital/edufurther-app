import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useInReviewRefusal } from './freeze';
import { useProfileItems, type BackgroundSave } from './profileItems';
import { keys } from './keys';

const PATCH = vi.fn();
const PUT = vi.fn();
vi.mock('./http', () => ({
  api: {
    PATCH: (...a: unknown[]) => PATCH(...a),
    PUT: (...a: unknown[]) => PUT(...a),
  },
}));

const ok = { data: {}, error: undefined, response: new Response(null) };
const fail = (status: number) => ({
  data: undefined,
  error: {},
  response: new Response(null, { status }),
});
const before: BackgroundSave = { originId: 'ng', studyId: 'us', languageIds: ['en'] };

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useProfileItems('u1'), { wrapper }), spy };
}

beforeEach(() => {
  PATCH.mockReset();
  PUT.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('useProfileItems — topics', () => {
  it('sends the ids as offering_ids and refetches the profile before closing', async () => {
    PATCH.mockResolvedValue(ok);
    const { result, spy } = setup();
    const done = vi.fn();
    act(() => result.current.saveTopics(['o1', 'o3'], done));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/mentor-profile', {
      params: { path: { user_id: 'u1' } },
      body: { offering_ids: ['o1', 'o3'] },
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
  });

  it('a failure says so in our words, and doesn’t close', async () => {
    PATCH.mockResolvedValue(fail(500));
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.saveTopics(['o1'], done));
    await waitFor(() => expect(result.current.topicsError).toBe('That didn’t save. Try again.'));
    expect(done).not.toHaveBeenCalled();
  });
});

describe('useProfileItems — background', () => {
  it('sends only what changed, each to its endpoint; languages as ids only', async () => {
    PATCH.mockResolvedValue(ok);
    PUT.mockResolvedValue(ok);
    const { result } = setup();
    const done = vi.fn();
    act(() =>
      result.current.saveBackground(
        before,
        { originId: 'gh', studyId: 'us', languageIds: ['en', 'yo'] },
        done,
      ),
    );
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { origin_country_id: 'gh' },
    });
    expect(PUT).toHaveBeenCalledWith('/api/v1/users/{user_id}/languages', {
      params: { path: { user_id: 'u1' } },
      body: { languages: [{ language_id: 'en' }, { language_id: 'yo' }] },
    });
  });

  it('where they studied goes to the mentor profile', async () => {
    PATCH.mockResolvedValue(ok);
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.saveBackground(before, { ...before, studyId: 'gb' }, done));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/mentor-profile', {
      params: { path: { user_id: 'u1' } },
      body: { primary_study_country_id: 'gb' },
    });
    expect(PUT).not.toHaveBeenCalled();
  });

  it('a partial save says what saved and what didn’t, and still refetches', async () => {
    PATCH.mockResolvedValue(ok);
    PUT.mockResolvedValue(fail(500));
    const { result, spy } = setup();
    const done = vi.fn();
    act(() =>
      result.current.saveBackground(
        before,
        { originId: 'gh', studyId: 'gb', languageIds: ['yo'] },
        done,
      ),
    );
    await waitFor(() =>
      expect(result.current.backgroundError).toBe(
        'Where you’re from and where you studied saved. Your languages didn’t: try again.',
      ),
    );
    expect(done).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.mentors.all });
  });

  it('after a failure, a retry sends every part, not just the diff (review of #85)', async () => {
    PATCH.mockResolvedValue(ok);
    PUT.mockResolvedValue(ok);
    const { result } = setup();
    const done = vi.fn();
    act(() => result.current.saveBackground(before, before, done, { all: true }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(PATCH).toHaveBeenCalledTimes(2);
    expect(PUT).toHaveBeenCalledTimes(1);
  });

  it('offline, the first failure says so', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    PATCH.mockResolvedValue(fail(503));
    const { result } = setup();
    act(() => result.current.saveBackground(before, { ...before, originId: 'gh' }, vi.fn()));
    await waitFor(() =>
      expect(result.current.backgroundError).toBe(
        'You’re offline. Your changes are still here; try again when you’re connected.',
      ),
    );
  });
});
const IN_REVIEW = {
  type: '/problems/mentor-application-in-review',
  title: 'MentorApplicationInReviewError',
  status: 409,
  detail: 'Your application is in review, so these can’t change until it is decided.',
  fields: ['headline'],
};
const refused = (error: unknown = IN_REVIEW) => ({
  data: undefined,
  error,
  response: new Response(null, { status: 409 }),
});

describe('useProfileItems — refused for the review (409 in review)', () => {
  function withFreeze() {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return renderHook(() => ({ items: useProfileItems('u1'), refused: useInReviewRefusal() }), {
      wrapper,
    });
  }

  it('topics: the page sees the refusal', async () => {
    PATCH.mockResolvedValue(refused({ ...IN_REVIEW, fields: ['offering_ids'] }));
    const { result } = withFreeze();
    act(() => result.current.items.saveTopics(['o1'], vi.fn()));
    await waitFor(() => expect(result.current.refused).toBe(true));
  });

  it('background: the page sees the refusal', async () => {
    PATCH.mockResolvedValue(refused({ ...IN_REVIEW, fields: ['origin_country_id'] }));
    const { result } = withFreeze();
    act(() => result.current.items.saveBackground(before, { ...before, originId: 'gh' }, vi.fn()));
    await waitFor(() => expect(result.current.refused).toBe(true));
  });
});
