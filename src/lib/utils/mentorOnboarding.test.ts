import { describe, expect, it } from 'vitest';
import type { MentorAnswers, SchoolDraft } from '@/types/mentorOnboarding';
import {
  defaultSchool,
  mentorDegreeFromSaved,
  needsCountry,
  formatTime,
  fromWeeklyHours,
  gapsFor,
  headlineFor,
  isLinkedInProfile,
  moveFrom,
  normaliseLinkedIn,
  toDayHours,
  toOptions,
  yearOptions,
  yearToApiDate,
} from './mentorOnboarding';

const school = (over: Partial<SchoolDraft> = {}): SchoolDraft => ({
  ...defaultSchool(true),
  school: 'Mississippi State University',
  institutionId: 'inst-6',
  catalogCountryId: 'c-us',
  degree: 'phd',
  field: 'Public Health',
  start: '2019',
  end: '2024',
  ...over,
});

const answers = (over: Partial<MentorAnswers> = {}): MentorAnswers => ({
  helpIds: [],
  schools: [school()],
  photoUrl: null,
  originId: '',
  linkedin: '',
  about: '',
  aboutDrafted: false,
  aboutPromptVersion: null,
  days: [],
  from: 1080,
  to: 1260,
  timeZone: 'Africa/Lagos',
  timeZoneFallback: false,
  ...over,
});

describe('degrees', () => {
  it('reads saved abbreviations back to the chips, MBA apart from Master’s', () => {
    expect(mentorDegreeFromSaved('MBA', 'masters')).toBe('mba');
    expect(mentorDegreeFromSaved('HND', 'diploma')).toBe('hnd');
    expect(mentorDegreeFromSaved(null, 'masters')).toBe('masters');
    expect(mentorDegreeFromSaved('M.Phil', 'doctorate')).toBe('phd');
    expect(mentorDegreeFromSaved(null, null)).toBe('');
  });
});

describe('years and headline', () => {
  it('sends a new start as Jan 1 and a new end as Dec 31', () => {
    expect(yearToApiDate('2019', null, 'start')).toBe('2019-01-01');
    expect(yearToApiDate('2024', null, 'end')).toBe('2024-12-31');
  });

  it('keeps a saved date while its year is unchanged', () => {
    expect(yearToApiDate('2015', '2015-09-01', 'start')).toBe('2015-09-01');
    expect(yearToApiDate('2019', '2019-01-01', 'end')).toBe('2019-01-01');
    expect(yearToApiDate('2020', '2019-01-01', 'end')).toBe('2020-12-31');
  });

  it('offers start years up to this year and end years from the start', () => {
    expect(yearOptions('start', 2026)[0]).toBe('2026');
    const end = yearOptions('end', 2026, '2020');
    expect(end[0]).toBe('2030');
    expect(end.at(-1)).toBe('2020');
  });

  it('builds the headline from the current school', () => {
    expect(headlineFor(school())).toBe('PhD Public Health · Mississippi State University');
    expect(headlineFor(school({ degree: '', field: '' }))).toBe('Mississippi State University');
  });
});

describe('LinkedIn', () => {
  it.each([
    'linkedin.com/in/gbenga-ekundayo',
    'https://www.linkedin.com/in/gbenga-ekundayo/',
    'http://ng.linkedin.com/in/gbenga?trk=x',
    'https://m.linkedin.com/in/jane',
  ])('accepts %s', (u) => expect(isLinkedInProfile(u)).toBe(true));

  it.each(['linkedin.com/company/x', 'gbenga', 'linkedin.com/in/', 'evil.com/linkedin.com/in/x'])(
    'refuses %s',
    (u) => expect(isLinkedInProfile(u)).toBe(false),
  );

  it('saves one form', () => {
    expect(normaliseLinkedIn('linkedin.com/in/gbenga/')).toBe('https://www.linkedin.com/in/gbenga');
  });
});

describe('gapsFor', () => {
  it('asks for a help area', () => {
    expect(gapsFor('help', answers())).toEqual(['help']);
    expect(gapsFor('help', answers({ helpIds: ['o1'] }))).toEqual([]);
  });

  it('asks for the basics before the country', () => {
    expect(gapsFor('education', answers({ schools: [school({ field: '' })] }))).toEqual([
      'education',
    ]);
    const typed = school({ institutionId: null, catalogCountryId: null, school: 'Lagos Poly' });
    expect(gapsFor('education', answers({ schools: [typed] }))).toEqual(['studyCountry']);
    expect(gapsFor('education', answers({ schools: [{ ...typed, countryId: 'c-ng' }] }))).toEqual(
      [],
    );
  });

  it('doesn’t re-ask an older saved school’s country, which the API doesn’t keep', () => {
    const older = school({ id: 'e2', current: false, institutionId: null, catalogCountryId: null });
    expect(gapsFor('education', answers({ schools: [school(), older] }))).toEqual([]);
  });

  it('names each missing About field, and a link that isn’t a profile', () => {
    expect(gapsFor('about', answers())).toEqual(['photo', 'origin', 'linkedin']);
    expect(
      gapsFor('about', answers({ photoUrl: 'x', originId: 'c-ng', linkedin: 'gbenga' })),
    ).toEqual(['linkedinFormat']);
  });

  it('asks for a day', () => {
    expect(gapsFor('hours', answers())).toEqual(['days']);
    expect(gapsFor('hours', answers({ days: [0] }))).toEqual([]);
  });
});

describe('hours', () => {
  it('formats times, midnight included', () => {
    expect(formatTime(1080)).toBe('6:00 pm');
    expect(formatTime(0)).toBe('12:00 am');
    expect(formatTime(1440)).toBe('12:00 am');
    expect(formatTime(750)).toBe('12:30 pm');
  });

  it('ends 30 minutes after the start at the earliest, and keeps the length on a move', () => {
    expect(toOptions(1380)).toEqual([1410, 1440]);
    expect(moveFrom(1080, 1260, 1200)).toEqual({ from: 1200, to: 1380 });
    expect(moveFrom(1080, 1260, 1380)).toEqual({ from: 1380, to: 1440 });
  });

  it('turns Monday-first picks into the Sunday-first week', () => {
    const week = toDayHours([0, 6], 1080, 1260);
    expect(week[1]).toEqual({ on: true, slots: [[1080, 1260]] }); // Monday
    expect(week[0]).toEqual({ on: true, slots: [[1080, 1260]] }); // Sunday
    expect(week.filter((d) => d.on)).toHaveLength(2);
  });

  it('reads saved hours back as the most common range', () => {
    const week = toDayHours([0, 1, 2], 1080, 1260);
    week[6] = { on: true, slots: [[600, 720]] }; // Saturday, another range
    expect(fromWeeklyHours({ days: week })).toEqual({ days: [0, 1, 2], from: 1080, to: 1260 });
    expect(fromWeeklyHours(null)).toEqual({ days: [], from: 1080, to: 1260 });
  });
});

describe('needsCountry', () => {
  it('asks for a country for any typed school without a catalogue match, however short', () => {
    expect(
      needsCountry(school({ school: 'UI', institutionId: null, catalogCountryId: null })),
    ).toBe(true);
  });

  it('never asks again for an older saved school the API kept no country for', () => {
    const older = school({ id: 'e2', current: false, catalogCountryId: null, institutionId: null });
    expect(needsCountry(older)).toBe(false);
  });
});
