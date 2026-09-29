import { stageLine, toMentorProfile } from './profile';

type Read = Parameters<typeof toMentorProfile>[0];
const read = (over: Partial<Read> = {}): Read =>
  ({
    id: 'u1',
    slug: 'gbenga',
    first_name: 'Gbenga',
    last_name: 'Elufisan',
    timezone: 'America/Chicago',
    completed_sessions: 51,
    mentoring_minutes: 3060,
    mentees_mentored: 27,
    next_available_state: 'open',
    next_available_at: '2026-09-30T15:00:00Z',
    reviews: { count: 7, session_value: 4.9 },
    education: [
      {
        id: 'e1',
        degree: 'PhD',
        study_course: 'Sociology',
        institution: 'Mississippi State University',
        date_start: '2023-08-01',
        date_end: '2027-05-01',
      },
    ],
    ...over,
  }) as Read;

describe('toMentorProfile', () => {
  it('maps the header, the latest degree and the proof figures', () => {
    const p = toMentorProfile(read());
    expect(p.mentor).toMatchObject({
      name: 'Gbenga Elufisan',
      initials: 'GE',
      profileHref: '/mentors/gbenga',
      degreeLine: 'PhD, Sociology',
      institution: 'Mississippi State University',
      rating: 4.9,
      reviewCount: 7,
      nextAvailableState: 'open',
    });
    expect(p.education).toEqual([
      { id: 'e1', title: 'PhD, Sociology', meta: 'Mississippi State University · 2023 – 2027' },
    ]);
  });

  it('addresses a mentor without a slug by id', () => {
    expect(toMentorProfile(read({ slug: null })).mentor.profileHref).toBe('/mentors/u1');
  });

  it('is the owner only when the owner-only keys are present, even if null', () => {
    expect(toMentorProfile(read()).owner).toBeNull();
    expect(
      toMentorProfile(read({ approval_status: 'pending', listing_status: null })).owner,
    ).toEqual({ approval: 'pending', listed: true });
    expect(
      toMentorProfile(read({ approval_status: 'approved', listing_status: 'unlisted' })).owner,
    ).toEqual({ approval: 'approved', listed: false });
  });

  it('keeps only safe social links', () => {
    const p = toMentorProfile(
      read({
        social_linkedin: 'https://www.linkedin.com/in/gbenga',
        social_twitter: 'javascript:alert(1)',
        social_youtube: 'gbenga',
      }),
    );
    expect(p.socials).toEqual([{ kind: 'linkedin', href: 'https://www.linkedin.com/in/gbenga' }]);
  });

  it('labels the offering’s stage and venue, using the custom label for "other"', () => {
    const p = toMentorProfile(
      read({
        session_types: [
          {
            id: 's1',
            name: 'SOP review',
            duration_minutes: 60,
            min_notice_minutes: 60,
            meeting_venue: 'google_meet',
            application_stage: 'drafting_stage',
            service_offering: {
              code: 'application-documents',
              display_name: 'Application documents',
            },
          },
          {
            id: 's2',
            name: 'Anything',
            duration_minutes: 30,
            min_notice_minutes: 60,
            meeting_venue: 'daily',
            application_stage: 'other',
            custom_stage_label: 'Pre-departure',
          },
        ] as Read['session_types'],
      }),
    );
    expect(p.sessionTypes[0]).toMatchObject({
      stage: 'Drafting',
      venue: 'Google Meet',
      category: 'Application documents',
      questions: [],
    });
    expect(p.sessionTypes[1]).toMatchObject({ stage: 'Pre-departure', category: null });
  });

  it('lists every stage an offering is aimed at, in order (application_stages)', () => {
    const t = (over: object) =>
      ({
        id: 's',
        name: 'x',
        duration_minutes: 30,
        min_notice_minutes: 60,
        meeting_venue: 'daily',
        ...over,
      }) as NonNullable<Read['session_types']>[number];
    expect(
      stageLine(
        t({
          application_stages: ['drafting_stage', 'revisions'],
          application_stage: 'drafting_stage',
        }),
      ),
    ).toBe('Drafting, Revising');
    // `other` reads as the mentor's words, in its place.
    expect(
      stageLine(
        t({
          application_stages: ['early_exploration', 'other'],
          custom_stage_label: ' Pre-departure ',
        }),
      ),
    ).toBe('Exploring, Pre-departure');
    // Empty means any stage: no chip. The list wins over the deprecated field.
    expect(stageLine(t({ application_stages: [], application_stage: null }))).toBeNull();
    // An older response without the list still reads its single stage.
    expect(stageLine(t({ application_stage: 'interviewing' }))).toBe('Interviewing');
    // `other` with no wording adds nothing.
    expect(stageLine(t({ application_stages: ['other'], custom_stage_label: '  ' }))).toBeNull();
  });

  it('survives a sparse profile', () => {
    const p = toMentorProfile(
      read({ first_name: null, last_name: null, education: [], reviews: undefined }),
    );
    expect(p.mentor.name).toBe('EduFurther mentor');
    expect(p.mentor.rating).toBeNull();
    expect(p.mentor.reviewCount).toBe(0);
    expect(p.education).toEqual([]);
    expect(p.about).toBeNull();
  });
});
