/**
 * The mock applicant's mentor application (ENABLE_MOCK_API=1), as GET /me's
 * `mentor_profile` will carry it (PENDING BACKEND, PRD B2/B3). Seeded from
 * MOCK_MENTOR_APPLICATION (unset: no mentor profile, so the mock mentee's
 * /me is unchanged); a page can pick its own with `?mockApplication=`,
 * which the /me route reads from the Referer (as the session route reads
 * `?mockViewer=`).
 */

export type MockApplicationState =
  'none' | 'unsubmitted' | 'pending' | 'approved' | 'seen' | 'declined';

const STATES: readonly MockApplicationState[] = [
  'none',
  'unsubmitted',
  'pending',
  'approved',
  'seen',
  'declined',
];

export function isMockApplicationState(v: unknown): v is MockApplicationState {
  return typeof v === 'string' && (STATES as readonly string[]).includes(v);
}

type Application = {
  approval_status: 'pending' | 'approved' | 'declined';
  submitted_at: string | null;
  approved_seen_at: string | null;
  review_note: string | null;
  reviewed_at: string | null;
};

const SUBMITTED = '2026-10-12T10:00:00Z';
const REVIEWED = '2026-10-14T15:30:00Z';
const NOTE =
  'We couldn’t match the PhD on your application to your LinkedIn profile. Add it to LinkedIn, or check that the school and years match, then contact us to apply again.';

export function seed(state: MockApplicationState): Application | null {
  switch (state) {
    case 'none':
      return null;
    case 'unsubmitted':
      return base('pending', null);
    case 'pending':
      return base('pending', SUBMITTED);
    case 'approved':
      return base('approved', SUBMITTED);
    case 'seen':
      return { ...base('approved', SUBMITTED), approved_seen_at: REVIEWED };
    case 'declined':
      return { ...base('declined', SUBMITTED), review_note: NOTE, reviewed_at: REVIEWED };
  }
}

function base(status: Application['approval_status'], submitted: string | null): Application {
  return {
    approval_status: status,
    submitted_at: submitted,
    approved_seen_at: null,
    review_note: null,
    reviewed_at: null,
  };
}

const initial = process.env.MOCK_MENTOR_APPLICATION;
/** The store's own state; `application` null = no mentor profile. */
export const mentorApplication: { application: Application | null } = {
  application: seed(isMockApplicationState(initial) ? initial : 'none'),
};

export function reset(state: MockApplicationState) {
  mentorApplication.application = seed(state);
}

/**
 * PRD B2 submit, without the completeness check (the submit route checks
 * `missing_items` first): pending and never submitted → stamp it; already
 * submitted → 200, nothing changes; reviewed → 409.
 */
export function submitApplication():
  | { status: 200; body: { submitted_at: string; approval_status: 'pending' } }
  | { status: 404 | 409 } {
  const a = mentorApplication.application;
  if (!a) return { status: 404 };
  if (a.approval_status !== 'pending') return { status: 409 };
  a.submitted_at ??= new Date().toISOString();
  return { status: 200, body: { submitted_at: a.submitted_at, approval_status: 'pending' } };
}

/** PRD B3 approved-seen: once (idempotent), 409 unless approved. */
export function markApprovedSeen(): { status: 200; at: string } | { status: 409 } {
  const a = mentorApplication.application;
  if (!a || a.approval_status !== 'approved') return { status: 409 };
  a.approved_seen_at ??= new Date().toISOString();
  return { status: 200, at: a.approved_seen_at };
}
