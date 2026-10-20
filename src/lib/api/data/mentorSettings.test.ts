import type { MentorProfileValues } from '@/types/mentorSettings';
import { headlineProblem, mentorProfileBodies, withSaved } from './mentorSettings';

const saved: MentorProfileValues = {
  name: 'Ada Obi',
  headline: 'PhD Sociology · Mississippi State University',
  about: 'I help with funding.',
  aboutDrafted: false,
  originId: 'ng',
  studyId: 'us',
  gender: '',
  languages: [{ id: 'en', label: 'English' }],
};

describe('headlineProblem', () => {
  it('requires a headline', () => {
    expect(headlineProblem(saved.headline, '   ')).toBe('required');
  });
  it('a new or edited headline is 80 at most', () => {
    expect(headlineProblem('', 'x'.repeat(80))).toBeNull();
    expect(headlineProblem('', 'x'.repeat(81))).toBe('tooLong');
  });
  it('an unchanged older headline that’s longer still saves', () => {
    const old = 'y'.repeat(120);
    expect(headlineProblem(old, old)).toBeNull();
    expect(headlineProblem(old, old.slice(1))).toBe('tooLong');
  });
});

describe('mentorProfileBodies', () => {
  it('nothing changed: nothing is sent', () => {
    expect(mentorProfileBodies({ before: saved, after: saved, promptVersion: null })).toEqual({
      details: null,
      listing: null,
      languages: null,
    });
  });

  it('each write carries only its changed fields', () => {
    const after: MentorProfileValues = {
      ...saved,
      name: '  Ada   Obi-Eze ',
      gender: 'Woman',
      headline: ' New headline ',
      languages: [...saved.languages, { id: 'yo', label: 'Yoruba' }],
    };
    expect(mentorProfileBodies({ before: saved, after, promptVersion: null })).toEqual({
      details: { full_name: 'Ada Obi-Eze', gender: 'Woman' },
      listing: { headline: 'New headline' },
      languages: { languages: [{ language_id: 'en' }, { language_id: 'yo' }] },
    });
  });

  it('origin goes with the profile, the study country with the mentor profile; cleared is null', () => {
    const after = { ...saved, originId: 'gh', studyId: '' };
    const b = mentorProfileBodies({ before: saved, after, promptVersion: null });
    expect(b.details).toEqual({ origin_country_id: 'gh' });
    expect(b.listing).toEqual({ primary_study_country_id: null });
  });

  it('an untouched AI draft in the About carries its prompt version', () => {
    const after = { ...saved, about: 'Drafted text', aboutDrafted: true };
    expect(
      mentorProfileBodies({ before: saved, after, promptVersion: 'bio_draft-v1' }).details,
    ).toEqual({
      about_me: 'Drafted text',
      about_me_drafted: true,
      about_me_prompt_version: 'bio_draft-v1',
    });
  });
});

describe('withSaved', () => {
  it('counts only the parts that landed as saved', () => {
    const after = { ...saved, name: 'Ada Eze', headline: 'New', languages: [] };
    expect(withSaved(saved, after, ['details'])).toEqual({ ...saved, name: 'Ada Eze' });
    expect(withSaved(saved, after, ['details', 'listing'])).toEqual({
      ...saved,
      name: 'Ada Eze',
      headline: 'New',
    });
  });
});

describe('a save while the application is in review', () => {
  it('sends only name and gender: nothing the review holds', () => {
    const after = { ...saved, name: 'Ada Obi-Eze', gender: 'Female' };
    const b = mentorProfileBodies({ before: saved, after, promptVersion: null });
    expect(b.details).toEqual({ full_name: 'Ada Obi-Eze', gender: 'Female' });
    expect(b.listing).toBeNull();
    expect(b.languages).toBeNull();
  });
});
