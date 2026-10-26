'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { FloatingHelp } from '@/components/organisms/FloatingHelp/FloatingHelp';
import { InviteModal } from '@/components/templates/InviteModal/InviteModal';
import { BookingLauncher } from '@/app/_shell/BookingLauncher/BookingLauncher';
import { bookBlockedFor } from '@/app/_shell/bookBlocked';
import { MATCH_CALL_URL, useAppShell } from '@/app/_shell/useAppShell';
import { EducationEditor } from '@/app/_profile/EducationEditor';
import { useUpcomingBookings } from '@/lib/api/data/bookings';
import { useDegreeLevels } from '@/lib/api/data/catalog';
import { useMenteeGoals } from '@/lib/api/data/goals';
import { useInviteLink, useReferrals } from '@/lib/api/data/invite';
import { useMenteeStats } from '@/lib/api/data/menteeHome';
import { useMentorMatches } from '@/lib/api/data/mentorMatches';
import { useTopics } from '@/lib/api/data/mentors';
import { toBookingMentor, useMetMentors, type MetMentor } from '@/lib/api/data/metMentors';
import { ProfileSaveError, useSaveMenteeProfile } from '@/lib/api/data/settings';
import { GETTING_STARTED, MENTORS_FOR_GOAL, NEW_SUBLINE, PROFILE_SHEET } from '@/lib/copy/home';
import { useDeviceFlag } from '@/lib/utils/deviceFlag';
import { deviceTimeZone } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import type { Mentor } from '@/types/mentor';
import { MenteeMentorsSection, RECOMMENDED_ID, SHOWN } from './MenteeMentorsSection';
import { MenteeNewView } from './MenteeNewView';
import { MenteeReturningView, KpiSkeleton, NextSkeleton } from './MenteeReturningView';
import { MenteeNextSession, startsSoon } from './MenteeNextSession';
import { MetMentorsModal } from './MetMentorsModal';
import { ProfileSheet } from './ProfileSheet';
import { stageFor, stepsDone, targetText } from './newMentee';
import { goalLineFrom, recommendedFrom } from './recommended';
import { useNewMentee } from './useNewMentee';
import styles from './MenteeHomeScreen.module.css';

/** The backend's most matches per request (`/me/mentor-matches` limit). */
const MATCHES_MAX = 10;
/** Getting started leaves this long after its last step is done (design gsDone). */
const FINISH_MS = 1500;
/** How long "Getting started hidden" offers Undo (design gsToast). */
const UNDO_MS = 5000;

/**
 * The mentee's Home (Mentee Dashboard v2.dc.html). A new mentee, up to their
 * first completed session, gets the next step, Getting started and Mentors
 * for their goal until Getting started is done or hidden; everyone else gets
 * progress, the next session and Mentors. The app shell is mounted once by the
 * (app) route-group layout (ADR 0007), so this renders only its own content.
 */
