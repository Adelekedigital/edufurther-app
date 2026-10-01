'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Tabs } from '@/components/atoms/Tabs/Tabs';
import { AboutEditor } from '@/components/molecules/AboutEditor/AboutEditor';
import { CoverPicker } from '@/components/molecules/CoverPicker/CoverPicker';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { IntroEditForm } from '@/components/molecules/IntroEditForm/IntroEditForm';
import { PhotoPicker } from '@/components/molecules/PhotoPicker/PhotoPicker';
import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import { BookSessionCard } from '@/components/organisms/BookSessionCard/BookSessionCard';
import { FirstMenteesCard } from '@/components/organisms/FirstMenteesCard/FirstMenteesCard';
import { ProfileStrengthCard } from '@/components/organisms/ProfileStrengthCard/ProfileStrengthCard';
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
import { useAvatarUpload } from '@/lib/api/data/avatar';
import { BANNER_ACCEPT, useCoverEdit } from '@/lib/api/data/cover';
import { useMentorProfile } from '@/lib/api/data/profile';
import { useSimilarMentors } from '@/lib/api/data/similar';
import { coverFor } from '@/lib/utils/cover';
import { deviceTimeZone, movedBetween } from '@/lib/utils/format';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type { CompletenessCode } from '@/types/mentor';
import { useOnline } from '@/lib/utils/useOnline';
import styles from './MentorProfileScreen.module.css';
import {
  OwnerItemEditor,
  type ItemKind,
  type ItemOutcome,
  type ItemTarget,
} from './OwnerItemEditor';
import { DeleteEntryConfirm } from './DeleteEntryConfirm';
import { RemovePhotoConfirm } from './RemovePhotoConfirm';
import {
  NotTakingEmpty,
  NotTakingNote,
  OwnerBar,
  PREVIEW_TOGGLE_ID,
  ProfileSkeleton,
} from './ProfileParts';
import { ProfileMissing } from './ProfileMissing';
import { ReviewsTab } from './ReviewsTab';
import { strengthTips } from './strengthTips';
import { listLabel } from './suggestions';
import { OwnerSessionTypes } from './OwnerSessionTypes';
import { useOwnerEditing } from './useOwnerEditing';
import { useBookLink } from './useBookLink';
import { useProfileBooking } from './useProfileBooking';
import { useProfileReviewing } from './useProfileReviewing';
import { useProfileTab } from './useProfileTab';

// Tests import it from here.
export { suggestionsLine } from './suggestions';

/** What the page announces after an owner's edit lands. */
const SAVED_COPY: Record<ItemKind, Record<ItemOutcome, string>> = {
  topics: { saved: 'Topics saved.', added: 'Topics saved.', removed: 'Topics saved.' },
  background: {
    saved: 'Background saved.',
    added: 'Background saved.',
    removed: 'Background saved.',
  },
  award: { saved: 'Award saved.', added: 'Award added.', removed: 'Award deleted.' },
  education: {
    saved: 'Education saved.',
    added: 'Education added.',
    removed: 'Education deleted.',
  },
};

/** Where weekly hours are set today (the Session types form's hours). */
const HOURS_HREF = '/session-types';
/** Session types (a type to turn on). */
const TYPES_HREF = '/session-types';
/** The strength card, where focus goes after a tip's step is done. */
const STRENGTH_ID = 'profile-strength';
/** The owner's photo input, opened by the "Add a profile photo" tip. */
const PHOTO_INPUT = 'profile-photo-input';

/**
 * After a save whose opener went with it (a strength tip whose step is now
 * done): the next tip, else the "View as mentee" toggle. Only when focus was lost.
 */
