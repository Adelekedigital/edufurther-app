import type { ComponentProps } from 'react';
import type { SessionLobby } from '@/components/organisms/SessionLobby/SessionLobby';
import type { GuideTip } from '@/components/organisms/SessionPrep/SessionPrep';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { formatTime } from '@/lib/utils/format';
import {
  canJoinNow,
  joinOpensLabel,
  lobbyClock,
  lobbyDate,
  lobbyTimes,
  opensBeforeMin,
  providerJoin,
  providerName,
  type SessionPhase,
} from '@/lib/utils/sessionPhase';
import type { BookingParty, SessionRoom } from '@/types/booking';

type LobbyProps = ComponentProps<typeof SessionLobby>;

/** The phases this page draws in PR 1. Completed and missed follow in PR 2. */
export type LivePhase = Extract<
  SessionPhase,
  'upcoming' | 'soon' | 'ongoing' | 'closed' | 'settling'
>;

export function isLivePhase(p: SessionPhase): p is LivePhase {
  return p === 'upcoming' || p === 'soon' || p === 'ongoing' || p === 'closed' || p === 'settling';
}

const STATUS: Record<LivePhase, LobbyProps['status']> = {
  upcoming: { tone: 'blue', label: 'Upcoming' },
  soon: { tone: 'blue', label: 'Starting soon' },
  ongoing: { tone: 'green', label: 'In progress', live: true },
  closed: { tone: 'green', label: 'In progress', live: true },
  // PROVISIONAL: the design has no state between the end and the attendance sweep.
  settling: { tone: 'neutral', label: 'Ended' },
};

const GROUND: Record<LivePhase, LobbyProps['ground']> = {
  upcoming: 'white',
  soon: 'blue',
  ongoing: 'green',
  closed: 'green',
  settling: 'white',
};

/** "1:1 call with Gbenga Ogundipe"; "Session with …" on an older row with no type. */
export function lobbyTitle(room: SessionRoom): string {
  return `${room.typeName ?? 'Session'} with ${room.booking.other.name}`;
}

/**
 * "Mon, Sep 28 · 6:00 – 6:30 pm · Lagos (WAT) · EduFurther video". The zone is
 * named (product rule: times say whose clock they are); the lobby design
 * leaves it out.
 */
export function lobbyMeta(room: SessionRoom, timeZone: string): string {
  const b = room.booking;
  const venue = providerName(room.provider);
  return [lobbyDate(b.startsAt, timeZone), lobbyTimes(b, timeZone), zoneLabel(timeZone), venue]
    .filter(Boolean)
    .join(' · ');
}

/** In the call, by their own Join press (`joined_at`, the first arrival). */
function isHere(p: BookingParty, phase: LivePhase): boolean {
  return phase !== 'upcoming' && !!p.joinedAt;
}

function people(room: SessionRoom, phase: LivePhase, timeZone: string): LobbyProps['people'] {
  const { me, booking } = room;
  const other = booking.other;
  if (phase === 'settling') {
    // Over, but not ruled on: say what we recorded, never "didn't join".
    const line = (p: BookingParty) =>
      p.joinedAt ? `Joined at ${formatTime(p.joinedAt, timeZone)}` : 'No arrival recorded';
    return [
      { person: me, name: 'You', presence: line(me), tone: me.joinedAt ? 'joined' : 'away' },
      {
        person: other,
        name: other.firstName,
        presence: line(other),
        tone: other.joinedAt ? 'joined' : 'away',
      },
    ];
  }
  const meHere = isHere(me, phase);
  const otherHere = isHere(other, phase);
  return [
    {
      person: me,
      name: 'You',
      presence: meHere ? 'Here now' : canJoinNow(phase) ? 'Ready when you are' : 'Not in the call',
      tone: meHere ? 'here' : 'away',
    },
    {
      person: other,
      name: other.firstName,
      // "Not here yet", never "Not here": `pending` means not known yet (backend reply §1).
      presence: otherHere ? 'Here now' : 'Not here yet',
      tone: otherHere ? 'here' : 'away',
    },
  ];
}

