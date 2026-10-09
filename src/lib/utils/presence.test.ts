import { describe, expect, it } from 'vitest';
import { sampleParty } from './bookingTestFixtures';
import { joinedTime, presenceOf } from './presence';

const PRESS = '2026-10-04T16:57:00Z';
const ROOM = '2026-10-04T16:57:20Z';
const none = sampleParty();
const pressed = sampleParty({ joinedAt: PRESS });
const inRoom = sampleParty({ joinedAt: PRESS, inRoomAt: ROOM });

describe('presenceOf', () => {
  it('EduFurther video: joined only once Daily saw them in the room', () => {
    expect(presenceOf(inRoom, 'daily')).toBe('joined');
    expect(presenceOf(pressed, 'daily')).toBe('joining');
    expect(presenceOf(none, 'daily')).toBe('none');
  });

  it('Google Meet, a mentor’s own link, or no venue: joined on the Join press', () => {
    for (const provider of ['google_meet', 'custom', 'zoom', null] as const) {
      expect(presenceOf(pressed, provider)).toBe('joined');
      expect(presenceOf(none, provider)).toBe('none');
    }
  });

  it('is never "joining" outside Daily: nothing else can tell a press from a presence', () => {
    expect(presenceOf(pressed, 'google_meet')).not.toBe('joining');
  });
});

describe('joinedTime', () => {
  it('is the room sighting for Daily, the Join press otherwise', () => {
    expect(joinedTime(inRoom, 'daily')).toBe(ROOM);
    expect(joinedTime(pressed, 'daily')).toBeNull();
    expect(joinedTime(inRoom, 'google_meet')).toBe(PRESS);
  });
});
