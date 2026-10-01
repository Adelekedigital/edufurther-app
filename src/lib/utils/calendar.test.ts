import { emptyWeek } from './sessionTypeDraft';
import {
  monthCells,
  monthStart,
  noticeLabel,
  slotCount,
  todayIn,
  weeklyTotal,
  windowSummary,
  type MonthCell,
} from './calendar';

const week = (slots: Record<number, [number, number][]>) =>
  emptyWeek().map((d, i) => (slots[i] ? { on: true, slots: slots[i]! } : d));

describe('weeklyTotal', () => {
  it('reads the design’s summary, one decimal', () => {
    expect(weeklyTotal(week({ 1: [[1020, 1200]], 6: [[540, 570]] }))).toBe(
      '3.5 hrs a week · 2 days',
    );
    expect(weeklyTotal(week({ 2: [[540, 600]] }))).toBe('1 hrs a week · 1 day');
  });
  it('says so when no day is on', () => {
    expect(weeklyTotal(emptyWeek())).toBe('No hours set');
  });
  it('ignores a slot that ends before it starts', () => {
    expect(weeklyTotal(week({ 1: [[600, 540]] }))).toBe('0 hrs a week · 1 day');
  });
});

describe('slotCount', () => {
  it('counts whole sessions of the length across the week', () => {
    expect(slotCount(week({ 1: [[540, 630]], 2: [[540, 570]] }), 60)).toBe(2);
    expect(slotCount(week({ 1: [[540, 570]] }), 60)).toBe(0);
  });
});

describe('noticeLabel and windowSummary', () => {
  it('names notice as the design does', () => {
    expect(noticeLabel(24)).toBe('24 hours');
    expect(noticeLabel(48)).toBe('2 days');
    expect(noticeLabel(72)).toBe('3 days');
    expect(noticeLabel(30)).toBe('30 hours');
  });
  it('summarises the window, falling back to the platform’s values, capped', () => {
    expect(
      windowSummary({
        durationMin: 45,
        noticeHours: 48,
        windowDays: 14,
        breakMin: 15,
        requiresApproval: true,
      }),
    ).toBe('45 min sessions · at least 2 days notice · up to 2 weeks ahead · 15 min break');
    expect(
      windowSummary({
        durationMin: null,
        noticeHours: null,
        windowDays: 56,
        breakMin: 0,
        requiresApproval: false,
        maxWindowDays: 28,
      }),
    ).toBe('60 min sessions · at least 24 hours notice · up to 4 weeks ahead · no break');
  });
});

describe('todayIn', () => {
  it('is the date in the zone, not the device’s', () => {
    const at = new Date('2026-10-01T23:30:00Z');
    expect(todayIn('Africa/Lagos', at)).toBe('2026-10-02');
    expect(todayIn('America/New_York', at)).toBe('2026-10-01');
  });
});

describe('monthCells', () => {
  const days = (cells: MonthCell[]) =>
    cells.filter((c): c is Extract<MonthCell, { kind: 'day' }> => c.kind === 'day');

  it('pads to the 1st’s weekday, Sunday first, and lists every day', () => {
    // October 2026 starts on a Thursday.
    const cells = monthCells({
      month: '2026-10-01',
      today: '2026-10-01',
      selected: [],
      booked: [],
    });
    expect(cells.slice(0, 4).every((c) => c.kind === 'pad')).toBe(true);
    expect(days(cells)).toHaveLength(31);
    expect(days(cells)[0]).toMatchObject({ iso: '2026-10-01', weekday: 4, today: true });
  });

  it('joins a blocked run within a week only', () => {
    const d = days(
      monthCells({
        month: '2026-10-01',
        today: '2026-10-01',
        selected: ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'],
        booked: [],
      }),
    );
    const at = (n: number) => d[n - 1]!;
    expect(at(9)).toMatchObject({ joinPrev: false, joinNext: true });
    // Saturday 10th: the band stops at the week's end, and starts again on Sunday 11th.
    expect(at(10)).toMatchObject({ joinPrev: true, joinNext: false });
    expect(at(11)).toMatchObject({ joinPrev: false, joinNext: true });
    expect(at(12)).toMatchObject({ joinPrev: true, joinNext: false });
  });

  it('marks open weekdays from today on, never a past or blocked day', () => {
    const d = days(
      monthCells({
        month: '2026-10-01',
        today: '2026-10-06',
        selected: ['2026-10-13'],
        booked: ['2026-10-20'],
        available: [2],
      }),
    );
    const at = (n: number) => d[n - 1]!;
    expect(at(6)).toMatchObject({ open: true, past: false });
    expect(at(13)).toMatchObject({ open: false, selected: true });
    expect(at(20)).toMatchObject({ open: true, booked: true });
    expect(at(5)).toMatchObject({ past: true, open: false });
  });

  it('pages months from today’s', () => {
    expect(monthStart('2026-12-15', 1)).toBe('2027-01-01');
    expect(monthStart('2026-10-31', 0)).toBe('2026-10-01');
  });
});
