'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import { BookSessionCard } from '@/components/organisms/BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '@/components/organisms/FirstMenteesCard/FirstMenteesCard';
import { BookingFlow } from '@/components/organisms/BookingFlow/BookingFlow';
import { ProfileHeader } from '@/components/organisms/ProfileHeader/ProfileHeader';
import { ProfileOverview } from '@/components/organisms/ProfileOverview/ProfileOverview';
import { SessionTypeList } from '@/components/organisms/SessionTypeList/SessionTypeList';
import { TrackRecordCard } from '@/components/organisms/TrackRecordCard/TrackRecordCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { bookBlockedFor } from '@/app/_shell/bookBlocked';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useRequestBooking, useSessionTypes, useSlots } from '@/lib/api/data/booking';
import { useMentorProfile } from '@/lib/api/data/profile';
import { deviceTimeZone, movedBetween } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import type { MentorProfile } from '@/types/mentor';
import styles from './MentorProfileScreen.module.css';

type Tab = 'overview' | 'sessions';

/** Below this many completed sessions a mentor is "new" (design reply #45). */
const NEW_MENTOR_UNDER = 3;

/**
 * Mentor Profile (Mentor Profile.dc.html), read-only: the page every viewer
 * sees — mentee, guest, and the mentor themselves in any approval state
 * (backend mentor-profile reply #1). Editing, Reviews and Similar mentors come
 * in later PRs. The only place on this route that fetches.
 */
export function MentorProfileScreen({ handle }: { handle: string }) {
  const { viewer, member, chrome, account } = useAppShell();
  const online = useOnline();
  const profile = useMentorProfile(handle);
  const p = profile.data;

  // Tab in the URL, so a shared link and Back keep it.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hasSessions = (p?.sessionTypes.length ?? 0) > 0;
  const tab: Tab = params.get('tab') === 'sessions' && hasSessions ? 'sessions' : 'overview';
  const setTab = (t: string) => {
    // Change only `tab`: a shared link's other parameters (utm_*) stay.
    const next = new URLSearchParams(params.toString());
    if (t === 'sessions') next.set('tab', 'sessions');
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
      ) : (
        <FirstMenteesCard
          variant="mentee"
          firstName={p.mentor.firstName}
          nextTime={p.mentor.nextAvailableState === 'open' ? p.mentor.nextAvailableAt : null}
          timeZone={timeZone}
          move={movedBetween(p.originCountry, p.studyCountry)}
          award={p.awards[0]?.title ?? null}
          // Blocked booking (guest setup, offline…) is explained on the header's
          // Book; the card just doesn't offer one.
          onBook={hasSessions && !bookBlocked ? (time) => openBooking(undefined, time) : undefined}
        />
      )
    ) : null;

  return (
    <AppShell active="Explore" chrome={chrome} account={account} offline={!online}>
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
              actions={
                <>
                  {!isOwner && hasSessions && (
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
                ) : (
                  <SessionTypeList
                    sessionTypes={p.sessionTypes}
                    onBook={openBooking}
                    bookBlocked={bookBlocked}
                    canBook={!isOwner}
                  />
                )}
              </div>
              {tab === 'overview' && (
                <aside className={styles.aside} aria-label="Booking and track record">
                  {!isPhone && firstMentees}
                  {!isOwner && (
                    <BookSessionCard
                      sessionTypes={p.sessionTypes}
                      onBook={openBooking}
                      onCompare={() => setTab('sessions')}
                      bookBlocked={bookBlocked}
                    />
                  )}
                  <TrackRecordCard profile={p} />
                </aside>
              )}
            </div>
          </>
        )}
      </div>

      {booking && p && (
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
    </AppShell>
  );
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
