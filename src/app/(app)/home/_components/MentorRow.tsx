import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import type { MetMentor } from '@/lib/api/data/metMentors';
import { NOT_TAKING_TITLE } from '@/lib/copy/profile';
import { cx } from '@/lib/utils/cx';
import { dayLabel } from '@/lib/utils/format';
import styles from './MentorRow.module.css';

type MentorRowProps = {
  mentor: MetMentor;
  timeZone: string;
  /** Opens the booking flow for a bookable mentor (bookability "open"). */
  onBook: (mentor: MetMentor) => void;
  /**
   * `list`: a Book again row (48px photo, a medium button). `modal`: a row in
   * Mentors you've met (40px photo, small buttons, a note when they can't be booked).
   */
  variant?: 'list' | 'modal';
};

/**
 * "{n} sessions · Last on Tue, Oct 6", or "Next on …" while one is booked
 * (Mentee Dashboard v2.dc.html `hist`). Without the next date from the
 * backend, the booking is named instead of dated.
 */
export function metHistory(m: MetMentor, timeZone: string): string {
  const n = m.sessionCount;
  const sessions = `${n} session${n === 1 ? '' : 's'}`;
  const booked = m.bookability === 'has_upcoming' || m.bookability === 'pending';
  if (booked && m.nextSessionAt) return `${sessions} · Next on ${dayLabel(m.nextSessionAt, timeZone)}`;
  if (m.bookability === 'has_upcoming') return `${sessions} · Upcoming session`;
  if (m.bookability === 'pending') return `${sessions} · Request pending`;
  return `${sessions} · Last on ${dayLabel(m.lastSessionAt, timeZone)}`;
}

/** Why an unavailable mentor can't be booked, in the design's words. */
function unavailableNote(m: MetMentor): string {
  return m.unavailableReason === 'no_open_times' ? 'No open times yet' : NOT_TAKING_TITLE;
}

/**
 * One mentor you've met (Mentee Dashboard v2.dc.html: the Book again list and
 * Mentors you've met). The action follows the backend's `bookability`: open →
 * "Book again" (the booking flow in place, never the profile); has_upcoming /
 * pending → "View booking" in Bookings; unavailable → a note, no button.
 * "Message" waits for Messages (messageBtn hide).
 */
export function MentorRow({ mentor: m, timeZone, onBook, variant = 'list' }: MentorRowProps) {
  const modal = variant === 'modal';
  const size = modal ? 'small' : 'medium';
  const degreeLine = [m.degree, m.institution].filter(Boolean).join(' · ');
  return (
    <div className={cx(styles.row, modal && styles.modalRow)}>
      <div className={styles.who}>
        <Avatar
          size={modal ? 'md' : 'lg'}
          tone={m.cover}
          initials={m.initials}
          src={m.avatarUrl}
          focus={m.avatarFocus}
          alt=""
        />
        <span className={styles.lines}>
          <span className={styles.name}>{m.name}</span>
          {degreeLine && <span className={styles.sub}>{degreeLine}</span>}
          <span className={styles.meta}>{metHistory(m, timeZone)}</span>
        </span>
      </div>
      <div className={styles.cta}>
        {m.bookability === 'open' ? (
          <Button
            variant="secondary-outlined"
            size={size}
            aria-label={`Book again with ${m.name}`}
            onClick={() => onBook(m)}
          >
            Book again
          </Button>
        ) : m.bookability === 'has_upcoming' || m.bookability === 'pending' ? (
          <ButtonLink
            href={m.bookability === 'pending' ? '/bookings?tab=pending' : '/bookings'}
            prefetch={false}
            variant="secondary-outlined"
            size={size}
            aria-label={`View booking with ${m.name}`}
          >
            View booking
          </ButtonLink>
        ) : (
          <span className={styles.note}>{unavailableNote(m)}</span>
        )}
      </div>
    </div>
  );
}
