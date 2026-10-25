import { describe, expect, it } from 'vitest';
import { sessionSupportMail } from './session';

describe('sessionSupportMail', () => {
  it('names the role and signs off with the first name', () => {
    const m = sessionSupportMail({
      sessionName: '1:1 call with Gbenga Ogundipe',
      when: 'Mon, Sep 28, 6:00 – 6:30 pm',
      name: 'Amara Okafor',
      role: 'mentee',
    });
    expect(m.subject).toBe('Session: please help (Amara Okafor)');
    expect(m.body).toContain('Session: 1:1 call with Gbenga Ogundipe, Mon, Sep 28, 6:00 – 6:30 pm');
    expect(m.body).toContain('Role: Mentee');
    expect(m.body.endsWith('Thanks,\nAmara')).toBe(true);
  });
});
