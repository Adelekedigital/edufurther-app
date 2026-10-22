import {
  MOCK_SESSION_TYPES,
  mockNextAvailableAt,
  mockSessionTypesFor,
  mockSlots,
} from './availability';
import { MENTORS } from './fixtures';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const general = MOCK_SESSION_TYPES[0]!.id;
const mentor = MENTORS[0]!.id;

describe('mock availability', () => {
  it('keeps the grid still when the clock crosses an hour (review of #19)', () => {
    const now = Date.now();
    const later = now + HOUR;
    const before = mockSlots(mentor, general, now + 14 * DAY, now).map((s) => s.start);
    const after = mockSlots(mentor, general, now + 14 * DAY, later).map((s) => s.start);
    // Every slot still ahead an hour later is one that was offered before.
    expect(after.every((s) => before.includes(s))).toBe(true);
  });

  it('names the first slot still ahead as the card’s next available', () => {
    const now = Date.now();
    const first = mockSlots(mentor, general, now + 56 * DAY, now)[0]!;
    expect(mockNextAvailableAt(mentor, now)).toBe(first.start);
    expect(Date.parse(first.start)).toBeGreaterThanOrEqual(now);
  });

  it('each offering has its own next time; the mentor’s is the earliest (backend #526)', () => {
    const now = Date.now();
    const states = new Set<string>();
    for (const m of MENTORS) {
      const types = mockSessionTypesFor(m.id, now);
      for (const t of types) {
        states.add(t.next_available_state);
        // A time only when open, and an offering with nothing free has no grid.
        expect(t.next_available_at !== null).toBe(t.next_available_state === 'open');
        // (A mentor not taking bookings reads none without changing the grid.)
        if (t.next_available_state === 'none' && m.taking_bookings !== false)
          expect(mockSlots(m.id, t.id, now + 56 * DAY, now)).toEqual([]);
      }
      const open = types.flatMap((t) => t.next_available_at ?? []).sort();
      if (m.taking_bookings !== false) expect(mockNextAvailableAt(m.id, now)).toBe(open[0] ?? null);
    }
    // Every card state has data to render.
    expect([...states].sort()).toEqual(['none', 'open', 'refreshing']);
  });
});
