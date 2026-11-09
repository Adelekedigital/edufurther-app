import { norm } from '@/lib/utils/text';
import type { EmailSummary, EmailValue } from '@/lib/api/data/adminEmails';

export type EmailFilters = {
  /** A group key, or 'all'. */
  group: string;
  to: 'all' | 'mentor' | 'mentee' | 'admins';
  status: 'all' | 'live' | 'notSetUp';
};

export const NO_EMAIL_FILTERS: EmailFilters = { group: 'all', to: 'all', status: 'all' };

export const filtersActive = (q: string, f: EmailFilters) =>
  q.trim() !== '' || f.group !== 'all' || f.to !== 'all' || f.status !== 'all';

/**
 * The list's search and filters, in the browser over the loaded registry.
 * Search matches the name or the trigger; an email to both sides matches
 * Mentors and Mentees; Admins matches an email with an admins variant.
 */
export function filterEmails(
  emails: readonly EmailSummary[],
  q: string,
  f: EmailFilters,
): EmailSummary[] {
  const needle = norm(q.trim());
  return emails.filter(
    (e) =>
      (!needle || norm(`${e.name} ${e.trigger}`).includes(needle)) &&
      (f.group === 'all' || e.group === f.group) &&
      (f.to === 'all' || e.recipients.includes(f.to)) &&
      (f.status === 'all' || e.live === (f.status === 'live')),
  );
}

/** The Values tab's search: name or meaning. */
export function filterValues(values: readonly EmailValue[], q: string): EmailValue[] {
  const needle = norm(q.trim());
  if (!needle) return [...values];
  return values.filter((v) => norm(v.name).includes(needle) || norm(v.meaning).includes(needle));
}
