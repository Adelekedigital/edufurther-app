import type { components } from '@/lib/api/generated/schema';
import { ApiError, apiError } from './errors';
import { QueryClient } from '@tanstack/react-query';
import {
  autoIcon,
  createError,
  deleteError,
  refreshLimitsOnRefusal,
  toOwnSessionType,
} from './sessionTypes';

type Own = components['schemas']['OwnSessionTypeRead'];
const own = (over: Partial<Own> = {}): Own =>
  ({
    id: 't1',
    name: 'SOP draft review',
    description: '  Leave with a revision list.  ',
    duration_minutes: 60,
    min_notice_minutes: 1440,
    meeting_venue: 'daily',
    is_active: true,
    // Both, as the server sends today. The list is what we read; the single
    // field is on its way out (backend #274).
    service_offerings: [{ code: 'document-preparation', display_name: 'Document preparation' }],
    icon: null,
    requires_booking_confirmation: null,
    is_featured: false,
    pending_deletion: null,
    booked_count: 0,
    last_booked_ends_at: null as string | null,
    question_count: 2,
    ...over,
  }) as Own;

describe('toOwnSessionType', () => {
  it('maps the list fields and trims the description', () => {
    expect(toOwnSessionType(own())).toEqual({
      id: 't1',
      name: 'SOP draft review',
      description: 'Leave with a revision list.',
      durationMin: 60,
      noticeMin: 1440,
      isLive: true,
      usesOwnWindows: false,
      usesDefaultRules: false,
      stages: [],
      isStarter: false,
      topics: [{ code: 'document-preparation', label: 'Document preparation' }],
      icon: 'edit_document',
      iconChoice: null,
      questionCount: 2,
      isFeatured: false,
      requiresApproval: null,
      pendingDeletion: null,
      booked: { count: 0, lastEndsAt: null },
    });
  });

  it('keeps the type’s own approval setting; null follows the mentor’s', () => {
    expect(toOwnSessionType(own({ requires_booking_confirmation: true })).requiresApproval).toBe(
      true,
    );
    expect(toOwnSessionType(own({ requires_booking_confirmation: false })).requiresApproval).toBe(
      false,
    );
    expect(toOwnSessionType(own()).requiresApproval).toBeNull();
    expect(
      toOwnSessionType(own({ requires_booking_confirmation: undefined })).requiresApproval,
    ).toBeNull();
  });

  it('follows the booking rules only when length, notice, window and buffer are all inherited', () => {
    const inherits = {
      duration_inherited: true,
      min_notice_inherited: true,
      booking_window_days: null,
      break_after_minutes: null,
    };
    expect(toOwnSessionType(own(inherits)).usesDefaultRules).toBe(true);
    expect(toOwnSessionType(own({ ...inherits, duration_inherited: false })).usesDefaultRules).toBe(
      false,
    );
    expect(toOwnSessionType(own({ ...inherits, booking_window_days: 14 })).usesDefaultRules).toBe(
      false,
    );
    expect(toOwnSessionType(own({ ...inherits, break_after_minutes: 10 })).usesDefaultRules).toBe(
      false,
    );
    // Approval isn't one of the four rows: a session with its own still counts.
    expect(
      toOwnSessionType(own({ ...inherits, requires_booking_confirmation: false })).usesDefaultRules,
    ).toBe(true);
  });

  it('own windows: as the backend says; an older backend without the field follows the Calendar', () => {
    expect(toOwnSessionType(own({ uses_own_windows: true })).usesOwnWindows).toBe(true);
    const { uses_own_windows: _gone, ...older } = own();
    expect(toOwnSessionType(older as Own).usesOwnWindows).toBe(false);
  });

  // Slugs from before backend #536: the API no longer types them, so a test
  // that feeds one (a cached or older read) says so.
  const legacy = (...s: string[]) => s as unknown as Own['application_stages'];

  it('the stages, in the mentor’s order', () => {
    expect(toOwnSessionType(own({ application_stages: ['applying', 'exploring'] })).stages).toEqual(
      ['applying', 'exploring'],
    );
    // Old stored stages read exactly as the backend reads them (backend PR 1): two
    // that became one stay once, at the first one's place; `other` is dropped.
    expect(
      toOwnSessionType(
        own({
          application_stages: legacy(
            'post_submission',
            'revisions',
            'early_exploration',
            'drafting_stage',
            'other',
          ),
        }),
      ).stages,
    ).toEqual(['awaiting_decision', 'preparing_documents', 'exploring']);
    expect(toOwnSessionType(own({ application_stages: legacy('other') })).stages).toEqual([]);
    expect(toOwnSessionType(own({ application_stages: [] })).stages).toEqual([]);
  });

  it('featured, a scheduled deletion, and the booked figures (round 4)', () => {
    const t = toOwnSessionType({
      ...own({
        is_featured: true,
        pending_deletion: { deletes_after: '2026-10-14T18:00:00Z', booked_count: 2 },
      }),
      booked_count: 2,
      last_booked_ends_at: '2026-10-14T18:00:00Z',
    } as Own);
    expect(t).toMatchObject({
      isFeatured: true,
      pendingDeletion: { deletesAfter: '2026-10-14T18:00:00Z', bookedCount: 2 },
      booked: { count: 2, lastEndsAt: '2026-10-14T18:00:00Z' },
    });
  });

  it('a chosen icon wins; no choice follows the topic; no topic is the video call', () => {
    expect(toOwnSessionType(own({ icon: 'lightbulb' })).icon).toBe('lightbulb');
    expect(toOwnSessionType(own({ icon: 'lightbulb' })).iconChoice).toBe('lightbulb');
    expect(toOwnSessionType(own({ service_offerings: [] })).icon).toBe('video_call');
    expect(autoIcon(['interview-preparation'])).toBe('record_voice_over');
    expect(autoIcon(['something-new'])).toBe('video_call');
    expect(autoIcon([])).toBe('video_call');
    expect(autoIcon([null, 'test-preparation'])).toBe('video_call');
  });

  it('every catalog offering has its own icon; the first topic wins, however many there are', () => {
    // The backend's real codes (service_offerings seed) — the old map missed four.
    expect(
      [
        'test-preparation',
        'document-preparation',
        'school-selection',
        'program-selection',
        'scholarships-financial-aid',
        'interview-preparation',
      ].map((c) => autoIcon([c])),
    ).toEqual(['quiz', 'edit_document', 'school', 'school', 'payments', 'record_voice_over']);
    expect(autoIcon(['scholarships-financial-aid', 'school-selection'])).toBe('payments');
    // Three or more still follow the first (product, 2026-09-30).
    expect(autoIcon(['test-preparation', 'school-selection', 'program-selection'])).toBe('quiz');
  });

  it('switched off reads as not live; description may be missing', () => {
    const t = toOwnSessionType(own({ is_active: false, description: null }));
    expect(t.isLive).toBe(false);
    expect(t.description).toBe('');
  });

  it('the question count comes with the list (#147); a missing one hides the chip', () => {
    expect(toOwnSessionType(own({ question_count: 0 })).questionCount).toBe(0);
    const { question_count: _gone, ...older } = own();
    expect(toOwnSessionType(older as Own).questionCount).toBeNull();
  });
});

