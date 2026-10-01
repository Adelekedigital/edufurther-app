import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { hhmm } from '@/lib/utils/sessionTypeDraft';
import { minutes, planHoursSave, toWeeklyHours, useSaveWeeklyHours } from './weeklyHours';

const DELETE = vi.fn();
const POST = vi.fn();
vi.mock('./http', () => ({
  api: {
    DELETE: (...a: unknown[]) => DELETE(...a),
    POST: (...a: unknown[]) => POST(...a),
  },
}));
const reply = (status: number) => Promise.resolve({ response: new Response(null, { status }) });

const rule = (id: string, day: number, start: string, end: string, active = true) => ({
  id,
  day_of_week: day,
  start_time: start,
  end_time: end,
  timezone: 'Africa/Lagos',
  is_active: active,
});

describe('toWeeklyHours', () => {
  it('groups active rules by day, sorted; midnight ends the day; paused rules are left out', () => {
    const w = toWeeklyHours(
      [
        rule('a', 1, '17:00:00', '20:00:00'),
        rule('b', 1, '09:00:00', '10:30:00'),
        rule('c', 6, '22:00:00', '00:00:00'),
        rule('d', 3, '09:00:00', '10:00:00', false),
      ],
      'Europe/London',
    );
    expect(w.days[1]).toEqual({
      on: true,
      slots: [
        [540, 630],
        [1020, 1200],
      ],
    });
    expect(w.days[6]).toEqual({ on: true, slots: [[1320, 1440]] });
    expect(w.days[3]!.on).toBe(false);
    expect(w.timeZone).toBe('Africa/Lagos');
    expect(w.rules.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('with no hours, the zone is this device’s', () => {
    expect(toWeeklyHours([], 'Europe/London').timeZone).toBe('Europe/London');
  });
});

describe('planHoursSave', () => {
  it('changes only what changed: removed hours deleted, new ones added, the rest kept', () => {
    const rules = [rule('a', 1, '17:00:00', '20:00:00'), rule('b', 2, '17:00:00', '20:00:00')];
    const days = toWeeklyHours(rules, 'Africa/Lagos').days.map((d) => ({
      ...d,
      slots: d.slots.map((s) => [...s] as [number, number]),
    }));
    days[2] = { on: false, slots: [[1020, 1200]] }; // Tuesday off
    days[5] = { on: true, slots: [[540, 600]] }; // Friday added
    const plan = planHoursSave(rules, days);
    expect(plan.remove.map((r) => r.id)).toEqual(['b']);
    expect(plan.add).toEqual([{ day: 5, slot: [540, 600] }]);
  });

  it('an edited slot is a delete and an add', () => {
    const rules = [rule('a', 1, '17:00:00', '20:00:00')];
    const days = toWeeklyHours(rules, 'Africa/Lagos').days;
    days[1] = { on: true, slots: [[1020, 1260]] };
    const plan = planHoursSave(rules, days);
    expect(plan.remove.map((r) => r.id)).toEqual(['a']);
    expect(plan.add).toEqual([{ day: 1, slot: [1020, 1260] }]);
  });
});

describe('an end at midnight (review of #60)', () => {
  it('is sent as 23:59:59 (the backend refuses 00:00 as an end) and reads back as midnight', () => {
    expect(hhmm(1440)).toBe('23:59:59');
    expect(minutes(hhmm(1440), true)).toBe(1440);
    expect(minutes('23:59:00', true)).toBe(1440);
    // A start keeps its minute.
    expect(minutes('00:00:00', false)).toBe(0);
    const w = toWeeklyHours([rule('a', 6, '21:00:00', '23:59:59')], 'Africa/Lagos');
    expect(w.days[6]).toEqual({ on: true, slots: [[1260, 1440]] });
    // Unchanged, so a save leaves it alone.
    expect(planHoursSave(w.rules, w.days)).toEqual({ remove: [], add: [] });
  });
});

describe('zones', () => {
  it('shows the hours of the zone most are in, and names the others without touching them', () => {
    const w = toWeeklyHours(
      [
        rule('a', 1, '17:00:00', '20:00:00'),
        rule('b', 2, '17:00:00', '20:00:00'),
        { ...rule('c', 3, '09:00:00', '10:00:00'), timezone: 'Europe/London' },
      ],
      'America/New_York',
    );
    expect(w.timeZone).toBe('Africa/Lagos');
    expect(w.otherZones).toEqual(['Europe/London']);
    expect(w.otherSlots).toEqual([{ day: 3, slot: [540, 600], zone: 'Europe/London' }]);
    expect(w.rules.map((r) => r.id)).toEqual(['a', 'b']);
    expect(w.days[3]!.on).toBe(false);
  });
});

describe('a tie between zones', () => {
  it('goes to this device’s zone, whatever the API’s order', () => {
    const w = toWeeklyHours(
      [
        { ...rule('a', 1, '09:00:00', '10:00:00'), timezone: 'Europe/London' },
        rule('b', 2, '09:00:00', '10:00:00'),
      ],
      'Africa/Lagos',
    );
    expect(w.timeZone).toBe('Africa/Lagos');
  });
});

describe('useSaveWeeklyHours', () => {
  let qc: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    DELETE.mockReset();
    POST.mockReset();
    qc = new QueryClient();
  });
  const current = toWeeklyHours(
    [rule('a', 1, '17:00:00', '20:00:00'), rule('b', 2, '17:00:00', '20:00:00')],
    'Africa/Lagos',
  );
  const next = () => {
    const days = current.days.map((d) => ({
      ...d,
      slots: d.slots.map((s) => [...s] as [number, number]),
    }));
    days[2] = { on: false, slots: [[1020, 1200]] }; // Tuesday off
    days[6] = { on: true, slots: [[1260, 1440]] }; // Saturday to midnight
    return days;
  };

  it('deletes first, then adds in the hours’ zone, ending at 23:59:59; refreshes what depends on them', async () => {
    const order: string[] = [];
    DELETE.mockImplementation(() => (order.push('delete'), reply(200)));
    POST.mockImplementation(() => (order.push('post'), reply(201)));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSaveWeeklyHours('m1'), { wrapper });
    await result.current.save({ current, days: next() });
    expect(order).toEqual(['delete', 'post']);
    expect(DELETE.mock.calls[0]![1].params.path).toEqual({ user_id: 'm1', rule_id: 'b' });
    expect(POST.mock.calls[0]![1].body).toEqual({
      day_of_week: 6,
      start_time: '21:00:00',
      end_time: '23:59:59',
      timezone: 'Africa/Lagos',
      is_active: true,
    });
    const keysHit = invalidate.mock.calls.map((c) => JSON.stringify(c[0]!.queryKey));
    expect(keysHit).toEqual(
      expect.arrayContaining(['["weeklyHours","m1"]', '["booking"]', '["mentors"]']),
    );
  });

  it('a rule already gone (404, a retry after a partial save) counts as removed', async () => {
    DELETE.mockImplementation(() => reply(404));
    POST.mockImplementation(() => reply(201));
    const { result } = renderHook(() => useSaveWeeklyHours('m1'), { wrapper });
    await expect(result.current.save({ current, days: next() })).resolves.toBeUndefined();
  });

  it('says "some" when some failed, and not when all did', async () => {
    DELETE.mockImplementation(() => reply(200));
    POST.mockImplementation(() => reply(500));
    const { result } = renderHook(() => useSaveWeeklyHours('m1'), { wrapper });
    await expect(result.current.save({ current, days: next() })).rejects.toMatchObject({
      message: 'Some of your hours didn’t save. Check them, then try again.',
    });
    DELETE.mockImplementation(() => reply(500));
    await expect(result.current.save({ current, days: next() })).rejects.toMatchObject({
      message: 'Your hours didn’t save. Try again in a moment.',
    });
  });
});

