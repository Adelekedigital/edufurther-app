'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { cardClass } from '@/components/atoms/Card/Card';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { BlockedDatesPanel } from '@/components/molecules/BlockedDatesPanel/BlockedDatesPanel';
import { CalendarReconnectBanner } from '@/components/molecules/CalendarReconnectBanner/CalendarReconnectBanner';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SettingSummaryRow } from '@/components/molecules/SettingSummaryRow/SettingSummaryRow';
import { StatusPill } from '@/components/molecules/StatusPill/StatusPill';
import { BlockOutForm } from '@/components/organisms/BlockOutForm/BlockOutForm';
import { ReturnDateForm } from '@/components/organisms/ReturnDateForm/ReturnDateForm';
import { BookingRulesForm } from '@/components/organisms/BookingRulesForm/BookingRulesForm';
import { VideoSection } from '@/components/organisms/VideoSection/VideoSection';
import { WeeklyHoursCard } from '@/components/organisms/WeeklyHoursCard/WeeklyHoursCard';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { VideoSwitchConfirm } from '@/components/templates/VideoSwitchConfirm/VideoSwitchConfirm';
import { useBlockedDays, useBookedDays, useSaveBlockedDays } from '@/lib/api/data/calendar';
import { useConferencing, useSaveConferencing } from '@/lib/api/data/conferencing';
import { useMentorStatus, usePause, useResume } from '@/lib/api/data/mentorStatus';
import {
  useMentorDefaults,
  useOwnSessionTypes,
  useSaveMentorDefaults,
} from '@/lib/api/data/sessionTypes';
import { useSaveWeeklyHours, useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { shortestLength } from '@/lib/utils/sessionTypeDraft';
import {
  bookableRange,
  bookedRange,
  bookingRulesSummary,
  busyBody,
  busyHint,
  doneBody,
  shortDay,
  todayIn,
} from '@/lib/utils/calendar';
import {
  BOOKING_RULES_COPY,
  CALENDAR_PAGE_COPY,
  HOURS_COPY,
  UNLISTED_COPY,
  VIDEO_ROW_COPY,
  videoRowTitle,
} from '@/lib/copy/calendar';
import { deviceTimeZone } from '@/lib/utils/format';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { supportMailto } from '@/lib/utils/mailto';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { lockedPageGate, memberGate, type MemberGateCopy } from '@/app/_shell/MentorGate';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useCalendarReconnect } from '@/app/_shell/useCalendarReconnect';
import { CalendarSkeleton } from './CalendarSkeleton';
import { SaveBar, type SaveProblem } from './SaveBar';
import { useHoursDraft } from './useHoursDraft';
import styles from './CalendarScreen.module.css';

/** Copy confirmed by design (Calendar v2 scene Guest, 2026-10-01). */
const CALENDAR_GATE: MemberGateCopy = {
  illustration: 'calendar',
  guestTitle: 'Log in to manage your calendar',
  guestDescription: 'Your calendar is where you set when mentees can book you.',
};

