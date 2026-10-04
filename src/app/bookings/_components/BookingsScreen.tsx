'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Tabs, type TabItem } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { Notice } from '@/components/molecules/Notice/Notice';
import { TimezonePicker } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { BookingDetailsPanel } from '@/components/organisms/BookingDetailsPanel/BookingDetailsPanel';
import { NextSessionCard } from '@/components/organisms/NextSessionCard/NextSessionCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import {
  useBooking,
  useBookingHistory,
  useJoinSession,
  usePendingBookings,
  useUpcomingBookings,
} from '@/lib/api/data/bookings';
import { useBookingAnswers } from '@/lib/api/data/sessionAnswers';
import { useBookingOutcome } from '@/lib/api/data/sessionEvents';
import { normaliseError } from '@/lib/api/data/errors';
import { deviceTimeZone } from '@/lib/utils/format';
import { useHydrated } from '@/lib/utils/useHydrated';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { useOnline } from '@/lib/utils/useOnline';
import type { AnswerFile, Booking, BookingStatus } from '@/types/booking';
import { canBookFor } from '../../_shell/bookBlocked';
import { BOOKINGS_GATE, memberGate } from '../../_shell/MentorGate';
import { cx } from '@/lib/utils/cx';
import { useAppShell } from '../../_shell/useAppShell';
import { Button } from '@/components/atoms/Button/Button';
import type { RowMenuItem } from '@/components/molecules/RowMenu/RowMenu';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { IntakeFileViewer } from './IntakeFileViewer';
import {
  bookingHeading,
  canAccept,
  canCancel,
  canWithdraw,
  fullDate,
  HISTORY_FILTERS,
  overlapping,
} from '@/lib/utils/bookings';
import { useBookingAction } from '@/lib/api/data/bookingActions';
import { useMyReviewableSessions } from '@/lib/api/data/reviewableSessions';
import { BookingsPanel } from './BookingsPanel';
import { useBookingsTab } from './useBookingsTab';
import { useRevealed } from './useRevealed';
import { useRouter } from 'next/navigation';
import { useSelectedBooking } from './useSelectedBooking';
import styles from './BookingsScreen.module.css';

/** The details panel's element id, as BookingDetailsPanel renders it. */
const PANEL_ID = 'booking-details';

/**
 * The browser swallowed the new tab. Said wherever the Join was pressed, with
 * the link, because the attendance is already recorded and this is the only
 * route left to the meeting.
 */
function BlockedNotice({ url }: { url: string }) {
  return (
    <Notice tone="info">
      Your browser blocked the meeting window.{' '}
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open the session
      </a>
      . You’re already marked as here.
    </Notice>
  );
}

