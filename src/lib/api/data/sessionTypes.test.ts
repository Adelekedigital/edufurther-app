import type { components } from '@/lib/api/generated/schema';
import { ApiError } from './errors';
import { autoIcon, deleteError, toOwnSessionType } from './sessionTypes';

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
    service_offering: { code: 'document-preparation', display_name: 'Document preparation' },
    application_stage: null,
    custom_stage_label: null,
    icon: null,
    requires_booking_confirmation: null,
    ...over,
  }) as Own;

describe('toOwnSessionType', () => {
  it('maps the list fields and trims the description', () => {
    expect(toOwnSessionType(own(), 2)).toEqual({
      id: 't1',
      name: 'SOP draft review',
      description: 'Leave with a revision list.',
      durationMin: 60,
      noticeMin: 1440,
      isLive: true,
      topics: [{ code: 'document-preparation', label: 'Document preparation' }],
      icon: 'edit_document',
      iconChoice: null,
      questionCount: 2,
    });
  });

  it('a chosen icon wins; no choice follows the topic; no topic is the video call', () => {
    expect(toOwnSessionType(own({ icon: 'lightbulb' }), 0).icon).toBe('lightbulb');
    expect(toOwnSessionType(own({ icon: 'lightbulb' }), 0).iconChoice).toBe('lightbulb');
    expect(toOwnSessionType(own({ service_offering: null }), 0).icon).toBe('video_call');
    expect(autoIcon(['interview-preparation'])).toBe('record_voice_over');
    expect(autoIcon(['something-new'])).toBe('video_call');
    expect(autoIcon([])).toBe('video_call');
  });

  it('every catalog offering has its own icon, first topic wins, 3+ is a general call', () => {
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
    expect(autoIcon(['test-preparation', 'school-selection', 'program-selection'])).toBe(
      'video_call',
    );
  });

  it('switched off reads as not live; description may be missing', () => {
    const t = toOwnSessionType(own({ is_active: false, description: null }), null);
    expect(t.isLive).toBe(false);
    expect(t.description).toBe('');
    expect(t.questionCount).toBeNull();
  });
});

describe('deleteError (backend #4)', () => {
  it('409 with booked_count: has bookings, with the count', () => {
    const e = deleteError(new ApiError(409, 'x', '/problems/session-type-has-bookings'), {
      booked_count: 2,
    });
    expect(e).toMatchObject({ hasBookings: true, bookedCount: 2 });
  });

  it('any 409 on delete means bookings, even without a type or count', () => {
    const e = deleteError(new ApiError(409), {});
    expect(e.hasBookings).toBe(true);
    expect(e.bookedCount).toBeUndefined();
  });

  it('anything else is our retry copy, never `detail`; a network failure too', () => {
    expect(deleteError(new TypeError('Failed to fetch'), null).message).not.toContain(
      'Failed to fetch',
    );
    const e = deleteError(new ApiError(500), { detail: 'stack trace here' });
    expect(e.hasBookings).toBeUndefined();
    expect(e.message).not.toContain('stack trace');
    expect(e.message).toMatch(/We couldn’t delete it/);
  });
});
