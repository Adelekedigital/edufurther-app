import type { ComponentProps } from 'react';
import type { SessionLobby } from '@/components/organisms/SessionLobby/SessionLobby';
import type { GuideTip } from '@/components/organisms/SessionPrep/SessionPrep';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { formatTime } from '@/lib/utils/format';
import {
  entryFor,
  joinOpensLabel,
  lobbyClock,
  lobbyDate,
  lobbyTimes,
  opensBeforeMin,
  providerJoin,
  providerName,
  type SessionPhase,
} from '@/lib/utils/sessionPhase';
import { refundWindowFor } from '@/lib/utils/bookings';
import { LOBBY_COPY, PREP_COPY } from '@/lib/copy/session';
import { joinedTime, presenceOf } from '@/lib/utils/presence';
import { missedTone, missedWaitMin } from '@/lib/utils/sessionOutcome';
import type { BookingParty, SessionRoom } from '@/types/booking';

type LobbyProps = ComponentProps<typeof SessionLobby>;

/** Every phase this page draws; anything else is Bookings' to show. */
export type DrawnPhase = Exclude<SessionPhase, 'elsewhere'>;

export function isDrawnPhase(p: SessionPhase): p is DrawnPhase {
  return p !== 'elsewhere';
}

/**
 * Where the people show live presence ("Here now"): from Join opening to the
 * end. Not before (nobody can be in the room yet; "never before the window
 * opens"), nor once it is over, where the rings say what was recorded. The
 * page announces arrivals and departures in exactly these phases.
 */
export function showsLivePresence(p: DrawnPhase): boolean {
  return p === 'soon' || p === 'ongoing' || p === 'closed';
}

/** Over and ruled on: the outcome block shows under the lobby. */
export function isSettled(p: DrawnPhase): p is 'completed' | 'missed' {
  return p === 'completed' || p === 'missed';
}

const STATUS: Record<DrawnPhase, LobbyProps['status']> = {
  upcoming: { tone: 'blue', label: 'Upcoming' },
  soon: { tone: 'blue', label: 'Starting soon' },
  ongoing: { tone: 'green', label: 'In progress', live: true },
  closed: { tone: 'green', label: 'In progress', live: true },
  // PROVISIONAL: the design has no state between the end and the attendance sweep.
  settling: { tone: 'neutral', label: 'Ended' },
  completed: { tone: 'neutral', label: 'Completed' },
  missed: { tone: 'red', label: 'Missed' },
};

const GROUND: Record<Exclude<DrawnPhase, 'missed'>, LobbyProps['ground']> = {
  upcoming: 'white',
  soon: 'blue',
  ongoing: 'green',
  closed: 'green',
  settling: 'white',
  completed: 'green',
};

/** "1:1 call with Gbenga Ogundipe"; "Session with …" on an older row with no type. */
export function lobbyTitle(room: SessionRoom): string {
  return `${room.typeName ?? 'Session'} with ${room.booking.other.name}`;
}

/**
 * "Mon, Sep 28 · 6:00 – 6:30 pm · EduFurther video". No zone in the text: the
 * time zone switcher under it says whose clock the times are in.
 */
export function lobbyMeta(room: SessionRoom, timeZone: string): string {
  const b = room.booking;
  const venue = providerName(room.booking.provider);
  return [lobbyDate(b.startsAt, timeZone), lobbyTimes(b, timeZone), venue]
    .filter(Boolean)
    .join(' · ');
}

/**
 * "Mon, Sep 28, 6:00 – 6:30 pm Lagos (WAT)": the session's time in the support
 * email, with its zone, since the page may be showing another one.
 */
export function lobbyWhen(room: SessionRoom, timeZone: string): string {
  const b = room.booking;
  return `${lobbyDate(b.startsAt, timeZone)}, ${lobbyTimes(b, timeZone)} ${zoneLabel(timeZone)}`;
}