describe('moving the hours to another zone (Calendar)', () => {
  it('plans every rule removed and every slot re-added, clock times kept', () => {
    const rules = [rule('a', 1, '17:00:00', '20:00:00'), rule('b', 6, '09:00:00', '13:00:00')];
    const w = toWeeklyHours(rules, 'Africa/Lagos');
    const plan = planHoursSave(w.rules, w.days, true);
    expect(plan.remove.map((r) => r.id)).toEqual(['a', 'b']);
    expect(plan.add).toEqual([
      { day: 1, slot: [1020, 1200] },
      { day: 6, slot: [540, 780] },
    ]);
  });

  it('saves the new rules in the chosen zone', async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    DELETE.mockReset();
    POST.mockReset();
    DELETE.mockImplementation(() => reply(200));
    POST.mockImplementation(() => reply(201));
    const current = toWeeklyHours([rule('a', 1, '17:00:00', '20:00:00')], 'Africa/Lagos');
    const { result } = renderHook(() => useSaveWeeklyHours('m1'), { wrapper });
    await result.current.save({ current, days: current.days, timeZone: 'Europe/London' });
    expect(DELETE.mock.calls[0]![1].params.path.rule_id).toBe('a');
    expect(POST.mock.calls[0]![1].body).toMatchObject({
      day_of_week: 1,
      start_time: '17:00:00',
      timezone: 'Europe/London',
    });
  });
});
