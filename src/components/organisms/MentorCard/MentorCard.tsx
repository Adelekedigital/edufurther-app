/* eslint-disable @next/next/no-img-element -- remote avatar host not yet fixed (Supabase storage); see design-divergence.md */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { formatNextAvailable } from '@/lib/utils/format';
import { Tag } from '@/components/atoms/Tag/Tag';
import { MentorProof } from '@/components/molecules/MentorProof/MentorProof';
import type { Mentor, MentorLabel } from '@/types/mentor';
import { cx } from '@/lib/utils/cx';
import styles from './MentorCard.module.css';

const LABEL_TEXT: Record<MentorLabel, string> = {
  'top-rated': 'Top-rated',
  experienced: 'Experienced mentor',
  new: 'New mentor',
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
  /**
   * False for a viewer who can't book at all (a mentor, product 2026-09-29):
   * "View profile" takes Book's place, so the card keeps its action.
   */
  canBook?: boolean;
  /**
   * `photo` (Explore, the default) or `compact` (MentorCard.dc.html): a 56px
   * round photo beside the name, for suggestion grids such as the profile's
   * "isn't available" page.
   */
  variant?: 'photo' | 'compact';
};

/**
 * MentorCard, `photo` variant (the chosen default) or `compact`. Name and photo
 * link to the profile; the photo link is out of the tab order to avoid a
 * duplicate stop (compact's round photo is not a link, as drawn).
 * Bottom block per MentorCard.dc.html: the offer line ("Free mentorship available"
 * while every session is free; paid "from $X" waits for prices), then either
 * "Next available: …", "No open times at the moment" (only when known to be none), or
 * nothing while it is unknown/refreshing. Without a time, Book reads "See availability".
 * A mentor not taking bookings reads "Not taking bookings" and offers "View profile".
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
  canBook = true,
  variant = 'photo',
}: MentorCardProps) {
  const compact = variant === 'compact';
  // The face position (backend avatar_focus) drives the crop via CSS custom
  // properties; without it the CSS falls back to the design's 50% 25%.
  const tone = {
    '--photo-bg': `var(--avatar-tone-${m.tone})`,
    ...(m.photoFocus && {
      '--photo-x': `${(m.photoFocus.x * 100).toFixed(1)}%`,
      '--photo-y': `${(m.photoFocus.y * 100).toFixed(1)}%`,
    }),
  } as CSSProperties;
  const degree = [m.degreeLine, m.institution].filter(Boolean);
  return (
    <article
      className={cx(styles.card, compact && styles.compact)}
      aria-labelledby={`mentor-${m.id}`}
    >
      {/* Off: Next cancels its own profile prefetches mid-stream (failure-modes #25). */}
      {!compact && (
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
      )}

      <div className={compact ? styles.compactHead : styles.whoWrap}>
        {compact && (
          <Avatar
            size="xl"
            tone={m.tone}
            initials={m.initials}
            src={m.photoUrl}
            alt=""
            focus={m.photoFocus}
            lazy
          />
        )}
        <div className={styles.who}>
          <div className={styles.nameRow}>
            <h3 className={styles.nameWrap}>
              <Link
                href={m.profileHref}
                prefetch={false}
                id={`mentor-${m.id}`}
                className={styles.name}
              >
                {m.name}
              </Link>
            </h3>
            {/* "New mentor" is already the proof line's first words: not twice. */}
            {compact && m.label && m.label !== 'new' && (
              <Tag tone="badge">{LABEL_TEXT[m.label]}</Tag>
            )}
          </div>
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
            originCountry={m.originCountry}
            studyCountry={m.studyCountry}
          />
        </div>
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
        {m.takingBookings === false ? (
          // MentorCard.dc.html `notTakingLine` (design, 2026-09-29).
          <p className={cx(styles.next, styles.notTaking)}>
            <Icon name="event_busy" size={14} />
            Not taking bookings
          </p>
        ) : m.nextAvailableAt ? (
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

      {/* Nobody can book them: the profile, never a Book that opens nothing. */}
      {!canBook || isSelf || m.takingBookings === false ? (
        <ButtonLink
          href={m.profileHref}
          prefetch={false}
          fullWidth
          size="medium"
          variant="secondary-outlined"
          className={styles.book}
          // aria-label, not an sr-only span: Chrome reads that span as a block ("View profile : name").
          aria-label={`View profile: ${m.name}`}
        >
          View profile
        </ButtonLink>
      ) : (
        <Button
          fullWidth
          size="medium"
          // Repeated on every card, so outlined (CTA hierarchy).
          variant="secondary-outlined"
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
