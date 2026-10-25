import { describe, expect, it } from 'vitest';
import { sampleParty } from './bookingTestFixtures';
import { joinedTime, presenceOf } from './presence';

const PRESS = '2026-10-04T16:57:00Z';
const ROOM = '2026-10-04T16:57:20Z';
const none = sampleParty();
const pressed = sampleParty({ joinedAt: PRESS });
const inRoom = sampleParty({ joinedAt: PRESS, inRoomAt: ROOM });

describe('presenceOf', () => {
  it('EduFurther video, live: here while in the room, none once they leave (backend #394)', () => {
    expect(
      presenceOf(sampleParty({ joinedAt: PRESS, inRoomAt: ROOM, inRoom: true }), 'daily'),
    ).toBe('here');
    expect(
      presenceOf(sampleParty({ joinedAt: PRESS, inRoomAt: ROOM, inRoom: false }), 'daily'),
    ).toBe('none');
    // Pressed Join, never seen in the room: not in the call.
    expect(presenceOf(sampleParty({ joinedAt: PRESS, inRoom: false }), 'daily')).toBe('none');
  });

  it('EduFurther video with no live answer (no room): not in the call, whatever was seen before', () => {
    expect(presenceOf(inRoom, 'daily')).toBe('none');
    expect(presenceOf(pressed, 'daily')).toBe('none');
    expect(presenceOf(none, 'daily')).toBe('none');
  });

  it('a deleted account shows nothing, wherever it is', () => {
    const gone = sampleParty({ deleted: true, joinedAt: PRESS, inRoomAt: ROOM, inRoom: true });
    expect(presenceOf(gone, 'daily')).toBe('none');
    expect(presenceOf(gone, 'google_meet')).toBe('none');
  });

  it('Google Meet, a mentor’s own link, or no venue: joined on the Join press, never here', () => {
    for (const provider of ['google_meet', 'custom', 'zoom', null] as const) {
      expect(presenceOf(pressed, provider)).toBe('joined');
      expect(presenceOf(none, provider)).toBe('none');
    }
  });
});

describe('joinedTime', () => {
  it('is the room sighting for Daily, the Join press otherwise', () => {
    expect(joinedTime(inRoom, 'daily')).toBe(ROOM);
    expect(joinedTime(pressed, 'daily')).toBeNull();
    expect(joinedTime(inRoom, 'google_meet')).toBe(PRESS);
  });
});
