/* eslint-disable @next/next/no-img-element -- remote avatar host not yet fixed (Supabase storage); see design-divergence.md */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
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
};

/**
 * "Featured this week" (Design decisions: Explore, featured mentor). Photo left,
 * details right; stacks on phones. The page hides it while searching and on the
 * no-mentors and error states. Profile links don't prefetch (AppShell PREFETCH note).
 */
export function FeaturedMentor({ mentor: m, onBook, timeZone, offline }: FeaturedMentorProps) {
  const tone = { '--photo-bg': `var(--avatar-tone-${m.tone})` } as CSSProperties;
  return (
    <section aria-labelledby="featured-name" className={styles.card}>
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
      <div className={styles.body}>
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
        <MentorProof
          rating={m.rating}
          reviewCount={m.reviewCount}
          completedSessions={m.completedSessions}
        />
        <p className={styles.bio}>{m.bio}</p>
        {m.nextAvailableAt && (
          <p className={styles.next}>
            <Icon name="bolt" size={14} />
            Next available:{' '}
            <strong className={styles.nextTime}>
              {formatNextAvailable(m.nextAvailableAt, timeZone)}
            </strong>
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="secondary-outlined" disabled={offline} onClick={() => onBook(m)}>
            {offline ? 'Booking needs a connection' : `Book session with ${m.firstName}`}
          </Button>
        </div>
      </div>
    </section>
  );
}
