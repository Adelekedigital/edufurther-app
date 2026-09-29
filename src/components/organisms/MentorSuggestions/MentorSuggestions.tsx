import { useId } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { MentorCard } from '@/components/organisms/MentorCard/MentorCard';
import { MentorCardSkeleton } from '@/components/organisms/MentorCard/MentorCardSkeleton';
import type { Mentor } from '@/types/mentor';
import styles from './MentorSuggestions.module.css';

type MentorSuggestionsProps = {
  title: string;
  subtitle: string;
  /** Null while loading or when there's nothing to show. */
  mentors: Mentor[] | null;
  loading: boolean;
  /** How many skeleton cards to hold the place with. */
  expected?: number;
  exploreHref: string;
  onBook: (mentor: Mentor) => void;
  timeZone: string;
  offline?: boolean;
  bookBlocked?: string | null;
  canBook?: boolean;
};

/**
 * Mentor Profile.dc.html, the "profile isn't available" page: a titled grid of
 * compact MentorCards and "Explore all mentors". A suggestion, not the page's
 * content: nothing renders when the list is empty or failed (the caller keeps
 * its own way on). Loading holds the place with compact skeletons.
 */
export function MentorSuggestions({
  title,
  subtitle,
  mentors,
  loading,
  expected = 3,
  exploreHref,
  onBook,
  timeZone,
  offline,
  bookBlocked,
  canBook,
}: MentorSuggestionsProps) {
  const headingId = useId();
  if (!loading && !mentors?.length) return null;
  return (
    <section
      className={styles.section}
      aria-labelledby={headingId}
      aria-busy={loading || undefined}
    >
      <div className={styles.head}>
        <div className={styles.titles}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {!loading && <p className={styles.sub}>{subtitle}</p>}
        </div>
        <ButtonLink href={exploreHref} size="large" variant="secondary-outlined">
          Explore all mentors
        </ButtonLink>
      </div>
      <ul className={styles.grid}>
        {loading
          ? Array.from({ length: expected }, (_, i) => (
              <li key={i}>
                <MentorCardSkeleton variant="compact" />
              </li>
            ))
          : mentors!.map((m) => (
              <li key={m.id}>
                <MentorCard
                  variant="compact"
                  mentor={m}
                  onBook={onBook}
                  timeZone={timeZone}
                  offline={offline}
                  bookBlocked={bookBlocked}
                  canBook={canBook}
                />
              </li>
            ))}
      </ul>
    </section>
  );
}
