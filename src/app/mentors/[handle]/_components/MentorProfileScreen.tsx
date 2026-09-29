'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { AboutEditor } from '@/components/molecules/AboutEditor/AboutEditor';
import { CoverPicker } from '@/components/molecules/CoverPicker/CoverPicker';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { IntroEditForm } from '@/components/molecules/IntroEditForm/IntroEditForm';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import { BookSessionCard } from '@/components/organisms/BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '@/components/organisms/FirstMenteesCard/FirstMenteesCard';
import { BookingFlow } from '@/components/organisms/BookingFlow/BookingFlow';
import { ProfileHeader } from '@/components/organisms/ProfileHeader/ProfileHeader';
import { ProfileOverview } from '@/components/organisms/ProfileOverview/ProfileOverview';
import { ReviewFlow } from '@/components/organisms/ReviewFlow/ReviewFlow';
import { SessionTypeList } from '@/components/organisms/SessionTypeList/SessionTypeList';
import { SimilarMentorsCard } from '@/components/organisms/SimilarMentorsCard/SimilarMentorsCard';
import { TrackRecordCard } from '@/components/organisms/TrackRecordCard/TrackRecordCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { bookBlockedFor } from '@/app/_shell/bookBlocked';
import { useAppShell } from '@/app/_shell/useAppShell';
import { BANNER_ACCEPT, useCoverEdit } from '@/lib/api/data/cover';
import { useMentorProfile } from '@/lib/api/data/profile';
import { useSimilarMentors } from '@/lib/api/data/similar';
import { coverFor } from '@/lib/utils/cover';
import { deviceTimeZone, movedBetween } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import styles from './MentorProfileScreen.module.css';
import { OwnerBar, ProfileSkeleton } from './ProfileParts';
import { ProfileMissing } from './ProfileMissing';
import { ReviewsTab } from './ReviewsTab';
import { listLabel } from './suggestions';
import { useOwnerEditing } from './useOwnerEditing';
import { useProfileBooking } from './useProfileBooking';
import { useProfileReviewing } from './useProfileReviewing';
import { useProfileTab } from './useProfileTab';

// Tests import it from here.
export { suggestionsLine } from './suggestions';

/** Below this many completed sessions a mentor is "new" (design reply #45). */
const NEW_MENTOR_UNDER = 3;

/**
 * Mentor Profile (Mentor Profile.dc.html): the page every viewer sees — mentee,
 * guest, and the mentor themselves in any approval state (backend
 * mentor-profile reply #1). The only place on this route that fetches; each
 * concern lives in its own hook (tab, booking, reviewing, cover) and this
 * component lays the page out.
 */
