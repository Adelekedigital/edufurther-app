'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ReviewNote } from '@/components/molecules/ReviewNote/ReviewNote';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import { BookSessionCard } from '@/components/organisms/BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '@/components/organisms/FirstMenteesCard/FirstMenteesCard';
import { BookingFlow } from '@/components/organisms/BookingFlow/BookingFlow';
import { ProfileHeader } from '@/components/organisms/ProfileHeader/ProfileHeader';
import { ProfileOverview } from '@/components/organisms/ProfileOverview/ProfileOverview';
import { ReviewFlow } from '@/components/organisms/ReviewFlow/ReviewFlow';
import { ReviewsList } from '@/components/organisms/ReviewsList/ReviewsList';
import { ReviewsSummary } from '@/components/organisms/ReviewsSummary/ReviewsSummary';
import { SessionTypeList } from '@/components/organisms/SessionTypeList/SessionTypeList';
import { SimilarMentorsCard } from '@/components/organisms/SimilarMentorsCard/SimilarMentorsCard';
import { TrackRecordCard } from '@/components/organisms/TrackRecordCard/TrackRecordCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { bookBlockedFor } from '@/app/_shell/bookBlocked';
import { useAppShell } from '@/app/_shell/useAppShell';
import {
  useRequestBooking,
  useSessionTypes,
  useSlots,
  useUploadIntakeFile,
} from '@/lib/api/data/booking';
import { useMentorProfile } from '@/lib/api/data/profile';
import { REVIEW_PAGE_SIZE, useMentorReviews, useReviewPrompt } from '@/lib/api/data/reviews';
import {
  useAuthoredReview,
  useMyReview,
  useReviewableSessions,
  useSendReview,
} from '@/lib/api/data/reviewWrite';
import { useSimilarMentors } from '@/lib/api/data/similar';
import { deviceTimeZone, formatTime, movedBetween } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import type { MentorProfile, ReviewAnswers } from '@/types/mentor';
import styles from './MentorProfileScreen.module.css';

type Tab = 'overview' | 'sessions' | 'reviews';

/** Below this many completed sessions a mentor is "new" (design reply #45). */
const NEW_MENTOR_UNDER = 3;

/**
 * Mentor Profile (Mentor Profile.dc.html), read-only: the page every viewer
 * sees — mentee, guest, and the mentor themselves in any approval state
 * (backend mentor-profile reply #1). Editing comes in a later PR. The only place on this route that fetches.
 */