export type LobbyInput = {
  room: SessionRoom;
  phase: LivePhase;
  now: Date;
  timeZone: string;
  joining: boolean;
  onJoin: () => void;
  /** Present only while the session may still be called off. */
  onCancel?: () => void;
};

/** Everything the lobby shows, from the session, the phase and the clock. */
export function lobbyModel({
  room,
  phase,
  now,
  timeZone,
  joining,
  onJoin,
  onCancel,
}: LobbyInput): LobbyProps {
  const b = room.booking;
  const pv = providerJoin(room.provider);
  const other = b.other;
  const otherHere = isHere(other, phase);

  let join: LobbyProps['join'];
  let note: string | undefined;
  if (phase === 'upcoming') {
    join = {
      label: joinOpensLabel(b, now),
      enabled: false,
      onJoin,
      hint: `The button turns on ${opensBeforeMin(b)} minutes before the start.`,
    };
  } else if (phase === 'soon' || phase === 'ongoing') {
    join = {
      // "Rejoin" only for someone who has been in: the design says it to every
      // mentor, including one who hasn't arrived yet.
      label: phase === 'soon' ? pv.join : room.me.joinedAt ? 'Rejoin session' : 'Join now',
      enabled: true,
      busy: joining,
      onJoin,
      hint:
        otherHere && phase === 'ongoing'
          ? `${other.firstName} is in the call. ${pv.hint}`
          : pv.hint,
    };
  } else if (phase === 'closed' && b.joinClosesAt) {
    // PROVISIONAL: undesigned. Nothing can issue a way in after the window
    // (backend #379), so no button that would only be refused.
    const after = Math.round(
      (new Date(b.joinClosesAt).getTime() - new Date(b.startsAt).getTime()) / 60_000,
    );
    note = `Joining closed at ${formatTime(b.joinClosesAt, timeZone)}, ${after} minutes after the start.`;
  } else if (phase === 'closed') {
    note = 'Joining has closed for this session.';
  } else {
    // PROVISIONAL: undesigned. The sweep rules within the hour (backend reply §3).
    note = 'This session has ended. We’re confirming who joined, which can take up to an hour.';
  }

  const pre = phase === 'upcoming' || phase === 'soon';
  return {
    ground: GROUND[phase],
    status: STATUS[phase],
    title: lobbyTitle(room),
    meta: lobbyMeta(room, timeZone),
    clock: lobbyClock(b, phase, now),
    people: people(room, phase, timeZone),
    join,
    note,
    links:
      pre && onCancel
        ? [{ key: 'cancel', icon: 'event_busy', label: 'Cancel', onClick: onCancel, danger: true }]
        : [],
  };
}

/**
 * The quick guide (Session Join.dc.html `guide`), with two edits: the length is
 * the session's own, and "If plans change" no longer offers rescheduling or
 * messaging, which do not exist (logged in design-divergence.md).
 */
export function guideTips(room: SessionRoom, hasAnswers: boolean): GuideTip[] {
  const b = room.booking;
  const first = b.other.firstName;
  return [
    {
      title: 'Come with one clear goal',
      body:
        b.side === 'mentee'
          ? `This session is ${b.durationMin} minutes. Bring your questions and any drafts you want feedback on.`
          : hasAnswers
            ? `Read ${first}’s answers above and have one next step ready for them.`
            : `Have one next step ready for ${first}.`,
    },
    {
      title: 'Check your setup',
      body: 'A quiet spot, headphones and a steady connection make the call easier for both of you.',
    },
    {
      title: 'If plans change',
      body: 'Cancel at least 12 hours before, so the time can go to someone else.',
    },
  ];
}

/** What a screen reader hears when the phase moves on. The clock itself is never announced. */
export const PHASE_ANNOUNCEMENT: Partial<Record<LivePhase, string>> = {
  soon: 'Join is open.',
  ongoing: 'The session has started.',
  closed: 'Joining has closed.',
  settling: 'The session has ended.',
};
