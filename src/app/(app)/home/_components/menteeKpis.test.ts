import type { MenteeStats } from '@/lib/api/data/menteeHome';
import { MISSED_HREF, returningKpis } from './menteeKpis';

const stats = (over: Partial<MenteeStats> = {}): MenteeStats => ({
  sessionsHeld: 12,
  mentorsMet: 8,
  hoursOfGuidance: 9,
  missedSessions: 0,
  missedWindowDays: 90,
  windowDays: 30,
  current: { sessions: 2, hours: 1.5 },
  previous: { sessions: 1, hours: 0.75 },
  thisMonth: null,
  ...over,
});

describe('returningKpis', () => {
  it('shows the recent-window trend and formats hours', () => {
    const k = returningKpis(stats());
    expect(k[0]).toMatchObject({
      label: 'Sessions held',
      value: '12',
      trend: { text: '2 in the last 30 days', icon: 'trending_up', tone: 'positive' },
    });
    expect(k[2]).toMatchObject({
      value: '9',
      unit: 'hrs',
      trend: { text: '1.5 hrs in the last 30 days', tone: 'positive' },
    });
  });

  it('omits the trend when the recent window is empty', () => {
    const k = returningKpis(stats({ current: { sessions: 0, hours: 0 } }));
    expect(k[0]!.trend).toBeUndefined();
    expect(k[2]!.trend).toBeUndefined();
  });

  it('reads the window length from the data (not hard-coded)', () => {
    const k = returningKpis(stats({ windowDays: 7, missedWindowDays: 60, missedSessions: 0 }));
    expect(k[0]!.trend?.text).toBe('2 in the last 7 days');
    expect(k[3]!.trend?.text).toBe('None in 60 days');
    expect(k[3]!.info).toContain('in the last 60 days');
  });

  it('mentors met has no trend: the screen adds "View mentors" in its place', () => {
    const mentors = returningKpis(stats())[1]!;
    expect(mentors).toMatchObject({ label: 'Mentors met', value: '8' });
    expect(mentors.trend).toBeUndefined();
  });

  it('every tile carries its design hint', () => {
    expect(returningKpis(stats()).map((k) => k.info)).toEqual([
      'Sessions you and your mentor both joined',
      'Mentors you’ve completed at least one session with',
      'Total length of your completed sessions',
      'Sessions your mentor joined and you didn’t, in the last 90 days.',
    ]);
  });

  it('reads "+N this month" when the backend sends the calendar month', () => {
    const k = returningKpis(stats({ thisMonth: { sessions: 2, hours: 1.5 } }));
    expect(k[0]!.trend?.text).toBe('+2 this month');
    expect(k[2]!.trend?.text).toBe('+1.5 hrs this month');
    // A quiet month shows no trend, never "+0".
    const quiet = returningKpis(stats({ thisMonth: { sessions: 0, hours: 0 } }));
    expect(quiet[0]!.trend).toBeUndefined();
    expect(quiet[2]!.trend).toBeUndefined();
  });

  it('zero missed reads "None in 90 days" with the check, no "of N" unit and no link', () => {
    const missed = returningKpis(stats({ missedSessions: 0 }))[3]!;
    expect(missed).toMatchObject({ label: 'Missed sessions', value: '0' });
    expect(missed.trend).toMatchObject({
      text: 'None in 90 days',
      icon: 'check_circle',
      tone: 'positive',
    });
    expect(missed.unit).toBeUndefined();
    expect(missed.link).toBeUndefined();
  });

  it('one missed is amber, two or more red, each with "View missed" to Bookings History', () => {
    const one = returningKpis(stats({ missedSessions: 1 }))[3]!;
    expect(one).toMatchObject({ label: 'Missed · 90 days', value: '1', valueTone: 'warning' });
    expect(one.link).toEqual({ label: 'View missed', href: MISSED_HREF });
    expect(one.trend).toBeUndefined();
    expect(MISSED_HREF).toBe('/bookings?tab=history&filter=missed');
    const two = returningKpis(stats({ missedSessions: 2 }))[3]!;
    expect(two.valueTone).toBe('danger');
    // No pause wording until #444 is decided.
    expect(two.info).not.toMatch(/paus/i);
  });

  it('a null figure stays null ("No data yet"), with no activity trend over it', () => {
    // current still has activity (2 sessions, 1.5 hrs), but with the all-time
    // value unknown a trend beneath "No data yet" would contradict the card.
    const k = returningKpis(
      stats({ sessionsHeld: null, hoursOfGuidance: null, missedSessions: null }),
    );
    expect(k[0]!.value).toBeNull();
    expect(k[0]!.trend).toBeUndefined();
    expect(k[2]!.value).toBeNull();
    expect(k[2]!.trend).toBeUndefined();
    expect(k[3]!.value).toBeNull();
  });
});
