import type { components } from '@/lib/api/generated/schema';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { outcomeOf } from './sessionEvents';

type Event = components['schemas']['SessionEventRead'];

const created: Event = {
  id: 'e1',
  from_status: null,
  to_status: 'pending_mentor_approval',
  actor_id: 'mock-mentee',
  actor_type: 'user',
  reason_code: null,
  reason_text: null,
  created_at: '2026-08-24T17:12:03.337Z',
};
const ended = (over: Partial<Event> = {}): Event => ({
  id: 'e2',
  from_status: 'confirmed',
  to_status: 'cancelled',
  actor_id: 'them',
  actor_type: 'user',
  reason_code: null,
  reason_text: 'Sorry — my visa interview moved.',
  created_at: '2026-09-13T09:00:00.000Z',
  ...over,
});

describe('outcomeOf', () => {
  it('finds the event that put the booking where it is, and who did it', () => {
    const b = sampleBookingFor({ status: 'cancelled' });
    expect(outcomeOf([created, ended()], b, 'me')).toEqual({
      status: 'cancelled',
      reason: 'Sorry — my visa interview moved.',
      by: 'them',
      at: '2026-09-13T09:00:00.000Z',
    });
  });

  it('knows when the viewer did it themselves', () => {
    const b = sampleBookingFor({ status: 'cancelled' });
    expect(outcomeOf([created, ended({ actor_id: 'me' })], b, 'me')?.by).toBe('you');
  });

  it('a sweep is nobody: null actor_id with a system type', () => {
    const b = sampleBookingFor({ status: 'expired' });
    const e = ended({ to_status: 'expired', actor_id: null, actor_type: 'system', reason_text: null });
    expect(outcomeOf([created, e], b, 'me')).toMatchObject({ by: 'system', reason: null });
  });

  it('says nothing for an outcome that needs no explaining', () => {
    expect(outcomeOf([created, ended({ to_status: 'completed' })], sampleBookingFor({ status: 'completed' }), 'me')).toBeNull();
    expect(outcomeOf([created], sampleBookingFor({ status: 'confirmed' }), 'me')).toBeNull();
  });

  it('says nothing when no event matches — a migrated row may have none', () => {
    expect(outcomeOf([created], sampleBookingFor({ status: 'cancelled' }), 'me')).toBeNull();
  });

  it('blank reason text is no reason, not an empty quote', () => {
    const b = sampleBookingFor({ status: 'cancelled' });
    expect(outcomeOf([created, ended({ reason_text: '   ' })], b, 'me')?.reason).toBeNull();
  });
});
