'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import type { SummaryRow } from '@/components/molecules/ApprovedSummary/ApprovedSummary';
import {
  MentorApplicationStatus,
  type CalendarConnectState,
  type MentorApplicationStatusProps,
} from '@/components/organisms/MentorApplicationStatus/MentorApplicationStatus';
import { useCalendarConnection } from '@/lib/api/data/calendarConnection';
import {
  useContinueAsMentee,
  useMarkApprovedSeen,
  useMentorApplication,
  type MentorApplication,
} from '@/lib/api/data/mentorApplicationStatus';
import { useOwnSessionTypes } from '@/lib/api/data/sessionTypes';
import { useWeeklyHours } from '@/lib/api/data/weeklyHours';
import { APPROVED_COPY, CALENDAR_ROW_COPY, reapplyMailto } from '@/lib/copy/mentorApplication';
import { NEW_MENTEE_HOME, ONBOARDING_LIVE } from '@/lib/config/auth';
import { weeklyHoursSummary } from '@/lib/utils/weeklyHoursSummary';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useCalendarConnect } from '@/app/_shell/useCalendarConnect';

const SELF = '/mentor-application';
const APPLY = '/onboarding/mentor';
/** Mentor Dashboard v2.dc.html `?toast=approved`: "You're already approved". */
export const SEEN_HREF = '/dashboard?toast=approved';
/** Mentee onboarding when it's on (its own flag), else the mentee's Home. */
const MENTEE_HREF = ONBOARDING_LIVE ? '/onboarding/mentee' : NEW_MENTEE_HOME;
/** The type step 4 creates (PRD F1); its Edit opens it in Session types. */
const INTRO_CHAT = 'Intro chat';

/** "Oct 14, 2026", in the viewer's zone. */
const reviewDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

/** Where the page goes instead of rendering: the PRD's "Where people land". */
function redirectFor(app: MentorApplication): string | null {
  if (app.stage === 'none' || app.stage === 'unsubmitted') return APPLY;
  if (app.stage === 'approved' && app.seen) return SEEN_HREF;
  return null;
}

/**
 * /mentor-application: reads the application from GET /me and shows where it
 * stands. What it shows is decided on the first read and kept: the approved
 * screen marks itself seen, and must not then redirect itself away.
 */
export function MentorApplicationScreen() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  // Straight from Submit (?sent=1): read once and kept, so dropping the
  // parameter below doesn't flip the heading back.
  const [justSent] = useState(() => params.get('sent') === '1');
  useEffect(() => {
    if (params.get('sent') !== '1') return;
    const rest = new URLSearchParams(params.toString());
    rest.delete('sent');
    const q = rest.toString();
    router.replace(q ? `${path}?${q}` : path, { scroll: false });
  }, [params, path, router]);
  const { viewer, member } = useAppShell();
  const userId = member?.id ?? null;
  const app = useMentorApplication(userId);
  const [shown, setShown] = useState<MentorApplication | null>(null);
  // Fresh only: a cached read could still say "not seen" after it was.
  if (app.data && app.fresh && shown === null) setShown(app.data);

  const approved = shown?.stage === 'approved' && !shown.seen;
  const hours = useWeeklyHours(approved ? userId : null);
  const types = useOwnSessionTypes(approved);
  const seen = useMarkApprovedSeen(userId);
  const mentee = useContinueAsMentee(userId);
  const [menteeFailed, setMenteeFailed] = useState(false);

  // Google Calendar connects in place (owner, 2026-10-18): the same popup flow
  // as Integrations, so the approved screen stays where it is meanwhile.
  const calendar = useCalendarConnection(approved ? userId : null);
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  const announce = useCallback(
    (text: string) => setMessage((m) => ({ text, id: (m?.id ?? 0) + 1 })),
    [],
  );
  const connect = useCalendarConnect(
    approved ? userId : null,
    calendar.data,
    // Ours says it in the row's words.
    () => announce(CALENDAR_ROW_COPY.announceConnected),
  );
  const calendarState = calendarStateOf(calendar, connect);
  // A failure line is read out once, as it appears.
  const lastNotice = useRef<CalendarConnectState | null>(null);
  useEffect(() => {
    const notice = NOTICE_STATES.has(calendarState) ? calendarState : null;
    if (notice && notice !== lastNotice.current)
      announce(NOTICE_TEXT[notice as keyof typeof NOTICE_TEXT]);
    lastNotice.current = notice;
  }, [calendarState, announce]);

  // A guest signs in and comes back (the approval email links here); an
  // account that can't be read as a member goes where `/` explains it.
  const to =
    viewer.kind === 'guest'
      ? `/login?next=${encodeURIComponent(SELF)}`
      : viewer.kind === 'unlinked' || viewer.kind === 'accountExists'
        ? '/'
        : shown && redirectFor(shown);
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);

  const props = ((): MentorApplicationStatusProps => {
    if (viewer.kind === 'error')
      return { state: 'error', onRetry: viewer.retry, retrying: viewer.retrying };
    // Error before empty: a failed read never leaves the skeleton up.
    if (app.error && !shown) return { state: 'error', onRetry: app.retry };
    if (!shown || to) return { state: 'loading' };
    switch (shown.stage) {
      case 'pending':
        return {
          state: 'pending',
          email: shown.email,
          editHref: APPLY,
          justSent,
          firstName: shown.firstName,
        };
      case 'approved': {
        // The rows say what's really set up, so they wait for it; a failed
        // read only leaves its row out.
        if (hours.isLoading || types.isLoading) return { state: 'loading' };
        return {
          state: 'approved',
          firstName: shown.firstName,
          summary: summaryRows(hours.data, types.data),
          calendar: {
            state: calendarState,
            email: calendar.data?.accountEmail ?? null,
            onConnect: () => {
              connect.dismiss();
              void connect.connect();
            },
          },
          dashboardHref: '/dashboard',
          celebrate: true,
        };
      }
      case 'declined':
        return {
          state: 'declined',
          firstName: shown.firstName,
          email: shown.email,
          note: shown.note,
          reviewDate: reviewDate(shown.reviewedAt),
          mailto: reapplyMailto({
            name: shown.fullName,
            first: shown.firstName,
            email: shown.email,
            reviewDate: reviewDate(shown.reviewedAt) ?? '',
            note: shown.note ?? '',
          }),
          menteeHref: MENTEE_HREF,
          menteePending: mentee.isPending,
          menteeFailed,
          onContinueAsMentee: () => {
            setMenteeFailed(false);
            mentee.continueAsMentee().then(
              () => router.push(MENTEE_HREF),
              () => setMenteeFailed(true),
            );
          },
        };
      default:
        return { state: 'loading' };
    }
  })();

  // Once per account (PRD B3): marked when the approved screen is on screen,
  // not while its rows are still loading.
  const onScreen = props.state === 'approved';
  const marked = useRef(false);
  const { markSeen } = seen;
  useEffect(() => {
    if (!onScreen || marked.current) return;
    marked.current = true;
    markSeen();
  }, [onScreen, markSeen]);

  return (
    <>
      <LiveRegion message={message} />
      <MentorApplicationStatus {...props} />
    </>
  );
}

