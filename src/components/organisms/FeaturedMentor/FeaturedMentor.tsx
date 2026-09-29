/* eslint-disable @next/next/no-img-element -- remote avatar host not yet fixed (Supabase storage); see design-divergence.md */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { MentorProof } from '@/components/molecules/MentorProof/MentorProof';
import { formatNextAvailable } from '@/lib/utils/format';
import type { FeaturedMentor as Featured } from '@/types/mentor';
import styles from './FeaturedMentor.module.css';

type FeaturedMentorProps = {
  mentor: Featured;
  onBook: (mentor: Featured) => void;
  timeZone: string;
  offline?: boolean;
  /** Booking can't start for this viewer: the button says why. */
  bookBlocked?: string | null;
  /** False for a mentor viewer: "View profile" instead of Book (product, 2026-09-29). */
  canBook?: boolean;
};

/**
 * "Featured this week" (Design decisions: Explore, featured mentor). Photo left,
 * details right; stacks on phones. The page hides it while searching and on the
 * no-mentors and error states. Profile links don't prefetch (AppShell PREFETCH note).
 */
export function FeaturedMentor({
  mentor: m,
  onBook,
  timeZone,
  offline,
  bookBlocked = null,
  canBook = true,
}: FeaturedMentorProps) {
  // Face position anchors the crop (backend avatar_focus); CSS falls back to 50% 25%.
  const tone = {
    '--photo-bg': `var(--avatar-tone-${m.tone})`,
    ...(m.photoFocus && {
      '--photo-x': `${(m.photoFocus.x * 100).toFixed(1)}%`,
      '--photo-y': `${(m.photoFocus.y * 100).toFixed(1)}%`,
    }),
  } as CSSProperties;
  return (
    <section aria-labelledby="featured-name" className={styles.card}>
      {/* Off: Next cancels its own profile prefetches mid-stream (failure-modes #25). */}
      <Link
        href={m.profileHref}
        prefetch={false}
        className={styles.photo}
        style={tone}
        tabIndex={-1}
        aria-hidden
      >
        {m.photoUrl ? (
          <img src={m.photoUrl} alt="" className={styles.img} />
        ) : (
          <span className={styles.initials}>{m.initials}</span>
        )}
        <span className={styles.tag}>
          <Icon name="star" size={14} filled />
          Featured this week
        </span>
      </Link>
      {/* Groups (product, 2026-09-27): who → proof → bio → offer/availability → CTA,
          centred in the 315px card; design request #25. */}
      <div className={styles.body}>
        <div className={styles.who}>
          <h2 className={styles.nameWrap}>
            <span className="sr-only">Featured this week: </span>
            <Link href={m.profileHref} prefetch={false} id="featured-name" className={styles.name}>
              {m.name}
            </Link>
          </h2>
          {(m.degreeLine || m.institution) && (
            <p className={styles.degree}>
              {m.degreeLine}
              {m.degreeLine && m.institution && ' · '}
              {m.institution && <span className={styles.school}>{m.institution}</span>}
            </p>
          )}
        </div>
        <MentorProof
          rating={m.rating}
          reviewCount={m.reviewCount}
          completedSessions={m.completedSessions}
          originCountry={m.originCountry}
          studyCountry={m.studyCountry}
        />
        {m.bio && <p className={styles.bio}>{m.bio}</p>}
        {/* Same bottom block as MentorCard: offer line, then availability. Not
            rendered when empty, so it doesn't add a flex gap. */}
        {(m.offer === 'free' || m.nextAvailableAt || m.nextAvailableState === 'none') && (
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
        )}
        <div className={styles.actions}>
          {!canBook ? (
            <ButtonLink
              href={m.profileHref}
              prefetch={false}
              variant="secondary-outlined"
              size="medium"
              // aria-label, not an sr-only span: Chrome reads that span as a block ("View profile : name").
              aria-label={`View profile: ${m.name}`}
            >
              View profile
            </ButtonLink>
          ) : (
            <Button
              variant="secondary-outlined"
              size="medium"
              disabled={offline || !!bookBlocked}
              onClick={() => onBook(m)}
            >
              {offline
                ? 'Booking needs a connection'
                : (bookBlocked ?? `Book session with ${m.firstName}`)}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
