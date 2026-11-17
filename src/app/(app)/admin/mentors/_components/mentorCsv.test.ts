import { toCsv } from '@/lib/utils/csv';
import { mentorCsvColumns, mentorCsvFilename } from './mentorCsv';
import { mentorRow } from './mentorTestFixtures';

const ZONE = 'Africa/Lagos';
const lines = (csv: string) => csv.slice(1).split('\r\n');

describe('mentorCsvColumns', () => {
  it('Applications: name, email, applied day in the admin zone, wait, school', () => {
    const m = mentorRow({
      name: 'Ada Okafor',
      email: 'ada@example.com',
      // 23:30 UTC is already the next day in Lagos.
      submittedAt: '2026-11-10T23:30:00Z',
      waitingDays: 7,
      school: { name: 'University of Lagos', country: 'Nigeria' },
    });
    expect(lines(toCsv(mentorCsvColumns('applications', ZONE), [m])).slice(0, 2)).toEqual([
      'Name,Email,Applied,Waiting (days),School,School country',
      'Ada Okafor,ada@example.com,2026-11-11,7,University of Lagos,Nigeria',
    ]);
  });

  it('Approved: sessions and show-up as numbers, the tier in words', () => {
    const m = mentorRow({
      name: 'Bola',
      approvedAt: '2026-10-01T09:00:00Z',
      completed: 12,
      upcoming: 2,
      showUpRate: 90,
      showUpTier: 'onTrack',
    });
    const none = mentorRow({ name: 'Chi' });
    expect(lines(toCsv(mentorCsvColumns('approved', ZONE), [m, none])).slice(0, 3)).toEqual([
      'Name,Email,Approved,Completed sessions,Upcoming sessions,Show-up rate (%),Show-up tier',
      'Bola,x@example.com,2026-10-01,12,2,90,On track',
      'Chi,x@example.com,,0,0,,No sessions yet',
    ]);
  });

  it('Inactive: who paused them; a mentor’s own pause gives no admin reason', () => {
    const byAdmin = mentorRow({
      name: 'Dayo',
      pausedBy: 'admin',
      pausedAt: '2026-11-01T10:00:00Z',
      pausedReason: 'No-shows',
    });
    const self = mentorRow({ name: 'Ebi', pausedBy: 'mentor', pausedReason: 'internal' });
    expect(lines(toCsv(mentorCsvColumns('paused', ZONE), [byAdmin, self])).slice(1, 3)).toEqual([
      'Dayo,x@example.com,Suspended,2026-11-01,No-shows',
      'Ebi,x@example.com,Paused by the mentor,,',
    ]);
  });

  it('Not approved: decided, the comment, applied', () => {
    const m = mentorRow({
      name: 'Femi',
      decidedAt: '2026-11-02T10:00:00Z',
      declineReason: 'Profile incomplete',
      submittedAt: '2026-10-30T10:00:00Z',
    });
    expect(lines(toCsv(mentorCsvColumns('notApproved', ZONE), [m])).slice(0, 2)).toEqual([
      'Name,Email,Decided,Comment,Applied',
      'Femi,x@example.com,2026-11-02,Profile incomplete,2026-10-30',
    ]);
  });
});

describe('mentorCsvFilename', () => {
  it('names the tab and the admin’s own date', () => {
    const late = new Date('2026-11-17T23:30:00Z');
    expect(mentorCsvFilename('paused', ZONE, late)).toBe(
      'edufurther-mentors-inactive-2026-11-18.csv',
    );
  });
});
