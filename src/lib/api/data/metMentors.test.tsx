import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toMetMentor, useMetMentors } from './metMentors';

const get = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'me' }),
  sessionKey: () => 'me',
}));

const resp = (status: number, data: unknown) => ({
  data,
  error: status >= 400 ? {} : undefined,
  response: { ok: status < 400, status, headers: new Headers() },
});

const row = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  slug: 'mariam-alamata',
  first_name: 'Mariam',
  last_name: 'Alamata',
  avatar_url: null,
  avatar_focus: null,
  degree: 'MSc, Public Health',
  institution: 'University of Edinburgh',
  session_count: 2,
  last_session_at: '2026-10-06T10:00:00Z',
  bookability: 'open',
  ...over,
});

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
});

describe('toMetMentor', () => {
  it('maps the card fields, name and initials', () => {
    const m = toMetMentor(row() as never);
    expect(m).toMatchObject({
      id: 'm1',
      slug: 'mariam-alamata',
      name: 'Mariam Alamata',
      initials: 'MA',
      degree: 'MSc, Public Health',
      institution: 'University of Edinburgh',
      sessionCount: 2,
      lastSessionAt: '2026-10-06T10:00:00Z',
      bookability: 'open',
    });
    expect(m.tone).toBeGreaterThanOrEqual(1);
    expect(m.tone).toBeLessThanOrEqual(6);
  });

  it('a null slug stays null (card renders but does not link)', () => {
    expect(toMetMentor(row({ slug: null }) as never).slug).toBeNull();
  });

  it('falls back to "Your mentor" when the name is absent', () => {
    const m = toMetMentor(row({ first_name: null, last_name: null }) as never);
    expect(m.name).toBe('Your mentor');
    expect(m.initials).toBe('Y');
  });

  it('clamps a malformed avatar focus to null', () => {
    expect(
      toMetMentor(row({ avatar_focus: { x: 2, y: Number.NaN } }) as never).avatarFocus,
    ).toBeNull();
  });
});

describe('useMetMentors', () => {
  it('returns the mapped list', async () => {
    get.mockResolvedValue(
      resp(200, {
        data: [row(), row({ id: 'm2', bookability: 'has_upcoming' })],
        next_cursor: null,
      }),
    );
    const { result } = renderHook(() => useMetMentors(true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[1]?.bookability).toBe('has_upcoming');
    expect(result.current.error).toBeNull();
  });

  it('an empty list is [] (the empty state), not an error', async () => {
    get.mockResolvedValue(resp(200, { data: [], next_cursor: null }));
    const { result } = renderHook(() => useMetMentors(true), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual([]);
  });

  it('surfaces a non-200 as an error', async () => {
    get.mockResolvedValue(resp(500, undefined));
    const { result } = renderHook(() => useMetMentors(true), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it('is disabled until asked', () => {
    const { result } = renderHook(() => useMetMentors(false), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });
});
