import { QueryClient } from '@tanstack/react-query';
import { clearSeenHere, seenHere, SEEN_HERE_KEY } from '@/lib/utils/seenHere';
import { keys } from './keys';

const h = vi.hoisted(() => ({ put: vi.fn(), previewing: false }));
vi.mock('./pending', () => ({ untyped: { PUT: h.put } }));
vi.mock('./previewStore', () => ({ isPreviewing: () => h.previewing }));
vi.mock('./http', () => ({ api: {} }));
const { markSeen } = await import('./seenItems');

const KEY = 'whats-new:2026-11-migration';
const ME = 'u-1';
const res = (status: number) => ({ response: new Response(null, { status }) });

function cacheWith(seenItems: string[]) {
  const qc = new QueryClient();
  qc.setQueryData(keys.viewer.me(ME), { kind: 'member', id: ME, seenItems });
  return qc;
}
const cached = (qc: QueryClient) =>
  (qc.getQueryData(keys.viewer.me(ME)) as { seenItems: string[] }).seenItems;

beforeEach(() => {
  h.put.mockReset();
  h.previewing = false;
  clearSeenHere();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('markSeen', () => {
  it('adds the key to the cached /me and this viewer’s tab list at once, then PUTs it', async () => {
    h.put.mockResolvedValue(res(204));
    const qc = cacheWith(['older']);
    const done = markSeen(KEY, ME, qc);
    expect(cached(qc)).toEqual(['older', KEY]);
    expect(JSON.parse(sessionStorage.getItem(SEEN_HERE_KEY)!)).toEqual({ id: ME, keys: [KEY] });
    await expect(done).resolves.toBe(true);
    expect(h.put).toHaveBeenCalledWith(`/api/v1/me/seen-items/${encodeURIComponent(KEY)}`);
  });

  it('never adds a key twice', async () => {
    h.put.mockResolvedValue(res(204));
    const qc = cacheWith([KEY]);
    await markSeen(KEY, ME, qc);
    expect(cached(qc)).toEqual([KEY]);
  });

  it('retries quietly on a server error or a dropped connection, then gives up', async () => {
    h.put
      .mockResolvedValueOnce(res(503))
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(res(204));
    const done = markSeen(KEY, ME, cacheWith([]));
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe(true);
    expect(h.put).toHaveBeenCalledTimes(3);

    h.put.mockReset();
    h.put.mockResolvedValue(res(500));
    const failed = markSeen(KEY, ME, cacheWith([]));
    await vi.runAllTimersAsync();
    await expect(failed).resolves.toBe(false);
    expect(h.put).toHaveBeenCalledTimes(3);
  });

  it('a refusal is final, and the key stays seen here', async () => {
    h.put.mockResolvedValue(res(422));
    const qc = cacheWith([]);
    await expect(markSeen(KEY, ME, qc)).resolves.toBe(false);
    expect(h.put).toHaveBeenCalledTimes(1);
    expect(cached(qc)).toEqual([KEY]);
  });

  it('in Preview as user: nothing written, nothing kept here', async () => {
    h.previewing = true;
    const qc = cacheWith([]);
    await expect(markSeen(KEY, ME, qc)).resolves.toBe(false);
    expect(h.put).not.toHaveBeenCalled();
    expect(cached(qc)).toEqual([]);
    expect(seenHere(ME).size).toBe(0);
  });

  it('a key the backend would refuse is not sent or kept', async () => {
    const qc = cacheWith([]);
    await expect(markSeen('Bad Key', ME, qc)).resolves.toBe(false);
    expect(h.put).not.toHaveBeenCalled();
    expect(cached(qc)).toEqual([]);
  });
});

describe('the tab’s seen list belongs to one account', () => {
  it('another viewer in the same tab starts empty, and takes the list over when they mark', async () => {
    h.put.mockResolvedValue(res(204));
    await markSeen(KEY, ME, cacheWith([]));
    expect(seenHere(ME).has(KEY)).toBe(true);
    expect(seenHere('u-2').size).toBe(0);
    expect(seenHere(null).size).toBe(0);
    await markSeen('whats-new:2027-01', 'u-2');
    expect([...seenHere('u-2')]).toEqual(['whats-new:2027-01']);
    expect(seenHere(ME).size).toBe(0);
  });

  it('signing out (or a session ending) clears it', async () => {
    h.put.mockResolvedValue(res(204));
    await markSeen(KEY, ME, cacheWith([]));
    clearSeenHere();
    expect(sessionStorage.getItem(SEEN_HERE_KEY)).toBeNull();
    expect(seenHere(ME).size).toBe(0);
  });
});
