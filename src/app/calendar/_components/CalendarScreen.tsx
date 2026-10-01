'use client';

import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SettingSummaryRow } from '@/components/molecules/SettingSummaryRow/SettingSummaryRow';
import { StatusPill } from '@/components/molecules/StatusPill/StatusPill';
import { SchedulingWindowForm } from '@/components/organisms/SchedulingWindowForm/SchedulingWindowForm';
import { WeeklyHoursCard } from '@/components/organisms/WeeklyHoursCard/WeeklyHoursCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useBlockedDays, useBookedDays } from '@/lib/api/data/calendar';
import { useMentorDefaults, useSaveMentorDefaults } from '@/lib/api/data/sessionTypes';
import { useSaveWeeklyHours, useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { todayIn, windowSummary } from '@/lib/utils/calendar';
import { deviceTimeZone } from '@/lib/utils/format';
import { useLeaveGuard } from '@/lib/utils/leaveGuard';
import { useOnline } from '@/lib/utils/useOnline';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { mentorGate, type GateCopy } from '../../_shell/MentorGate';
import { useAppShell } from '../../_shell/useAppShell';
import { CalendarSkeleton } from './CalendarSkeleton';
import { SaveBar } from './SaveBar';
import { useHoursDraft } from './useHoursDraft';
import styles from './CalendarScreen.module.css';

/** PROVISIONAL copy (calendar design request #1). */
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
  useLeaveGuard(draft.dirty, 'your weekly hours');

  const [windowOpen, setWindowOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, id: (a?.id ?? 0) + 1 })),
    [],
  );

  const invalid = draft.slotErrors || !!draft.clash;
  const blockReason =
    !tried || !invalid
      ? null
      : // The Session Types modal's copy (confirmed by design, reply 2026-09-29, #7).
        draft.clash && !draft.slotErrors
        ? `Some of these hours overlap hours you set in ${zoneLabel(draft.clash.zone)}. Change them, then save.`
        : 'Fix the hours marked in red, then save.';

  const onSave = () => {
    setTried(true);
    if (invalid || !weekly.data) return;
    saveWeekly.save({ current: weekly.data, days: draft.days, timeZone: draft.timeZone }).then(
      () => {
        draft.markSaved();
        setTried(false);
        announce('Your weekly hours are saved.');
      },
      () => {},
    );
  };
  const onDiscard = () => {
    draft.discard();
    saveWeekly.reset();
    setTried(false);
    announce('Your changes were discarded.');
  };

  const gate = mentorGate(viewer, isMentor, '/calendar', CALENDAR_GATE);
  const loading = viewer.kind === 'loading' || weekly.isLoading || defaults.isLoading;
  const failed = weekly.error ?? defaults.error;

  let body: ReactNode;
  if (gate) body = gate;
  // Error before empty: a failed load never reads as "no hours".
  else if (failed && !weekly.data)
    body = (
      <div className={styles.state}>
        <EmptyState
          illustration="calendar-grey"
          size={120}
          // The state is the whole page, so its title is the page's h1.
          headingLevel={1}
          // PROVISIONAL copy (calendar design request #1).
          title="We couldn’t load your calendar"
          description={
            failed.kind === 'offline'
              ? 'You’re offline. Your hours will load when you reconnect.'
              : 'Something went wrong on our side. Try again in a moment.'
          }
          actions={
            <Button
              size="large"
              onClick={() => {
                weekly.retry();
                defaults.retry();
              }}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  else if (loading || !weekly.data || !defaults.data) body = <CalendarSkeleton />;
  else {
    const hasHours = weekly.data.days.some((d) => d.on);
    const today = todayIn(draft.timeZone);
    body = (
      <>
        <header className={styles.header}>
          <div className={styles.intro}>
            <h1 className={styles.title}>Your calendar</h1>
            <p className={styles.lede}>
              Set when mentees can book you, block the days you’re away, and choose how sessions
              run.
            </p>
          </div>
          {/* Busy and its switch come with the busy flow (PR 3); until then only a listed
              mentor with hours is "Available". */}
          {member?.isListedMentor && hasHours && (
            <StatusPill tone="available" label="Available" hint="Open for new bookings" />
          )}
        </header>

        <section aria-label="Session settings" className={styles.settings}>
          <SettingSummaryRow
            icon="date_range"
            title="Scheduling window"
            summary={windowSummary(defaults.data)}
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
            deviceZone={deviceZone}
            otherZones={weekly.data.otherZones}
            note={
              !hasHours && (
                <div className={styles.note}>
                  {/* PROVISIONAL copy (calendar design request #1; from the dashboard's needsHours banner). */}
                  <Notice tone="info" icon="calendar_month">
                    Mentees can find and book you once you set your weekly hours.
                  </Notice>
                </div>
              )
            }
          />
          <section aria-labelledby={monthTitleId} className={styles.monthCard}>
            <h2 id={monthTitleId} className={styles.cardTitle}>
              Month at a glance
            </h2>
            <MonthPicker
              readOnly
              today={today}
              selected={blocked.data ?? []}
              booked={booked.data ?? []}
              available={draft.days.flatMap((d, i) => (d.on ? [i] : []))}
              showLegend
            />
            {(booked.error || blocked.error) && (
              <p className={styles.partial}>
                {/* PROVISIONAL copy (calendar design request #1). */}
                {booked.error && blocked.error
                  ? 'We couldn’t load your booked sessions or blocked dates.'
                  : booked.error
                    ? 'We couldn’t load your booked sessions.'
                    : 'We couldn’t load your blocked dates.'}{' '}
                <button
                  type="button"
                  className={styles.textBtn}
                  onClick={() => {
                    if (booked.error) booked.retry();
                    if (blocked.error) blocked.retry();
                  }}
                >
                  Try again
                </button>
              </p>
            )}
          </section>
        </div>

        {draft.dirty && (
          <SaveBar
            saving={saveWeekly.isPending}
            error={blockReason ?? saveWeekly.error?.message ?? null}
            onDiscard={onDiscard}
            onSave={onSave}
          />
        )}
      </>
    );
  }

  return (
    <AppShell active="Calendar" nav={nav} chrome={chrome} account={account} offline={!online}>
      <div className={styles.page} aria-busy={!gate && !failed && loading}>
        {body}
      </div>
      {windowOpen && defaults.data && (
        <ModalShell
          title="Scheduling window"
          subtitle="When mentees can book you and how long sessions last. Applies to every session type."
          icon="date_range"
          size="md"
          onClose={() => setWindowOpen(false)}
        >
          <SchedulingWindowForm
            initial={defaults.data}
            days={draft.days}
            saving={saveDefaults.isPending}
            error={saveDefaults.error?.message ?? null}
            onCancel={() => setWindowOpen(false)}
            onSave={(next) =>
              saveDefaults.save(next).then(
                () => {
                  setWindowOpen(false);
                  announce('Your scheduling window is saved.');
                },
                () => {},
              )
            }
          />
        </ModalShell>
      )}
      <LiveRegion message={announcement} />
    </AppShell>
  );
}