function people(room: SessionRoom, phase: DrawnPhase, timeZone: string): LobbyProps['people'] {
  const { me, booking } = room;
  const other = booking.other;
  if (isSettled(phase)) {
    // Ruled on: what each person's record says (the design's completed and
    // missed rings). `pending` here is no record at all, never "didn't join".
    // The design's "Joined at 6:01 pm"; on a missed session the one who came
    // also "waited 15 min" (the row's wait, as the missed card says).
    const joinedLine = (p: BookingParty): string => {
      const at = joinedTime(p, room.booking.provider);
      if (!at) return 'Joined';
      const line = `Joined at ${formatTime(at, timeZone)}`;
      return phase === 'missed' ? `${line}, waited ${missedWaitMin(booking)} min` : line;
    };
    const settled = (p: BookingParty, name: string): LobbyProps['people'][number] =>
      p.attendance === 'attended' || p.attendance === 'leftEarly'
        ? { person: p, name, presence: joinedLine(p), tone: 'joined' }
        : p.attendance === 'noShow'
          ? { person: p, name, presence: 'Didn’t join', tone: 'absent' }
          : { person: p, name, presence: 'No record', tone: 'away' };
    // The viewer's own record is `myAttendance` (the room's `me` is the same party).
    return [
      settled({ ...me, attendance: booking.myAttendance }, 'You'),
      settled(other, other.firstName),
    ];
  }
  if (phase === 'settling') {
    // Over, but not ruled on: say what we recorded, never "didn't join". A
    // Daily press with no room sighting may still be filled in by settlement.
    const line = (p: BookingParty): LobbyProps['people'][number] => {
      const name = p === me ? 'You' : p.firstName;
      const at = joinedTime(p, room.booking.provider);
      if (at)
        return {
          person: p,
          name,
          presence: `Joined at ${formatTime(at, timeZone)}`,
          tone: 'joined',
        };
      if (p.joinedAt)
        // PROVISIONAL: ours, until design answers.
        return {
          person: p,
          name,
          presence: `Pressed Join at ${formatTime(p.joinedAt, timeZone)}`,
          tone: 'away',
        };
      return { person: p, name, presence: 'No arrival recorded', tone: 'away' };
    };
    return [line(me), line(other)];
  }
  // Live (backend #394): "Here now" while EduFurther video has them in the
  // room, back to "Not in the call yet" when they leave. Google Meet can't
  // say, so its "Joined" is the Join press. The same for the viewer.
  const live = (p: BookingParty): LobbyProps['people'][number] => {
    const name = p === me ? 'You' : p.firstName;
    const presence = showsLivePresence(phase) ? presenceOf(p, room.booking.provider) : 'none';
    if (presence === 'here') return { person: p, name, presence: 'Here now', tone: 'here' };
    if (presence === 'joined') return { person: p, name, presence: 'Joined', tone: 'joined' };
    return { person: p, name, presence: 'Not in the call yet', tone: 'away' };
  };
  return [live(me), live(other)];
}

export type LobbyInput = {
  room: SessionRoom;
  phase: DrawnPhase;
  now: Date;
  timeZone: string;
  /**
   * Where Join and Rejoin link to: our entry route, `/sessions/{id}/enter`,
   * which sends /join (and /door when /join answers 409) on the server and
   * redirects to the call (#207, ADR 0009). `entry` only picks the label.
   */
  enterHref: string;
  /** Join was followed: the page drops its last Join problem. */
  onFollow?: () => void;
  /**
   * Present only while the session may still be called off. Cancel opens the
   * shared dialog: a mentor can suggest a new time in it, a mentee can move
   * the session (PRD fix 1).
   */
  onCancel?: () => void;
  /** Absolute URL of this page, for the calendar event (never the call link). */
  pageUrl: string;
};

/**
 * "Joining closed at 6:15 pm, 15 minutes after the start." Said where Join is
 * gone for someone who never joined, and when the server refuses them
 * (`/problems/join-window-closed`): one sentence for one rule. Null on an
 * older row with no window.
 */
export function joiningClosedNote(b: SessionRoom['booking'], timeZone: string): string | null {
  if (!b.joinClosesAt) return null;
  const after = Math.round(
    (new Date(b.joinClosesAt).getTime() - new Date(b.startsAt).getTime()) / 60_000,
  );
  return `Joining closed at ${formatTime(b.joinClosesAt, timeZone)}, ${after} minutes after the start.`;
}

