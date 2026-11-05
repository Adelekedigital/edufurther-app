import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toSchoolNames, useMentorSchools } from './mentorSchools';

const get = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));

const resp = (status: number, data: unknown) => ({
  data,
  error: status >= 400 ? {} : undefined,
  response: { ok: status < 400, status, headers: new Headers() },
});

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('toSchoolNames', () => {
  it('keeps the backend’s order and drops an empty name', () => {
    expect(
      toSchoolNames({
        data: [{ name: 'University of Oxford' }, { name: ' ' }, { name: 'TU Munich' }],
        next_cursor: null,
      }),
    ).toEqual(['University of Oxford', 'TU Munich']);
  });
});

describe('useMentorSchools', () => {
  it('asks for 5 by default and returns the names', async () => {
    get.mockResolvedValue(
      resp(200, { data: [{ name: 'University of Oxford' }], next_cursor: null }),
    );
    const { result } = renderHook(() => useMentorSchools(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(['University of Oxford']));
    expect(get).toHaveBeenCalledWith('/api/v1/mentor-schools', {
      params: { query: { limit: 5 } },
      signal: expect.anything(),
    });
  });

  it('reports a failure once, without retrying (the strip hides)', async () => {
    get.mockResolvedValue(resp(500, null));
    const { result } = renderHook(() => useMentorSchools(), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
