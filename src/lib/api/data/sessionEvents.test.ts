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
      reasonFromCode: null,
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

describe('the coded reason, for when nobody wrote anything', () => {
  const b = () => sampleBookingFor({ status: 'cancelled' });

  it('reads the code as a sentence when the note is empty', () => {
    // The whole point of requiring a chip: with the box hidden for every
    // reason but "Something else", this is the only thing that reaches the
    // other party. The API has always sent `reason_code`; this mapping used to
    // drop it, so an ending with no note explained nothing at all.
    const e = ended({ reason_text: null, reason_code: 'scheduling_conflict' });
    expect(outcomeOf([created, e], b(), 'me')).toMatchObject({
      reason: null,
      reasonFromCode: 'A calendar clash.',
    });
  });

  it('a written note wins — their words beat our template', () => {
    const e = ended({ reason_text: 'Visa interview moved.', reason_code: 'scheduling_conflict' });
    expect(outcomeOf([created, e], b(), 'me')).toMatchObject({
      reason: 'Visa interview moved.',
      reasonFromCode: null,
    });
  });

  it('whitespace is not a note, so the code still speaks', () => {
    const e = ended({ reason_text: '      ', reason_code: 'technical_issue' });
    expect(outcomeOf([created, e], b(), 'me')).toMatchObject({
      reason: null,
      reasonFromCode: 'A technical problem.',
    });
  });

  it('says nothing for Other with no note, rather than "Other"', () => {
    // Unreachable through our UI, where the note is required alongside it —
    // but reachable through any other client, and a bare "Other" is worse
    // than silence.
    const e = ended({ reason_text: null, reason_code: 'other' });
    expect(outcomeOf([created, e], b(), 'me')?.reasonFromCode).toBeNull();
  });

  it('says nothing for a code the system set itself', () => {
    const e = ended({ reason_text: null, reason_code: 'expired_no_response' });
    expect(outcomeOf([created, e], b(), 'me')?.reasonFromCode).toBeNull();
  });

  it('says nothing when there is no code either — a migrated row', () => {
    // Legacy held free text only, so these arrive with neither. Silence, not
    // an error.
    const e = ended({ reason_text: null, reason_code: null });
    expect(outcomeOf([created, e], b(), 'me')).toMatchObject({
      reason: null,
      reasonFromCode: null,
    });
  });
});
