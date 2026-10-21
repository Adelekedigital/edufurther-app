import { emptyWeek } from './sessionTypeDraft';
import {
  availabilitySummary,
  bookableRange,
  monthCells,
  runsOf,
  shortDay,
  monthStart,
  noticeLabel,
  slotCount,
  todayIn,
  weeklyTotal,
  bookingRulesSummary,
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

describe('availabilitySummary', () => {
  const nineToFive: [number, number][] = [[540, 1020]];
  it('names a run of three or more days as a range, and one shared time', () => {
    expect(
      availabilitySummary(
        week({ 1: nineToFive, 2: nineToFive, 3: nineToFive, 4: nineToFive, 5: nineToFive }),
      ),
    ).toBe('Mon–Fri · 9 am–5 pm');
  });
  it('lists two days, gaps and single days, Sunday first like the hours list', () => {
    expect(
      availabilitySummary(week({ 0: nineToFive, 1: nineToFive, 3: nineToFive, 6: nineToFive })),
    ).toBe('Sun, Mon, Wed, Sat · 9 am–5 pm');
  });
  it('says the times vary when days differ or a day has two ranges', () => {
    expect(availabilitySummary(week({ 1: nineToFive, 2: [[600, 660]] }))).toBe(
      'Mon, Tue · times vary by day',
    );
    expect(
      availabilitySummary(
        week({
          1: [
            [540, 600],
            [780, 870],
          ],
        }),
      ),
    ).toBe('Mon · times vary by day');
  });
  it('keeps half hours, and is null with no hours', () => {
    expect(availabilitySummary(week({ 2: [[570, 1050]] }))).toBe('Tue · 9:30 am–5:30 pm');
    expect(availabilitySummary(emptyWeek())).toBeNull();
  });
});

describe('slotCount', () => {
  it('counts whole sessions of the length across the week', () => {
    expect(slotCount(week({ 1: [[540, 690]], 2: [[540, 600]] }), 60)).toBe(3);
    expect(slotCount(week({ 1: [[540, 570]] }), 60)).toBe(0);
    // Two hour-long openings fit no 90-minute session: a session can't span two.
    expect(
      slotCount(
        week({
          1: [
            [540, 600],
            [660, 720],
          ],
        }),
        90,
      ),
    ).toBe(0);
  });
});

describe('noticeLabel and bookingRulesSummary', () => {
  it('names notice as the design does', () => {
    expect(noticeLabel(24)).toBe('24 hours');
    expect(noticeLabel(48)).toBe('2 days');
    expect(noticeLabel(72)).toBe('3 days');
    expect(noticeLabel(30)).toBe('30 hours');
    expect(noticeLabel(61 / 60)).toBe('1 hour');
  });
  it('summarises the rules, approval first, falling back to the platform’s values, capped', () => {
    expect(
      bookingRulesSummary({
        durationMin: 45,
        noticeHours: 48,
        windowDays: 14,
        breakMin: 15,
        requiresApproval: true,
      }),
    ).toBe('You approve each booking · 45 min · 2 days notice · 2 weeks ahead · 15 min buffer');
    expect(
      bookingRulesSummary({
        durationMin: null,
        noticeHours: null,
        windowDays: 56,
        breakMin: 0,
        requiresApproval: false,
        maxWindowDays: 28,
      }),
    ).toBe('Confirmed straight away · 60 min · 24 hrs notice · 4 weeks ahead · No buffer');
  });
  it('shortens notice in hours, and says one hour as one', () => {
    const at = (noticeHours: number) =>
      bookingRulesSummary({
        durationMin: 60,
        noticeHours,
        windowDays: 28,
        breakMin: 15,
        requiresApproval: false,
      }).split(' · ')[2];
    expect(at(36)).toBe('36 hrs notice');
    expect(at(1)).toBe('1 hr notice');
    expect(at(72)).toBe('3 days notice');
    // Minutes stored elsewhere: judged on the number shown.
    expect(at(61 / 60)).toBe('1 hr notice');
    expect(at(1.5)).toBe('1.5 hrs notice');
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

  it('marks open only between the notice and the end of the booking window', () => {
    const d = days(
      monthCells({
        month: '2026-10-01',
        today: '2026-10-01',
        selected: [],
        booked: [],
        available: [0, 1, 2, 3, 4, 5, 6],
        openFrom: '2026-10-02',
        openUntil: '2026-10-08',
      }),
    );
    expect(d.filter((c) => c.open).map((c) => c.day)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it('bookableRange: notice in whole days, the window capped', () => {
    expect(
      bookableRange('2026-10-01', {
        durationMin: 60,
        noticeHours: 48,
        windowDays: 56,
        breakMin: 0,
        requiresApproval: false,
        maxWindowDays: 14,
      }),
    ).toEqual({ from: '2026-10-03', until: '2026-10-15' });
  });

  it('pages months from today’s', () => {
    expect(monthStart('2026-12-15', 1)).toBe('2027-01-01');
    expect(monthStart('2026-10-31', 0)).toBe('2026-10-01');
  });
});

describe('runsOf and shortDay', () => {
  it('groups days into runs, end exclusive, across a month end', () => {
    expect(runsOf(['2026-10-31', '2026-11-01', '2026-10-05', '2026-10-05'])).toEqual([
      { start: '2026-10-05', end: '2026-10-06' },
      { start: '2026-10-31', end: '2026-11-02' },
    ]);
  });
  it('names a day as the design does', () => {
    expect(shortDay('2026-10-12')).toBe('Mon, Oct 12');
  });
});

describe('busy copy once the return date has passed', () => {
  it('says passed, not "we\u2019ll remind you"', async () => {
    const { busyBody, busyHint } = await import('./calendar');
    expect(busyHint('2026-10-08', '2026-10-12')).toBe('Return date passed');
    expect(busyHint('2026-10-08', '2026-10-01')).toBe('Back Thu, Oct 8');
    // On the day itself (the reminder's day) it hasn't passed yet.
    expect(busyHint('2026-10-08', '2026-10-08')).toBe('Back Thu, Oct 8');
    expect(busyBody('2026-10-08', '2026-10-08')).toContain('We’ll remind you on Thu, Oct 8');
    expect(busyHint(null, '2026-10-01')).toBe('No return date');
    expect(busyBody('2026-10-08', '2026-10-12')).toContain(
      'Your return date, Thu, Oct 8, has passed.',
    );
    expect(busyBody('2026-10-08', '2026-10-01')).toContain('We’ll remind you on Thu, Oct 8');
  });
});

describe('bookedRange', () => {
  it('reaches the furthest of 90 days, every month on screen and the window, plus a day', async () => {
    const { bookedRange } = await import('./calendar');
    // 90 days from Oct 1 is the furthest: Dec 31, then a day of slack.
    expect(bookedRange('2026-10-01', [null], null)).toEqual({
      from: '2026-10-01',
      to: '2027-01-01',
    });
    // A month paged to February: its end (Mar 1) plus a day.
    expect(bookedRange('2026-10-01', ['2027-02-01', null], null).to).toBe('2027-03-02');
    // A modal paged further than the page.
    expect(bookedRange('2026-10-01', ['2026-10-01', '2027-04-01'], null).to).toBe('2027-05-02');
    // A booking window past 90 days: its last day, the day after, then slack.
    expect(bookedRange('2026-10-01', [null], '2027-02-10').to).toBe('2027-02-12');
  });
});
