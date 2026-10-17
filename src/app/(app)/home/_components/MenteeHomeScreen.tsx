'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { KpiCard } from '@/components/molecules/KpiCard/KpiCard';
import { Notice } from '@/components/molecules/Notice/Notice';
import { BookingLauncher } from '@/app/_shell/BookingLauncher/BookingLauncher';
import { FloatingHelp } from '@/components/organisms/FloatingHelp/FloatingHelp';
import { useUpcomingBookings } from '@/lib/api/data/bookings';
import { EMPTY_STATS, useMenteeStats } from '@/lib/api/data/menteeHome';
import { toBookingMentor, useMetMentors, type MetMentor } from '@/lib/api/data/metMentors';
import { deviceTimeZone } from '@/lib/utils/format';
import { MATCH_CALL_URL, useAppShell } from '@/app/_shell/useAppShell';
import { MenteeEmptyCard } from './MenteeEmptyCard';
import { MenteeFirstSession } from './MenteeFirstSession';
import { MENTORS_SECTION_ID, MenteeMentorsSection } from './MenteeMentorsSection';
import { MenteeNextSession } from './MenteeNextSession';
import { greeting } from './greeting';
import { NEW_MENTEE_KPIS, returningKpis } from './menteeKpis';
import styles from './MenteeHomeScreen.module.css';

/**
 * The mentee's home (Mentee Dashboard v2.dc.html): greeting, progress, next
 * session. The app shell is mounted once by the (app) route-group layout
 * (ADR 0007), so this screen renders only its own content.
 */
