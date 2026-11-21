import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import { Notice } from '@/components/molecules/Notice/Notice';
import { EMPTY_STATS, type MenteeStats } from '@/lib/api/data/menteeHome';
import type { Booking } from '@/types/booking';
import type { Remote } from '@/types/mentor';
import { MenteeEmptyCard } from './MenteeEmptyCard';
import { MentorsSkeleton } from './MenteeMentorsSection';
import { MenteeNextSession } from './MenteeNextSession';
import { returningKpis } from './menteeKpis';
import styles from './MenteeHomeScreen.module.css';

type MenteeReturningViewProps = {
  stats: Remote<MenteeStats>;
  upcoming: Remote<Booking[]>;
  nextBooking: Booking | null;
  /** No confirmed session, but a request awaiting the mentor. */
  hasPending: boolean;
  /** Free sessions left this month, for the idle line; null when not unlocked. */
  freeLeft: number | null;
  /** "View mentors" on the KPI, once there's someone to list. */
  onViewMentors: (() => void) | null;
  zone: string;
  now: Date;
  phone: boolean;
  /** The next session's "Send a message"; absent while Messages is off. */
  onMessageNext?: () => void;
  /**
   * Profile strength while the profile is short: after the next-session card
   * at every width (the design's default wide layout has no side column).
   */
  profileStrength?: ReactNode;
  /** Book again / Recommended. */
  children: ReactNode;
};

/**
 * The returning mentee's Home (Mentee Dashboard v2.dc.html): progress, the next
 * session (or the idle card), Profile strength while the profile is short,
 * then Mentors. Props only; the screen reads.
 */
export function MenteeReturningView(p: MenteeReturningViewProps) {
  const { stats, upcoming } = p;
  const size = p.phone ? 'large' : 'medium';
  return (
    <>
      {/* Progress: error checked before the figures (ui-states). */}
      {stats.error ? (
        <Notice tone="neutral" icon="error" title="We couldn’t load your progress.">
          <button type="button" className={styles.inlineAction} onClick={stats.retry}>
            Try again
          </button>
        </Notice>
      ) : (
        <section aria-label="Your progress" className={styles.kpis}>
          {stats.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
            : returningKpis(stats.data ?? EMPTY_STATS).map(({ key, link, ...k }) => (
                <KpiCard
                  key={key}
                  {...k}
                  link={
                    link ??
                    (key === 'mentors' && p.onViewMentors
                      ? { label: 'View mentors', onClick: p.onViewMentors }
                      : undefined)
                  }
                />
              ))}
        </section>
      )}

      {upcoming.isLoading ? (
        <NextSkeleton />
      ) : upcoming.error ? (
        <EmptyState
          illustration="forms"
          title="We couldn’t load your next session."
          description="Your bookings are safe. This is just the view."
          actions={
            <Button variant="secondary-outlined" size="large" onClick={upcoming.retry}>
              Try again
            </Button>
          }
        />
      ) : p.nextBooking ? (
        <MenteeNextSession
          key={p.nextBooking.id}
          booking={p.nextBooking}
          timeZone={p.zone}
          now={p.now}
          onMessage={p.onMessageNext}
        />
      ) : p.hasPending ? (
        <MenteeEmptyCard
          illustration="calendar-grey"
          title="Waiting on your mentor"
          body="You’ve sent a session request. We’ll let you know as soon as they respond."
          action={
            <ButtonLink
              href="/bookings?tab=pending"
              prefetch={false}
              variant="secondary-outlined"
              size={size}
              fullWidth={p.phone}
            >
              View your request
            </ButtonLink>
          }
        />
      ) : (
        <MenteeEmptyCard
          illustration="calendar"
          title="Nothing booked yet"
          body={
            p.freeLeft
              ? `Book a mentor you’ve met or someone new. ${p.freeLeft} free session${p.freeLeft === 1 ? '' : 's'} left this month.`
              : 'Book a mentor you’ve met or someone new.'
          }
          action={
            <ButtonLink
              href="/explore"
              prefetch={false}
              variant="primary"
              size={size}
              fullWidth={p.phone}
            >
              Book a session
            </ButtonLink>
          }
        />
      )}

      {p.profileStrength}
      {p.children}
    </>
  );
}

/**
 * The full Home while it loads (ui-states): the progress tiles, the next-session
 * card and Mentors, in the order and at about the size they render. The page
 * swaps all of it for the content at once, so nothing already drawn moves.
 */
export function ReturningSkeleton() {
  return (
    <>
      <div className={styles.kpis}>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <NextSkeleton />
      <MentorsSkeleton />
    </>
  );
}

/** One KPI tile, loading: KpiCard's label, figure and trend at their own heights. */
function KpiSkeleton() {
  return (
    <div className={styles.skelKpi}>
      <Skeleton width="55%" className={styles.skelXs} />
      <Skeleton width="40%" className={styles.skelFigure} />
      <Skeleton width="65%" className={styles.skelXs} />
    </div>
  );
}

/**
 * The Next-session card, loading, as MenteeNextSession lays it out: the
 * card's head, the date and details, the prep row, and the action (beside the
 * details wider up, under the prep row on phones).
 */
function NextSkeleton() {
  return (
    <div className={styles.skelNext}>
      <div className={styles.skelNextHead}>
        <Skeleton width="120px" className={styles.skelMd} />
        <Skeleton width="56px" className={styles.skelXs} />
      </div>
      <div className={styles.skelNextBody}>
        <div className={styles.skelNextRow}>
          <Skeleton width="52px" height="52px" radius="md" />
          <div className={styles.skelNextLines}>
            <Skeleton width="60%" className={styles.skelSm} />
            <Skeleton width="45%" className={styles.skelXs} />
            <Skeleton width="50%" className={styles.skelXs} />
          </div>
          <span className={styles.skelNextBeside}>
            <Skeleton width="140px" height="var(--button-h-medium)" radius="md" />
          </span>
        </div>
        <Skeleton height="52px" radius="lg" />
        <span className={styles.skelNextBelow}>
          <Skeleton height="44px" radius="md" />
        </span>
      </div>
    </div>
  );
}
