'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { Snackbar, toastHasFocus } from '@/components/molecules/Snackbar/Snackbar';
import { FloatingHelp } from '@/components/organisms/FloatingHelp/FloatingHelp';
import { BookingLauncher } from '@/app/_shell/BookingLauncher/BookingLauncher';
import { SendMessageLauncher } from '@/app/_shell/SendMessageLauncher';
import { bookBlockedFor } from '@/app/_shell/bookBlocked';
import { MATCH_CALL_URL, useAppShell } from '@/app/_shell/useAppShell';
import { useUpcomingBookings } from '@/lib/api/data/bookings';
import { useDegreeLevels } from '@/lib/api/data/catalog';
import { useMenteeGoals } from '@/lib/api/data/goals';
import { useInviteLink, useReferrals } from '@/lib/api/data/invite';
import { useMenteeStats } from '@/lib/api/data/menteeHome';
import { useMentorMatches } from '@/lib/api/data/mentorMatches';
import { useTopics } from '@/lib/api/data/mentors';
import { toBookingMentor, useMetMentors, type MetMentor } from '@/lib/api/data/metMentors';
import { ProfileSaveError, useSaveMenteeProfile } from '@/lib/api/data/settings';
import { MESSAGES_LIVE } from '@/lib/config/messages';
import {
  COMPLETE_FOR_CREDIT,
  GETTING_STARTED,
  MENTORS_FOR_GOAL,
  NEW_SUBLINE,
  PROFILE_SHEET,
  PROFILE_TIPS,
} from '@/lib/copy/home';
import { bookingRecipient, recipientFromMetMentor } from '@/lib/utils/messageRecipient';
import { useDeviceFlag } from '@/lib/utils/deviceFlag';
import { viewerZone } from '@/lib/utils/format';
import { FIRST_PAINT_ZONE, useDeviceTimeZone } from '@/lib/utils/useDeviceTimeZone';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import type { Mentor } from '@/types/mentor';
import type { MessageRecipient } from '@/types/messages';
import { MENTORS_ID, MenteeMentorsSection, RECOMMENDED_ID, SHOWN } from './MenteeMentorsSection';
import { MenteeNewView } from './MenteeNewView';
import { MenteeReturningView, ReturningSkeleton } from './MenteeReturningView';
import { MenteeNextSession, startsSoon } from './MenteeNextSession';
import { stageFor, stepsDone, targetText, type ProfileKey } from './newMentee';
import { MenteeProfileStrength, focusAfterTip } from './MenteeProfileStrength';
import { goalLineFrom, recommendedFrom } from './recommended';
import { useNewMentee } from './useNewMentee';
import { completeForCredit, sheetRowFor } from './completeForCredit';
import { profileLinkSource } from '@/lib/analytics/profileSource';
import styles from './MenteeHomeScreen.module.css';
import { scrollBehavior } from '@/lib/utils/scrollBehavior';
import { replaceQuery } from '@/lib/utils/replaceQuery';

// Each opens from a button (or ?invite=open), never at first paint: they load
// on open (performance budget, 350kB first-load JS) and mount whole, so their
// focus handling is unchanged.
const InviteModal = lazyPart(
  () => import('@/components/templates/InviteModal/InviteModal').then((m) => m.InviteModal),
  { close: (p) => p.onClose() },
);
const EducationEditor = lazyPart(
  () => import('@/app/_profile/EducationEditor').then((m) => m.EducationEditor),
  { close: (p) => p.onClose() },
);
const MetMentorsModal = lazyPart(() => import('./MetMentorsModal').then((m) => m.MetMentorsModal), {
  close: (p) => p.onClose(),
});
const ProfileSheet = lazyPart(() => import('./ProfileSheet').then((m) => m.ProfileSheet), {
  close: (p) => p.onClose(),
});

/** Getting started leaves this long after its last step is done (design gsDone). */
const FINISH_MS = 1500;
/** How long "Getting started hidden" offers Undo (design gsToast). */
const UNDO_MS = 5000;

/**
 * The mentee's Home (Mentee Dashboard v2.dc.html). A new mentee, before their
 * first completed session, gets the next step, Getting started and Mentors
 * for their goal until Getting started is done or hidden; everyone else gets
 * the full Home: progress, the next session, Profile strength while the
 * profile is short, and Mentors. The app shell is mounted once by the (app)
 * route-group layout (ADR 0007), so this renders only its own content.
 */
