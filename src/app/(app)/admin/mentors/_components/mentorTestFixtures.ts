import type { AdminMentorRow } from '@/lib/api/data/adminMentors';

/** A Mentors row for tests: every field set, the given ones on top. */
export const mentorRow = (p: Partial<AdminMentorRow>): AdminMentorRow => ({
  id: p.name ?? 'x',
  name: 'X',
  firstName: 'X',
  initials: 'X',
  cover: 'sky',
  photoUrl: null,
  handle: null,
  email: 'x@example.com',
  submittedAt: null,
  approvedAt: null,
  decidedAt: null,
  pausedAt: null,
  pausedBy: null,
  pausedReason: null,
  declineReason: null,
  waitingDays: null,
  school: null,
  completed: 0,
  upcoming: 0,
  showUpRate: null,
  showUpTier: null,
  ...p,
});
