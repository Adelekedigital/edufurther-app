import { describe, expect, it } from 'vitest';
import type { components } from '@/lib/api/generated/schema';
import { toDayHours } from '@/lib/utils/mentorOnboarding';
import type { SchoolDraft } from '@/types/mentorOnboarding';
import {
  educationBody,
  planEducation,
  refusedFields,
  toApplicationState,
} from './mentorApplication';
import type { WeeklyHours } from './weeklyHours';

type Me = components['schemas']['UserRead'];
type Edu = Me['education'][number];

const countries = [
  { id: 'c-ng', label: 'Nigeria', code: 'NG' },
  { id: 'c-us', label: 'United States', code: 'US' },
  { id: 'c-gb', label: 'United Kingdom', code: 'GB' },
];
const levels = [
  { id: 'dl-diploma', code: 'diploma' },
  { id: 'dl-bachelors', code: 'bachelors' },
  { id: 'dl-masters', code: 'masters' },
  { id: 'dl-doctorate', code: 'doctorate' },
];

const edu = (over: Partial<Edu> = {}): Edu =>
  ({
    id: 'e1',
    school_name_raw: 'Mississippi State University',
    institution: {
      id: 'inst-6',
      name: 'Mississippi State University',
      country: { code: 'US', display_name: 'United States' },
    },
    degree_level: { id: 'dl-doctorate', code: 'doctorate', display_name: 'Doctorate' },
    degree_abbreviation: 'PhD',
    study_course: 'Public Health',
    date_start: '2019-01-01',
    date_end: '2024-12-31',
    is_most_recent: true,
    ...over,
  }) as Edu;

const me = (over: Partial<Me> = {}): Me =>
  ({
    id: 'u1',
    email: 'gbenga@example.com',
    first_name: 'Gbenga',
    slug: 'gbenga',
    primary_role: 'mentor',
    timezone: 'UTC',
    education: [],
    awards: [],
    is_admin: false,
    created_at: '2026-10-01T00:00:00Z',
    mentee_completed_sessions: 0,
    mentee_cancel_refund_hours: 12,
    ...over,
  }) as Me;

const ctx = { countries, hours: null, sessionTypeNames: [], deviceZone: 'Africa/Lagos' };

describe('toApplicationState', () => {
  it('starts a new applicant at step 1 with one empty current school and the device zone', () => {
    const s = toApplicationState(me(), ctx);
    expect(s.lastStep).toBeNull();
    expect(s.hasProfile).toBe(false);
    expect(s.answers.schools).toHaveLength(1);
    expect(s.answers.schools[0]!.current).toBe(true);
    expect(s.answers.timeZone).toBe('Africa/Lagos');
    expect(s.answers.timeZoneFallback).toBe(false);
    expect(s.answers.days).toEqual([]);
  });

  it('falls back to UTC with the note when no zone can be read', () => {
    const s = toApplicationState(me(), { ...ctx, deviceZone: null });
    expect(s.answers.timeZone).toBe('UTC');
    expect(s.answers.timeZoneFallback).toBe(true);
  });

  it('rebuilds every answer from the server, and the mentor step names', () => {
    const hours: WeeklyHours = {
      days: toDayHours([0, 1, 2, 3, 4], 1080, 1260),
      timeZone: 'Europe/London',
      rules: [
        {
          id: 'r1',
          day_of_week: 1,
          start_time: '18:00:00',
          end_time: '21:00:00',
          timezone: 'Europe/London',
          is_active: true,
        },
      ],
      otherZones: [],
      otherSlots: [],
    };
    const s = toApplicationState(
      me({
        onboarding: { complete: false, missing: [], last_step: 'mentor_about' as never },
        education: [edu()],
        profile: {
          avatar_url: 'https://x/a.webp',
          social_linkedin: 'https://www.linkedin.com/in/gbenga',
          origin_country: { code: 'NG', display_name: 'Nigeria' },
          about_me: 'I studied…',
          about_me_drafted_at: '2026-10-10T00:00:00Z',
        } as Me['profile'],
        mentor_profile: {
          approval_status: 'pending',
          offerings: [{ id: 'o1', code: 'school-selection', display_name: 'School selection' }],
          primary_study_country: { code: 'US', display_name: 'United States' },
        } as unknown as Me['mentor_profile'],
      }),
      { ...ctx, hours, sessionTypeNames: ['Intro chat'] },
    );
    expect(s.lastStep).toBe('about');
    expect(s.hasProfile).toBe(true);
    expect(s.hasIntroChat).toBe(true);
    expect(s.approvalStatus).toBe('pending');
    expect(s.answers).toMatchObject({
      helpIds: ['o1'],
      photoUrl: 'https://x/a.webp',
      originId: 'c-ng',
      aboutDrafted: true,
      days: [0, 1, 2, 3, 4],
      from: 1080,
      to: 1260,
      timeZone: 'Europe/London',
    });
    expect(s.answers.schools[0]).toMatchObject({
      id: 'e1',
      degree: 'phd',
      start: '2019',
      end: '2024',
      catalogCountryId: 'c-us',
      countryId: '',
      current: true,
    });
  });

  it('reads a typed current school’s country back from the study country', () => {
    const s = toApplicationState(
      me({
        education: [edu({ institution: null, school_name_raw: 'Lagos Poly' })],
        mentor_profile: {
          approval_status: 'pending',
          offerings: [],
          primary_study_country: { code: 'NG', display_name: 'Nigeria' },
        } as unknown as Me['mentor_profile'],
      }),
      ctx,
    );
    expect(s.answers.schools[0]).toMatchObject({ catalogCountryId: null, countryId: 'c-ng' });
  });
});

