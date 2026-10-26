import type { ReactNode } from 'react';
import type { InviteLinkPanelProps } from '@/components/molecules/InviteLinkPanel/InviteLinkPanel';
import { GETTING_STARTED as G, INVITE_COPY, NEXT_STEP, withLine } from '@/lib/copy/home';
import { dayLabel, formatTime } from '@/lib/utils/format';
import { GettingStarted, type GettingStartedRow, type StepState } from './GettingStarted';
import { NextStepCard } from './NextStepCard';
import {
  doneCount,
  nextMissing,
  stageFor,
  stepsDone,
  type NewMenteeState,
  type ProfileField,
} from './newMentee';
import styles from './MenteeNewView.module.css';

type MenteeNewViewProps = NewMenteeState & {
  fields: ProfileField[];
  /** Free sessions the mentee holds now, for "1 free session ready"; null when unknown. */
  freeSessions: number | null;
  /** "Master’s in Public Health, United Kingdom" for the ready card; null when unknown. */
  goal: string | null;
  timeZone: string;
  phone: boolean;
  invite: Omit<InviteLinkPanelProps, 'layout'>;
  onOpenProfile: () => void;
  onOpenInvite: () => void;
  onChooseMentor: () => void;
  /** Shown once a first request is sent (design canHide); null before. */
  onHide: (() => void) | null;
  hideRef?: React.Ref<HTMLButtonElement>;
  /** Under the two cards: the next session when there is one, then Mentors for your goal. */
  children?: ReactNode;
};

const when = (iso: string, zone: string) => `${dayLabel(iso, zone)}, ${formatTime(iso, zone)}`;

/**
 * The new mentee's Home (Mentee Dashboard v2.dc.html, newHome nextStep): the
 * next step and Getting started side by side (stacked on phones), then
 * what the screen passes below them (a booked session's card, Mentors for your
 * goal). No KPIs. Props only; the screen reads.
 */
export function MenteeNewView(p: MenteeNewViewProps) {
  const n = doneCount(p.fields);
  const missing = nextMissing(p.fields);
  const { stage, oneStepLeft } = stageFor(p);
  const steps = stepsDone(p);
  const inviteBody = p.unlocked
    ? INVITE_COPY.unlocked
    : p.friendJoined
      ? INVITE_COPY.friendJoined
      : INVITE_COPY.body;

  const card =
    stage === 'incomplete'
      ? {
          art: 'forms' as const,
          kicker: oneStepLeft ? NEXT_STEP.incomplete.kickerLeft : NEXT_STEP.incomplete.kicker,
          title: NEXT_STEP.incomplete.title,
          body: NEXT_STEP.incomplete.body,
          meter: { done: n, label: NEXT_STEP.incomplete.meter(n, missing) },
          action: { label: NEXT_STEP.incomplete.action, onClick: p.onOpenProfile },
        }
      : stage === 'ready'
        ? {
            art: 'search-results' as const,
            // Only a count that's known and not 0 is promised; otherwise the plain kicker.
            kicker: p.freeSessions
              ? NEXT_STEP.ready.kicker(p.freeSessions)
              : NEXT_STEP.incomplete.kicker,
            title: NEXT_STEP.ready.title,
            body: NEXT_STEP.ready.body(p.goal),
            action: { label: NEXT_STEP.ready.action, onClick: p.onChooseMentor },
          }
        : {
            art: 'team' as const,
            kicker:
              stage === 'firstDone' || !p.booked
                ? NEXT_STEP.firstDone.kicker
                : withLine(
                    p.booked.confirmed,
                    p.booked.mentorFirst,
                    when(p.booked.startsAt, p.timeZone),
                  ),
            title: INVITE_COPY.title,
            body: inviteBody,
            invite: p.invite,
          };

  // The current step is the one the card is about (incomplete: profile; ready:
  // book; booked and after: invite), so the list and the card always agree.
  const current = stage === 'incomplete' ? 'profile' : stage === 'ready' ? 'book' : 'invite';
  const state = (done: boolean, key: string): StepState =>
    done ? 'done' : key === current ? 'now' : 'todo';
  const inviteNote = p.unlocked
    ? G.invitedNote.unlocked
    : p.friendJoined
      ? G.invitedNote.friendJoined
      : p.invited
        ? p.firstDone
          ? G.invitedNote.sharedAfterFirst
          : G.invitedNote.shared
        : G.invitedNote.none;
  const rows: GettingStartedRow[] = [
    { key: 'account', label: G.account, note: G.done, state: 'done', href: '/settings' },
    {
      key: 'profile',
      label: G.profile,
      note: steps.profile ? G.done : G.details(n),
      state: state(steps.profile, 'profile'),
      onClick: p.onOpenProfile,
    },
    {
      key: 'book',
      label: G.book,
      note: p.firstDone
        ? p.firstDone.mentorFirst && p.firstDone.startsAt
          ? G.doneWith(p.firstDone.mentorFirst, dayLabel(p.firstDone.startsAt, p.timeZone))
          : G.done
        : p.booked
          ? withLine(p.booked.confirmed, p.booked.mentorFirst, when(p.booked.startsAt, p.timeZone))
          : G.starter,
      state: state(steps.booked, 'book'),
      href: steps.booked ? '/bookings' : '/explore',
    },
    {
      key: 'invite',
      label: G.invite,
      note: inviteNote,
      state: state(steps.invite, 'invite'),
      onClick: p.onOpenInvite,
    },
  ];

  return (
    <>
      <div className={styles.grid}>
        <NextStepCard {...card} phone={p.phone} />
        <GettingStarted
          rows={rows}
          doneCount={1 + Number(steps.profile) + Number(steps.booked) + Number(steps.invite)}
          onHide={p.onHide}
          hideRef={p.hideRef}
        />
      </div>
      {p.children}
    </>
  );
}