export function MenteeHomeScreen() {
  const { viewer, member } = useAppShell();
  const router = useRouter();
  // deviceTimeZone is a lazy initializer; read it once (as the other screens do).
  const [browserZone] = useState(deviceTimeZone);
  const phone = useMediaQuery('(max-width: 767px)');

  // A minute tick so the next-session card's join state advances while the tab
  // stays open (as BookingsScreen does).
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(clock), [clock]);

  // Mentee-side = any member who isn't a mentor (mirrors isMenteeSide in useAppShell).
  const menteeSide = !!member && !member.isMentor;
  const userId = member?.id ?? null;
  const completed = member?.completedSessions ?? 0;
  const counts = member?.bookingCounts;
  // The new view is for a mentee up to their first completed session, and only
  // when /me's counts are known: an unknown count reads as returning, so a real
  // session is never hidden behind it.
  const early = menteeSide && completed <= 1 && counts?.upcoming != null && counts?.pending != null;
  const [hidden, setHidden] = useDeviceFlag('home-getting-started-hidden', userId);
  // Done sticks: once the view has given way, a step going back (a cancelled
  // first booking, another device) doesn't bring it back.
  const [doneFlag, setDoneFlag] = useDeviceFlag('home-getting-started-done', userId);
  const [invited, setInvited] = useDeviceFlag('home-invite-shared', userId);
  const candidate = early && !hidden && !doneFlag;

  const zone = member?.timeZone ?? browserZone;
  const stats = useMenteeStats(userId, menteeSide);
  const upcoming = useUpcomingBookings(userId, zone, menteeSide);
  const metMentors = useMetMentors(menteeSide);
  const topics = useTopics();
  const levels = useDegreeLevels(menteeSide);
  const goals = useMenteeGoals(menteeSide ? userId : null);
  const matches = useMentorMatches(userId, topics.topics, levels.levels, {
    // Asked once the met list is in, for enough that 3 remain after the met
    // ones drop out (up to the backend's 10).
    enabled: menteeSide && !!metMentors.data,
    limit: Math.min(MATCHES_MAX, SHOWN + (metMentors.data?.length ?? 0)),
  });
  const fresh = useNewMentee({
    userId,
    active: candidate,
    hasCompleted: completed >= 1,
    goals,
    topics: topics.topics,
    upcoming,
  });
  const online = useOnline();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Education opens over nothing; closing it brings the profile sheet back.
  const [eduOpen, setEduOpen] = useState(false);
  const [metOpen, setMetOpen] = useState(false);
  const [toast, setToast] = useState(0);
  const [booking, setBooking] = useState<{ mentor: Mentor; ratingUnknown: boolean } | null>(null);
  const saveProfile = useSaveMenteeProfile(userId);

  const friendJoinedRead = useReferrals(userId, candidate || inviteOpen);
  const state = {
    profileDone: fresh.profileDone,
    booked: fresh.booked,
    firstDone: fresh.firstDone,
    invited,
    friendJoined: friendJoinedRead.friendJoined,
    unlocked: !!member?.credits?.monthly?.unlocked,
  };
  const steps = stepsDone(state);
  const { stage } = stageFor(state);
  const inviteStage = stage === 'booked' || stage === 'firstDone';
  const link = useInviteLink(userId, inviteOpen || (candidate && !fresh.loading && inviteStage));

  // All three steps done: the view stays 1.5s, then gives way to the returning
  // Home. Done before it was ever shown (an old account), it never shows.
  const [shownOpen, setShownOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const ready = candidate && !fresh.loading && !fresh.error;
  // Set while rendering (React's derived-state pattern): no extra pass through an effect.
  if (ready && !steps.all && !shownOpen) setShownOpen(true);
  // Never under an open dialog: the view (and what focus returns to) stays
  // until it's closed.
  const dialogOpen = inviteOpen || profileOpen || eduOpen;
  const viewRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!steps.all || !shownOpen || dialogOpen) return;
    const t = setTimeout(() => {
      // Focus in the cards would be dropped with them: it moves to the title.
      if (viewRef.current?.contains(document.activeElement)) titleRef.current?.focus();
      setFinished(true);
      setDoneFlag(true);
    }, FINISH_MS);
    return () => clearTimeout(t);
  }, [steps.all, shownOpen, dialogOpen, setDoneFlag]);
  const newView = candidate && !fresh.error && !(steps.all && (!shownOpen || finished));

  // Hide: the list goes, and Undo is offered for 5 seconds; never timed out
  // from under focus (it waits while Undo has it). Undo brings focus back to Hide.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideRef = useRef<HTMLButtonElement>(null);
  // Set by Undo; the effect below moves focus once Hide is back.
  const undone = useRef(false);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const dismissToast = () => {
    if (document.activeElement?.closest('[role="status"]')) {
      toastTimer.current = setTimeout(dismissToast, UNDO_MS);
      return;
    }
    setToast(0);
  };
  const hide = () => {
    setHidden(true);
    setToast((n) => n + 1);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(dismissToast, UNDO_MS);
  };
  const undo = () => {
    clearTimeout(toastTimer.current);
    setToast(0);
    setHidden(false);
    undone.current = true;
  };
  useEffect(() => {
    if (!undone.current || hidden || !newView) return;
    undone.current = false;
    hideRef.current?.focus();
  }, [hidden, newView]);
  // "Choose your mentor" from the sheet: the scroll waits for the sheet to
  // close (its scroll lock, and the focus it returns), then focus follows.
  const [recRequest, setRecRequest] = useState(0);
  const scrollPending = useRef(false);
  useEffect(() => {
    if (!scrollPending.current || profileOpen) return;
    scrollPending.current = false;
    const el = document.getElementById(RECOMMENDED_ID);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    el?.focus({ preventScroll: true });
  }, [recRequest, profileOpen]);

  // A mentor or a signed-out visitor who lands on /home directly goes to their
  // own home instead (homeFor sends them there from /, this covers a typed URL).
  useEffect(() => {
    if (viewer.kind === 'loading') return;
    if (viewer.kind !== 'member') {
      router.replace('/explore');
      return;
    }
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

  const bookMet = (m: MetMentor) => setBooking({ mentor: toBookingMentor(m), ratingUnknown: true });
  const bookMatched = (m: Mentor) => setBooking({ mentor: m, ratingUnknown: false });
  const nextBooking = upcoming.data?.find((b) => b.side === 'mentee') ?? null;
  const monthly = member.credits?.monthly;
  const freeLeft = monthly?.unlocked ? monthly.balance : null;
  const metShown = metOpen && (metMentors.data?.length ?? 0) > 0;
  const metIds = new Set((metMentors.data ?? []).map((m) => m.id));
  const goalNeeds = goals.read?.goal?.needs.map((n) => n.id) ?? [];
  const firstDone = !!fresh.firstDone;

  // The team call: new mentees, and returning ones with 2 or fewer sessions
  // (design matchCall float, menteeSessions ≤ 2). Hidden when the URL isn't
  // set, and while Mentors you've met is open (design helpOn: !mentorsOpen).
  const showHelp = !!MATCH_CALL_URL && (newView || completed <= 2) && !metShown;
  const openCall = () => {
    if (MATCH_CALL_URL) window.open(MATCH_CALL_URL, '_blank', 'noopener,noreferrer');
  };

  // Returning sublines read the upcoming list, the same source as the card, so
  // the two never disagree. A pending request isn't "nothing booked".
  const listSettled = !upcoming.isLoading && !upcoming.error;
  const noConfirmed = listSettled && nextBooking === null;
  const hasPending = noConfirmed && (counts?.pending ?? 0) > 0;
  const soon = listSettled && !!nextBooking && startsSoon(nextBooking, now, zone);
  const subline = newView
    ? stage === 'incomplete'
      ? NEW_SUBLINE.incomplete
      : stage === 'ready'
        ? NEW_SUBLINE.ready
        : stage === 'booked'
          ? fresh.booked?.confirmed
            ? NEW_SUBLINE.booked
            : NEW_SUBLINE.requested
          : NEW_SUBLINE.firstDone
    : noConfirmed && !hasPending
      ? 'No session booked right now. Pick up where you left off.'
      : soon
        ? 'Your session starts soon.'
        : 'Here’s what’s next on your journey.';
  // "Welcome" in the new view until the first completed session, then "Welcome back".
  const hello = `${newView && !firstDone ? 'Welcome' : 'Welcome back'}, ${member.firstName}`;
  // Invite a friend: the returning view, and the new view once the first session is done.
  const headerInvite = !newView || firstDone;

  const chooseMentor = () => {
    setProfileOpen(false);
    scrollPending.current = true;
    setRecRequest((n) => n + 1);
  };
  const saveBio = async (bio: string, drafted: boolean): Promise<string | null> => {
    const p = fresh.menteeProfile;
    if (!p) return PROFILE_SHEET.saveFailed;
    const values = { name: p.name, countryId: p.countryId, languages: p.languages };
    try {
      await saveProfile.mutateAsync({
        before: { ...values, bio: p.bio, bioDrafted: p.bioDrafted },
        after: { ...values, bio, bioDrafted: drafted },
        promptVersion: null,
      });
      return null;
    } catch (e) {
      // Settings' own words for it (offline or failed).
      return e instanceof ProfileSaveError ? e.copy : PROFILE_SHEET.saveFailed;
    }
  };
  const educationId = (() => {
    const entries = fresh.education;
    return (entries.find((e) => e.values.current) ?? entries[0])?.id ?? null;
  })();

  const mentors = (
    <MenteeMentorsSection
      mentors={metMentors}
      recommended={{
        items: recommendedFrom(matches.data?.matches ?? [], metIds, topics.topics),
        // Loading until matches arrive; they're only asked for once the met list is in.
        isLoading: topics.isLoading || metMentors.isLoading || (!matches.data && !matches.error),
        // A failed refetch keeps the matches it had. Without the met list, met
        // mentors would leak in: hidden.
        failed: (!!matches.error && !matches.data) || !!metMentors.error,
      }}
      goalLine={goalLineFrom(goalNeeds, topics.topics)}
      recTitle={newView ? MENTORS_FOR_GOAL : undefined}
      timeZone={zone}
      compact={phone}
      offline={!online}
      bookBlocked={bookBlockedFor(viewer)}
      onBook={bookMet}
      onBookMentor={bookMatched}
      onSeeAll={() => setMetOpen(true)}
      showRecommended={recRequest}
    />
  );
  // While the new view reads, nothing says which view it is: no greeting
  // that could flip, no header invite.
  const settling = candidate && fresh.loading;

  return (
    // data-help reserves bottom room so the fixed help pill never overlaps the
    // last content at full scroll.
    <div className={styles.page} data-help={showHelp ? '' : undefined}>
      <header className={styles.header}>
        {settling ? (
          <div className={styles.greeting}>
            <Skeleton width="240px" height="24px" />
            <Skeleton width="180px" height="14px" />
          </div>
        ) : (
          <div className={styles.greeting}>
            <h1 ref={titleRef} tabIndex={-1} className={styles.hello}>
              {hello}
            </h1>
            <p className={styles.subline}>{subline}</p>
          </div>
        )}
        {headerInvite && !settling && (
          <Button variant="secondary-outlined" size="medium" onClick={() => setInviteOpen(true)}>
            Invite a friend
          </Button>
        )}
      </header>

      {settling ? (
        <NewSkeleton />
      ) : candidate && fresh.error ? (
        <Notice tone="neutral" icon="error" title="We couldn’t load your next steps.">
          <button type="button" className={styles.inlineAction} onClick={fresh.retry}>
            Try again
          </button>
        </Notice>
      ) : newView ? (
        <div ref={viewRef} className={styles.newView}>
          {/* A confirmed first session is joined from here too (ours: the
              design's new view has no Next session card). */}
          {nextBooking && (
            <MenteeNextSession
              key={nextBooking.id}
              booking={nextBooking}
              timeZone={zone}
              now={now}
            />
          )}
          <MenteeNewView
            {...state}
            fields={fresh.fields}
            freeSessions={member.credits?.balance ?? null}
            goal={targetText(fresh.goalParts)}
            timeZone={zone}
            phone={phone}
            invite={{
              url: link.data?.url ?? null,
              urlLoading: link.isLoading,
              urlError: !!link.error,
              onRetry: link.retry,
              linkActive: link.data?.active ?? true,
              onShared: () => setInvited(true),
            }}
            onOpenProfile={() => setProfileOpen(true)}
            onOpenInvite={() => setInviteOpen(true)}
            onChooseMentor={chooseMentor}
            onHide={fresh.booked || firstDone ? hide : null}
            hideRef={hideRef}
          >
            {mentors}
          </MenteeNewView>
        </div>
      ) : (
        <MenteeReturningView
          stats={stats}
          upcoming={upcoming}
          nextBooking={nextBooking}
          hasPending={hasPending}
          freeLeft={freeLeft}
          onViewMentors={(metMentors.data?.length ?? 0) > 0 ? () => setMetOpen(true) : null}
          zone={zone}
          now={now}
          phone={phone}
        >
          {mentors}
        </MenteeReturningView>
      )}

      {metShown && (
        <MetMentorsModal
          mentors={metMentors.data ?? []}
          timeZone={zone}
          onBook={(m) => {
            // Close the list first, so the booking flow isn't stacked on it.
            setMetOpen(false);
            bookMet(m);
          }}
          onClose={() => setMetOpen(false)}
        />
      )}
      {inviteOpen && (
        <InviteModal
          url={link.data?.url ?? null}
          urlLoading={link.isLoading}
          urlError={!!link.error}
          onRetry={link.retry}
          linkActive={link.data?.active ?? true}
          friendJoined={friendJoinedRead.friendJoined}
          // The unlock counts attended sessions (owner, 25 Oct); completed
          // stands in until the backend sends that count.
          attended={(stats.data?.sessionsAttended ?? stats.data?.sessionsHeld ?? completed) >= 1}
          unlocked={!!monthly?.unlocked}
          onShared={() => setInvited(true)}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {profileOpen && (
        <ProfileSheet
          fields={fresh.fields}
          onEducation={() => {
            setProfileOpen(false);
            setEduOpen(true);
          }}
          onSaveBio={saveBio}
          bioSaving={saveProfile.isPending}
          onChoose={chooseMentor}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {eduOpen && userId && (
        <EducationEditor
          userId={userId}
          id={educationId}
          audience="mentee"
          onClose={() => {
            setEduOpen(false);
            setProfileOpen(true);
          }}
          onSaved={() => {
            setEduOpen(false);
            setProfileOpen(true);
          }}
        />
      )}
      <Snackbar
        message={toast ? GETTING_STARTED.hidden : null}
        stamp={toast}
        action={toast ? { label: GETTING_STARTED.undo, onClick: undo, focus: true } : undefined}
      />

      <FloatingHelp
        show={showHelp}
        title="Not sure where to start?"
        label="Book a free call"
        sheetLabel="Book a free call"
        body="Book a free 1-on-1 call with someone from the EduFurther team. We’ll help you plan your next steps and suggest mentors to start with."
        external
        onAction={openCall}
      />
      {/* No hideProfileLink: both callers book public mentors. Book again opens
          only for an `open` (taking-bookings, so approved and listed) mentor, and
          matches come from the public listing, so "View profile"
          (/mentors/{slug ?? id}) always resolves, as on Explore. */}
      <BookingLauncher
        mentor={booking?.mentor ?? null}
        ratingUnknown={booking?.ratingUnknown ?? false}
        onClose={() => setBooking(null)}
      />
    </div>
  );
}

/** The new view, loading: the two cards' frames. */
function NewSkeleton() {
  return (
    <div className={styles.skelNew}>
      <Skeleton height="320px" radius="xl" />
      <Skeleton height="320px" radius="xl" />
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
