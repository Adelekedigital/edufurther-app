import { describe, expect, it } from 'vitest';
import {
  NEXT_STEPS,
  reapplyMailto,
  IN_REVIEW_COPY,
  NOT_APPROVED_COPY,
  APPROVED_COPY,
} from './mentorApplication';

describe('reapplyMailto (PRD: Not approved, Contact us)', () => {
  const href = reapplyMailto({
    name: 'Gbenga Ekundayo',
    first: 'Gbenga',
    email: 'gbenga+mentor@example.com',
    reviewDate: 'Oct 14, 2026',
    note: 'Check the school & years?',
  });

  it('writes to support with the subject and body URL-encoded', () => {
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('support@edufurther.org');
    // Encoded: no raw space or line break, and the note's "&" can't start a field.
    expect(href).not.toMatch(/[\s#]/);
    expect(href.split('&')).toHaveLength(2);
    const q = new URLSearchParams(href.split('?')[1]);
    expect(q.get('subject')).toBe('Mentor application: please review again (Gbenga Ekundayo)');
    const body = q.get('body')!;
    expect(body).toContain('What I’ve changed since the review:\n- \n');
    expect(body).toContain('Name: Gbenga Ekundayo');
    expect(body).toContain('Account email: gbenga+mentor@example.com');
    expect(body).toContain('Review date: Oct 14, 2026');
    expect(body).toContain('Reviewer’s note: Check the school & years?');
    expect(body.endsWith('Thanks,\nGbenga')).toBe(true);
  });
});

describe('mentor application copy', () => {
  it('has no em dash anywhere (copy standard)', () => {
    const all = JSON.stringify([
      NEXT_STEPS,
      IN_REVIEW_COPY,
      NOT_APPROVED_COPY,
      APPROVED_COPY,
      IN_REVIEW_COPY.body('a@b.c'),
      APPROVED_COPY.title('A'),
      NOT_APPROVED_COPY.body('A'),
    ]);
    expect(all).not.toContain('—');
  });
});