export function MenteeHomeScreen() {
  const { viewer, member } = useAppShell();
  const router = useRouter();
  // deviceTimeZone is a lazy initializer; read it once (as the other screens do).
  const [browserZone] = useState(deviceTimeZone);

  // A minute tick so the next-session card's join state advances while the tab
  // stays open (as BookingsScreen does). Without it `now` is frozen at the
  // render that first showed the card, and "Join" never opens on its own.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(clock), [clock]);

  // Mentee-side = any member who isn't a mentor (mirrors isMenteeSide in
  // useAppShell — keep the two in step), goal or not: a no-goal member still sees
  // their progress and books; goal setup moves here once onboarding/Settings ships
  // (product, 2026-10-15).
  const menteeSide = !!member && !member.isMentor;
  const completed = member?.completedSessions ?? 0;
  const counts = member?.bookingCounts;
  // New = no activity at all, and we must be *sure* of it. An absent count, or a
  // count whose field is null, is "unknown" not "zero": both must fall back to
  // returning, so a real upcoming session is never hidden behind the "book your
  // first session" hero. `=== 0` (not `?? 0`) is what makes null/undefined miss —
  // the field type is `number | null`, nullable per field, not just as a whole.
  // Treated as returning, the session is fetched and the no-upcoming empty state
  // (not the hero) covers a genuinely new mentee.
  const isNew =
    menteeSide && completed === 0 && counts?.upcoming === 0 && counts?.pending === 0;

  const zone = member?.timeZone ?? browserZone;
  const stats = useMenteeStats(member?.id ?? null, menteeSide && !isNew);
  const upcoming = useUpcomingBookings(member?.id ?? null, zone, menteeSide && !isNew);
  const metMentors = useMetMentors(menteeSide && !isNew);
  const [bookTarget, setBookTarget] = useState<MetMentor | null>(null);
  const bookMentor = useMemo(() => (bookTarget ? toBookingMentor(bookTarget) : null), [bookTarget]);

  // A mentor or a signed-out visitor who lands on /home directly goes to their
  // own home instead (homeFor sends them there from /, this covers a typed URL).
  useEffect(() => {
    if (viewer.kind === 'loading') return;
    if (viewer.kind !== 'member') {
      router.replace('/explore');
      return;
    }
    // Mirror homeFor: only a mentor goes elsewhere (to the dashboard). Every
    // other member — goal or not — is mentee-side and stays on /home.
    if (viewer.isMentor) router.replace('/dashboard');
  }, [viewer, router]);

  // While /me loads, or a mentor is being redirected: a neutral skeleton.
  if (viewer.kind === 'loading' || !member || member.isMentor) {
    return (
      <div className={styles.page}>
        <HomeSkeleton />
      </div>
    );
  }

  // The sessions list can carry rows on either side; the backend asks us to pick
  // the mentee-side rows client-side, so the next session is the soonest of those.
  const nextBooking = upcoming.data?.find((b) => b.side === 'mentee') ?? null;

  // Monthly credits only for "N free sessions this month" — `credits.balance`
  // folds in non-expiring bonus credits, which aren't "this month".
  const monthly = member.credits?.monthly;
  // Free sessions left this month, for the idle card's line (design copy); null
  // when the grant isn't unlocked. The `freeLeft ?` guard below drops the line at
  // null or 0, so "0 free sessions left" never sits beside the Book CTA.
  const freeLeft = monthly?.unlocked ? monthly.balance : null;

  // The "Mentors met" KPI links down to the Book-again section on the same page.
  const scrollToMentors = () => {
    const el = document.getElementById(MENTORS_SECTION_ID);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  // "Talk to us" opens the external Cal booking page (same link as Explore's
  // "Find my mentor matches"). Hidden when unconfigured, and — per the design
  // (menteeSessions ≤ 2) — shown only to an early mentee: a brand-new one gets
  // the hero instead, and an experienced one (3+ sessions) doesn't need help
  // choosing a mentor.
  const showHelp = !!MATCH_CALL_URL && !isNew && completed <= 2;
  const openCall = () => {
    if (MATCH_CALL_URL) window.open(MATCH_CALL_URL, '_blank', 'noopener,noreferrer');
  };

  // State-dependent subline (Mentee Dashboard v2.dc.html: new / nothingNext /
  // default), read from the upcoming list — the SAME source the next-session
  // card below uses — so the subline and the card never disagree (a count and
  // the list can). Only once the list has loaded; while it loads the card shows
  // a skeleton and the subline stays the default.
  //
  // No confirmed session isn't always "nothing": a mentee may have a request
  // still awaiting the mentor (bookingCounts.pending). useUpcomingBookings
  // returns only confirmed rows, so without this that mentee would read as
  // "nothing booked" and be invited to book again — a duplicate. A null count
  // is unknown, not zero, so it stays "nothing" (we don't assert a request).
  const listSettled = !upcoming.isLoading && !upcoming.error;
  const noConfirmed = !isNew && listSettled && nextBooking === null;
  const hasPending = noConfirmed && (counts?.pending ?? 0) > 0;
  const noUpcoming = noConfirmed && !hasPending;
  const subline = isNew
    ? 'Let’s find the right mentor for your goal.'
    : hasPending
      ? 'Your request is with your mentor — we’ll let you know.'
      : noUpcoming
        ? 'No session booked right now. Pick up where you left off.'
        : 'Here’s what’s next on your journey.';

  return (
    // data-help reserves bottom room so the fixed help pill never overlaps the
    // last content at full scroll (it floats at the bottom-right; only needed
    // when the pill is shown).
    <div className={styles.page} data-help={showHelp ? '' : undefined}>
      <header className={styles.greeting}>
        <h1 className={styles.hello}>
          {greeting(member.firstName, member.createdAt, completed, now)}
        </h1>
        <p className={styles.subline}>{subline}</p>
      </header>

      {/* Progress — error checked before the figures (ui-states). */}
      {!isNew && stats.error ? (
        <Notice tone="neutral" icon="error" title="We couldn’t load your progress.">
          <button type="button" className={styles.inlineAction} onClick={stats.retry}>
            Try again
          </button>
        </Notice>
      ) : (
        <section aria-label="Your progress" className={styles.kpis}>
          {isNew
            ? NEW_MENTEE_KPIS.map(({ key, ...k }) => <KpiCard key={key} {...k} />)
            : stats.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
              : returningKpis(stats.data ?? EMPTY_STATS).map(({ key, ...k }) => (
                  <KpiCard
                    key={key}
                    {...k}
                    link={
                      key === 'mentors' && (metMentors.data?.length ?? 0) > 0
                        ? { label: 'View mentors', onClick: scrollToMentors }
                        : undefined
                    }
                  />
                ))}
        </section>
      )}

      {/* Next session — new mentee gets the invitation; otherwise the real card,
          its own loading / error / empty states. */}
      {isNew ? (
        <MenteeFirstSession credits={monthly?.unlocked ? monthly.balance : null} />
      ) : upcoming.isLoading ? (
        <NextSkeleton />
      ) : upcoming.error ? (
        <EmptyState
          illustration="forms"
          title="We couldn’t load your next session."
          description="Your bookings are safe — this is just the view."
          actions={
            <Button variant="secondary-outlined" size="large" onClick={upcoming.retry}>
              Try again
            </Button>
          }
        />
      ) : nextBooking ? (
        <MenteeNextSession key={nextBooking.id} booking={nextBooking} timeZone={zone} now={now} />
      ) : hasPending ? (
        <MenteeEmptyCard
          illustration="calendar-grey"
          title="Waiting on your mentor"
          body="You’ve sent a session request — we’ll let you know as soon as they respond."
          action={
            <ButtonLink
              href="/bookings?tab=pending"
              prefetch={false}
              variant="secondary-outlined"
              size="large"
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
            freeLeft
              ? `Book a mentor you’ve met or someone new. ${freeLeft} free session${freeLeft === 1 ? '' : 's'} left this month.`
              : 'Book a mentor you’ve met or someone new.'
          }
          action={
            <ButtonLink href="/explore" prefetch={false} variant="primary" size="large">
              Book a session
            </ButtonLink>
          }
        />
      )}

      {!isNew && (
        <MenteeMentorsSection mentors={metMentors} timeZone={zone} onBook={setBookTarget} />
      )}

      <FloatingHelp
        show={showHelp}
        title="Not sure which mentor to choose?"
        label="Talk to us"
        sheetLabel="Book a free call"
        body="Book a free 15-min call with our team and we’ll suggest mentors who fit. No credit used."
        external
        onAction={openCall}
      />
      {/* No hideProfileLink: Book-again only opens for an `open` (taking-bookings)
          mentor, who is approved + listed = public, so "View profile"
          (/mentors/{slug ?? id}) always resolves — as Explore does. */}
      <BookingLauncher
        mentor={bookMentor}
        ratingUnknown
        onClose={() => setBookTarget(null)}
      />
    </div>
  );
}

/** One KPI tile, loading. */
function KpiSkeleton() {
  return (
    <div className={styles.skelKpi}>
      <Skeleton width="55%" height="12px" />
      <Skeleton width="40%" height="28px" />
      <Skeleton width="65%" height="12px" />
    </div>
  );
}

/** The Next-session card, loading. */
function NextSkeleton() {
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

/** Greeting + progress + next session, all loading. */
function HomeSkeleton() {
  return (
    <>
      <div className={styles.greeting}>
        <Skeleton width="240px" height="24px" />
        <Skeleton width="180px" height="14px" />
      </div>
      <div className={styles.kpis}>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <NextSkeleton />
    </>
  );
}
