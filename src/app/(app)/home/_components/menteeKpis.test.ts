import type { MenteeStats } from '@/lib/api/data/menteeHome';
import { NEW_MENTEE_KPIS, returningKpis } from './menteeKpis';

const stats = (over: Partial<MenteeStats> = {}): MenteeStats => ({
  sessionsHeld: 12,
  mentorsMet: 8,
  hoursOfGuidance: 9,
  missedSessions: 0,
  missedWindowDays: 90,
  windowDays: 30,
  current: { sessions: 2, hours: 1.5 },
  previous: { sessions: 1, hours: 0.75 },
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
    expect(k[3]!.trend?.text).toBe('None in the last 60 days');
  });

  it('mentors met is value-only in PR 1 (no trend, no link)', () => {
    const mentors = returningKpis(stats())[1]!;
    expect(mentors).toMatchObject({ label: 'Mentors met', value: '8' });
    expect(mentors.trend).toBeUndefined();
  });

  it('zero missed reads "None in the last 90 days" (positive), with no "of N" unit', () => {
    const missed = returningKpis(stats({ missedSessions: 0 }))[3]!;
    expect(missed).toMatchObject({ value: '0' });
    expect(missed.trend).toMatchObject({ text: 'None in the last 90 days', tone: 'positive' });
    expect(missed.unit).toBeUndefined();
  });

  it('a positive missed count reads negative, with no icon', () => {
    const missed = returningKpis(stats({ missedSessions: 2 }))[3]!;
    expect(missed.trend).toMatchObject({ text: '2 in the last 90 days', tone: 'negative' });
    expect(missed.trend?.icon).toBeUndefined();
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

describe('NEW_MENTEE_KPIS', () => {
  it('are encouraging zeros with no missed cap', () => {
    expect(NEW_MENTEE_KPIS.map((k) => k.value)).toEqual(['0', '0', '0', '0']);
    expect(NEW_MENTEE_KPIS[3]!.unit).toBeUndefined();
    expect(NEW_MENTEE_KPIS[0]!.trend).toMatchObject({ text: 'Your first one counts here' });
  });
});
