import type { EducationEntry } from '@/types/mentor';
import {
  doneCount,
  educationText,
  nextMissing,
  profileFields,
  stageFor,
  stepsDone,
  targetText,
  type NewMenteeState,
} from './newMentee';

const edu = (over: Partial<EducationEntry['values']> = {}, levelName: string | null = null) =>
  ({
    id: 'e1',
    values: {
      school: 'University of Lagos',
      degree: 'BSc',
      course: 'Microbiology',
      start: 2020,
      end: 2024,
      current: true,
      ...over,
    },
    dateStart: null,
    dateEnd: null,
    levelId: null,
    levelName,
  }) as EducationEntry;

describe('profile details', () => {
  it('words the goal, the latest degree and the help areas as the design does', () => {
    expect(
      targetText({ degree: 'Master’s', field: 'Public Health', country: 'United Kingdom' }),
    ).toBe('Master’s in Public Health, United Kingdom');
    expect(targetText({ degree: null, field: 'Data Science', country: null })).toBe('Data Science');
    expect(targetText({ degree: null, field: null, country: 'Canada' })).toBeNull();
    expect(educationText([edu()])).toBe('BSc Microbiology · University of Lagos · 2024');
    // "Other" names the saved level instead.
    expect(educationText([edu({ degree: 'Other', course: '' }, 'Diploma')])).toBe(
      'Diploma · University of Lagos · 2024',
    );
    expect(educationText([])).toBeNull();
  });

  it('a detail is done when saved and not empty; the drafted bio says so', () => {
    const fields = profileFields({
      degree: 'Master’s',
      field: null,
      country: null,
      helpAreas: [],
      education: [edu()],
      bio: '  Drafted bio  ',
      bioDrafted: true,
    });
    expect(doneCount(fields)).toBe(3);
    expect(nextMissing(fields)).toBe('what you need help with');
    expect(fields.find((f) => f.key === 'bio')).toMatchObject({
      value: 'Drafted bio',
      drafted: true,
    });
    const blank = profileFields({
      degree: null,
      field: null,
      country: null,
      helpAreas: [],
      education: [],
      bio: '   ',
      bioDrafted: true,
    });
    expect(doneCount(blank)).toBe(0);
    expect(blank.find((f) => f.key === 'bio')?.drafted).toBe(false);
  });
});

const base: NewMenteeState = {
  profileDone: false,
  booked: null,
  firstDone: null,
  invited: false,
  friendJoined: false,
};
const booked = { mentorFirst: 'Mariam', startsAt: '2026-10-29T17:00:00Z', confirmed: false };

describe('stageFor', () => {
  it('goes incomplete, ready, booked, first session done', () => {
    expect(stageFor(base)).toEqual({ stage: 'incomplete', oneStepLeft: false });
    expect(stageFor({ ...base, profileDone: true })).toEqual({
      stage: 'ready',
      oneStepLeft: false,
    });
    expect(stageFor({ ...base, booked }).stage).toBe('booked');
    expect(
      stageFor({ ...base, booked, firstDone: { mentorFirst: 'Mariam', startsAt: booked.startsAt } })
        .stage,
    ).toBe('firstDone');
  });

  it('booked with the link shared and the profile short: the profile card, "One step left"', () => {
    expect(stageFor({ ...base, booked, invited: true })).toEqual({
      stage: 'incomplete',
      oneStepLeft: true,
    });
  });
});

describe('stepsDone', () => {
  it('a friend joining counts as the invite step; all three make it done', () => {
    expect(stepsDone({ ...base, friendJoined: true }).invite).toBe(true);
    expect(stepsDone({ ...base, unlocked: true }).invite).toBe(true);
    expect(
      stepsDone({ profileDone: true, booked, firstDone: null, invited: true, friendJoined: false })
        .all,
    ).toBe(true);
    expect(stepsDone({ ...base, profileDone: true, booked }).all).toBe(false);
  });
});