/** /calendar — the mentor's availability (Calendar v2.dc.html, scene Available). */
export function CalendarScreen() {
  const { viewer, member, access } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  // A locked page (the setup lock) fetches nothing it won't show.
  const locked = access.locked.has('Calendar');
  const mentorId = isMentor && !locked ? member!.id : null;
  const deviceZone = useMemo(() => deviceTimeZone(), []);
  const monthTitleId = useId();

  const weekly = useWeeklyHours(mentorId);
  const saveWeekly = useSaveWeeklyHours(mentorId);
  const defaults = useMentorDefaults(mentorId);
  const saveDefaults = useSaveMentorDefaults(mentorId);
  // Hours must fit the shortest session offered (product, 2026-10-01). The page
  // waits for the types (#147); 0 (nothing enforced) only before it's ready.
  const own = useOwnSessionTypes(isMentor && !locked);
  const minLength = shortestLength(defaults.data?.durationMin, own.data);
  const draft = useHoursDraft(weekly.data, deviceZone, minLength);
  // Days are counted in the zone the hours are saved in, until a new one is saved.
  const savedZone = weekly.data?.timeZone ?? draft.timeZone;
  // The backend counts session dates in the account's zone (#326) and judges
  // return dates there too (#324).
  const accountToday = safeToday(member?.timeZone, savedZone);
  // Booked days from today: as far as the month on screen and any modal's picker
  // have paged, the booking window, and at least 90 days.
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const [modalMonth, setModalMonth] = useState<string | null>(null);
  const booked = useBookedDays(
    // Waits for the hours ("today" would be the device's zone) and the window
    // (the range would widen, and load again).
    weekly.data && defaults.data ? mentorId : null,
    savedZone,
    bookedRange(
      accountToday,
      [shownMonth, modalMonth],
      defaults.data ? bookableRange(accountToday, defaults.data).until : null,
    ),
  );
  const blocked = useBlockedDays(mentorId);
  const saveBlocked = useSaveBlockedDays(mentorId);
  const status = useMentorStatus(mentorId);
  const pause = usePause(mentorId);
  const resume = useResume(mentorId);
  const video = useConferencing(mentorId);
  const saveVideo = useSaveConferencing(mentorId);
  useLeaveGuard(draft.dirty, 'your weekly hours');

  const [windowOpen, setWindowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  // "Availability updated": the return date just set (null = no date), or closed.
  const [done, setDone] = useState<{ back: string | null } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  // A pick closes the picker and asks here first (PRD decision 2, as Integrations).
  const [switchTo, setSwitchTo] = useState<'daily' | 'google_meet' | null>(null);
  const videoAction = useRef<HTMLButtonElement>(null);
  const statusSwitch = useRef<HTMLButtonElement>(null);
  const saveHoursBtn = useRef<HTMLButtonElement>(null);
  // Going busy waited on unsaved hours: the bar says so until they're saved or discarded.
  const [holdForHours, setHoldForHours] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unblockError, setUnblockError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, id: (a?.id ?? 0) + 1 })),
    [],
  );

  // A broken Google grant is costing them bookings right now, so it is said
  // here rather than only on Integrations, a page they have no reason to open.
  const reconnect = useCalendarReconnect(mentorId, announce);

  const hoursTitle = useRef<HTMLHeadingElement>(null);
  const invalid = draft.slotErrors || !!draft.clash;
  // `mobileCollapse=on`: weekly availability collapses on phones only.
  const isPhone = useMediaQuery('(max-width: 767px)');
  // The Session Types modal's copy (confirmed by design, reply 2026-09-29, #7).
  const invalidReason =
    draft.clash && !draft.slotErrors
      ? `Some of these hours overlap hours you set in ${zoneLabel(draft.clash.zone)}. Change them, then save.`
      : 'Fix the hours marked in red, then save.';
  // Calendar v2 bar messages; a partly failed save keeps our fuller message.
  const failure = saveWeekly.error;
  const problem: SaveProblem | null = invalid
    ? { kind: 'invalid', message: invalidReason }
    : failure
      ? {
          kind: 'failed',
          message:
            failure.kind === 'offline'
              ? 'You’re offline, so we couldn’t save. Your changes are still here. Save again when you reconnect.'
              : failure.partial
                ? failure.message
                : 'We couldn’t save your hours. Your changes are still here. Try again.',
        }
      : null;

  // The save bar goes with the draft: focus moves to the hours' title first,
  // so it never drops to the page.
  const focusHours = () => hoursTitle.current?.focus();
  // A failure is read out by the bar's own status message.
  const onSave = () => {
    if (invalid || !weekly.data) return;
    const sent = { days: draft.days, timeZone: draft.timeZone };
    saveWeekly.save({ current: weekly.data, ...sent }).then(
      () => {
        focusHours();
        draft.clearIf(sent);
        announce('Your weekly hours are saved.');
      },
      () => {},
    );
  };
  const onDiscard = () => {
    focusHours();
    draft.clear();
    saveWeekly.reset();
    announce('Your changes were discarded.');
  };
  // A sent save can't be called back: the modal stays until it answers.
  const closeWindow = () => {
    if (!saveDefaults.isPending) setWindowOpen(false);
  };

  const blockZone = savedZone;
  const blockToday = todayIn(blockZone);
  // One blocked-dates save at a time: each plans from the days as last read.
  const blockBusy = saveBlocked.isPending;
  const upcomingBlocked = (blocked.data?.days ?? []).filter((d) => d >= blockToday);
  // The weekdays the hours open, and where a mentee could book: the month and the block modal tint the same days.
  const openWeekdays = draft.days.flatMap((d, i) => (d.on ? [i] : []));
  const blockRange = defaults.data ? bookableRange(blockToday, defaults.data) : null;
  const saveBlocks = (wanted: string[]) =>
    saveBlocked.save({
      exceptions: blocked.data?.exceptions ?? [],
      wanted,
      today: blockToday,
      timeZone: blockZone,
    });
  const openBlockOut = () => {
    if (blockBusy) return;
    saveBlocked.reset();
    setUnblockError(null);
    setBlockOpen(true);
  };
  const closeBlockOut = () => {
    if (!saveBlocked.isPending) setBlockOpen(false);
  };
  // A chip's ×: no confirm (one tap puts it back), the result is read out.
  const unblock = (day: string) => {
    if (blockBusy) return;
    setUnblockError(null);
    saveBlocks(upcomingBlocked.filter((d) => d !== day)).then(
      () => announce(`${shortDay(day)} is open again.`),
      (e: { message: string }) => {
        setUnblockError(e.message);
        announce(e.message);
      },
    );
  };

  // Busy: a pause with an optional return date (a reminder, never an automatic
  // switch back). The pill's switch and "Change return date" open the modal.
  const busy = !!status.data?.pausedByMentor;
  // Approved, off the listing, and not by their own pause: only an admin can
  // relist them. Applicants in review or declined are off the listing too.
  const unlisted = !!status.data?.approved && !status.data.listed && !status.data.pausedByMentor;
  const focusSwitch = () => requestAnimationFrame(() => statusSwitch.current?.focus());
  const openReturn = () => {
    if (resume.isPending) return;
    // Going busy hides the editor: unsaved hours would sit unseen behind the
    // break card, so they're saved or discarded first. (Already busy: nothing
    // to hide, "Change return date" opens straight away.)
    if (!busy && draft.dirty) {
      setHoldForHours(true);
      // Save is off while hours are invalid: then the hours' title takes focus.
      requestAnimationFrame(() => (invalid ? hoursTitle.current : saveHoursBtn.current)?.focus());
      return;
    }
    setResumeError(null);
    pause.reset();
    setReturnOpen(true);
  };
  const closeReturn = () => {
    if (!pause.isPending) setReturnOpen(false);
  };
  const setBusy = (back: string | null) =>
    pause.pause({ returnOn: back }).then(
      () => {
        setReturnOpen(false);
        setDone({ back });
      },
      (e: { message: string }) => announce(e.message),
    );
  const setAvailable = () => {
    if (resume.isPending) return;
    setResumeError(null);
    resume.resume().then(
      () => {
        announce('You’re available again. Mentees can book you.');
        focusSwitch();
      },
      (e: { message: string }) => {
        setResumeError(e.message);
        announce(e.message);
      },
    );
  };
  const closeVideo = () => setVideoOpen(false);
  // The confirm opened from a radio that's gone, so focus comes back here by hand.
  const focusVideoAction = () => requestAnimationFrame(() => videoAction.current?.focus());
  const pickVideo = (next: 'daily' | 'google_meet') => {
    if (video.data?.provider === next) return;
    saveVideo.reset();
    setVideoOpen(false);
    setSwitchTo(next);
  };
  // A refetch landed the saved provider on the pick (another tab, a refocus):
  // nothing is left to ask, so the pick is dropped here and focus comes back.
  const [refocusVideo, setRefocusVideo] = useState(0);
  if (switchTo && switchTo === video.data?.provider && !saveVideo.isPending) {
    setSwitchTo(null);
    setRefocusVideo((n) => n + 1);
  }
  useEffect(() => {
    if (refocusVideo) focusVideoAction();
  }, [refocusVideo]);
  const keepVideo = () => {
    if (saveVideo.isPending) return;
    setSwitchTo(null);
    focusVideoAction();
  };
  const confirmVideo = async (next: 'daily' | 'google_meet') => {
    try {
      // Resolves once the setting is read back, so the row already shows it.
      await saveVideo.save({ provider: next, customUrl: null });
      setSwitchTo(null);
      announce(VIDEO_ROW_COPY.saved);
      focusVideoAction();
    } catch (e) {
      // The confirm stays open with the error beside its button; said aloud too.
      announce((e as { message?: string })?.message ?? VIDEO_ROW_COPY.saveFailed);
    }
  };

  // A failed save's message belongs to that draft: once the hours match what's
  // saved again, it goes.
  const { error: saveError, reset: resetSave } = saveWeekly;
  useEffect(() => {
    if (!draft.dirty && saveError) resetSave();
  }, [draft.dirty, saveError, resetSave]);
  if (holdForHours && !draft.dirty) setHoldForHours(false);

  // Unlinked and existing-account notices keep the shared gate; the rest are
  // Calendar v2 panels under the page header.
  const accountGate =
    viewer.kind === 'unlinked' || viewer.kind === 'accountExists'
      ? memberGate(viewer, '/calendar', CALENDAR_GATE)
      : null;
  // The status decides between editing and the break card, so the page waits
  // for it too: a busy mentor must never see the editor (or no way back).
  const loading =
    viewer.kind === 'loading' ||
    weekly.isLoading ||
    defaults.isLoading ||
    status.isLoading ||
    own.isLoading;
  // The session types set the hours minimum, so Save waits for them (#147).
  const failed = weekly.error ?? defaults.error ?? status.error ?? own.error;
  const ready = !!weekly.data && !!defaults.data && !!status.data && !!own.data && isMentor;

  let panel: ReactNode = null;
  if (viewer.kind === 'guest')
    panel = (
      <Panel title={CALENDAR_GATE.guestTitle} body={CALENDAR_GATE.guestDescription}>
        <ButtonLink href="/login?next=%2Fcalendar" prefetch={false} size="large">
          Log in
        </ButtonLink>
      </Panel>
    );
  // Error before empty: a failed load never reads as "no hours".
  else if (viewer.kind === 'error' || (failed && !ready))
    panel = (
      <Panel
        title="We couldn’t load your calendar"
        body={
          !online
            ? 'You’re offline. Your hours will load when you reconnect.'
            : 'Something went wrong on our side. Try again in a moment.'
        }
      >
        <Button
          size="large"
          busy={viewer.kind === 'error' && viewer.retrying}
          onClick={() => {
            if (viewer.kind === 'error') return viewer.retry();
            weekly.retry();
            defaults.retry();
            status.retry();
            own.retry();
          }}
        >
          Try again
        </Button>
      </Panel>
    );

  // The setup lock after the shared states (guest, a failed /me), before this
  // page's own loading and errors: a locked page never waits on or reports
  // data it won't show. A mentee never gets here: the page redirects
  // (RoleRedirect); a mentor sign-up, with no profile yet, meets the lock.
  const viewerPanel = viewer.kind === 'guest' || viewer.kind === 'error';
  const lock = accountGate || viewerPanel ? null : lockedPageGate(access, 'Calendar');

  let body: ReactNode;
  if (accountGate) body = accountGate;
  else if (lock) body = lock;
  else if (panel || loading || !ready)
    body = (
      <>
        <PageHeader />
        {panel ?? <CalendarSkeleton />}
      </>
    );
  else {
    const hasHours = weekly.data!.days.some((d) => d.on);
    const today = blockToday;
    const range = bookableRange(today, defaults.data!);
    body = (
      <>
        <PageHeader>
          {/* Busy for a mentor who paused themselves; Available for a listed one with
              hours. An admin-unlisted mentor gets neither (they can't change it). */}
          {busy ? (
            <StatusPill
              tone="busy"
              label="Busy"
              hint={busyHint(status.data?.returnOn ?? null, accountToday)}
              switchRef={statusSwitch}
              onChange={(on) => on && setAvailable()}
            />
          ) : (
            status.data?.listed &&
            hasHours && (
              <StatusPill
                tone="available"
                label="Available"
                hint={CALENDAR_PAGE_COPY.availableHint}
                switchRef={statusSwitch}
                onChange={(on) => !on && openReturn()}
              />
            )
          )}
        </PageHeader>

        {unlisted && (
          // Page content, not a change: not a live region.
          <Notice tone="info" icon="info" title={UNLISTED_COPY.title} live={false}>
            {UNLISTED_COPY.body}{' '}
            <a
              href={supportMailto(
                UNLISTED_COPY.subject(member!.firstName),
                UNLISTED_COPY.mailBody(member!.firstName),
              )}
            >
              {UNLISTED_COPY.contact}
            </a>{' '}
            {UNLISTED_COPY.after}
          </Notice>
        )}

        {/* `show` already accounts for paused and unlisted: the rule lives in
            useCalendarReconnect so both mounts get it. */}
        {reconnect.show && (
          <CalendarReconnectBanner
            busy={reconnect.busy}
            unavailable={reconnect.unavailable}
            failure={reconnect.failure}
            onReconnect={reconnect.reconnect}
          />
        )}

        {busy && (
          <section className={styles.busy}>
            <EmptyState
              illustration="calendar-grey"
              title="You’re taking a break"
              description={busyBody(status.data?.returnOn ?? null, accountToday)}
            />
            <div className={styles.busyActions}>
              <Button busy={resume.isPending} onClick={setAvailable}>
                I’m back, set me available
              </Button>
              <Button variant="secondary-outlined" disabled={resume.isPending} onClick={openReturn}>
                Change return date
              </Button>
            </div>
            {resumeError && (
              <p className={styles.busyError}>
                <Icon name="error" size={16} />
                {resumeError}
              </p>
            )}
          </section>
        )}

        {!busy && (
          <>
            <section
              aria-label="Session settings"
              className={cardClass({ padding: 'none', className: styles.settings })}
            >
              <SettingSummaryRow
                icon="date_range"
                title={BOOKING_RULES_COPY.title}
                summary={bookingRulesSummary(defaults.data!)}
                actionLabel={BOOKING_RULES_COPY.editLabel}
                onChange={() => {
                  saveDefaults.reset();
                  setWindowOpen(true);
                }}
              />
              {video.error && !video.data && (
                <SettingSummaryRow
                  icon="video_chat"
                  title="Video for sessions"
                  // PROVISIONAL (calendar design request, PR 3).
                  summary="We couldn’t load your video setting."
                  actionText="Try again"
                  actionLabel="Try loading your video setting again"
                  busy={video.retrying}
                  onChange={video.retry}
                />
              )}
              {video.data && (
                <SettingSummaryRow
                  ref={videoAction}
                  icon="video_chat"
                  title={videoRowTitle(video.data.provider)}
                  summary={
                    video.data.provider === 'custom'
                      ? VIDEO_ROW_COPY.customSummary
                      : VIDEO_ROW_COPY.summary
                  }
                  actionLabel={VIDEO_ROW_COPY.editLabel}
                  onChange={() => {
                    saveVideo.reset();
                    setVideoOpen(true);
                  }}
                />
              )}
            </section>

            <div className={styles.columns}>
              <WeeklyHoursCard
                className={styles.hoursCard}
                days={draft.days}
                onDays={draft.setDays}
                timeZone={draft.timeZone}
                onTimeZone={draft.setTimeZone}
                titleRef={hoursTitle}
                collapsible={isPhone}
                invalid={invalid}
                dirty={draft.dirty}
                deviceZone={deviceZone}
                otherZones={weekly.data!.otherZones}
                minLength={minLength}
                note={
                  !hasHours && (
                    <div className={styles.note}>
                      <Notice tone="info" icon="info">
                        {HOURS_COPY.noHoursNotice}
                      </Notice>
                    </div>
                  )
                }
              />
              <section
                aria-labelledby={monthTitleId}
                className={cardClass({ className: styles.monthCard })}
              >
                <div className={styles.monthHead}>
                  <h2 id={monthTitleId} className={styles.cardTitle}>
                    Month at a glance
                  </h2>
                </div>
                <MonthPicker
                  readOnly
                  today={today}
                  selected={blocked.data?.days ?? []}
                  booked={(booked.data ?? []).map((b) => b.day)}
                  available={openWeekdays}
                  // Open only where a mentee could book: past the notice, within the window.
                  openFrom={range.from}
                  openUntil={range.until}
                  showLegend
                  onMonthChange={setShownMonth}
                />
                {(booked.error || blocked.error) && (
                  <div role="alert" className={styles.partial}>
                    <Icon name="error" size={16} className={styles.partialIcon} />
                    <span className={styles.partialMsg}>
                      {booked.error && blocked.error
                        ? 'We couldn’t load your booked sessions or blocked dates.'
                        : booked.error
                          ? 'We couldn’t load your booked sessions.'
                          : 'We couldn’t load your blocked dates.'}
                    </span>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        if (booked.error) booked.retry();
                        if (blocked.error) blocked.retry();
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                )}
                {/* While blocked days can't load, the panel would say there are none. */}
                {!blocked.error && blocked.data && (
                  <BlockedDatesPanel
                    days={upcomingBlocked}
                    onEdit={openBlockOut}
                    onUnblock={unblock}
                    busy={blockBusy}
                    error={unblockError}
                  />
                )}
              </section>
            </div>

            {draft.dirty && (
              <SaveBar
                saving={saveWeekly.isPending}
                problem={
                  holdForHours && problem?.kind === 'invalid'
                    ? {
                        kind: 'invalid',
                        // PROVISIONAL (calendar design request, PR 3).
                        message:
                          'Fix the hours marked in red, then save before setting yourself as busy.',
                      }
                    : (problem ??
                      (holdForHours
                        ? {
                            kind: 'hold',
                            // PROVISIONAL (calendar design request, PR 3).
                            message: 'Save or discard your hours first, then set yourself as busy.',
                          }
                        : null))
                }
                onDiscard={onDiscard}
                onSave={onSave}
                saveRef={saveHoursBtn}
              />
            )}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className={styles.page} aria-busy={!panel && !accountGate && !lock && loading}>
        {body}
      </div>
      {windowOpen && defaults.data && (
        <ModalShell
          title={BOOKING_RULES_COPY.title}
          subtitle={BOOKING_RULES_COPY.sub}
          icon="date_range"
          size="md"
          onClose={closeWindow}
        >
          <BookingRulesForm
            initial={defaults.data}
            days={draft.days}
            saving={saveDefaults.isPending}
            error={saveDefaults.error?.message ?? null}
            onCancel={closeWindow}
            onSave={(next) =>
              saveDefaults.save(next).then(
                () => {
                  setWindowOpen(false);
                  announce(BOOKING_RULES_COPY.saved);
                },
                (e: { message: string }) => announce(e.message),
              )
            }
          />
        </ModalShell>
      )}
      {blockOpen && blocked.data && (
        <ModalShell
          title={CALENDAR_PAGE_COPY.blockTitle}
          subtitle="Tap the days you’re away. Mentees won’t be able to book them."
          size="md"
          mobile="sheet"
          onClose={closeBlockOut}
        >
          <BlockOutForm
            today={blockToday}
            initial={upcomingBlocked}
            booked={(booked.data ?? []).filter((b) => b.day >= blockToday)}
            available={openWeekdays}
            openFrom={blockRange?.from}
            openUntil={blockRange?.until}
            saving={saveBlocked.isPending}
            error={saveBlocked.error?.message ?? null}
            onEdit={() => saveBlocked.error && saveBlocked.reset()}
            onMonthChange={setModalMonth}
            onSave={(days) =>
              saveBlocks(days).then(
                () => {
                  setBlockOpen(false);
                  announce('Blocked dates saved.');
                },
                (e: { message: string }) => announce(e.message),
              )
            }
          />
        </ModalShell>
      )}
      {returnOpen && (
        <ModalShell title="When will you be back?" size="md" mobile="sheet" onClose={closeReturn}>
          <ReturnDateForm
            today={accountToday}
            booked={booked.data ?? []}
            saving={pause.isPending}
            error={pause.error?.message ?? null}
            onCancel={closeReturn}
            onEdit={() => pause.error && pause.reset()}
            onMonthChange={setModalMonth}
            onSave={setBusy}
          />
        </ModalShell>
      )}
      {done && (
        <ModalShell
          title="Availability updated"
          size="sm"
          mobile="sheet"
          onClose={() => {
            setDone(null);
            focusSwitch();
          }}
        >
          <div className={styles.done}>
            <EmptyState
              illustration="calendar"
              size={120}
              title={`See you soon, ${member?.firstName ?? 'there'}`}
              description={doneBody(done.back)}
            />
            <Button
              size="large"
              fullWidth
              onClick={() => {
                setDone(null);
                focusSwitch();
              }}
            >
              Done
            </Button>
          </div>
        </ModalShell>
      )}
      {videoOpen && video.data && (
        <ModalShell
          title={VIDEO_ROW_COPY.modalTitle}
          subtitle={VIDEO_ROW_COPY.modalSub}
          icon="video_chat"
          size="lg"
          mobile="sheet"
          onClose={closeVideo}
        >
          <VideoSection
            provider={video.data.provider}
            customUrl={video.data.customUrl}
            onPick={pickVideo}
            heading={false}
          />
        </ModalShell>
      )}
      {switchTo && video.data && (
        <VideoSwitchConfirm
          from={video.data.provider}
          to={switchTo}
          pending={saveVideo.isPending}
          error={saveVideo.error?.message ?? null}
          onKeep={keepVideo}
          onConfirm={() => void confirmVideo(switchTo)}
        />
      )}
      <LiveRegion message={announcement} />
    </>
  );
}

/** The title and intro every state keeps (Calendar v2 header). */
function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Your calendar</h1>
        <p className={styles.lede}>{CALENDAR_PAGE_COPY.lede}</p>
      </div>
      {children}
    </header>
  );
}

/** Load failed / Guest: the grey calendar, the message and one action. */
function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <EmptyState illustration="calendar-grey" title={title} description={body} />
      {children}
    </section>
  );
}

/** Today in the account's zone; a zone the browser can't read falls back to the hours' zone. */
function safeToday(zone: string | undefined, fallback: string): string {
  if (zone) {
    try {
      return todayIn(zone);
    } catch {
      // A legacy or unknown zone name: RangeError from Intl.
    }
  }
  return todayIn(fallback);
}