/** Everything the lobby shows, from the session, the phase and the clock. */
export function lobbyModel({
  room,
  phase,
  now,
  timeZone,
  enterHref,
  onFollow,
  onCancel,
  pageUrl,
}: LobbyInput): LobbyProps {
  const b = room.booking;
  const pv = providerJoin(room.booking.provider);
  const entry = entryFor(b, room.me.joinedAt, phase, now);

  let join: LobbyProps['join'];
  let note: string | undefined;
  if (phase === 'upcoming') {
    join = {
      label: joinOpensLabel(b, now),
      enabled: false,
      hint: LOBBY_COPY.joinLockedHint(opensBeforeMin(b)),
    };
  } else if (entry) {
    join = {
      // "Rejoin" only for someone who has been in. Who else is here is the
      // people's rings to say, not the hint.
      label: entry === 'door' ? LOBBY_COPY.rejoin : pv.join,
      enabled: true,
      href: enterHref,
      onFollow,
      hint: pv.hint,
    };
  } else if (phase === 'closed' && b.joinClosesAt && !room.me.joinedAt) {
    // PROVISIONAL: undesigned. A first arrival after the window isn't let in
    // (product, 2026-10-08): it couldn't count as attending.
    note = joiningClosedNote(b, timeZone) ?? undefined;
  } else if (phase === 'closed') {
    note = 'Joining has closed for this session.';
  } else if (phase === 'settling') {
    // The sweep rules within the hour (backend reply §3).
    note = LOBBY_COPY.settlingNote;
  }

  return {
    ground: phase === 'missed' ? missedTone(b) : GROUND[phase],
    status: STATUS[phase],
    title: lobbyTitle(room),
    meta: lobbyMeta(room, timeZone),
    clock: lobbyClock(b, phase, now),
    people: people(room, phase, timeZone),
    join,
    note,
    // While upcoming only: none once Join opens.
    links:
      phase === 'upcoming' && onCancel
        ? [
            // One link for both roles (PRD fix 1): a mentee moves the session
            // from the same dialog, so Reschedule went.
            {
              key: 'cancel',
              icon: 'event_busy',
              label: LOBBY_COPY.cancel,
              onClick: onCancel,
              danger: true,
            },
          ]
        : [],
    calendar:
      phase === 'upcoming'
        ? {
            id: b.id,
            title: lobbyTitle(room),
            startsAt: b.startsAt,
            endsAt: b.endsAt,
            pageUrl,
            venue: providerName(room.booking.provider),
          }
        : undefined,
  };
}

/**
 * The lobby of a session the viewer's own move canceled when the new time
 * couldn't be booked (PRD fix 1). Everywhere else a canceled session is
 * Bookings' to show; here the page stays, so the notice under it can say what
 * happened and offer Book again. PROVISIONAL: undesigned, ours (grey ground,
 * a "Canceled" pill, no clock, Join or links).
 */
export function canceledLobby(room: SessionRoom, timeZone: string): LobbyProps {
  const person = (p: BookingParty, name: string): LobbyProps['people'][number] => ({
    person: p,
    name,
    presence: LOBBY_COPY.canceled,
    tone: 'away',
  });
  return {
    ground: 'grey',
    status: { tone: 'neutral', label: LOBBY_COPY.canceled },
    title: lobbyTitle(room),
    meta: lobbyMeta(room, timeZone),
    clock: null,
    people: [person(room.me, 'You'), person(room.booking.other, room.booking.other.firstName)],
    links: [],
  };
}

/**
 * The quick guide (Session Join.dc.html `guide`, 19 Oct copy pass): the length
 * is the session's own and the refund window the row's. A mentor whose mentee
 * answered nothing gets no "Check {First}'s response" tip: there is none.
 */
export function guideTips(room: SessionRoom, hasAnswers: boolean): GuideTip[] {
  const b = room.booking;
  const first = b.other.firstName;
  const T = PREP_COPY.tips;
  const lead: GuideTip[] =
    b.side === 'mentee'
      ? [{ icon: 'checklist', title: T.goal.title, body: T.goal.body(b.durationMin) }]
      : hasAnswers
        ? [{ icon: 'forum', title: T.response.title(first), body: T.response.body(first) }]
        : [];
  return [
    ...lead,
    { icon: 'wifi', title: T.setup.title, body: T.setup.body },
    {
      icon: 'event_repeat',
      title: T.plans.title,
      // The window is deployment configuration (backend #413), so the number
      // comes from this session's own deadline; with none, no number at all.
      body: b.refundUntil ? T.plans.body[b.side](refundWindowFor(b)) : T.plans.bodyNoWindow[b.side],
    },
  ];
}

/** What a screen reader hears when the phase moves on. The clock itself is never announced. */
export const PHASE_ANNOUNCEMENT: Partial<Record<DrawnPhase, string>> = {
  completed: 'The session is complete.',
  missed: 'This session was missed.',
  soon: 'Join is open.',
  ongoing: 'The session has started.',
  closed: 'Joining has closed.',
  settling: 'The session has ended.',
};