function refocusAfterTip() {
  if (document.activeElement && document.activeElement !== document.body) return;
  const next = document.getElementById(STRENGTH_ID)?.querySelector<HTMLElement>('a, button');
  (next ?? document.getElementById(PREVIEW_TOGGLE_ID))?.focus();
}

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
  const isOwner = !!p && (p.owner !== null || member?.id === p.mentor.id);
  // "View as mentee" (Mentor Profile.dc.html `pvw`): the owner sees the page as
  // a mentee does, with Book drawn but off. Page state: a reload is back to editing.
  const [previewOn, setPreview] = useState(false);
  // The owner's active count, from their own list once the Sessions tab has
  // loaded it: it changes before the profile refetches (Codex on PR 119).
  const [ownActive, setOwnActive] = useState<number | null>(null);
  const viewing = isOwner && previewOn;
  const editing = isOwner && !previewOn;
  // Mentors can't book (product 2026-09-29, canBookFor): on another mentor's
  // profile every Book control goes away, as for the owner on their own.
  const canBookHere = !isOwner && canBook;
  // Who sees the booking side of the page: someone who can book, or the owner previewing.
  const asMentee = canBookHere || viewing;
  // …and a mentor who isn't taking bookings (backend #301) offers no Book at
  // all: the header and aside say "Not taking bookings" instead.
  const notTaking = !!p && !p.takingBookings;
  // For someone who could book, the Sessions tab says so too (Mentor
  // Profile.dc.html `notTaking`); a mentor viewing keeps the read-only list
  // (review of PR 102).
  const notTakingTab = asMentee && notTaking;
  // The owner, editing, always has the tab: "New session type" is there.
  const { tab, setTab } = useProfileTab(hasSessions || notTakingTab || editing, hasReviews);

  // Cards only render after a client fetch, so reading the device zone here is safe.
  const [timeZone] = useState(deviceTimeZone);
  // The profile only exists after a client fetch, so `window` is there by then.
  const shareUrl = p ? `${window.location.origin}${p.mentor.profileHref}` : '';
  // The owner's "Share your profile" opens the header's share menu.
  const [shareOpen, setShareOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');

  const bookBlocked = !online ? 'Booking needs a connection' : bookBlockedFor(viewer);
  const mayBook = canBookHere && !notTaking;
  const booking = useProfileBooking({ mentor: p?.mentor ?? null, mayBook, canBook, timeZone });
  useBookLink({
    profile: p ?? null,
    gone: profile.notFound || (!!profile.error && !p),
    ready: viewer.kind !== 'loading' && online,
    // Gated like every Book on the page: an account-blocked viewer's link is
    // dropped (the page's Book says why).
    allowed: mayBook && !bookBlockedFor(viewer),
    open: booking.open,
  });
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
  // No user id for anyone but the owner: the hook then can't upload, whatever calls it.
  const photo = useAvatarUpload(handle, isOwner && p ? p.mentor.id : null);
  // The owner's name, headline and About (Mentor Profile.dc.html edit mode).
  const editProfileButton = useRef<HTMLButtonElement>(null);
  const owner = useOwnerEditing(p ?? null, isOwner, editProfileButton);
  // The owner's topics, background and awards (ProfileItemModal.dc.html), and
  // what the last save did, for screen readers (the modal closing says nothing).
  const [itemOpen, setItemOpen] = useState<ItemTarget | null>(null);
  // The photo's remove confirm is the page's, like its other dialogs: it must
  // outlive the badge menu that opens it, which closes on the pick (Codex on PR 125).
  const [photoRemoving, setPhotoRemoving] = useState(false);
  // Removed: the badge is now "Add photo"; focus goes there (the menu it came from is gone).
  // A frame later, so "Photo removed." isn't cut off by the focus move (review of PR 125).
  useEffect(() => {
    if (!photo.removedStamp) return;
    const f = requestAnimationFrame(() => document.getElementById(PHOTO_INPUT)?.focus());
    return () => cancelAnimationFrame(f);
  }, [photo.removedStamp]);
  // The row Delete's confirm (product 2026-09-30: Delete beside Edit).
  const [deleting, setDeleting] = useState<{ kind: 'award' | 'education'; id: string } | null>(
    null,
  );
  // The Sessions tab's outcomes, here so a delete settling after a tab switch
  // is still said (Codex on PR 130).
  const [sessionsSaid, setSessionsSaid] = useState<{ text: string; id: number } | null>(null);
  const saySessions = useCallback(
    (text: string) => setSessionsSaid((was) => ({ text, id: (was?.id ?? 0) + 1 })),
    [],
  );
  const [itemSaved, setItemSaved] = useState<{
    text: string;
    id: number;
    kind: ItemKind;
    outcome: ItemOutcome;
  } | null>(null);
  // Where focus goes when what opened the dialog is gone by the time it
  // closes: the empty "Add background" card (review of #85), a removed row's
  // Edit. Runs after the dialog's own focus return.
  const backgroundEdit = useRef<HTMLButtonElement>(null);
  const awardsAdd = useRef<HTMLButtonElement>(null);
  const educationAdd = useRef<HTMLButtonElement>(null);
  const editTopics = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!itemSaved) return;
    if (itemSaved.kind === 'background') backgroundEdit.current?.focus();
    if (itemSaved.kind === 'topics') editTopics.current?.focus();
    // Added from the empty invite card (gone once the row shows), or removed.
    if (itemSaved.outcome === 'removed' || itemSaved.outcome === 'added') {
      if (itemSaved.kind === 'award') awardsAdd.current?.focus();
      if (itemSaved.kind === 'education') educationAdd.current?.focus();
    }
    // Opened from a strength tip on a tab without those controls (Codex on PR 106).
    refocusAfterTip();
  }, [itemSaved]);

  // Similar mentors: the Overview aside, for mentees and guests. Not the mentor
  // themselves, and not other mentors (product 2026-09-28: it's a mentee-facing
  // suggestion, and mentors' nav has no Explore). Waits for who is looking.
  const showSimilar =
    !!p &&
    tab === 'overview' &&
    viewer.kind !== 'loading' &&
    (viewing || (!isOwner && !member?.isMentor));
  // The "isn't available" page offers them to everyone (Mentor Profile.dc.html
  // notFound; mentors see "View profile" on the cards). The endpoint answers
  // for hidden and unknown handles alike (#38).
  const similar = useSimilarMentors(handle, showSimilar || profile.notFound);
  // The card hides itself when the list is empty or failed.
  const similarShown = showSimilar && (similar.isLoading || !!similar.data?.length);
  // Profile strength (Mentor Profile.dc.html `canEdit` aside, FE #40): the
  // owner, editing, on the tabs that have an aside; gone at 100%.
  const completeness = p?.owner?.completeness ?? null;
  const strengthShown =
    editing && tab !== 'sessions' && !!completeness && completeness.percent < 100;
  // The aside's name lists what it holds for this viewer on this tab; with
  // only the first-mentees card it's "About this mentor".
  const asideLabel =
    listLabel([
      // Neutral when nothing can be booked (review of #81).
      // Neutral when it only says bookings are closed (review of #81, #102).
      asMentee && (notTaking ? 'availability' : 'booking'),
      strengthShown && 'profile strength',
      tab === 'overview' && 'track record',
      similarShown && 'similar mentors',
    ]) ?? 'About this mentor';

  // Mentees can see this profile: the owner's card only nudges sharing then
  // (a pending, declined or unlisted profile's link 404s for everyone else;
  // the OwnerBar explains that instead). No owner block → public.
  const isPublic = !p?.owner || (p.owner.approval === 'approved' && p.owner.listed);
  const canStartBooking = mayBook && hasSessions && !bookBlocked;
  // Book as a mentee sees it: offered (maybe blocked, with why), or drawn but off in preview.
  const showBook = asMentee && !notTaking;
  // In preview Book reads as a mentee's, never the owner's own block (review of PR 106).
  const shownBlock = viewing ? null : bookBlocked;
  // The toggle waits while an inline edit is open, so a draft is never dropped
  // (review of PR 106). Its pressed state says the rest; no extra announcement.
  const previewBlocked =
    owner.introOpen || owner.aboutOpen ? 'Save or cancel your edit to preview.' : null;

  // A tip's step done: its tip (or the whole card, at 100%) goes, and with it
  // the focus the dialog handed back. Put it on the next tip, else the toggle.
  const [tipUsed, setTipUsed] = useState<string | null>(null);
  const [refocus, setRefocus] = useState(0);
  // Adjusted during render (React's pattern for state that follows props): once
  // the refetched profile no longer lists the step, it's done.
  if (tipUsed && completeness && !completeness.missing.includes(tipUsed as CompletenessCode)) {
    setTipUsed(null);
    setRefocus((n) => n + 1);
  }
  useEffect(() => {
    // A refetch that lands after the editor closed: the same fallback.
    if (refocus) refocusAfterTip();
  }, [refocus]);

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
      editing ? (
        isPublic ? (
          <FirstMenteesCard variant="owner" onShare={() => setShareOpen(true)} />
        ) : null
      ) : showBook ? (
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
          // In preview, drawn but off, as every Book is (Codex on PR 106).
          bookDisabled={viewing}
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
            {isOwner && (
              <OwnerBar
                profile={p}
                preview={viewing}
                onTogglePreview={() => setPreview(!previewOn)}
                hoursHref={HOURS_HREF}
                previewBlocked={previewBlocked}
              />
            )}
            <ProfileHeader
              profile={p}
              onShowReviews={hasReviews ? () => setTab('reviews') : undefined}
              onEditTopics={editing ? () => setItemOpen({ kind: 'topics' }) : undefined}
              editTopicsRef={editTopics}
              photoTools={
                editing ? (
                  <PhotoPicker
                    inputId={PHOTO_INPUT}
                    hasPhoto={!!p.mentor.photoUrl}
                    accept={photo.accept}
                    uploading={photo.uploading}
                    onFile={photo.upload}
                    error={photo.error}
                    errorFrom={photo.errorFrom}
                    onDismissError={photo.dismissError}
                    onRemove={() => setPhotoRemoving(true)}
                    onRetryRemove={photo.remove}
                    removing={photo.removing}
                    removedStamp={photo.removedStamp}
                  />
                ) : undefined
              }
              // As drawn (design reply #58).
              status={asMentee && notTaking ? 'Not taking bookings' : undefined}
              introEditor={
                editing && owner.introOpen ? (
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
                editing ? (
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
                  {editing && !owner.introOpen && (
                    <Button
                      ref={editProfileButton}
                      variant="secondary-outlined"
                      size="large"
                      onClick={owner.openIntro}
                    >
                      Edit profile
                    </Button>
                  )}
                  {showBook && hasSessions && (
                    // The view's one filled button: Large (CTA hierarchy).
                    <Button
                      size="large"
                      disabled={viewing || !!shownBlock}
                      onClick={() => booking.open()}
                    >
                      {shownBlock ?? 'Book a session'}
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
                  ...(hasSessions || notTakingTab || editing
                    ? [
                        {
                          value: 'sessions',
                          // Nothing to book counts as none (the design's visible count).
                          label: `Sessions (${notTakingTab ? 0 : editing && ownActive !== null ? ownActive : p.sessionTypes.length})`,
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
                    onEditBackground={
                      editing ? () => setItemOpen({ kind: 'background' }) : undefined
                    }
                    backgroundEditRef={backgroundEdit}
                    awardsEdit={
                      editing
                        ? {
                            onAdd: () => setItemOpen({ kind: 'award', id: null }),
                            onEdit: (id) => setItemOpen({ kind: 'award', id }),
                            onDelete: (id) => setDeleting({ kind: 'award', id }),
                          }
                        : undefined
                    }
                    awardsAddRef={awardsAdd}
                    educationEdit={
                      editing
                        ? {
                            onAdd: () => setItemOpen({ kind: 'education', id: null }),
                            onEdit: (id) => setItemOpen({ kind: 'education', id }),
                            onDelete: (id) => setDeleting({ kind: 'education', id }),
                          }
                        : undefined
                    }
                    educationAddRef={educationAdd}
                    aboutEdit={
                      editing
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
                ) : notTakingTab ? (
                  <NotTakingEmpty firstName={p.mentor.firstName} />
                ) : editing ? (
                  <OwnerSessionTypes
                    shown={p.sessionTypes}
                    onActiveCount={setOwnActive}
                    onSay={saySessions}
                  />
                ) : (
                  <SessionTypeList
                    sessionTypes={p.sessionTypes}
                    onBook={booking.open}
                    bookBlocked={shownBlock}
                    canBook={showBook}
                    bookDisabled={viewing}
                  />
                )}
              </div>
              {tab !== 'sessions' &&
                // Never an empty named landmark (the owner's Reviews tab can hold nothing).
                (asMentee ||
                  tab === 'overview' ||
                  strengthShown ||
                  (!isPhone && !!firstMentees)) && (
                  // Reviews tab: the design's default `reviewsLayout=focus` drops
                  // the track record (and Similar mentors) from the aside.
                  <aside className={styles.aside} aria-label={asideLabel}>
                    {!isPhone && firstMentees}
                    {asMentee &&
                      (notTaking ? (
                        <NotTakingNote firstName={p.mentor.firstName} />
                      ) : (
                        <div id="profile-book" className={styles.scrollTarget}>
                          <BookSessionCard
                            sessionTypes={p.sessionTypes}
                            onBook={booking.open}
                            onCompare={() => setTab('sessions')}
                            bookBlocked={shownBlock}
                            bookDisabled={viewing}
                          />
                        </div>
                      ))}
                    {strengthShown && completeness && (
                      <ProfileStrengthCard
                        id={STRENGTH_ID}
                        percent={completeness.percent}
                        tips={strengthTips(completeness.missing, {
                          hoursHref: HOURS_HREF,
                          typesHref: TYPES_HREF,
                          openPhoto: () => document.getElementById(PHOTO_INPUT)?.click(),
                          openIntro: owner.openIntro,
                          openAbout: () => {
                            setTab('overview');
                            owner.openAbout();
                          },
                          openItem: setItemOpen,
                          onUse: setTipUsed,
                        })}
                      />
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

      {isOwner && p && itemOpen && (
        <OwnerItemEditor
          target={itemOpen}
          profile={p}
          onClose={() => setItemOpen(null)}
          onSaved={(kind, outcome) => {
            setItemOpen(null);
            setItemSaved({ text: SAVED_COPY[kind][outcome], id: Date.now(), kind, outcome });
          }}
        />
      )}
      {isOwner && p && deleting && (
        <DeleteEntryConfirm
          kind={deleting.kind}
          id={deleting.id}
          userId={p.mentor.id}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setItemSaved({
              text: SAVED_COPY[deleting.kind].removed,
              id: Date.now(),
              kind: deleting.kind,
              outcome: 'removed',
            });
          }}
        />
      )}
      {/* Always there while it's the owner, so a screen reader hears each save. */}
      {isOwner && <LiveRegion message={itemSaved} />}
      {isOwner && <LiveRegion message={sessionsSaid} />}
      {editing && photoRemoving && (
        <RemovePhotoConfirm
          onKeep={() => setPhotoRemoving(false)}
          onRemove={() => {
            setPhotoRemoving(false);
            photo.remove();
          }}
        />
      )}
      {isOwner && (
        <LiveRegion
          message={
            photo.removedStamp > photo.uploadedStamp
              ? { text: 'Photo removed.', id: photo.removedStamp }
              : photo.uploadedStamp
                ? { text: 'Photo updated.', id: photo.uploadedStamp }
                : null
          }
        />
      )}

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
