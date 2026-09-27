import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { StatTile } from '@/components/molecules/StatTile/StatTile';
import { cx } from '@/lib/utils/cx';
import { formatRating } from '@/lib/utils/format';
import type { MentorProfile } from '@/types/mentor';
import styles from './TrackRecordCard.module.css';

type TrackRecordCardProps = {
  profile: MentorProfile;
  /** The mentor is looking at their own page. */
  isOwner: boolean;
};

const n = new Intl.NumberFormat('en-US');

/**
 * Mentor Profile.dc.html track record: a rating tile and "Mentees keep coming
 * back" on blue, then plain-worded stats (BFM: give numbers context). No
 * sessions yet → the design's "first mentees" card instead.
 *
 * Not built: the "Top-rated" badge (no product rule yet, design #33). The
 * "keep coming back" line only appears when it is true — more than one
 * session per mentee on average.
 */
export function TrackRecordCard({ profile, isOwner }: TrackRecordCardProps) {
  const m = profile.mentor;

  if (m.completedSessions === 0) {
    return (
      <section className={cx(styles.card, styles.empty)} aria-labelledby="track-h">
        <div>
          <Badge type="accent" color="green" size="sm">
            New mentor
          </Badge>
        </div>
        <h2 id="track-h" className={styles.emptyTitle}>
          {isOwner ? 'Your track record starts here' : `Be one of ${m.firstName}’s first mentees`}
        </h2>
        <p className={styles.body}>
          {isOwner
            ? 'Sessions, mentees and attendance show up after your first booking. Sharing your profile is the fastest way to get it.'
            : 'New mentors often have more open slots and time to go deep with you.'}
        </p>
      </section>
    );
  }

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
    ...(profile.attendanceRate !== null
      ? [
          {
            icon: 'verified_user' as const,
            tone: 'neutral' as const,
            value: `${Math.round(profile.attendanceRate)}%`,
            label: 'avg. attendance',
          },
        ]
      : []),
  ];

  return (
    <section className={styles.card} aria-labelledby="track-h">
      <h2 id="track-h" className="sr-only">
        Track record
      </h2>
      {repeat && (
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
                  <Icon
                    key={i}
                    name="star"
                    size={10}
                    filled
                    className={i <= filled ? styles.starOn : styles.starOff}
                  />
                ))}
              </span>
            </div>
          )}
          <div className={styles.bandText}>
            <span className={styles.bandTitle}>Mentees keep coming back</span>
            <span className={styles.body}>
              On average each mentee books {perMentee.toFixed(1)} sessions with {m.firstName}.
            </span>
          </div>
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
