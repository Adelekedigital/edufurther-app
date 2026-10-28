import { describe, expect, it } from 'vitest';
import { hasContactDetails } from './contactDetails';

describe('hasContactDetails: the notice shows while an email or phone number is in the text', () => {
  it.each(['write to amara@example.com', 'call +234 803 123 4567', 'my number is (0803) 123-4567'])(
    'finds one in “%s”',
    (t) => expect(hasContactDetails(t)).toBe(true),
  );

  it.each(['see you at 3:00 pm', 'room 1204', 'Fall 2027 intake'])('nothing in “%s”', (t) =>
    expect(hasContactDetails(t)).toBe(false),
  );
});
