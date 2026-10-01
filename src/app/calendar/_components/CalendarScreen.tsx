'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { BlockedDatesPanel } from '@/components/molecules/BlockedDatesPanel/BlockedDatesPanel';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SettingSummaryRow } from '@/components/molecules/SettingSummaryRow/SettingSummaryRow';
import { StatusPill } from '@/components/molecules/StatusPill/StatusPill';
import { BlockOutForm } from '@/components/organisms/BlockOutForm/BlockOutForm';
import { SchedulingWindowForm } from '@/components/organisms/SchedulingWindowForm/SchedulingWindowForm';
import { WeeklyHoursCard } from '@/components/organisms/WeeklyHoursCard/WeeklyHoursCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useBlockedDays, useBookedDays, useSaveBlockedDays } from '@/lib/api/data/calendar';
import { useMentorDefaults, useSaveMentorDefaults } from '@/lib/api/data/sessionTypes';
import { useSaveWeeklyHours, useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { bookableRange, shortDay, todayIn, windowSummary } from '@/lib/utils/calendar';
import { deviceTimeZone } from '@/lib/utils/format';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { useOnline } from '@/lib/utils/useOnline';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { mentorGate, type GateCopy } from '../../_shell/MentorGate';
import { useAppShell } from '../../_shell/useAppShell';
import { CalendarSkeleton } from './CalendarSkeleton';
import { SaveBar, type SaveProblem } from './SaveBar';
import { useHoursDraft } from './useHoursDraft';
import styles from './CalendarScreen.module.css';

/** Copy confirmed by design (Calendar v2 scenes Guest / Not a mentor, 2026-10-01). */
const CALENDAR_GATE: GateCopy = {
  illustration: 'calendar',
  guestTitle: 'Log in to manage your calendar',
  guestDescription: 'Your calendar is where you set when mentees can book you.',
  nonMentorTitle: 'Your calendar is for mentors',
  nonMentorDescription: 'Once you’re a mentor, this is where you set when mentees can book you.',
};

/** /calendar — the mentor's availability (Calendar v2.dc.html, scene Available). */
export function CalendarScreen() {
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const isMentor = !!member?.isMentor;
  const mentorId = isMentor ? member!.id : null;
  const deviceZone = useMemo(() => deviceTimeZone(), []);
  const monthTitleId = useId();

  const weekly = useWeeklyHours(mentorId);
  const saveWeekly = useSaveWeeklyHours(mentorId);
  const defaults = useMentorDefaults(mentorId);
  const saveDefaults = useSaveMentorDefaults(mentorId);
  const draft = useHoursDraft(weekly.data, deviceZone);
  const booked = useBookedDays(mentorId, draft.timeZone);
  const blocked = useBlockedDays(mentorId);
  const saveBlocked = useSaveBlockedDays(mentorId);
  useLeaveGuard(draft.dirty, 'your weekly hours');

  const [windowOpen, setWindowOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, id: (a?.id ?? 0) + 1 })),
    [],
  );

  const hoursTitle = useRef<HTMLHeadingElement>(null);
  const invalid = draft.slotErrors || !!draft.clash;
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
              : failure.message.startsWith('Some of')
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

  // Blocked days are counted in the zone the hours are kept in (what's saved).
  const blockZone = weekly.data?.timeZone ?? draft.timeZone;
  const blockToday = todayIn(blockZone);
  const upcomingBlocked = (blocked.data?.days ?? []).filter((d) => d >= blockToday);
  const saveBlocks = (wanted: string[]) =>
    saveBlocked.save({
      exceptions: blocked.data?.exceptions ?? [],
      wanted,
      today: blockToday,
      timeZone: blockZone,
    });
  const openBlockOut = () => {
    saveBlocked.reset();
    setBlockOpen(true);
  };
  const closeBlockOut = () => {
    if (!saveBlocked.isPending) setBlockOpen(false);
  };
  // A chip's ×: no confirm (one tap puts it back), the result is read out.
  const unblock = (day: string) => {
    setUnblocking(day);
    saveBlocks(upcomingBlocked.filter((d) => d !== day))
      .then(
        () => announce(`${shortDay(day)} is open again.`),
        (e: { message: string }) => announce(e.message),
      )
      .finally(() => setUnblocking(null));
  };

  // A failed save's message belongs to that draft: once the hours match what's
  // saved again, it goes.
  const { error: saveError, reset: resetSave } = saveWeekly;
  useEffect(() => {
    if (!draft.dirty && saveError) resetSave();
  }, [draft.dirty, saveError, resetSave]);

  // Unlinked and existing-account notices keep the shared gate; the rest are
  // Calendar v2 panels under the page header.
  const accountGate =
    viewer.kind === 'unlinked' || viewer.kind === 'accountExists'
      ? mentorGate(viewer, isMentor, '/calendar', CALENDAR_GATE)
      : null;
  const loading = viewer.kind === 'loading' || weekly.isLoading || defaults.isLoading;
  const failed = weekly.error ?? defaults.error;
  const ready = !!weekly.data && !!defaults.data && isMentor;

  let panel: ReactNode = null;
  if (viewer.kind === 'guest')
    panel = (
      <Panel title={CALENDAR_GATE.guestTitle} body={CALENDAR_GATE.guestDescription}>
        <ButtonLink href="/login?next=%2Fcalendar" prefetch={false} size="large">
          Log in
        </ButtonLink>
      </Panel>
    );
  else if (viewer.kind === 'member' && !isMentor)
    panel = (
      <Panel title={CALENDAR_GATE.nonMentorTitle} body={CALENDAR_GATE.nonMentorDescription}>
        <ButtonLink href="/explore" size="large">
          Find a mentor
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
          }}
        >
          Try again
        </Button>
      </Panel>
    );

  let body: ReactNode;
  if (accountGate) body = accountGate;
  else if (panel || loading || !ready)
    body = (
      <>
        <PageHeader />
        {panel ?? <CalendarSkeleton />}
      </>
    );
  else {
    const hasHours = weekly.data!.days.some((d) => d.on);
    const today = todayIn(draft.timeZone);
    const range = bookableRange(today, defaults.data!);
    body = (
      <>
        <PageHeader>
          {/* Busy and its switch come with the busy flow (PR 3); until then only a listed
              mentor with hours is "Available". */}
          {member?.isListedMentor && hasHours && (
            <StatusPill tone="available" label="Available" hint="Open for new bookings" />
          )}
        </PageHeader>

        <section aria-label="Session settings" className={styles.settings}>
          <SettingSummaryRow
            icon="date_range"
            title="Scheduling window"
            summary={windowSummary(defaults.data!)}
            actionLabel="Change scheduling window"
            onChange={() => {
              saveDefaults.reset();
              setWindowOpen(true);
            }}
          />
        </section>

        <div className={styles.columns}>
          <WeeklyHoursCard
            className={styles.hoursCard}
            days={draft.days}
            onDays={draft.setDays}
            timeZone={draft.timeZone}
            onTimeZone={draft.setTimeZone}
            titleRef={hoursTitle}
            deviceZone={deviceZone}
            otherZones={weekly.data!.otherZones}
            note={
              !hasHours && (
                <div className={styles.note}>
                  <Notice tone="info" icon="info">
                    Mentees can find and book you once you set your weekly hours.
                  </Notice>
                </div>
              )
            }
          />
          <section aria-labelledby={monthTitleId} className={styles.monthCard}>
            <div className={styles.monthHead}>
              <h2 id={monthTitleId} className={styles.cardTitle}>
                Month at a glance
              </h2>
              <button type="button" className={styles.blockedBtn} onClick={openBlockOut}>
                <Icon name="event_busy" size={16} className={styles.blockedBtnIcon} />
                {upcomingBlocked.length
                  ? `Blocked dates (${upcomingBlocked.length})`
                  : 'Blocked dates'}
              </button>
            </div>
            <MonthPicker
              readOnly
              today={today}
              selected={blocked.data?.days ?? []}
              booked={(booked.data ?? []).map((b) => b.day)}
              available={draft.days.flatMap((d, i) => (d.on ? [i] : []))}
              // Open only where a mentee could book: past the notice, within the window.
              openFrom={range.from}
              openUntil={range.until}
              showLegend
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
                busyDay={unblocking}
              />
            )}
          </section>
        </div>

        {draft.dirty && (
          <SaveBar
            saving={saveWeekly.isPending}
            problem={problem}
            onDiscard={onDiscard}
            onSave={onSave}
          />
        )}
      </>
    );
  }

  return (
    <AppShell active="Calendar" nav={nav} chrome={chrome} account={account} offline={!online}>
      <div className={styles.page} aria-busy={!panel && !accountGate && loading}>
        {body}
      </div>
      {windowOpen && defaults.data && (
        <ModalShell
          title="Scheduling window"
          subtitle="When mentees can book you and how long sessions last. Applies to every session type."
          icon="date_range"
          size="md"
          onClose={closeWindow}
        >
          <SchedulingWindowForm
            initial={defaults.data}
            days={draft.days}
            saving={saveDefaults.isPending}
            error={saveDefaults.error?.message ?? null}
            onCancel={closeWindow}
            onSave={(next) =>
              saveDefaults.save(next).then(
                () => {
                  setWindowOpen(false);
                  announce('Your scheduling window is saved.');
                },
                (e: { message: string }) => announce(e.message),
              )
            }
          />
        </ModalShell>
      )}
      {blockOpen && blocked.data && (
        <ModalShell
          title="Block out dates"
          subtitle="Tap the days you’re away. Mentees won’t be able to book them."
          size="md"
          onClose={closeBlockOut}
        >
          <BlockOutForm
            today={blockToday}
            initial={upcomingBlocked}
            booked={(booked.data ?? []).filter((b) => b.day >= blockToday)}
            saving={saveBlocked.isPending}
            error={saveBlocked.error?.message ?? null}
            onSave={(days) =>
              saveBlocks(days).then(
                () => {
                  setBlockOpen(false);
                  announce('Your blocked dates are saved.');
                },
                (e: { message: string }) => announce(e.message),
              )
            }
          />
        </ModalShell>
      )}
      <LiveRegion message={announcement} />
    </AppShell>
  );
}

/** The title and intro every state keeps (Calendar v2 header). */
function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Your calendar</h1>
        <p className={styles.lede}>
          Set when mentees can book you, block the days you’re away, and choose how sessions run.
        </p>
      </div>
      {children}
    </header>
  );
}

/** Load failed / Not a mentor / Guest: the grey calendar, the message and one action. */
function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <EmptyState illustration="calendar-grey" title={title} description={body} />
      {children}
    </section>
  );
}