export function MenteeHomeScreen() {
  const { viewer, member } = useAppShell();
  const router = useRouter();
  const browserZone = useDeviceTimeZone() ?? FIRST_PAINT_ZONE;
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
  // The new view is for a mentee before their first completed session (owner,
  // 21 Nov 2026: after one, the full Home, as a mentor gets), and only when
  // /me's counts are known: an unknown count reads as returning, so a real
  // session is never hidden behind it.
  const early =
    menteeSide && completed === 0 && counts?.upcoming != null && counts?.pending != null;
  const [hidden, setHidden] = useDeviceFlag('home-getting-started-hidden', userId);
  // Done sticks: once the view has given way, a step going back (a cancelled
  // first booking, another device) doesn't bring it back.
  const [doneFlag, setDoneFlag] = useDeviceFlag('home-getting-started-done', userId);
  const [invited, setInvited] = useDeviceFlag('home-invite-shared', userId);
  const candidate = early && !hidden && !doneFlag;

  const zone = viewerZone(member?.timeZone, browserZone);
  const stats = useMenteeStats(userId, menteeSide);
  const upcoming = useUpcomingBookings(userId, zone, menteeSide);
  const metMentors = useMetMentors(menteeSide);
  const topics = useTopics();
  const levels = useDegreeLevels(menteeSide);
  const goals = useMenteeGoals(menteeSide ? userId : null);
  // Recommended: 3 the mentee hasn't met; the backend leaves met mentors out.
  const matches = useMentorMatches(userId, topics.topics, levels.levels, {
    enabled: menteeSide,
    limit: SHOWN,
    excludeMet: true,
  });
  const fresh = useNewMentee({
    userId,
    active: candidate,
    // The full Home's Profile strength card reads the same four details.
    readProfile: menteeSide,
    goals,
    topics: topics.topics,
    upcoming,
  });
  const online = useOnline();

  const [inviteOpen, setInviteOpen] = useState(false);
  // `/home?invite=open`: a mentee who opened their own invite link (PRD Invite
  // Landing) lands here to share it. InviteModal opens once per arrival, and
  // the parameter is dropped so a reload or Back doesn't open it again.
  const params = useSearchParams();
  const inviteAsked = menteeSide && params.get('invite') === 'open';
  const [inviteTaken, setInviteTaken] = useState(false);
  if (inviteAsked && !inviteTaken) {
    setInviteTaken(true);
    setInviteOpen(true);
  }
  useEffect(() => {
    if (!inviteAsked) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete('invite');
    const q = rest.toString();
    replaceQuery(q ? `/home?${q}` : '/home');
  }, [inviteAsked, params]);
  const [profileOpen, setProfileOpen] = useState(false);
  // Education opens over nothing; closing it brings the profile sheet back.
  const [eduOpen, setEduOpen] = useState(false);
  // Opened from a Profile strength tip: closing it doesn't bring the sheet back.
  const [eduFromTip, setEduFromTip] = useState(false);
  // The sheet opened from the "Add a short bio" tip starts in the bio editor.
  const [bioFromTip, setBioFromTip] = useState(false);
  // A tip whose step is now done goes, and with it the focus its dialog hands
  // back: the next tip, else the title, takes it (as Mentor Profile does).
  const [tipUsed, setTipUsed] = useState<ProfileKey | null>(null);
  const [refocus, setRefocus] = useState(0);
  const [metOpen, setMetOpen] = useState(false);
  const [toast, setToast] = useState(0);
  const [booking, setBooking] = useState<{ mentor: Mentor; ratingUnknown: boolean } | null>(null);
  // SendMessage's recipient while it is open (PRD Messages, Message buttons).
  const [messaging, setMessaging] = useState<MessageRecipient | null>(null);
  const saveProfile = useSaveMenteeProfile(userId);

  const friendJoinedRead = useReferrals(userId, candidate || inviteOpen);
  // Finishing the answers pays a credit (decision 358): /me says so, and the
  // save that completes them refetches /me, so this goes without a reload.
  const forCredit = completeForCredit(member);
  const state = {
    forCredit,
    profileDone: fresh.profileDone,
    booked: fresh.booked,
    invited,
    friendJoined: friendJoinedRead.friendJoined,
    unlocked: !!member?.credits?.monthly?.unlocked,
  };
  const steps = stepsDone(state);
  const { stage } = stageFor(state);
  const inviteStage = stage === 'booked';
  // Asked for as soon as the stage is known to be `booked`, not after every
  // read settles: copying and sharing wait on it. A read still out can't put
  // a mentee in `booked` wrongly: it needs a booking already on screen, and
  // the details still loading only ever read as not done (stageFor).
  const link = useInviteLink(userId, inviteOpen || (candidate && inviteStage));

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

  // Adjusted during render (React's pattern for state that follows data): once
  // the refetched details no longer miss the tip's field, it's done.
  if (tipUsed && fresh.fields.find((f) => f.key === tipUsed)?.value) {
    setTipUsed(null);
    setRefocus((n) => n + 1);
  }
  useEffect(() => {
    if (refocus && !profileOpen && !eduOpen) focusAfterTip(titleRef.current);
  }, [refocus, profileOpen, eduOpen]);
  // Closed with the step not done: back to its tip. The editor took focus as it
  // opened, so the dialog's own return lands on <body> (after its rAF retry).
  useEffect(() => {
    if (!tipUsed || profileOpen || eduOpen) return;
    const raf = requestAnimationFrame(() => focusAfterTip(titleRef.current, PROFILE_TIPS[tipUsed]));
    return () => cancelAnimationFrame(raf);
  }, [tipUsed, profileOpen, eduOpen]);

  // Hide: the list goes, and Undo is offered for 5 seconds; never timed out
  // from under focus (it waits while Undo has it). Undo brings focus back to Hide.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideRef = useRef<HTMLButtonElement>(null);
  // Set by Undo; the effect below moves focus once Hide is back.
  const undone = useRef(false);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const dismissToast = () => {
    if (toastHasFocus()) {
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
    // Recommended when it's there; else the Mentors block (Book again alone).
    const el = document.getElementById(RECOMMENDED_ID) ?? document.getElementById(MENTORS_ID);
    el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
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
  // Off, no Message button is drawn (design messageBtn hide).
  const nextTo = MESSAGES_LIVE && nextBooking ? bookingRecipient(nextBooking) : null;
  const messageNext = nextTo ? () => setMessaging(nextTo) : undefined;
  const messageMet = MESSAGES_LIVE
    ? (m: MetMentor) => setMessaging(recipientFromMetMentor(m))
    : undefined;
  const monthly = member.credits?.monthly;
  const freeLeft = monthly?.unlocked ? monthly.balance : null;
  const metShown = metOpen && (metMentors.data?.length ?? 0) > 0;
  const goalNeeds = goals.read?.goal?.needs.map((n) => n.id) ?? [];

  // The team call ("Not sure where to start?"): only before the first completed
  // session (owner, 21 Nov 2026: it reads wrong after one; the design showed it
  // up to 2 sessions, matchCall menteeSessions <= 2). Hidden when the URL isn't
  // set, and while Mentors you've met is open (design helpOn: !mentorsOpen).
  const showHelp = !!MATCH_CALL_URL && completed === 0 && !metShown;
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
        : fresh.booked?.confirmed
          ? NEW_SUBLINE.booked
          : NEW_SUBLINE.requested
    : noConfirmed && !hasPending
      ? 'No session booked right now. Pick up where you left off.'
      : soon
        ? 'Your session starts soon.'
        : 'Here’s what’s next on your journey.';
  // "Welcome" in the new view (before the first completed session), then "Welcome back".
  const hello = `${newView ? 'Welcome' : 'Welcome back'}, ${member.firstName}`;
  // Invite a friend in the header: the full Home (the new view has its own invite step).
  const headerInvite = !newView;

  const chooseMentor = () => {
    setProfileOpen(false);
    scrollPending.current = true;
    setRecRequest((n) => n + 1);
  };
  const saveBio = async (bio: string, drafted: boolean): Promise<string | null> => {
    const p = fresh.menteeProfile;
    if (!p) return PROFILE_SHEET.saveFailed;
    const values = { name: p.name, originId: p.originId, languages: p.languages };
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
        items: recommendedFrom(matches.data?.matches ?? [], topics.topics),
        isLoading: topics.isLoading || (!matches.data && !matches.error),
        // A failed refetch keeps the matches it had.
        failed: !!matches.error && !matches.data,
      }}
      goalLine={goalLineFrom(goalNeeds, topics.topics)}
      recTitle={newView ? MENTORS_FOR_GOAL : undefined}
      timeZone={zone}
      compact={phone}
      offline={!online}
      bookBlocked={bookBlockedFor(viewer)}
      onBook={bookMet}
      onMessage={messageMet}
      onBookMentor={bookMatched}
      onSeeAll={() => setMetOpen(true)}
      showRecommended={recRequest}
    />
  );
  // While the new view reads, nothing says which view it is: no greeting
  // that could flip, no header invite.
  const settling = candidate && fresh.loading;
  // The full Home is drawn at once, when the reads it lays out by have settled
  // (loaded or failed): the subline, the tiles' links, the next session and
  // Profile strength each change the page's height as they land, and drawn one
  // by one they pushed what was already on screen around (CLS). Until then its
  // skeleton holds the same order; Recommended still loads in its own frame.
  const fullLoading =
    !settling &&
    !newView &&
    !(candidate && fresh.error) &&
    (stats.isLoading ||
      upcoming.isLoading ||
      metMentors.isLoading ||
      fresh.detailsStatus === 'loading');
  const loading = settling || fullLoading;

  return (
    // data-help reserves bottom room so the fixed help pill never overlaps the
    // last content at full scroll.
    <div
      className={styles.page}
      data-help={showHelp ? '' : undefined}
      // A profile opened from Home: suggestions, featured, My mentors (PRD 30).
      onClickCapture={profileLinkSource('home')}
    >
      <header className={styles.header}>
        {loading ? (
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
        {headerInvite && !loading && (
          <Button variant="secondary-outlined" size="medium" onClick={() => setInviteOpen(true)}>
            Invite a friend
          </Button>
        )}
      </header>

      {settling ? (
        <NewSkeleton />
      ) : fullLoading ? (
        <ReturningSkeleton />
      ) : candidate && fresh.error ? (
        <Notice tone="neutral" icon="error" title="We couldn’t load your next steps.">
          <button type="button" className={styles.inlineAction} onClick={fresh.retry}>
            Try again
          </button>
        </Notice>
      ) : newView ? (
        <div ref={viewRef} className={styles.newView}>
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
            onHide={fresh.booked ? hide : null}
            hideRef={hideRef}
          >
            {/* A confirmed first session is joined from here too, below Getting
                started (owner, 26 Oct; the design's new view has no Next
                session card). */}
            {nextBooking && (
              <MenteeNextSession
                key={nextBooking.id}
                booking={nextBooking}
                timeZone={zone}
                now={now}
                onMessage={messageNext}
              />
            )}
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
          onMessageNext={messageNext}
          profileStrength={
            <MenteeProfileStrength
              status={fresh.detailsStatus}
              fields={fresh.fields}
              onEducation={() => {
                setTipUsed('education');
                setEduFromTip(true);
                setEduOpen(true);
              }}
              onBio={() => {
                setTipUsed('bio');
                setBioFromTip(true);
                setProfileOpen(true);
              }}
              lead={forCredit ? COMPLETE_FOR_CREDIT : undefined}
            />
          }
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
          onMessage={
            messageMet &&
            ((m) => {
              // As with booking: close the list first, so SendMessage isn't stacked on it.
              setMetOpen(false);
              messageMet(m);
            })
          }
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
          // The unlock counts attended sessions (owner, 25 Oct). A completed
          // session was attended, so /me's count (what the header and the new
          // view go by) ticks it too: the modal never contradicts the page.
          attended={completed >= 1 || (stats.data?.sessionsAttended ?? 0) >= 1}
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
          onClose={() => {
            setProfileOpen(false);
            setBioFromTip(false);
          }}
          editBio={bioFromTip}
          returning={!newView}
          // Opened for the credit: on the first answer still owed.
          focusKey={forCredit && !bioFromTip ? sheetRowFor(member.onboardingMissing) : undefined}
        />
      )}
      {eduOpen && userId && (
        <EducationEditor
          userId={userId}
          id={educationId}
          audience="mentee"
          onClose={() => {
            setEduOpen(false);
            setEduFromTip(false);
            if (!eduFromTip) setProfileOpen(true);
          }}
          onSaved={() => {
            setEduOpen(false);
            setEduFromTip(false);
            if (!eduFromTip) setProfileOpen(true);
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
        entryPoint="home"
        ratingUnknown={booking?.ratingUnknown ?? false}
        onClose={() => setBooking(null)}
      />
      <SendMessageLauncher to={messaging} onClose={() => setMessaging(null)} />
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

/** The greeting and the full Home, all loading. */
function HomeSkeleton() {
  return (
    <>
      <div className={styles.greeting}>
        <Skeleton width="240px" height="24px" />
        <Skeleton width="180px" height="14px" />
      </div>
      <ReturningSkeleton />
    </>
  );
}
