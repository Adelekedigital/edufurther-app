import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import type { MetMentor } from '@/lib/api/data/metMentors';
import styles from './MentorRow.module.css';

type MentorRowProps = {
  mentor: MetMentor;
  timeZone: string;
  /** Opens the booking flow for a bookable mentor (bookability "open"). */
  onBook: (mentor: MetMentor) => void;
};

function shortDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(
    new Date(iso),
  );
}

/** The history line under the name — what happened last, by bookability. */
function history(m: MetMentor, timeZone: string): string {
  const n = m.sessionCount;
  const sessions = `${n} session${n === 1 ? '' : 's'}`;
  if (m.bookability === 'has_upcoming') return `${sessions} · Upcoming session`;
  if (m.bookability === 'pending') return `${sessions} · Request pending`;
  return `${sessions} · Last met ${shortDate(m.lastSessionAt, timeZone)}`;
}

/**
 * One mentor in the home "Book again" list (Mentee Dashboard v2.dc.html). The
 * action follows the backend's `bookability`: open → "Book again" (opens the
 * booking flow in place, never the profile — product); has_upcoming / pending →
 * "View booking" in Bookings; unavailable → a note, no button. The per-card
 * "Message" button is omitted until Messages ships (#238). The name isn't a
 * profile link — the card re-books in place (design-divergence.md).
 */
export function MentorRow({ mentor: m, timeZone, onBook }: MentorRowProps) {
  const degreeLine = [m.degree, m.institution].filter(Boolean).join(' · ');
  return (
    <div className={styles.row}>
      <div className={styles.who}>
        <Avatar
          size="lg"
          tone={m.cover}
          initials={m.initials}
          src={m.avatarUrl}
          focus={m.avatarFocus}
          alt=""
        />
        <span className={styles.lines}>
          <span className={styles.name}>{m.name}</span>
          {degreeLine && <span className={styles.sub}>{degreeLine}</span>}
          <span className={styles.meta}>{history(m, timeZone)}</span>
        </span>
      </div>
      <div className={styles.cta}>
        {m.bookability === 'open' ? (
          <Button
            variant="secondary-outlined"
            size="small"
            aria-label={`Book again with ${m.name}`}
            onClick={() => onBook(m)}
          >
            Book again
          </Button>
        ) : m.bookability === 'has_upcoming' ? (
          <ButtonLink
            href="/bookings"
            prefetch={false}
            variant="secondary-outlined"
            size="small"
            aria-label={`View booking with ${m.name}`}
          >
            View booking
          </ButtonLink>
        ) : m.bookability === 'pending' ? (
          <ButtonLink
            href="/bookings?tab=pending"
            prefetch={false}
            variant="secondary-outlined"
            size="small"
            aria-label={`View booking with ${m.name}`}
          >
            View booking
          </ButtonLink>
        ) : (
          <span className={styles.note}>Not taking bookings</span>
        )}
      </div>
    </div>
  );
}