/** `/bookings` — the sessions a person has booked or been booked for (Bookings.dc.html). */
export function BookingsScreen() {
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const { tab, setTab } = useBookingsTab();
  const userId = member?.id ?? null;
  const isMentor = !!member?.isMentor;
  const canBook = canBookFor(viewer);

  // A minute is enough for every deadline on this page, and keeps "Starts in
  // 8 min" honest. Without it, Join never enables for someone already looking
  // at the page, and a lapsing request keeps its countdown (BookingFlow's
  // useTimeChoice does the same).
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(clock), [clock]);

  const deviceZone = useMemo(() => deviceTimeZone(), []);
  // The account's zone is what the backend judges dates in; the picker is the
  // viewer's own override for this visit.
  const [zone, setZone] = useState<string | null>(null);
  const timeZone = zone ?? member?.timeZone ?? deviceZone;
  // What the backend compares `from` against — never the display override.
  const accountZone = member?.timeZone ?? deviceZone;

  const [filters, setFilters] = useState<BookingStatus[]>([]);
  // Fetched on Pending too: the clash check reads it, and Pending is where the
  // nav badge sends a mentor, so gating it on the Upcoming tab meant the one
  // warning that matters never appeared on the path that matters.
  const upcoming = useUpcomingBookings(userId, accountZone, tab === 'upcoming' || tab === 'pending');
  const pending = usePendingBookings(userId, tab === 'pending');
  const history = useBookingHistory(userId, filters, tab === 'history');

  const { selected, select, toggle } = useSelectedBooking();
  const router = useRouter();
  // The design's own breakpoint for this screen: below it the aside has no
  // room beside the 920px column, so the panel takes the whole screen.
  const asSheet = useMediaQuery('(max-width: 1099px)');
  // matchMedia answers `false` until the client runs, so a phone opening a
  // ?booking= link would paint the 380px aside beside the list and then swap to
  // the sheet. The panel is secondary, so it waits a frame rather than jump.
  const ready = useHydrated();
  // Whichever list is loaded may already hold it — opening the panel from a row
  // costs no request. A ?booking= link opened cold has to ask.
  const loaded = [...(upcoming.data ?? []), ...(pending.data ?? []), ...history.bookings].find(
    (b) => b.id === selected,
  );
  const fetched = useBooking(selected, userId, !!selected && !loaded);
  const open = loaded ?? fetched.data;
  const outcome = useBookingOutcome(open ?? null, userId, !!open);
  // Only while the panel is open: a list of twenty rows must not make twenty
  // requests. One per booking, cached for the visit.
  const answers = useBookingAnswers(open?.id ?? null, userId ?? '', !!open);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AnswerFile | null>(null);
  const showPanel = ready && (!!open || !!selected);
  const openId = open?.id ?? null;
  const answersExpanded = !!openId && expandedFor === openId;
  const openAnswers = (id: string) => {
    select(id);
    // Set against the id rather than a boolean: the panel may still be on the
    // previous booking this tick, and the expansion belongs to this one.
    setExpandedFor(id);
  };

  const join = useJoinSession();
  // A repeated failure must be heard again, so each message carries a new id.
  const [joinProblem, setJoinProblem] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback((text: string) => setJoinProblem({ text, id: Date.now() }), []);
  // The browser blocked the new tab: offer the link rather than leaving the
  // click looking broken.
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  // Which Join was pressed. On a phone the panel is a full-screen sheet over
  // everything, so a message left on the page behind it cannot be seen or
  // clicked — and the blocked-popup link is the only way to the meeting.
  const [joinFrom, setJoinFrom] = useState<'hero' | 'panel' | null>(null);

  const reveal = {
    upcoming: useRevealed(),
    pending: useRevealed(),
    history: useRevealed(),
  };
  // A filter change shortens the list; the old reveal count would leave "Show
  // 5 more" pointing at rows that are no longer there.
  const resetHistory = reveal.history.reset;
  useEffect(() => resetHistory(), [filters, resetHistory]);

  const counts = member?.bookingCounts;
  const items: TabItem[] = [
    {
      value: 'upcoming',
      label: 'Upcoming',
      panelId: 'bookings-upcoming',
      count: counts?.upcoming ?? null,
      countLabel: counts?.upcoming != null ? `${counts.upcoming} upcoming` : undefined,
    },
    {
      value: 'pending',
      label: 'Pending',
      panelId: 'bookings-pending',
      count: counts?.pending ?? null,
      countLabel: counts?.pending != null ? `${counts.pending} awaiting a response` : undefined,
    },
    { value: 'history', label: 'History', panelId: 'bookings-history' },
  ];

  // Addressed to one side only when every row is on that side. A dual-role
  // account with one incoming and one outgoing request gets neither line,
  // because either would be wrong above half the list (failure log #38).
  const pendingRows = pending.data ?? [];
  const hosting = pendingRows.some((b) => b.side === 'mentor');
  const sending = pendingRows.some((b) => b.side === 'mentee');
  const pendingIntro =
    hosting && !sending
      ? // PR 1 has no accept or decline control, so the line stops at the fact.
        'These mentees asked for a time.'
      : sending && !hosting
        ? 'Requests you sent that your mentor hasn’t confirmed yet.'
        : undefined;

  // The write actions (backend: accept/decline/withdraw/cancel). One hook per
  // action so each knows its own pending and error, and the dialog can show
  // them without the screen holding four parallel flags.
  const accept = useBookingAction('accept');
  const decline = useBookingAction('decline');
  const withdraw = useBookingAction('withdraw');
  const cancel = useBookingAction('cancel');
  const [confirming, setConfirming] = useState<{
    action: 'decline' | 'withdraw' | 'cancel';
    booking: Booking;
  } | null>(null);
  const pendingAction = confirming
    ? { decline, withdraw, cancel }[confirming.action]
    : null;

  // Which completed sessions this mentee can still review. The list is the
  // authority — it already applies "completed only", "not already reviewed" and
  // the 30-day interval per offering — so nothing here re-derives eligibility.
  const reviewable = useMyReviewableSessions(tab === 'history');
  const canReview = (b: Booking) =>
    b.side === 'mentee' && (reviewable.data ?? []).some((r) => r.id === b.id);

  const rowMenu = (b: Booking) => {
    const items: RowMenuItem[] = [
      {
        key: 'details',
        icon: 'info',
        label: selected === b.id ? 'Hide details' : 'See details',
        onSelect: () => toggle(b.id),
      },
    ];
    // Only what this person can actually do to this booking, now. A control
    // that would be refused is worse than no control.
    if (canWithdraw(b, now))
      items.push({
        key: 'withdraw',
        icon: 'block',
        label: 'Withdraw request',
        onSelect: () => setConfirming({ action: 'withdraw', booking: b }),
        danger: true,
      });
    if (canCancel(b, now))
      items.push({
        key: 'cancel',
        icon: 'block',
        label: 'Cancel session',
        onSelect: () => setConfirming({ action: 'cancel', booking: b }),
        danger: true,
      });
    return items;
  };

  const clashId = (id: string) => `clash-${id}`;

  /**
   * Full width under the row's detail, never in the button rail: a block in
   * there collapses the content column to nothing from 1100px up.
   */
  const rowNotice = (b: Booking) => {
    if (!canAccept(b, now)) return null;
    const clash = overlapping(b, upcoming.data ?? []);
    const failed = accept.isError && accept.variables?.bookingId === b.id ? accept.error : null;
    if (!clash && !failed) return null;
    return (
      <>
        {/* The design warns rather than blocks: accepting both may be exactly
            what they mean. Saying so first is the point. */}
        {clash && (
          <Notice tone="info" icon="error" id={clashId(b.id)}>
            This overlaps your session with <strong>{clash.other.firstName}</strong> on{' '}
            <strong>{fullDate(clash.startsAt, timeZone)}</strong>. Accepting books both.
          </Notice>
        )}
        {/* Accept has no dialog to carry its refusal, and the live region is
            screen-reader only — so a sighted mentor saw nothing at all. */}
        {failed && (
          <Notice tone="neutral" icon="error">
            {failed.message}
          </Notice>
        )}
      </>
    );
  };

  /** The mentor's two answers to a pending request, on the row itself. */
  const rowActions = (b: Booking) => {
    if (!canAccept(b, now)) return null;
    const clash = overlapping(b, upcoming.data ?? []);
    return (
      <>
        {/* The design's own variants: an outlined Accept and a destructive
            *text* Decline, so the row does not carry two competing fills. */}
        <Button
          variant="secondary-outlined"
          size="small"
          busy={accept.isPending && accept.variables?.bookingId === b.id}
          aria-describedby={clash ? clashId(b.id) : undefined}
          onClick={() =>
            accept.mutate(
              { bookingId: b.id },
              {
                // Accept has no dialog to carry its refusal, so it goes to the
                // live region. Silence after a click reads as the app ignoring
                // it, which is the one thing a write must never do.
                onError: (e) => say(e.message),
                onSuccess: () => say(`Accepted. ${bookingHeading(b)} is confirmed.`),
              },
            )
          }
        >
          {accept.isPending && accept.variables?.bookingId === b.id ? 'Accepting…' : 'Accept'}
        </Button>
        <Button
          variant="text-destructive"
          size="small"
          onClick={() => setConfirming({ action: 'decline', booking: b })}
        >
          Decline
        </Button>
      </>
    );
  };

  // A chip is several statuses now: turning it off must clear all of them, or
  // the chip reads as off while still filtering.
  const toggleFilter = (group: BookingStatus[]) =>
    setFilters((on) =>
      group.every((s) => on.includes(s))
        ? on.filter((s) => !group.includes(s))
        : [...on, ...group.filter((s) => !on.includes(s))],
    );

  const onJoin = useCallback(
    (sessionId: string, from: 'hero' | 'panel') => {
      setJoinProblem(null);
      setBlockedUrl(null);
      setJoinFrom(from);
      join.mutate(sessionId, {
        onSuccess: ({ meetingUrl }) => {
          // Attendance is recorded either way — the rest is only about getting
          // there. The POST is awaited, so this open is outside the click's
          // gesture and a popup blocker can swallow it; `open` returns null
          // when it does, and silence would read as a dead button.
          if (!meetingUrl) {
            say('You’re marked as here, but this session has no meeting link yet.');
            return;
          }
          const opened = window.open(meetingUrl, '_blank', 'noopener,noreferrer');
          if (!opened) setBlockedUrl(meetingUrl);
        },
        onError: (e) => {
          setBlockedUrl(null);
          const err = normaliseError(e);
          say(
            err.status === 409
              ? 'This session isn’t open to join right now.'
              : 'We couldn’t join you. Try again in a moment.',
          );
        },
      });
    },
    [join, say],
  );

  const gate = memberGate(viewer, '/bookings', BOOKINGS_GATE);
  // Upcoming's first row is the hero; the list holds the rest.
  const all = upcoming.data ?? [];
  const [next, ...later] = all;

  return (
    <AppShell active="Bookings" nav={nav} chrome={chrome} account={account} offline={!online}>
      {gate ?? (
        <div className={cx(styles.page, showPanel && !asSheet && styles.withAside)}>
          <header className={styles.header}>
            <h1 className={styles.title}>Bookings</h1>
            <TimezonePicker value={timeZone} onChange={setZone} deviceZone={deviceZone} />
          </header>

          <Tabs items={items} value={tab} onChange={setTab} label="Bookings" />

          <div className={styles.columns}>
            <div className={styles.column}>

          {/* One live region for the whole page: sr-only, so it is heard even
              while the sheet covers everything. */}
          <LiveRegion message={joinProblem} />
          {blockedUrl && joinFrom !== 'panel' && <BlockedNotice url={blockedUrl} />}

          <TabPanel id="bookings-upcoming" active={tab === 'upcoming'}>
            <BookingsPanel
              tab="upcoming"
              bookings={later}
              isLoading={upcoming.isLoading}
              error={upcoming.error}
              retry={upcoming.retry}
              timeZone={timeZone}
              isMentor={isMentor}
              heading={later.length ? 'Later' : undefined}
              now={now}
              total={later.length}
              menuFor={rowMenu}
              onOpenAnswers={openAnswers}
              answersControls={showPanel ? PANEL_ID : undefined}
              selectedId={selected}
              shown={reveal.upcoming.shown}
              showMore={reveal.upcoming.showMore}
            >
              {next && (
                <NextSessionCard
                  booking={next}
                  onOpenAnswers={() => openAnswers(next.id)}
                  answersControls={showPanel ? PANEL_ID : undefined}
                  timeZone={timeZone}
                  onJoin={() => onJoin(next.id, 'hero')}
                  joining={join.isPending}
                  menu={rowMenu(next)}
                  now={now}
                />
              )}
            </BookingsPanel>
          </TabPanel>

          <TabPanel id="bookings-pending" active={tab === 'pending'}>
            <BookingsPanel
              tab="pending"
              bookings={pending.data ?? []}
              isLoading={pending.isLoading}
              error={pending.error}
              retry={pending.retry}
              timeZone={timeZone}
              isMentor={isMentor}
              intro={pendingIntro}
              total={pending.data?.length}
              now={now}
              menuFor={rowMenu}
              actionsFor={rowActions}
              noticeFor={rowNotice}
              onOpenAnswers={openAnswers}
              answersControls={showPanel ? PANEL_ID : undefined}
              selectedId={selected}
              shown={reveal.pending.shown}
              showMore={reveal.pending.showMore}
            />
          </TabPanel>

          <TabPanel id="bookings-history" active={tab === 'history'}>
            <div className={styles.filters}>
              {HISTORY_FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  // A chip covers several outcomes now, so it reads as on only
                  // when all of them are.
                  pressed={f.statuses.every((st) => filters.includes(st))}
                  onClick={() => toggleFilter(f.statuses)}
                >
                  {f.label}
                </Chip>
              ))}
            </div>
            <BookingsPanel
              tab="history"
              bookings={history.bookings}
              isLoading={history.isLoading}
              error={history.error}
              retry={history.retry}
              timeZone={timeZone}
              isMentor={isMentor}
              filtered={filters.length > 0}
              menuFor={rowMenu}
              selectedId={selected}
              shown={reveal.history.shown}
              showMore={() => {
                reveal.history.showMore();
                // Reveal runs ahead of what is loaded: fetch the next page too.
                if (history.bookings.length <= reveal.history.shown && history.hasMore)
                  history.loadMore();
              }}
              // Once the last page is in, the loaded count IS the total; while
              // more is coming the API sends none, so the caption says less.
              total={history.hasMore ? undefined : history.bookings.length}
              hasMore={history.hasMore}
              loadMoreError={history.loadMoreError}
              isLoadingMore={history.isLoadingMore}
              actionsFor={(b) =>
                // Only a session this viewer booked can be booked again, and a
                // mentor never books at all.
                canReview(b) ? (
                  <ButtonLink
                    // The review flow lives on the profile; linking there keeps
                    // one implementation rather than mounting it twice.
                    href={`/mentors/${b.other.id}?tab=reviews`}
                    prefetch={false}
                    variant="secondary-outlined"
                    size="small"
                  >
                    Leave a review
                  </ButtonLink>
                ) : canBook && b.side === 'mentee' && b.status === 'completed' ? (
                  <ButtonLink
                    href={`/mentors/${b.other.id}`}
                    prefetch={false}
                    variant="secondary-outlined"
                    size="small"
                  >
                    Book again
                  </ButtonLink>
                ) : null
              }
            />
          </TabPanel>
            </div>
            {showPanel && (
              <BookingDetailsPanel
                asSheet={asSheet}
                booking={open ?? null}
                timeZone={timeZone}
                joinNotice={
                  joinFrom === 'panel' && blockedUrl ? <BlockedNotice url={blockedUrl} /> : null
                }
                joinProblem={joinFrom === 'panel' ? (joinProblem?.text ?? null) : null}
                outcome={outcome.data}
                outcomeLoading={outcome.isLoading}
                answers={answers.data}
                answersLoading={answers.isLoading}
                answersFailed={!!answers.error}
                retryAnswers={answers.retry}
                onBookSuggestion={
                  open?.suggestion && open.side === 'mentee'
                    ? () =>
                        // The held slot is listed for this mentee alone, so the
                        // ordinary flow at that time is all it takes — no
                        // special path, and the booking limits still apply.
                        router.push(
                          `/mentors/${open.other.id}?at=${encodeURIComponent(open.suggestion!.startsAt)}`,
                        )
                    : undefined
                }
                answersExpanded={answersExpanded}
                onToggleAnswers={() => setExpandedFor(answersExpanded ? null : openId)}
                onOpenFile={setViewing}
                outcomeFailed={!!outcome.error}
                retryOutcome={outcome.retry}
                isLoading={fetched.isLoading}
                error={fetched.error}
                retry={fetched.retry}
                onClose={() => {
                  // Forget the expansion too: reopening through "See details"
                  // should show what it says, not what the last visit left.
                  setExpandedFor(null);
                  select(null);
                }}
                onJoin={open ? () => onJoin(open.id, 'panel') : undefined}
                joining={join.isPending}
                now={now}
              />
            )}
          </div>
          {viewing && <IntakeFileViewer file={viewing} onClose={() => setViewing(null)} />}
          {confirming && pendingAction && (
            <ConfirmActionDialog
              action={confirming.action}
              booking={confirming.booking}
              timeZone={timeZone}
              viewerId={userId ?? ''}
              now={now}
              pending={pendingAction.isPending}
              error={pendingAction.error}
              onClose={() => {
                // Escape and the ✕ go through here too, so the in-flight guard
                // has to live at this level rather than only on "Keep it".
                if (pendingAction.isPending) return;
                pendingAction.reset();
                setConfirming(null);
              }}
              onConfirm={(input) =>
                pendingAction.mutate(
                  { bookingId: confirming.booking.id, ...input },
                  // Closed only on success: a refusal stays on screen with the
                  // reason still typed, so it can be sent again.
                  { onSuccess: () => setConfirming(null) },
                )
              }
            />
          )}
        </div>
      )}
    </AppShell>
  );
}
