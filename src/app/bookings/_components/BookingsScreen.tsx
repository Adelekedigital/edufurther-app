'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Chip } from '@/components/atoms/Chip/Chip';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Tabs, type TabItem } from '@/components/atoms/Tabs/Tabs';
import { TabPanel } from '@/components/atoms/Tabs/TabPanel';
import { TimezonePicker } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { NextSessionCard } from '@/components/organisms/NextSessionCard/NextSessionCard';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import {
  useBookingHistory,
  useJoinSession,
  usePendingBookings,
  useUpcomingBookings,
} from '@/lib/api/data/bookings';
import { normaliseError } from '@/lib/api/data/errors';
import { deviceTimeZone } from '@/lib/utils/format';
import { useOnline } from '@/lib/utils/useOnline';
import type { BookingStatus } from '@/types/booking';
import { BOOKINGS_GATE, memberGate } from '../../_shell/MentorGate';
import { useAppShell } from '../../_shell/useAppShell';
import { BookingsPanel } from './BookingsPanel';
import { useBookingsTab } from './useBookingsTab';
import { useRevealed } from './useRevealed';
import styles from './BookingsScreen.module.css';

/**
 * The History filter chips. The design drew three; the API has six past
 * outcomes, so `declined`, `expired` and `withdrawn` are reachable only with no
 * filter on. Raised in docs/handoff/bookings-design-request.md.
 */
const FILTERS: { label: string; status: BookingStatus }[] = [
  { label: 'Canceled', status: 'cancelled' },
  { label: 'Missed', status: 'noShow' },
  { label: 'Completed', status: 'completed' },
];

/** `/bookings` — the sessions a person has booked or been booked for (Bookings.dc.html). */
export function BookingsScreen() {
  const { viewer, member, chrome, account, nav } = useAppShell();
  const online = useOnline();
  const { tab, setTab } = useBookingsTab();
  const userId = member?.id ?? null;
  const isMentor = !!member?.isMentor;

  const deviceZone = useMemo(() => deviceTimeZone(), []);
  // The account's zone is what the backend judges dates in; the picker is the
  // viewer's own override for this visit.
  const [zone, setZone] = useState<string | null>(null);
  const timeZone = zone ?? member?.timeZone ?? deviceZone;

  const [filters, setFilters] = useState<BookingStatus[]>([]);
  const upcoming = useUpcomingBookings(userId, timeZone, tab === 'upcoming');
  const pending = usePendingBookings(userId, tab === 'pending');
  const history = useBookingHistory(userId, filters, tab === 'history');

  const join = useJoinSession();
  // A repeated failure must be heard again, so each message carries a new id.
  const [joinProblem, setJoinProblem] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback((text: string) => setJoinProblem({ text, id: Date.now() }), []);

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

  const toggleFilter = (s: BookingStatus) =>
    setFilters((on) => (on.includes(s) ? on.filter((x) => x !== s) : [...on, s]));

  const onJoin = useCallback(
    (sessionId: string) => {
      setJoinProblem(null);
      join.mutate(sessionId, {
        onSuccess: ({ meetingUrl }) => {
          // The call records attendance either way; only the venue can be missing.
          if (meetingUrl) window.open(meetingUrl, '_blank', 'noopener,noreferrer');
          else say('You’re marked as here, but this session has no meeting link yet.');
        },
        onError: (e) => {
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
        <div className={styles.page}>
          <header className={styles.header}>
            <h1 className={styles.title}>Bookings</h1>
            <TimezonePicker value={timeZone} onChange={setZone} deviceZone={deviceZone} />
          </header>

          <Tabs items={items} value={tab} onChange={setTab} label="Bookings" />

          <LiveRegion message={joinProblem} />

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
              total={later.length}
              shown={reveal.upcoming.shown}
              showMore={reveal.upcoming.showMore}
            >
              {next && (
                <NextSessionCard
                  booking={next}
                  timeZone={timeZone}
                  onJoin={() => onJoin(next.id)}
                  joining={join.isPending}
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
              intro={
                // Read from the rows, not the viewer's role: one account can
                // host some of these and have sent others.
                (pending.data ?? []).some((b) => b.side === 'mentor')
                  ? 'These mentees asked for a time. Accept to confirm it, or decline so they can pick another.'
                  : 'Requests you sent that your mentor hasn’t confirmed yet.'
              }
              total={pending.data?.length}
              shown={reveal.pending.shown}
              showMore={reveal.pending.showMore}
            />
          </TabPanel>

          <TabPanel id="bookings-history" active={tab === 'history'}>
            <div className={styles.filters}>
              {FILTERS.map((f) => (
                <Chip
                  key={f.status}
                  pressed={filters.includes(f.status)}
                  onClick={() => toggleFilter(f.status)}
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
              isLoadingMore={history.isLoadingMore}
              actionsFor={(b) =>
                // Only a session this viewer booked can be booked again, and a
                // mentor never books at all (canBookFor).
                !isMentor && b.side === 'mentee' && b.status === 'completed' ? (
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
      )}
    </AppShell>
  );
}
