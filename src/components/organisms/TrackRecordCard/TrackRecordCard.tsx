import { Icon } from '@/components/atoms/Icon/Icon';
import { Star } from '@/components/atoms/Star/Star';
import { StatTile } from '@/components/molecules/StatTile/StatTile';
import { cx } from '@/lib/utils/cx';
import { formatRating } from '@/lib/utils/format';
import type { MentorProfile } from '@/types/mentor';
import styles from './TrackRecordCard.module.css';

type TrackRecordCardProps = {
  profile: MentorProfile;
};

const n = new Intl.NumberFormat('en-US');
/** The blue rating band waits for 3 completed sessions (design: showStatsHead). */
const BAND_FROM = 3;

/**
 * Mentor Profile.dc.html track record: a rating tile and "Mentees keep coming
 * back" on blue (from 3 sessions), then plain-worded stats (BFM: give numbers
 * context). Nothing at 0 sessions: the page shows FirstMenteesCard.
 *
 * Not built: the "Top-rated" badge (no product rule yet, design #33). The
 * "keep coming back" line only appears when it is true — more than one
 * session per mentee on average.
 */
export function TrackRecordCard({ profile }: TrackRecordCardProps) {
  const m = profile.mentor;

  // Nothing to show before the first session: the page shows the first-mentees
  // card instead (design reply #45).
  if (m.completedSessions === 0) return null;

  const perMentee = profile.menteesMentored > 0 ? m.completedSessions / profile.menteesMentored : 0;
  const repeat = Math.round(perMentee * 10) / 10 > 1;
  const rated = m.reviewCount > 0 && m.rating !== null;
  const filled = rated ? Math.round(m.rating!) : 0;

  const stats = [
    {
      icon: 'schedule' as const,
      tone: 'gold' as const,
      value: `${n.format(profile.mentoringMinutes)} mins`,
      label: 'mentoring time',
    },
    {
      icon: 'event_available' as const,
      tone: 'blue' as const,
      value: n.format(m.completedSessions),
      label: 'sessions completed',
    },
    {
      icon: 'groups' as const,
      tone: 'green' as const,
      value: n.format(profile.menteesMentored),
      label: 'mentees mentored',
    },
    // Always four tiles: attendance is null (never 0) until a session has
    // settled (backend), and a missing tile left a hole in the grid.
    {
      icon: 'verified_user' as const,
      tone: 'neutral' as const,
      value: profile.attendanceRate === null ? null : `${Math.round(profile.attendanceRate)}%`,
      label: 'avg. attendance',
    },
  ];

  return (
    <section className={styles.card} aria-labelledby="track-h">
      <h2 id="track-h" className="sr-only">
        Track record
      </h2>
      {m.completedSessions >= BAND_FROM && (rated || repeat) && (
        <div className={styles.band}>
          {rated && (
            <div
              className={styles.rating}
              role="img"
              aria-label={`Rated ${formatRating(m.rating!)} out of 5`}
            >
              <span className={styles.ratingValue}>{formatRating(m.rating!)}</span>
              <span className={styles.stars} aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={10}
                    className={i <= filled ? styles.starOn : styles.starOff}
                  />
                ))}
              </span>
            </div>
          )}
          {repeat && (
            <div className={styles.bandText}>
              <span className={styles.bandTitle}>Mentees keep coming back</span>
              <span className={styles.body}>
                On average each mentee books {perMentee.toFixed(1)} sessions with {m.firstName}.
              </span>
            </div>
          )}
        </div>
      )}
      <div className={styles.grid}>
        {stats.map((s, i) => (
          <StatTile key={s.label} {...s} className={cx(styles.cell, i % 2 === 1 && styles.right)} />
        ))}
      </div>
    </section>
  );
}
