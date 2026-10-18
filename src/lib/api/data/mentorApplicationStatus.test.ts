import { describe, expect, it } from 'vitest';
import { toMentorApplication } from './mentorApplicationStatus';
import type { PendingMe, PendingMentorProfile } from './pending';

const me = (
  profile: Partial<PendingMentorProfile> | null,
  names = { first: 'Gbenga', last: 'Ekundayo' },
) =>
  ({
    id: 'u1',
    email: 'gbenga@example.com',
    first_name: names.first,
    last_name: names.last,
    mentor_profile: profile && ({ approval_status: 'pending', ...profile } as PendingMentorProfile),
  }) as PendingMe;

describe('toMentorApplication (PRD "Where people land")', () => {
  it('reads no profile, and a profile never sent', () => {
    expect(toMentorApplication(me(null))).toEqual({ stage: 'none' });
    expect(toMentorApplication(me({ submitted_at: null }))).toEqual({ stage: 'unsubmitted' });
  });

  it('reads a sent application as in review', () => {
    expect(toMentorApplication(me({ submitted_at: '2026-10-12T10:00:00Z' }))).toEqual({
      stage: 'pending',
      firstName: 'Gbenga',
      fullName: 'Gbenga Ekundayo',
      email: 'gbenga@example.com',
    });
  });

  it('reads approved as seen or not', () => {
    expect(
      toMentorApplication(me({ approval_status: 'approved', approved_seen_at: null })),
    ).toMatchObject({
      stage: 'approved',
      seen: false,
    });
    expect(
      toMentorApplication(
        me({ approval_status: 'approved', approved_seen_at: '2026-10-14T00:00:00Z' }),
      ),
    ).toMatchObject({ stage: 'approved', seen: true });
  });

  it('reads a decline with its note and date; a blank note is none', () => {
    expect(
      toMentorApplication(
        me({
          approval_status: 'declined',
          review_note: ' Add the PhD. ',
          reviewed_at: '2026-10-14T15:30:00Z',
        }),
      ),
    ).toMatchObject({
      stage: 'declined',
      note: 'Add the PhD.',
      reviewedAt: '2026-10-14T15:30:00Z',
    });
    expect(
      toMentorApplication(me({ approval_status: 'declined', review_note: '  ' })),
    ).toMatchObject({
      note: null,
      reviewedAt: null,
    });
  });

  it('treats fields an older backend lacks as today: applied, and already seen', () => {
    expect(toMentorApplication(me({}))).toMatchObject({ stage: 'pending' });
    expect(toMentorApplication(me({ approval_status: 'approved' }))).toMatchObject({ seen: true });
  });

  it('falls back to the email name when the account has none', () => {
    expect(toMentorApplication(me({ submitted_at: 'x' }, { first: '', last: '' }))).toMatchObject({
      firstName: 'gbenga',
      fullName: 'gbenga',
    });
  });
});
