/* eslint-disable @next/next/no-img-element -- remote avatar host not yet fixed (Supabase storage); see design-divergence.md */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { formatNextAvailable } from '@/lib/utils/format';
import { Tag } from '@/components/atoms/Tag/Tag';
import { MentorProof } from '@/components/molecules/MentorProof/MentorProof';
import type { Mentor, MentorLabel } from '@/types/mentor';
import styles from './MentorCard.module.css';

const LABEL_TEXT: Record<MentorLabel, string> = {
  'top-rated': 'Top-rated',
  experienced: 'Experienced mentor',
  rising: 'Rising mentor',
};

type MentorCardProps = {
  mentor: Mentor;
  onBook: (mentor: Mentor) => void;
  /** Booking needs the network (Design decisions §5). */
  offline?: boolean;
  /** The viewer's zone, for the next-available time. */
  timeZone: string;
  /** Topic tags. Design MentorCard defaults to true; Explore's `cardTopics` default hides them. */
  showTopics?: boolean;
  /**
   * The viewer's own card (a mentor browsing Explore): no Book button — nobody
   * books themselves. Interim until the backend leaves the caller out of /mentors.
   */
  isSelf?: boolean;
  /** Booking can't start for this viewer (e.g. no account yet): the button says why. */
  bookBlocked?: string | null;
};

/**
 * MentorCard, `photo` variant (the chosen default). Name and photo link to the
 * profile; the photo link is out of the tab order to avoid a duplicate stop.
 * Bottom block per MentorCard.dc.html: the offer line ("Free mentorship available"
 * while every session is free; paid "from $X" waits for prices), then either
 * "Next available: …", "No open times at the moment" (only when known to be none), or
 * nothing while it is unknown/refreshing. Without a time, Book reads "See availability".
 * Prefetch is off on profile links: Mentor Profile is not built yet (AppShell PREFETCH note).
 */
export function MentorCard({
  mentor: m,
  onBook,
  offline,
  timeZone,
  showTopics = true,
  isSelf = false,
  bookBlocked = null,
}: MentorCardProps) {
  const tone = { '--photo-bg': `var(--avatar-tone-${m.tone})` } as CSSProperties;
  const degree = [m.degreeLine, m.institution].filter(Boolean);
  return (
    <article className={styles.card} aria-labelledby={`mentor-${m.id}`}>
      <Link
        href={m.profileHref}
        prefetch={false}
        className={styles.photo}
        style={tone}
        tabIndex={-1}
        aria-hidden
      >
        {m.photoUrl ? (
          <>
            <img src={m.photoUrl} alt="" className={styles.img} loading="lazy" />
            <span className={styles.scrim} />
          </>
        ) : (
          <span className={styles.initials}>{m.initials}</span>
        )}
        {m.label && (
          <Tag tone="on-photo" className={styles.label}>
            {LABEL_TEXT[m.label]}
          </Tag>
        )}
      </Link>

      <div className={styles.who}>
        <h3 className={styles.nameWrap}>
          <Link href={m.profileHref} prefetch={false} id={`mentor-${m.id}`} className={styles.name}>
            {m.name}
          </Link>
        </h3>
        {degree.length > 0 && (
          <p className={styles.degree}>
            {m.degreeLine}
            {m.degreeLine && m.institution && ' · '}
            {m.institution && <span className={styles.school}>{m.institution}</span>}
          </p>
        )}
        <MentorProof
          rating={m.rating}
          reviewCount={m.reviewCount}
          completedSessions={m.completedSessions}
        />
      </div>

      {showTopics && m.topics.length > 0 && (
        <ul className={styles.topics} aria-label="Helps with">
          {m.topics.map((t) => (
            <li key={t.slug}>
              <Tag tone="neutral">{t.label}</Tag>
            </li>
          ))}
        </ul>
      )}

      {/* MentorCard.dc.html bottom block: offer line, then availability. */}
      <div className={styles.meta}>
        {m.offer === 'free' && (
          <p className={styles.offer}>
            <span className={styles.offerDot} aria-hidden />
            Free mentorship available
          </p>
        )}
        {m.nextAvailableAt ? (
          <p className={styles.next}>
            <Icon name="bolt" size={14} />
            Next available:{' '}
            <strong className={styles.nextTime}>
              {formatNextAvailable(m.nextAvailableAt, timeZone)}
            </strong>
          </p>
        ) : m.nextAvailableState === 'none' ? (
          <p className={styles.next}>
            <Icon name="event_busy" size={14} />
            No open times at the moment
          </p>
        ) : null}
      </div>

      {!isSelf && (
        <Button
          fullWidth
          className={styles.book}
          disabled={offline || !!bookBlocked}
          onClick={() => onBook(m)}
        >
          {offline
            ? 'Booking needs a connection'
            : bookBlocked
              ? bookBlocked
              : m.nextAvailableAt
                ? `Book session with ${m.firstName}`
                : 'See availability'}
        </Button>
      )}
    </article>
  );
}
