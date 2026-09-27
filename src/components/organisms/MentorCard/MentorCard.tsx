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
};

/**
 * MentorCard, `photo` variant (the chosen default). Name and photo link to the
 * profile; the photo link is out of the tab order to avoid a duplicate stop.
 * No price line: there are no prices (backend reply #3). The next-available line
 * shows only when the API has a time (backend reply #4: null → hide).
 */
// prefetch is off on profile links: Mentor Profile is not built yet (see AppShell PREFETCH note).
export function MentorCard({ mentor: m, onBook, offline, timeZone }: MentorCardProps) {
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

      {m.topics.length > 0 && (
        <ul className={styles.topics} aria-label="Helps with">
          {m.topics.map((t) => (
            <li key={t.slug}>
              <Tag tone="neutral">{t.label}</Tag>
            </li>
          ))}
        </ul>
      )}

      {m.nextAvailableAt && (
        <p className={styles.next}>
          <Icon name="bolt" size={14} />
          Next available:{' '}
          <strong className={styles.nextTime}>
            {formatNextAvailable(m.nextAvailableAt, timeZone)}
          </strong>
        </p>
      )}

      <Button fullWidth className={styles.book} disabled={offline} onClick={() => onBook(m)}>
        {offline
          ? 'Booking needs a connection'
          : m.nextAvailableAt
            ? `Book session with ${m.firstName}`
            : 'See availability'}
      </Button>
    </article>
  );
}
