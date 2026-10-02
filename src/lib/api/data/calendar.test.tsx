import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { blockedDaysOf, fetchBookedSessions, planBlockSave, useSaveBlockedDays } from './calendar';

const GET = vi.fn();
const DELETE = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => GET(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
    POST: (...a: unknown[]) => POST(...a),
  },
}));

const s = (id: string, starts: string, status = 'confirmed', mentor = 'm1') => ({
  id,
  mentor_id: mentor,
  mentee_id: 'x',
  mentee: { id: 'x', deleted: false, first_name: id === 'd' ? 'Taofeeq' : null },
  status,
  starts_at: starts,
});
const page = (data: unknown[], next: string | null) =>
  Promise.resolve({ data: { data, next_cursor: next }, response: new Response(null) });

describe('fetchBookedSessions', () => {
  beforeEach(() => GET.mockReset());
  const RANGE = { from: '2026-10-01', to: '2026-12-31' };

  it('asks for the range and both live statuses, pages to the end, keeps the mentor’s own', async () => {
    GET.mockImplementationOnce(() =>
      page(
        [
          s('a', '2026-10-09T16:00:00Z', 'pending_mentor_approval'),
          s('c', '2026-10-07T16:00:00Z', 'confirmed', 'someone-else'),
          s('d', '2026-10-04T16:00:00Z'),
        ],
        'next',
      ),
    ).mockImplementationOnce(() => page([s('e', '2026-10-02T09:00:00Z')], null));
    const got = await fetchBookedSessions('m1', RANGE);
    expect(got).toEqual([
      { startsAt: '2026-10-09T16:00:00Z', mentee: null },
      { startsAt: '2026-10-04T16:00:00Z', mentee: 'Taofeeq' },
      { startsAt: '2026-10-02T09:00:00Z', mentee: null },
    ]);
    expect(GET).toHaveBeenCalledTimes(2);
    expect(GET.mock.calls[0]![1].params.query).toEqual({
      limit: 50,
      cursor: undefined,
      from: '2026-10-01',
      to: '2026-12-31',
      status: ['confirmed', 'pending_mentor_approval'],
    });
    expect(GET.mock.calls[1]![1].params.query.cursor).toBe('next');
  });

  it('throws when the list fails (a 422 included)', async () => {
    GET.mockImplementationOnce(() =>
      Promise.resolve({
        data: undefined,
        error: {},
        response: new Response(null, { status: 422 }),
      }),
    );
    await expect(fetchBookedSessions('m1', RANGE)).rejects.toBeTruthy();
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

describe('planBlockSave', () => {
  const block = (id: string, start: string, end: string, extra: object = {}) => ({
    id,
    type: 'block' as const,
    start_date: start,
    end_date: end,
    start_time: null,
    end_time: null,
    timezone: 'Africa/Lagos',
    reason: null,
    ...extra,
  });
  const TODAY = '2026-10-01';

  it('keeps a block whose days are all still wanted, and adds new days as runs', () => {
    const plan = planBlockSave(
      [block('a', '2026-10-12', '2026-10-15')],
      ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-20', '2026-10-21', '2026-10-23'],
      TODAY,
      'Africa/Lagos',
    );
    expect(plan.remove).toEqual([]);
    expect(plan.add).toEqual([
      { start: '2026-10-20', end: '2026-10-22', timezone: 'Africa/Lagos' },
      { start: '2026-10-23', end: '2026-10-24', timezone: 'Africa/Lagos' },
    ]);
  });

  it('splits a run when a day inside it is unblocked: delete, then recreate what remains', () => {
    const plan = planBlockSave(
      [block('a', '2026-10-12', '2026-10-15')],
      ['2026-10-12', '2026-10-14'],
      TODAY,
      'Africa/Lagos',
    );
    expect(plan.remove.map((e) => e.id)).toEqual(['a']);
    expect(plan.add).toEqual([
      { start: '2026-10-12', end: '2026-10-13', timezone: 'Africa/Lagos' },
      { start: '2026-10-14', end: '2026-10-15', timezone: 'Africa/Lagos' },
    ]);
  });

  it('never touches part-day blocks or overrides; a split keeps the block’s past days', () => {
    const plan = planBlockSave(
      [
        block('part', '2026-10-05', '2026-10-06', { start_time: '09:00:00', end_time: '12:00:00' }),
        block('over', '2026-10-07', '2026-10-08', { type: 'override' }),
        block('span', '2026-09-28', '2026-10-04'),
      ],
      ['2026-09-28', '2026-09-29', '2026-10-02'],
      TODAY,
      'Africa/Lagos',
    );
    expect(plan.remove.map((e) => e.id)).toEqual(['span']);
    // Today (Oct 1) was unblocked; the past days (Sep 28–30) and Oct 2 come back.
    expect(plan.add).toEqual([
      { start: '2026-09-28', end: '2026-10-01', timezone: 'Africa/Lagos' },
      { start: '2026-10-02', end: '2026-10-03', timezone: 'Africa/Lagos' },
    ]);
  });

  it('leaves a past block, and one running through today, alone (the page sends days from today on)', () => {
    const plan = planBlockSave(
      [block('past', '2026-09-20', '2026-09-23'), block('through', '2026-09-30', '2026-10-04')],
      // What the screen sends: the upcoming days only, plus a new one in November.
      ['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-10'],
      TODAY,
      'Africa/Lagos',
    );
    expect(plan.remove).toEqual([]);
    expect(plan.add).toEqual([
      { start: '2026-11-10', end: '2026-11-11', timezone: 'Africa/Lagos' },
    ]);
  });

  it('a split keeps the block’s own zone; new days take the hours’ zone', () => {
    const plan = planBlockSave(
      [block('a', '2026-10-12', '2026-10-15')],
      ['2026-10-12', '2026-10-20'],
      TODAY,
      'Europe/London',
    );
    expect(plan.add).toEqual([
      { start: '2026-10-12', end: '2026-10-13', timezone: 'Africa/Lagos' },
      { start: '2026-10-20', end: '2026-10-21', timezone: 'Europe/London' },
    ]);
  });
});

describe('useSaveBlockedDays', () => {
  const reply = (status: number) => Promise.resolve({ response: new Response(null, { status }) });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  const split = {
    exceptions: [
      {
        id: 'a',
        type: 'block' as const,
        start_date: '2026-10-12',
        end_date: '2026-10-15',
        start_time: null,
        end_time: null,
        timezone: 'Africa/Lagos',
        reason: null,
      },
    ],
    wanted: ['2026-10-12', '2026-10-14'],
    today: '2026-10-01',
    timeZone: 'Europe/London',
  };
  beforeEach(() => {
    DELETE.mockReset();
    POST.mockReset();
  });

  it('deletes first, then creates whole-day runs, end exclusive', async () => {
    const order: string[] = [];
    DELETE.mockImplementation(() => (order.push('delete'), reply(204)));
    POST.mockImplementation(() => (order.push('post'), reply(201)));
    const { result } = renderHook(() => useSaveBlockedDays('m1'), { wrapper });
    await result.current.save(split);
    expect(order).toEqual(['delete', 'post', 'post']);
    expect(DELETE.mock.calls[0]![1].params.path).toEqual({ user_id: 'm1', exception_id: 'a' });
    expect(POST.mock.calls[0]![1].body).toEqual({
      type: 'block',
      start_date: '2026-10-12',
      end_date: '2026-10-13',
      start_time: null,
      end_time: null,
      // Split from a Lagos block: it keeps Lagos, whatever the hours' zone.
      timezone: 'Africa/Lagos',
      reason: null,
    });
  });

  it('says "some" when part of it failed', async () => {
    DELETE.mockImplementation(() => reply(204));
    POST.mockImplementationOnce(() => reply(201)).mockImplementationOnce(() => reply(500));
    const { result } = renderHook(() => useSaveBlockedDays('m1'), { wrapper });
    await expect(result.current.save(split)).rejects.toMatchObject({
      message: 'Some of your dates didn’t save. Check them, then try again.',
    });
  });
});
