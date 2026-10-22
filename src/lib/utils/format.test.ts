import { REVIEW_COPY } from '@/lib/copy/profile';
import { formatShortDate } from './format';
import { newestFirst } from './reviewable';

describe('formatShortDate', () => {
  it('"Sep 19", read in the zone it is given', () => {
    // 23:30 UTC on the 19th is already the 20th in Lagos (UTC+1).
    expect(formatShortDate('2026-09-19T23:30:00Z', 'UTC')).toBe('Sep 19');
    expect(formatShortDate('2026-09-19T23:30:00Z', 'Africa/Lagos')).toBe('Sep 20');
    expect(formatShortDate('2026-09-20T00:30:00Z', 'America/New_York')).toBe('Sep 19');
  });

  it('without a zone, this device’s', () => {
    const at = '2026-10-12T12:00:00Z';
    expect(formatShortDate(at)).toBe(
      new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    );
  });
});

describe('newestFirst', () => {
  it('orders by time, not by text, and leaves the input alone', () => {
    const list = [
      { id: 'a', startsAt: '2026-09-10T15:00:00Z' },
      // Later, though its text sorts first.
      { id: 'b', startsAt: '2026-09-19T08:00:00-05:00' },
      { id: 'c', startsAt: '2026-09-19T12:00:00Z' },
    ];
    expect(newestFirst(list).map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(list.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('REVIEW_COPY.dueBody', () => {
  const at = '2026-09-19T15:00:00Z';
  it('names the day and the session type', () => {
    expect(REVIEW_COPY.dueBody({ startsAt: at, typeName: 'SOP review' }, 'UTC')).toBe(
      'Your review on Sep 19 (SOP review) helps other mentees choose, and takes about a minute.',
    );
  });
  it('no brackets without a type name', () => {
    expect(REVIEW_COPY.dueBody({ startsAt: at, typeName: '  ' }, 'UTC')).toBe(
      'Your review on Sep 19 helps other mentees choose, and takes about a minute.',
    );
  });
  it('the plain line while no session is known', () => {
    expect(REVIEW_COPY.dueBody(null, 'UTC')).toBe(
      'Your review helps other mentees choose, and takes about a minute.',
    );
  });
});
