'use client';

import { StatusLinkRow } from '@/components/molecules/StatusLinkRow/StatusLinkRow';
import { usePendingBookings } from '@/lib/api/data/bookings';
import type { MentorStage } from '@/lib/api/data/dashboard';
import { useOpenTimesCount } from '@/lib/api/data/openTimes';
import { HERO_COPY, STATUS_COPY } from '@/lib/copy/dashboard';
import type { Booking } from '@/types/booking';
import type { AppError, Remote } from '@/types/mentor';
import type { MoveKey } from '@/lib/utils/weekMoves';
import { HeroRows, MentorHero } from './MentorHero';
import { NextSessionCard } from './NextSessionCard';
import { WeekMoves } from './WeekMoves';

type NewMentorHeroProps = {
  stage: Extract<MentorStage, 'firstBooked' | 'noBookings'>;
  mentorId: string;
  /** The account's zone: the approval date and the 14 days are the mentor's. */
  timeZone: string;
  profileHref: string;
  approvedAt: string | null;
  nextSession: Remote<Booking | null>;
  upcomingCount: number | null;
  now: Date;
  /** This week's moves already pressed. */
  movesDone: readonly MoveKey[];
  onMove: (move: MoveKey) => void;
  onCopyLink: () => void;
};

/** A row's value from its own query: loading, failed ("Couldn't load"), or the figure. */
function rowValue<T>(q: { data: T | null; error: AppError | null }, show: (v: T) => string) {
  if (q.error) return STATUS_COPY.failed;
  return q.data === null ? null : show(q.data);
}

/**
 * The new-mentor hero, in one of its two stages (PRD Mentor Home): "Get your
 * first booking" with the status rows, or "Your first session is booked" with
 * the booking card above them. Each status row has its own query and states,
 * so one failing never touches the others (or the page).
 */
export function NewMentorHero({
  stage,
  mentorId,
  timeZone,
  profileHref,
  approvedAt,
  nextSession,
  upcomingCount,
  now,
  movesDone,
  onMove,
  onCopyLink,
}: NewMentorHeroProps) {
  const firstBooked = stage === 'firstBooked';
  const copy = firstBooked ? HERO_COPY.firstBooked : HERO_COPY.noBookings;
  const openTimes = useOpenTimesCount(mentorId, timeZone);
  // Only the noBookings stage shows requests; firstBooked shows upcoming instead.
  const pending = usePendingBookings(mentorId, !firstBooked);
  // A dual-role account's own requests to other mentors aren't theirs to answer.
  const requests = pending.data ? pending.data.filter((b) => b.side === 'mentor').length : null;

  const listedValue = approvedAt
    ? STATUS_COPY.listedSince(
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(
          new Date(approvedAt),
        ),
      )
    : STATUS_COPY.listedNoDate;

  return (
    <MentorHero eyebrow={copy.eyebrow} title={copy.title} body={copy.body}>
      {firstBooked && (
        <NextSessionCard
          variant="hero"
          note={HERO_COPY.firstBookingNote}
          isLoading={nextSession.isLoading}
          error={nextSession.error}
          onRetry={nextSession.retry}
          booking={nextSession.data}
          timeZone={timeZone}
          now={now}
        />
      )}
      <HeroRows>
        <StatusLinkRow
          icon="travel_explore"
          label={STATUS_COPY.listed}
          value={listedValue}
          href={profileHref}
        />
        <StatusLinkRow
          icon="event_available"
          label={STATUS_COPY.openTimes}
          value={rowValue(openTimes, String)}
          href="/calendar"
        />
        {firstBooked ? (
          <StatusLinkRow
            icon="event"
            label={STATUS_COPY.upcoming}
            value={upcomingCount === null ? null : String(upcomingCount)}
            href="/bookings"
          />
        ) : (
          <StatusLinkRow
            icon="inbox"
            label={STATUS_COPY.requests}
            value={rowValue({ data: requests, error: pending.error }, (n) =>
              n > 0 ? String(n) : STATUS_COPY.requestsNone,
            )}
            href="/bookings?tab=pending"
          />
        )}
      </HeroRows>
      {/* firstBooked keeps only the Hours move, with no counter (design). */}
      <WeekMoves
        moves={firstBooked ? ['hours'] : ['share', 'about', 'hours']}
        done={movesDone}
        showCounter={!firstBooked}
        profileHref={profileHref}
        onMark={onMove}
        onCopyLink={onCopyLink}
      />
    </MentorHero>
  );
}