export function MentorProfileScreen({ handle }: { handle: string }) {
  const { viewer, member, chrome, account, nav, canBook } = useAppShell();
  const online = useOnline();
  const profile = useMentorProfile(handle);
  const p = profile.data;
  const hasSessions = (p?.sessionTypes.length ?? 0) > 0;
  const hasReviews = (p?.reviews.count ?? 0) > 0;
  const { tab, setTab } = useProfileTab(hasSessions, hasReviews);

  // Cards only render after a client fetch, so reading the device zone here is safe.
  const [timeZone] = useState(deviceTimeZone);
  // The profile only exists after a client fetch, so `window` is there by then.
  const shareUrl = p ? `${window.location.origin}${p.mentor.profileHref}` : '';
  // The owner's "Share your profile" opens the header's share menu.
  const [shareOpen, setShareOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');

  const isOwner = !!p && (p.owner !== null || member?.id === p.mentor.id);
  const bookBlocked = !online ? 'Booking needs a connection' : bookBlockedFor(viewer);
  // Mentors can't book (product 2026-09-29, canBookFor): on another mentor's
  // profile every Book control goes away, as for the owner on their own.
  const mayBook = !isOwner && canBook;
  const booking = useProfileBooking({ mentor: p?.mentor ?? null, mayBook, canBook, timeZone });
  const reviews = useProfileReviewing({
    handle,
    mentorId: p?.mentor.id ?? null,
    tab,
    viewerKind: viewer.kind,
    isOwner,
    canBook,
    timeZone,
  });
  // The owner's cover (Mentor Profile.dc.html "Change cover"): colour and art
  // save as picked; an image replaces them.
  const coverEdit = useCoverEdit(handle, isOwner && p ? p.mentor.id : null);
  // The owner's name, headline and About (Mentor Profile.dc.html edit mode).
  const editProfileButton = useRef<HTMLButtonElement>(null);
  const owner = useOwnerEditing(p ?? null, isOwner, editProfileButton);

  // Similar mentors: the Overview aside, for mentees and guests. Not the mentor
  // themselves, and not other mentors (product 2026-09-28: it's a mentee-facing
  // suggestion, and mentors' nav has no Explore). Waits for who is looking.
  const showSimilar =
    !!p && !isOwner && tab === 'overview' && viewer.kind !== 'loading' && !member?.isMentor;
  // The "isn't available" page offers them to everyone (Mentor Profile.dc.html
  // notFound; mentors see "View profile" on the cards). The endpoint answers
  // for hidden and unknown handles alike (#38).
  const similar = useSimilarMentors(handle, showSimilar || profile.notFound);
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
  const canStartBooking = mayBook && hasSessions && !bookBlocked;

  // Mentor Profile.dc.html `scrollToBook`: the "no session yet" note's Book
  // takes you to the booking card rather than opening booking itself.
  const scrollToBook = () => {
    const card = document.getElementById('profile-book');
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card?.querySelector<HTMLElement>('button, a[href]')?.focus({ preventScroll: true });
  };

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
          onBook={canStartBooking ? (time) => booking.open(undefined, time) : undefined}
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
          <ProfileMissing
            similar={similar}
            onBook={booking.openFor}
            timeZone={timeZone}
            offline={!online}
            bookBlocked={bookBlocked}
            canBook={canBook}
          />
        ) : (
          <>
            {isOwner && <OwnerBar profile={p} />}
            <ProfileHeader
              profile={p}
              onShowReviews={hasReviews ? () => setTab('reviews') : undefined}
              introEditor={
                isOwner && owner.introOpen ? (
                  <IntroEditForm
                    initial={owner.introValues}
                    onSave={owner.saveIntro}
                    onCancel={owner.closeIntro}
                    saving={owner.introSaving}
                    errors={owner.introErrors}
                  />
                ) : undefined
              }
              bannerTools={
                isOwner ? (
                  <CoverPicker
                    color={p.cover.color ?? coverFor(p.mentor.id)}
                    artOn={p.cover.art !== 'none'}
                    onPickColor={coverEdit.pickColor}
                    onToggleArt={(on) => coverEdit.save({ art: on ? 'icons' : 'none' })}
                    saveState={coverEdit.saveState}
                    savedStamp={coverEdit.savedStamp}
                    hasImage={!!p.bannerUrl}
                    accept={BANNER_ACCEPT}
                    uploading={coverEdit.uploading}
                    onRemoveImage={coverEdit.removeImage}
                    removing={coverEdit.removing}
                    removedStamp={coverEdit.removedStamp}
                    imageError={coverEdit.imageError}
                    onFile={coverEdit.upload}
                    onClose={coverEdit.clearMessages}
                  />
                ) : undefined
              }
              actions={
                <>
                  {isOwner && !owner.introOpen && (
                    <Button
                      ref={editProfileButton}
                      variant="secondary-outlined"
                      size="large"
                      onClick={owner.openIntro}
                    >
                      Edit profile
                    </Button>
                  )}
                  {mayBook && hasSessions && (
                    // The view's one filled button: Large (CTA hierarchy).
                    <Button size="large" disabled={!!bookBlocked} onClick={() => booking.open()}>
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
                onChange={(t) => {
                  // The About editor lives on Overview: leaving closes it.
                  if (owner.aboutOpen) owner.closeAbout();
                  setTab(t);
                }}
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
                  <ProfileOverview
                    profile={p}
                    aboutEdit={
                      isOwner
                        ? {
                            onEdit: owner.openAbout,
                            editor: owner.aboutOpen ? (
                              <AboutEditor
                                initial={p.about ?? ''}
                                onSave={owner.saveAbout}
                                onCancel={owner.closeAbout}
                                saving={owner.aboutSaving}
                                error={owner.aboutError}
                              />
                            ) : null,
                          }
                        : undefined
                    }
                  />
                ) : tab === 'reviews' ? (
                  <ReviewsTab
                    profile={p}
                    reviews={reviews}
                    offerBook={canStartBooking}
                    onBook={scrollToBook}
                  />
                ) : (
                  <SessionTypeList
                    sessionTypes={p.sessionTypes}
                    onBook={booking.open}
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
                          onBook={booking.open}
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

      {booking.active && (
        <BookingFlow
          mentor={booking.active}
          sessionTypes={booking.sessionTypes}
          sessionTypeId={booking.typeId}
          onSessionTypeChange={booking.setTypeId}
          slots={booking.slots}
          isGuest={viewer.kind === 'guest'}
          // PHASE A: no auth yet — continuing counts as signed up.
          onSignup={() => undefined}
          onRequest={booking.request.request}
          requestPending={booking.request.isPending}
          requestDone={booking.request.isDone}
          requestError={booking.request.error}
          onUpload={booking.uploadIntakeFile}
          onClose={booking.close}
          deviceZone={timeZone}
          initialTime={booking.initialTime}
          // On this profile the link would lead back here; a suggested mentor's is useful.
          hideProfileLink={booking.isThisMentor}
          renderShell={(shell, body) => (
            <ModalShell
              title={shell.title}
              subtitle={shell.subtitle}
              size="xl"
              onClose={booking.close}
              sheet={shell.sheet}
              footer={shell.footer}
            >
              {body}
            </ModalShell>
          )}
        />
      )}

      {reviews.reviewing && p && member && (
        <ReviewFlow
          // Remount when the edit snapshot arrives, so the form starts from it.
          key={
            reviews.reviewing === 'edit'
              ? reviews.editBase
                ? 'edit-ready'
                : 'edit-loading'
              : 'new'
          }
          mode={reviews.reviewing}
          loading={reviews.editLoading}
          loadError={
            reviews.editFailed
              ? {
                  message: 'We couldn’t load your review. Check your connection and try again.',
                  onRetry: reviews.retryEdit,
                }
              : null
          }
          mentorFirstName={p.mentor.firstName}
          sessions={reviews.reviewable.data ?? []}
          initial={reviews.reviewing === 'edit' ? (reviews.editBase ?? undefined) : undefined}
          editableUntil={reviews.send.result?.editableUntil ?? reviews.mine?.editableUntil ?? null}
          author={{ name: member.firstName, initials: member.initial, institution: null }}
          timeZone={timeZone}
          onSend={(answers, sessionId) =>
            reviews.reviewing === 'edit' && reviews.mine
              ? reviews.send.send({
                  mode: 'edit',
                  mentorId: p.mentor.id,
                  reviewId: reviews.mine.id,
                  before: reviews.editBase ?? reviews.mine.answers,
                  answers,
                })
              : sessionId &&
                reviews.send.send({ mode: 'new', mentorId: p.mentor.id, sessionId, answers })
          }
          pending={reviews.send.isPending}
          error={reviews.send.error?.message ?? null}
          done={!!reviews.send.result}
          onClose={reviews.close}
          onBookAgain={
            canStartBooking
              ? () => {
                  reviews.close();
                  booking.open();
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
              onClose={reviews.close}
            >
              {body}
            </ModalShell>
          )}
        />
      )}
    </AppShell>
  );
}
