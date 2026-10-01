import { blockedDaysOf, fetchBookedStarts } from './calendar';

const GET = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => GET(...a) } }));

const NOW = Date.parse('2026-10-01T12:00:00Z');
const s = (id: string, starts: string, status = 'confirmed', mentor = 'm1') => ({
  id,
  mentor_id: mentor,
  mentee_id: 'x',
  status,
  starts_at: starts,
});
const page = (data: unknown[], next: string | null) =>
  Promise.resolve({ data: { data, next_cursor: next }, response: new Response(null) });

describe('fetchBookedStarts', () => {
  beforeEach(() => GET.mockReset());

  it('keeps the mentor’s confirmed and pending sessions and stops at the first older one', async () => {
    GET.mockImplementationOnce(() =>
      page(
        [
          s('a', '2026-10-09T16:00:00Z', 'pending_mentor_approval'),
          s('b', '2026-10-08T16:00:00Z', 'cancelled'),
          s('c', '2026-10-07T16:00:00Z', 'confirmed', 'someone-else'),
          s('d', '2026-10-04T16:00:00Z'),
        ],
        'next',
      ),
    ).mockImplementationOnce(() =>
      page([s('e', '2026-10-02T09:00:00Z'), s('f', '2026-09-20T09:00:00Z')], 'more'),
    );
    const starts = await fetchBookedStarts('m1', undefined, NOW);
    expect(starts).toEqual([
      '2026-10-09T16:00:00Z',
      '2026-10-04T16:00:00Z',
      '2026-10-02T09:00:00Z',
    ]);
    // Stopped at f: no third page.
    expect(GET).toHaveBeenCalledTimes(2);
    expect(GET.mock.calls[1]![1].params.query).toEqual({ limit: 50, cursor: 'next' });
  });

  it('throws when the list fails', async () => {
    GET.mockImplementationOnce(() =>
      Promise.resolve({
        data: undefined,
        error: {},
        response: new Response(null, { status: 500 }),
      }),
    );
    await expect(fetchBookedStarts('m1', undefined, NOW)).rejects.toBeTruthy();
  });
});

describe('blockedDaysOf', () => {
  const ex = (start: string, end: string, extra: object = {}) => ({
    id: start,
    type: 'block' as const,
    start_date: start,
    end_date: end,
    start_time: null,
    end_time: null,
    timezone: 'Africa/Lagos',
    reason: null,
    ...extra,
  });
  it('lists whole blocked days, end exclusive; skips part-day blocks and overrides', () => {
    expect(
      blockedDaysOf([
        ex('2026-10-12', '2026-10-15'),
        ex('2026-10-20', '2026-10-21', { start_time: '09:00:00', end_time: '12:00:00' }),
        ex('2026-10-22', '2026-10-23', { type: 'override' }),
        ex('2026-10-13', '2026-10-14'),
      ]),
    ).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
  });
});