describe('deleteError', () => {
  it('our retry copy, never `detail`; a network failure too (a booked type is scheduled now, not refused)', () => {
    expect(deleteError(new TypeError('Failed to fetch')).message).not.toContain('Failed to fetch');
    const e = deleteError(new ApiError(500, 'stack trace here'));
    expect(e.message).not.toContain('stack trace');
    expect(e.message).toMatch(/We couldn’t delete it/);
  });
});

describe('createError: past the session limit (backend PR 3)', () => {
  const limitBody = {
    type: 'https://x.test/problems/session-type-limit-reached',
    title: 'x',
    limit: 5,
  };
  it('says the limit in our words; no field is blamed, and the server’s words never show', () => {
    const e = createError(apiError(409, limitBody), limitBody);
    expect(e.message).toBe('You can offer up to 5 sessions.');
    expect(e.fields).toEqual({});
  });
  it('a limit of 1 reads as one session', () => {
    const body = { ...limitBody, limit: 1 };
    expect(createError(apiError(409, body), body).message).toBe('You can offer 1 session.');
  });
  it('without the limit member, still not a name clash', () => {
    const body = { ...limitBody, limit: undefined };
    const e = createError(apiError(409, body), body, 'duplicate');
    expect(e.message).toBe('You’ve reached your session limit.');
    expect(e.fields.name).toBeUndefined();
  });
  it('any other 409 is still the name', () => {
    const body = { type: 'https://x.test/problems/conflict', title: 'x' };
    expect(createError(apiError(409, body), body).fields.name).toBe(
      'You already have a session with this name.',
    );
  });
});

describe('refreshLimitsOnRefusal: past the limit, the limit and the list reload', () => {
  it('reloads /me and the sessions on a limit refusal, and the defaults on a 422', () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue();
    refreshLimitsOnRefusal(qc, { status: 409, limitReached: true });
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['viewer'], ['sessionTypes']]);
    spy.mockClear();
    refreshLimitsOnRefusal(qc, { status: 409 });
    expect(spy).not.toHaveBeenCalled();
    refreshLimitsOnRefusal(qc, { status: 422 });
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['mentorDefaults']]);
  });
});

describe('toOwnSessionType: the starter (backend PR 540)', () => {
  it('the Intro chat onboarding made is the starter; absent is not', () => {
    expect(toOwnSessionType(own({ is_starter: true })).isStarter).toBe(true);
    expect(toOwnSessionType(own({ is_starter: false })).isStarter).toBe(false);
  });
});
