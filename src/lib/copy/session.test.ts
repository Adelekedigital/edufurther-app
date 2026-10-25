import { describe, expect, it } from 'vitest';
import { supportHref } from '@/lib/utils/mailto';
import { sessionSupportRequest } from './session';

const request = sessionSupportRequest({
  sessionName: '1:1 call with Gbenga Ogundipe',
  when: 'Mon, Sep 28, 6:00 – 6:30 pm Lagos (WAT)',
});
const mail = (href: string) => new URLSearchParams(href.slice(href.indexOf('?') + 1));

describe('sessionSupportRequest', () => {
  it('names the session, its time with the zone, the role, and signs off with the first name', () => {
    const q = mail(supportHref({ name: 'Amara Okafor', email: '', mentor: false }, request));
    expect(q.get('subject')).toBe('Session: please help (Amara Okafor)');
    expect(q.get('body')).toContain(
      'Session: 1:1 call with Gbenga Ogundipe, Mon, Sep 28, 6:00 – 6:30 pm Lagos (WAT)',
    );
    expect(q.get('body')).toContain('Role: Mentee');
    expect(q.get('body')!.endsWith('Thanks,\nAmara')).toBe(true);
  });

  it('a mentor is named as one', () => {
    const q = mail(supportHref({ name: 'Gbenga Ogundipe', email: '', mentor: true }, request));
    expect(q.get('body')).toContain('Role: Mentor');
  });
});
