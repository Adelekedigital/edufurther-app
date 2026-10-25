import type { ComponentProps } from 'react';
import type { SessionLobby } from '@/components/organisms/SessionLobby/SessionLobby';
import type { GuideTip } from '@/components/organisms/SessionPrep/SessionPrep';
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
import { LOBBY_COPY } from '@/lib/copy/session';
import { joinedTime, presenceOf } from '@/lib/utils/presence';
import { missedTone } from '@/lib/utils/sessionOutcome';
import type { BookingParty, SessionRoom } from '@/types/booking';

type LobbyProps = ComponentProps<typeof SessionLobby>;

/** Every phase this page draws; anything else is Bookings' to show. */
export type DrawnPhase = Exclude<SessionPhase, 'elsewhere'>;

export function isDrawnPhase(p: SessionPhase): p is DrawnPhase {
  return p !== 'elsewhere';
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
  const venue = providerName(room.provider);
  return [lobbyDate(b.startsAt, timeZone), lobbyTimes(b, timeZone), venue]
    .filter(Boolean)
    .join(' · ');
}

/** "Mon, Sep 28, 6:00 – 6:30 pm": the session's time in the support email. */
export function lobbyWhen(room: SessionRoom, timeZone: string): string {
  const b = room.booking;
  return `${lobbyDate(b.startsAt, timeZone)}, ${lobbyTimes(b, timeZone)}`;
}

function people(
  room: SessionRoom,
  phase: DrawnPhase,
  timeZone: string,
  canEnter: boolean,
): LobbyProps['people'] {
  const { me, booking } = room;
  const other = booking.other;
  if (isSettled(phase)) {
    // Ruled on: what each person's record says (the design's completed and
    // missed rings). `pending` here is no record at all, never "didn't join".
    const settled = (p: BookingParty, name: string): LobbyProps['people'][number] =>
      p.attendance === 'attended' || p.attendance === 'leftEarly'
        ? { person: p, name, presence: 'Joined', tone: 'joined' }
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
      const at = joinedTime(p, room.provider);
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
  // Joined / Joining…, never "Here now": nothing we hold says who is in the
  // call right now (product, 2026-10-09; live presence is backend #394).
  const live = (p: BookingParty, waiting: string): LobbyProps['people'][number] => {
    const name = p === me ? 'You' : p.firstName;
    const presence = phase === 'upcoming' ? 'none' : presenceOf(p, room.provider);
    if (presence === 'joined') return { person: p, name, presence: 'Joined', tone: 'joined' };
    // PROVISIONAL: ours, until design answers.
    if (presence === 'joining') return { person: p, name, presence: 'Joining…', tone: 'away' };
    return { person: p, name, presence: waiting, tone: 'away' };
  };
  return [
    live(me, canEnter ? 'Ready when you are' : 'Not in the call'),
    // "Not here yet", never "Not here": `pending` means not known yet (backend reply §1).
    live(other, 'Not here yet'),
  ];
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
   * Present only while the session may still be called off. Reschedule opens
   * the same dialog (J2): a mentor suggests a new time in it, a mentee cancels
   * and books again.
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
  const pv = providerJoin(room.provider);
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
    people: people(room, phase, timeZone, !!entry),
    join,
    note,
    // While upcoming only: none once Join opens.
    links:
      phase === 'upcoming' && onCancel
        ? [
            { key: 'reschedule', icon: 'update', label: LOBBY_COPY.reschedule, onClick: onCancel },
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
            venue: providerName(room.provider),
          }
        : undefined,
  };
}

/**
 * The quick guide (Session Join.dc.html `guide`), with three edits: the length
 * is the session's own, "If plans change" no longer offers rescheduling or
 * messaging, which do not exist, and the answers are no longer "above", since
 * they sit beside the lobby or behind a button (logged in design-divergence.md).
 */
export function guideTips(room: SessionRoom, hasAnswers: boolean): GuideTip[] {
  const b = room.booking;
  const first = b.other.firstName;
  return [
    {
      icon: 'checklist',
      title: 'Come with one clear goal',
      body:
        b.side === 'mentee'
          ? `This session is ${b.durationMin} minutes. Bring your questions and any drafts you want feedback on.`
          : hasAnswers
            ? `Read ${first}’s answers and have one next step ready for them.`
            : `Have one next step ready for ${first}.`,
    },
    {
      icon: 'wifi',
      title: 'Check your setup',
      body: 'A quiet spot, headphones and a steady connection make the call easier for both of you.',
    },
    {
      icon: 'event_repeat',
      title: 'If plans change',
      // The window is deployment configuration (backend #413), so the number
      // comes from this session's own deadline. Left at 12 it contradicted the
      // cancel dialog on the same screen.
      //
      // With no deadline the sentence drops the number rather than guessing
      // one. Nothing here depends on it — unlike the cancel dialog, which is
      // explaining a decision the fallback window already made.
      body: b.refundUntil
        ? `Cancel at least ${refundWindowFor(b)} hours before, so the time can go to someone else.`
        : 'Cancel in good time, so the time can go to someone else.',
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
