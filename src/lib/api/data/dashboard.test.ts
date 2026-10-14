import { deriveActivation, deriveKpis, type ActivationInputs, type KpiInputs } from './dashboard';

const base: ActivationInputs = {
  completedSessions: 0,
  missing: ['session_type', 'weekly_hours', 'photo', 'headline', 'about', 'topics', 'education'],
  setupNeeded: ['session_type', 'weekly_hours'],
  calendarConnected: false,
  shared: false,
  firstName: 'Gbenga',
  fullName: 'Gbenga Adeyemi',
  profileHref: '/mentors/m1',
  origin: 'https://edufurther.com',
};
const inputs = (over: Partial<ActivationInputs> = {}): ActivationInputs => ({ ...base, ...over });

describe('deriveActivation', () => {
  it('a brand-new mentor with nothing done: 0 of 4, profile is next', () => {
    const a = deriveActivation(inputs());
    expect(a.isNew).toBe(true);
    expect(a.setup).toMatchObject({ doneCount: 0, total: 4, pct: 0 });
    expect(a.setup.next).toEqual({
      key: 'profile',
      title: 'Complete your profile',
      action: { label: 'Edit profile', href: '/mentors/m1' },
    });
  });

  it('profile counts as done when only the two availability codes remain', () => {
    const a = deriveActivation(inputs({ missing: ['session_type', 'weekly_hours'] }));
    expect(a.setup.doneCount).toBe(1);
    expect(a.setup.next?.key).toBe('sessions');
  });

  it('the sessions step points at Sessions when a type is missing, else Calendar', () => {
    expect(deriveActivation(inputs({ missing: [], setupNeeded: ['session_type'] })).setup.next).toMatchObject({
      key: 'sessions',
      title: 'Create your first session',
      action: { href: '/session-types' },
    });
    expect(deriveActivation(inputs({ missing: [], setupNeeded: ['weekly_hours'] })).setup.next).toMatchObject({
      key: 'sessions',
      title: 'Open your weekly hours',
      action: { href: '/calendar' },
    });
  });

  it('Google is next once profile and sessions are done', () => {
    const a = deriveActivation(inputs({ missing: [], setupNeeded: [] }));
    expect(a.setup).toMatchObject({ doneCount: 2, pct: 50 });
    expect(a.setup.next).toMatchObject({ key: 'google', action: { href: '/integrations' } });
  });

  it('share is a copy intent, and finishing all four hides the banner', () => {
    const shareNext = deriveActivation(inputs({ missing: [], setupNeeded: [], calendarConnected: true }));
    expect(shareNext.setup.next).toMatchObject({ key: 'share', action: { copy: true } });
    const allDone = deriveActivation(
      inputs({ missing: [], setupNeeded: [], calendarConnected: true, shared: true }),
    );
    expect(allDone.setup).toMatchObject({ doneCount: 4, pct: 100, next: null });
  });

  it('is not new once a session has completed', () => {
    expect(deriveActivation(inputs({ completedSessions: 1 })).isNew).toBe(false);
  });

  it('builds the share URL from origin + href, empty until origin is known', () => {
    expect(deriveActivation(inputs()).shareUrl).toBe('https://edufurther.com/mentors/m1');
    expect(deriveActivation(inputs({ origin: '' })).shareUrl).toBe('');
  });

  it('falls back to the first name for the share subject', () => {
    expect(deriveActivation(inputs({ fullName: '' })).shareName).toBe('Gbenga');
  });
});

const kpiBase: KpiInputs = {
  completedSessions: 2,
  mentoringMinutes: 120,
  menteesMentored: 1,
  rating: 4.8,
  reviewCount: 12,
};
const kpiInputs = (over: Partial<KpiInputs> = {}): KpiInputs => ({ ...kpiBase, ...over });

describe('deriveKpis', () => {
  it('maps the four figures from the profile', () => {
    const [sessions, hours, mentees, rating] = deriveKpis(kpiInputs());
    expect(sessions).toMatchObject({ label: 'Sessions completed', value: '2' });
    expect(hours).toMatchObject({ label: 'Mentoring time', value: '2', unit: 'hrs' });
    expect(mentees).toMatchObject({ label: 'Mentees mentored', value: '1' });
    expect(rating).toMatchObject({ label: 'Average rating', value: '4.8', unit: '/ 5' });
  });

  it('rounds mentoring minutes to whole hours', () => {
    expect(deriveKpis(kpiInputs({ mentoringMinutes: 90 }))[1]!.value).toBe('2');
    expect(deriveKpis(kpiInputs({ mentoringMinutes: 150 }))[1]!.value).toBe('3');
  });

  it('shows no rating without reviews — null, never 0', () => {
    expect(deriveKpis(kpiInputs({ reviewCount: 0, rating: null }))[3]!.value).toBeNull();
    expect(deriveKpis(kpiInputs({ reviewCount: 0, rating: 4.2 }))[3]!.value).toBeNull();
  });

  it('every KPI carries an info hint', () => {
    expect(deriveKpis(kpiInputs()).every((k) => k.info.length > 0)).toBe(true);
  });
});
