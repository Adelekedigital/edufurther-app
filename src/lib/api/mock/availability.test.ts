import { MOCK_SESSION_TYPES, mockNextAvailableAt, mockSlots } from './availability';
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
});