describe('toApplicationState: submitted and approved-seen', () => {
  const withProfile = (extra: Record<string, unknown>) =>
    toApplicationState(
      me({
        mentor_profile: {
          approval_status: 'approved',
          offerings: [],
          ...extra,
        } as unknown as Me['mentor_profile'],
      }),
      ctx,
    );

  it('reads null as not yet', () => {
    const s = withProfile({ submitted_at: null, approved_seen_at: null });
    expect(s.submitted).toBe(false);
    expect(s.approvedSeen).toBe(false);
  });

  it('reads a stamp as done', () => {
    const s = withProfile({
      submitted_at: '2026-10-18T10:00:00Z',
      approved_seen_at: '2026-10-19T09:00:00Z',
    });
    expect(s.submitted).toBe(true);
    expect(s.approvedSeen).toBe(true);
  });

  it('counts a field an older backend doesn’t send as set', () => {
    const s = withProfile({});
    expect(s.submitted).toBe(true);
    expect(s.approvedSeen).toBe(true);
  });

  it('without a mentor profile, neither', () => {
    const s = toApplicationState(me(), ctx);
    expect(s.submitted).toBe(false);
    expect(s.approvedSeen).toBe(false);
  });
});

describe('planEducation', () => {
  const draft = (over: Partial<SchoolDraft>): SchoolDraft => ({
    key: 'k',
    id: null,
    school: 'University of Lagos',
    institutionId: 'inst-1',
    catalogCountryId: 'c-ng',
    countryId: '',
    countryOpen: false,
    degree: 'bachelors',
    field: 'Microbiology',
    start: '2011',
    end: '2015',
    current: false,
    ...over,
  });

  it('saves the level and the abbreviation, MBA and HND included', () => {
    expect(educationBody(draft({ degree: 'mba' }), levels)).toMatchObject({
      degree_level_id: 'dl-masters',
      degree_abbreviation: 'MBA',
    });
    expect(educationBody(draft({ degree: 'hnd' }), levels)).toMatchObject({
      degree_level_id: 'dl-diploma',
      degree_abbreviation: 'HND',
      date_start: '2011-01-01',
      date_end: '2015-12-31',
    });
  });

  it('leaves an unchanged school alone, so a retry adds nothing', () => {
    const same = draft({
      id: 'e1',
      school: 'Mississippi State University',
      institutionId: 'inst-6',
      degree: 'phd',
      field: 'Public Health',
      start: '2019',
      end: '2024',
      current: true,
    });
    expect(planEducation([edu()], [same], levels)).toEqual({ remove: [], edit: [], add: [] });
  });

  it('adds new schools, sends only what changed, and removes the dropped ones', () => {
    const kept = draft({
      id: 'e1',
      school: 'Mississippi State University',
      institutionId: 'inst-6',
      degree: 'phd',
      field: 'Epidemiology',
      start: '2019',
      end: '2024',
      current: true,
    });
    const plan = planEducation(
      [edu(), edu({ id: 'e2', is_most_recent: false })],
      [kept, draft({})],
      levels,
    );
    expect(plan.remove).toEqual(['e2']);
    expect(plan.edit).toEqual([{ id: 'e1', body: { study_course: 'Epidemiology' } }]);
    expect(plan.add).toHaveLength(1);
  });
});

describe('refusedFields', () => {
  it('names the step fields a 422 points at', () => {
    expect(
      refusedFields({
        errors: [
          { pointer: '/social_linkedin', message: 'not a LinkedIn profile' },
          { pointer: '/origin_country_id' },
        ],
      }),
    ).toEqual(['linkedinFormat', 'origin']);
  });

  it('names none when one refused field has no place on the step, so the notice shows', () => {
    expect(
      refusedFields({ errors: [{ pointer: '/social_linkedin' }, { pointer: '/about_me' }] }),
    ).toEqual([]);
    expect(refusedFields({ title: 'Unprocessable Content' })).toEqual([]);
    expect(refusedFields(null)).toEqual([]);
  });
});