export function MentorProfileScreen({ handle }: { handle: string }) {
  const { viewer, member, chrome, account, nav, canBook } = useAppShell();
  const online = useOnline();
  const profile = useMentorProfile(handle);
  const p = profile.data;

  // Tab in the URL, so a shared link and Back keep it.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hasSessions = (p?.sessionTypes.length ?? 0) > 0;
  const hasReviews = (p?.reviews.count ?? 0) > 0;
  const asked = params.get('tab');
  const tab: Tab =
    asked === 'sessions' && hasSessions
      ? 'sessions'
      : asked === 'reviews' && hasReviews
        ? 'reviews'
        : 'overview';
  const setTab = (t: string) => {
    // Change only `tab`: a shared link's other parameters (utm_*) stay.
    const next = new URLSearchParams(params.toString());
    if (t === 'sessions' || t === 'reviews') next.set('tab', t);
    else next.delete('tab');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Cards only render after a client fetch, so reading the device zone here is safe.
  const [timeZone] = useState(deviceTimeZone);
  // The profile only exists after a client fetch, so `window` is there by then.
  const shareUrl = p ? `${window.location.origin}${p.mentor.profileHref}` : '';

  // ---- booking: the shared BookingModal, as on Explore -----------------------
  const [booking, setBooking] = useState(false);
  const [bookingTypeId, setBookingTypeId] = useState<string | null>(null);
  // A time to open on, from the first-mentees card's "Book {time}".
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const mentorId = booking && p ? p.mentor.id : null;
  const sessionTypes = useSessionTypes(mentorId);
  const typeId = bookingTypeId ?? sessionTypes.data?.[0]?.id ?? null;
  const slots = useSlots(mentorId, typeId, timeZone);
  const request = useRequestBooking();
  const uploadIntakeFile = useUploadIntakeFile();
  const openBooking = (sessionTypeId?: string, time?: string) => {
    setBookingTypeId(sessionTypeId ?? null);
    setBookingTime(time ?? null);
    setBooking(true);
  };
  const closeBooking = () => {
    setBooking(false);
    setBookingTypeId(null);
    setBookingTime(null);
    request.reset();
  };
  // The owner's "Share your profile" opens the header's share menu.
  const [shareOpen, setShareOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');

  const isOwner = !!p && (p.owner !== null || member?.id === p.mentor.id);
  const bookBlocked = !online ? 'Booking needs a connection' : bookBlockedFor(viewer);
  // Mentors can't book (product 2026-09-29, canBookFor): on another mentor's
  // profile every Book control goes away, as for the owner on their own.
  const mayBook = !isOwner && canBook;

  // ---- reviews tab ------------------------------------------------------------
  const isGuest = viewer.kind === 'guest';
  const [reviewFilter, setReviewFilter] = useState<string | null>(null);
  const reviews = useMentorReviews(handle, reviewFilter, {
    guest: isGuest,
    active: tab === 'reviews',
    // Guest or not decides what's fetched, so wait until that's known.
    ready: viewer.kind !== 'loading',
  });
  const reviewPrompt = useReviewPrompt(
    p?.mentor.id ?? null,
    // Mentors can't book a first session, so "review after your first session" isn't for them.
    tab === 'reviews' && viewer.kind === 'member' && !isOwner && canBook,
  );
  const reviewsHref = p ? `${p.mentor.profileHref}?tab=reviews` : '';

  // ---- writing a review (ReviewModal.dc.html) ---------------------------------
  // Writing a review is a mentee's (mentors can't have had a session as one).
  const asMember = tab === 'reviews' && viewer.kind === 'member' && !isOwner && canBook;
  const myReview = useMyReview(p?.mentor.id ?? null, asMember);
  const reviewable = useReviewableSessions(
    p?.mentor.id ?? null,
    asMember && reviewPrompt === 'due',
  );
  const sendReview = useSendReview();
  const [reviewing, setReviewing] = useState<'new' | 'edit' | null>(null);
  const mine = myReview.data;
  // Edit pre-fills from the author's full review; the list row has only step 1.
  const authored = useAuthoredReview(mine?.id ?? null, reviewing === 'edit');
  // The form starts from, and saving compares against, ONE snapshot: a copy
  // fetched after Edit opened (a cached one can predate the last save; review
  // of #59). Taken while rendering, once, when that fresh copy lands.
  const [editOpenedAt, setEditOpenedAt] = useState(0);
  const [editBase, setEditBase] = useState<Partial<ReviewAnswers> | null>(null);
  if (reviewing === 'edit' && !editBase && authored.fetchedAt >= editOpenedAt && authored.data) {
    setEditBase(authored.data.answers);
  }
  const editFailed =
    reviewing === 'edit' && !editBase && authored.failedAt >= editOpenedAt && !!authored.error;
  // "Still editable" is decided now, not when the review was fetched, and the
  // page re-renders at the deadline so Edit goes away on its own.
  const [now, setNow] = useState(() => Date.now());
  const until = mine?.editableUntil ? Date.parse(mine.editableUntil) : 0;
  const mineOpen = until > now;
  useEffect(() => {
    if (!mineOpen) return;
    const t = setTimeout(() => setNow(Date.now()), until - Date.now() + 50);
    return () => clearTimeout(t);
  }, [mineOpen, until]);
  const mineUntil =
    mineOpen && mine?.editableUntil ? formatTime(mine.editableUntil, timeZone) : null;
  const canWrite = !mineOpen && reviewPrompt === 'due' && !!reviewable.data?.length;
  const openReview = (mode: 'new' | 'edit') => {
    sendReview.reset();
    setEditBase(null);
    setEditOpenedAt(Date.now());
    setReviewing(mode);
  };
  const closeReview = () => {
    setReviewing(null);
    setEditBase(null);
    sendReview.reset();
  };
  // Mentor Profile.dc.html `scrollToBook`: the "no session yet" note's Book
  // takes you to the booking card rather than opening booking itself.
  const scrollToBook = () => {
    const card = document.getElementById('profile-book');
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card?.querySelector<HTMLElement>('button, a[href]')?.focus({ preventScroll: true });
  };

  // Similar mentors: the Overview aside, for mentees and guests. Not the mentor
  // themselves, and not other mentors (product 2026-09-28: it's a mentee-facing
  // suggestion, and mentors' nav has no Explore). Waits for who is looking.
  const showSimilar =
    !!p && !isOwner && tab === 'overview' && viewer.kind !== 'loading' && !member?.isMentor;
  const similar = useSimilarMentors(handle, showSimilar);
  // The card hides itself when the list is empty or failed.
  const similarShown = showSimilar && (similar.isLoading || !!similar.data?.length);
  // The aside's name lists what it holds for this viewer on this tab; with
  // only the first-mentees card it's "About this mentor".
  const asideLabel =
    listLabel([
      mayBook && 'booking',
      tab === 'overview' && 'track record',
      similarShown && 'similar mentors',
    ]) ?? 'About this mentor';

  // Mentees can see this profile: the owner's card only nudges sharing then
  // (a pending, declined or unlisted profile's link 404s for everyone else;
  // the OwnerBar explains that instead). No owner block → public.
  const isPublic = !p?.owner || (p.owner.approval === 'approved' && p.owner.listed);

  // Design reply #45: under 3 sessions, an invitation (mentees) or what mentees
  // see (owner). Desktop: top of the aside (Overview only, like the aside).
  // Phones: under the tabs, on both tabs.
  const firstMentees =
    p && p.mentor.completedSessions < NEW_MENTOR_UNDER ? (
      isOwner ? (
        isPublic ? (
          <FirstMenteesCard variant="owner" onShare={() => setShareOpen(true)} />
        ) : null
      ) : mayBook ? (
        // The invitation to book: not for mentors, who can't (review of #54).
        <FirstMenteesCard
          variant="mentee"
          firstName={p.mentor.firstName}
          nextTime={p.mentor.nextAvailableState === 'open' ? p.mentor.nextAvailableAt : null}
          timeZone={timeZone}
          move={movedBetween(p.originCountry, p.studyCountry)}
          award={p.awards[0]?.title ?? null}
          // Blocked booking (guest setup, offline…) is explained on the header's
          // Book; the card just doesn't offer one.
          onBook={
            mayBook && hasSessions && !bookBlocked
              ? (time) => openBooking(undefined, time)
              : undefined
          }
        />
      ) : null
    ) : null;

  return (
    <AppShell active="Explore" nav={nav} chrome={chrome} account={account} offline={!online}>
      <div className={styles.page}>
        {profile.isLoading ? (
          <ProfileSkeleton />
        ) : profile.error && !p ? (
          // Only with nothing to show: a failed background refetch keeps the profile.
          <div className={styles.state}>
            <EmptyState
              illustration="forms"
              title="We couldn’t load this profile"
              description="Something went wrong on our side. Check your connection and try again."
              actions={
                <Button size="large" onClick={profile.retry}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : profile.notFound || !p ? (
          // Design reply #34. 404 is "not found or not public", indistinguishable
          // on purpose — the copy doesn't guess which.
          <div className={styles.state}>
            <EmptyState
              illustration="search-results"
              title="This mentor profile isn’t available"
              description="The link may be out of date, or the profile isn’t public. You can find other mentors who’ve done the same path."
              actions={
                <ButtonLink href="/explore" size="large">
                  Explore mentors
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <>
            {isOwner && <OwnerBar profile={p} />}
            <ProfileHeader
              profile={p}
              onShowReviews={hasReviews ? () => setTab('reviews') : undefined}
              actions={
                <>
                  {mayBook && hasSessions && (
                    // The view's one filled button: Large (CTA hierarchy).
                    <Button size="large" disabled={!!bookBlocked} onClick={() => openBooking()}>
                      {bookBlocked ?? 'Book a session'}
                    </Button>
                  )}
                  {shareUrl && (
                    <ShareMenu
                      url={shareUrl}
                      name={p.mentor.name}
                      open={shareOpen}
                      onOpenChange={setShareOpen}
                    />
                  )}
                </>
              }
            />

            <div className={styles.tabsRow}>
              <Tabs
                label="Profile"
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'overview', label: 'Overview', panelId: 'panel-overview' },
                  ...(hasSessions
                    ? [
                        {
                          value: 'sessions',
                          label: `Sessions (${p.sessionTypes.length})`,
                          panelId: 'panel-sessions',
                        },
                      ]
                    : []),
                  ...(hasReviews
                    ? [
                        {
                          value: 'reviews',
                          label: `Reviews (${p.reviews.count})`,
                          panelId: 'panel-reviews',
                        },
                      ]
                    : []),
                ]}
              />
            </div>

            {isPhone && firstMentees}

            <div className={styles.cols}>
              <div
                className={styles.main}
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`panel-${tab}-tab`}
              >
                {tab === 'overview' ? (
                  <ProfileOverview profile={p} />
                ) : tab === 'reviews' ? (
                  <>
                    <ReviewsSummary summary={p.reviews} firstName={p.mentor.firstName} />
                    {mineOpen ? (
                      <ReviewNote
                        tone="success"
                        icon="check_circle"
                        title="Thanks, your review is live"
                        body={`You can edit it until ${mineUntil}. After that it’s locked, and your next session can add a new one.`}
                        action={
                          <Button
                            variant="secondary-outlined"
                            size="medium"
                            onClick={() => openReview('edit')}
                          >
                            Edit review
                          </Button>
                        }
                      />
                    ) : reviewPrompt === 'none' ? (
                      <ReviewNote
                        tone="neutral"
                        icon="rate_review"
                        title={`You can review ${p.mentor.firstName} after your first session`}
                        body="Reviews come only from mentees who’ve had a session, so you can trust what you read."
                        action={
                          mayBook && hasSessions && !bookBlocked ? (
                            <Button
                              variant="secondary-outlined"
                              size="medium"
                              onClick={scrollToBook}
                            >
                              Book a session
                            </Button>
                          ) : undefined
                        }
                      />
                    ) : reviewPrompt === 'due' ? (
                      <ReviewNote
                        tone="info"
                        icon="star"
                        title={`How was your session with ${p.mentor.firstName}?`}
                        body="Your review helps other mentees choose, and takes about a minute."
                        action={
                          canWrite ? (
                            <Button size="medium" onClick={() => openReview('new')}>
                              Write a review
                            </Button>
                          ) : undefined
                        }
                      />
                    ) : null}
                    <ReviewsList
                      reviews={reviews.reviews}
                      isLoading={reviews.isLoading}
                      error={reviews.error}
                      onRetry={reviews.retry}
                      hasMore={reviews.hasMore}
                      isLoadingMore={reviews.isLoadingMore}
                      loadMoreError={reviews.loadMoreError}
                      onLoadMore={reviews.loadMore}
                      // What the next click loads: at most a page, from the
                      // unfiltered total ("Show 5 more", not "Show 15 more").
                      remaining={
                        reviewFilter === null
                          ? Math.min(p.reviews.count - reviews.reviews.length, REVIEW_PAGE_SIZE)
                          : null
                      }
                      filters={p.sessionTypes.map((t) => ({ id: t.id, label: t.name }))}
                      filter={reviewFilter}
                      onFilter={setReviewFilter}
                      mine={
                        mine
                          ? {
                              id: mine.id,
                              edit: mineUntil
                                ? { until: mineUntil, onEdit: () => openReview('edit') }
                                : null,
                            }
                          : null
                      }
                      gate={
                        isGuest
                          ? {
                              firstName: p.mentor.firstName,
                              // Filtered, the total isn't known: no "+N more" count.
                              total:
                                reviewFilter === null ? p.reviews.count : reviews.reviews.length,
                              signupHref: `/signup?next=${encodeURIComponent(reviewsHref)}`,
                              loginHref: `/login?next=${encodeURIComponent(reviewsHref)}`,
                            }
                          : null
                      }
                    />
                  </>
                ) : (
                  <SessionTypeList
                    sessionTypes={p.sessionTypes}
                    onBook={openBooking}
                    bookBlocked={bookBlocked}
                    canBook={mayBook}
                  />
                )}
              </div>
              {tab !== 'sessions' &&
                // Never an empty named landmark (the owner's Reviews tab can hold nothing).
                (mayBook || tab === 'overview' || (!isPhone && !!firstMentees)) && (
                  // Reviews tab: the design's default `reviewsLayout=focus` drops
                  // the track record (and Similar mentors) from the aside.
                  <aside className={styles.aside} aria-label={asideLabel}>
                    {!isPhone && firstMentees}
                    {mayBook && (
                      <div id="profile-book" className={styles.scrollTarget}>
                        <BookSessionCard
                          sessionTypes={p.sessionTypes}
                          onBook={openBooking}
                          onCompare={() => setTab('sessions')}
                          bookBlocked={bookBlocked}
                        />
                      </div>
                    )}
                    {tab === 'overview' && <TrackRecordCard profile={p} />}
                    {similarShown && (
                      <SimilarMentorsCard
                        mentors={similar.data}
                        isLoading={similar.isLoading}
                        timeZone={timeZone}
                        seeAllHref="/explore"
                      />
                    )}
                  </aside>
                )}
            </div>
          </>
        )}
      </div>

      {booking && p && mayBook && (
        <BookingFlow
          mentor={p.mentor}
          sessionTypes={sessionTypes}
          sessionTypeId={typeId}
          onSessionTypeChange={setBookingTypeId}
          slots={slots}
          isGuest={viewer.kind === 'guest'}
          // PHASE A: no auth yet — continuing counts as signed up.
          onSignup={() => undefined}
          onRequest={request.request}
          requestPending={request.isPending}
          requestDone={request.isDone}
          requestError={request.error}
          onUpload={uploadIntakeFile}
          onClose={closeBooking}
          deviceZone={timeZone}
          initialTime={bookingTime}
          hideProfileLink
          renderShell={(shell, body) => (
            <ModalShell
              title={shell.title}
              subtitle={shell.subtitle}
              size="xl"
              onClose={closeBooking}
              sheet={shell.sheet}
              footer={shell.footer}
            >
              {body}
            </ModalShell>
          )}
        />
      )}

      {reviewing && p && member && (
        <ReviewFlow
          // Remount when the edit snapshot arrives, so the form starts from it.
          key={reviewing === 'edit' ? (editBase ? 'edit-ready' : 'edit-loading') : 'new'}
          mode={reviewing}
          loading={reviewing === 'edit' && !editBase && !editFailed}
          loadError={
            editFailed
              ? {
                  message: 'We couldn’t load your review. Check your connection and try again.',
                  onRetry: () => {
                    setEditOpenedAt(Date.now());
                    authored.retry();
                  },
                }
              : null
          }
          mentorFirstName={p.mentor.firstName}
          sessions={reviewable.data ?? []}
          initial={reviewing === 'edit' ? (editBase ?? undefined) : undefined}
          editableUntil={sendReview.result?.editableUntil ?? mine?.editableUntil ?? null}
          author={{ name: member.firstName, initials: member.initial, institution: null }}
          timeZone={timeZone}
          onSend={(answers, sessionId) =>
            reviewing === 'edit' && mine
              ? sendReview.send({
                  mode: 'edit',
                  mentorId: p.mentor.id,
                  reviewId: mine.id,
                  before: editBase ?? mine.answers,
                  answers,
                })
              : sessionId &&
                sendReview.send({ mode: 'new', mentorId: p.mentor.id, sessionId, answers })
          }
          pending={sendReview.isPending}
          error={sendReview.error?.message ?? null}
          done={!!sendReview.result}
          onClose={closeReview}
          onBookAgain={
            mayBook && hasSessions && !bookBlocked
              ? () => {
                  closeReview();
                  openBooking();
                }
              : undefined
          }
          renderShell={(shell, body) => (
            <ModalShell
              title={shell.title}
              subtitle={shell.subtitle}
              icon={shell.icon}
              tone={shell.tone}
              size="md"
              onClose={closeReview}
            >
              {body}
            </ModalShell>
          )}
        />
      )}
    </AppShell>
  );
}

/** "Booking, track record and similar mentors" from the parts present; null for none. */
function listLabel(parts: (string | false)[]): string | null {
  const p = parts.filter((x): x is string => !!x);
  if (!p.length) return null;
  const text = p.length === 1 ? p[0]! : `${p.slice(0, -1).join(', ')} and ${p.at(-1)}`;
  return text[0]!.toUpperCase() + text.slice(1);
}

/**
 * Mentor Profile.dc.html owner bar (design reply #35), read-only for now: the
 * "View as mentee" toggle arrives with editing. A profile mentees can't see yet
 * says so, with a lock.
 */
function OwnerBar({ profile }: { profile: MentorProfile }) {
  const o = profile.owner;
  const hidden =
    o && o.approval === 'declined'
      ? // PROVISIONAL (design request #42): design wrote pending and unlisted only.
        'Your profile wasn’t approved. Only you can see it.'
      : o && o.approval !== 'approved'
        ? 'Only you can see this until your profile is approved.'
        : o && !o.listed
          ? 'Your profile is unlisted. Only you can see it.'
          : null;
  return (
    <div className={styles.ownerBar}>
      <span className={styles.ownerText}>
        <Icon
          name={hidden ? 'lock' : 'person'}
          size={18}
          className={hidden ? styles.ownerIconLock : styles.ownerIcon}
        />
        {hidden ?? 'You’re viewing your own profile.'}
      </span>
    </div>
  );
}

/** Mentor Profile.dc.html `pageState=loading`: the header card and both columns. */
function ProfileSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy>
      <span className="sr-only" role="status">
        Loading profile
      </span>
      <div className={styles.skHeader}>
        <div className={styles.skBanner} />
        <div className={styles.skHead}>
          <span className={styles.skAvatar} />
          <div className={styles.skLines}>
            <Skeleton width="40%" height="24px" radius="md" />
            <Skeleton width="60%" height="14px" radius="md" />
            <Skeleton width="30%" height="14px" radius="md" />
          </div>
        </div>
      </div>
      <div className={styles.cols}>
        <div className={styles.skMain}>
          <Skeleton width="30%" height="18px" radius="md" />
          <Skeleton height="14px" radius="md" />
          <Skeleton height="14px" radius="md" />
          <Skeleton width="70%" height="14px" radius="md" />
          <Skeleton height="160px" radius="lg" className={styles.skBlock} />
        </div>
        <Skeleton height="220px" radius="lg" className={styles.skAside} />
      </div>
    </div>
  );
}