const NOTICE_TEXT = {
  blocked: CALENDAR_ROW_COPY.blocked,
  nothingConnected: CALENDAR_ROW_COPY.nothingConnected,
  offline: CALENDAR_ROW_COPY.offline,
  failed: CALENDAR_ROW_COPY.failed,
  unavailable: CALENDAR_ROW_COPY.unavailable,
} as const;
const NOTICE_STATES = new Set<CalendarConnectState>(
  Object.keys(NOTICE_TEXT) as CalendarConnectState[],
);

/**
 * The connection and the last connect attempt → one row state. Busy wins (a
 * reconnect is busy too); a connection, once read, beats any earlier notice,
 * which a successful connect has made untrue. A failed read still offers
 * Connect: the attempt reads the connection again itself.
 */
export function calendarStateOf(
  calendar: Pick<ReturnType<typeof useCalendarConnection>, 'data' | 'isLoading'>,
  connect: Pick<ReturnType<typeof useCalendarConnect>, 'state' | 'unavailable'>,
): CalendarConnectState {
  if (connect.state.kind === 'busy') return 'busy';
  if (calendar.isLoading) return 'loading';
  const c = calendar.data;
  if (c) return c.status === 'error' ? (c.fault === 'revoked' ? 'revoked' : 'broken') : 'connected';
  if (connect.unavailable) return 'unavailable';
  const k = connect.state.kind;
  return k === 'idle' ? 'idle' : k;
}

function summaryRows(
  hours: ReturnType<typeof useWeeklyHours>['data'],
  types: ReturnType<typeof useOwnSessionTypes>['data'],
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const line = hours ? weeklyHoursSummary(hours.days) : null;
  if (hours && line)
    rows.push({
      icon: 'schedule',
      title: APPROVED_COPY.hoursTitle,
      body: APPROVED_COPY.hoursBody(line, hours.timeZone),
      link: { label: APPROVED_COPY.hoursLink, href: '/calendar' },
    });
  const intro = types?.find((t) => t.name.trim() === INTRO_CHAT);
  if (intro)
    rows.push({
      icon: 'video_chat',
      title: APPROVED_COPY.introTitle,
      body: APPROVED_COPY.introBody,
      link: {
        label: APPROVED_COPY.introLink,
        href: `/session-types/${encodeURIComponent(intro.id)}/edit`,
      },
    });
  rows.push({
    icon: 'travel_explore',
    title: APPROVED_COPY.listedTitle,
    body: APPROVED_COPY.listedBody,
  });
  return rows;
}
