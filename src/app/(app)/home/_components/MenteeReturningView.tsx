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
  /** Book again / Recommended. */
  children: ReactNode;
};

/**
 * The returning mentee's Home (Mentee Dashboard v2.dc.html): progress, the next
 * session (or the idle card), then Mentors. Props only; the screen reads.
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

      {p.children}
    </>
  );
}

/** One KPI tile, loading. */
export function KpiSkeleton() {
  return (
    <div className={styles.skelKpi}>
      <Skeleton width="55%" height="12px" />
      <Skeleton width="40%" height="28px" />
      <Skeleton width="65%" height="12px" />
    </div>
  );
}

/** The Next-session card, loading. */
export function NextSkeleton() {
  return (
    <div className={styles.skelNext}>
      <Skeleton width="30%" height="16px" />
      <div className={styles.skelNextRow}>
        <Skeleton width="56px" height="56px" radius="md" />
        <div className={styles.skelNextLines}>
          <Skeleton width="60%" height="14px" />
          <Skeleton width="45%" height="12px" />
          <Skeleton width="50%" height="12px" />
        </div>
      </div>
      <Skeleton width="140px" height="40px" radius="md" />
    </div>
  );
}
