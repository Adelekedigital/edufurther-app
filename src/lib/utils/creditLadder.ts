import type { CreditsView } from './credits';

/**
 * "Earn up to 3 credits a month" in the card (decision 370, owner 2026-11-25,
 * amending 308; design "Credits Ladder Direction"): three steps, each worth 1
 * credit a month, in any order, up to 3. Each row ticks on its own: the
 * profile from the level (onboarded), the session and the friend from what
 * the mentee has done (`LadderProgress`). A step is never shown done that
 * isn't: an unknown read (loading or failed) leaves its row unticked, except
 * at level 3, which means all three on every ladder the backend has had.
 */
export const CREDIT_STEPS_LABEL = 'Earn up to 3 credits a month';

/**
 * What the mentee has done, from GET /me/mentee-stats (`sessions_attended`)
 * and GET /me/referrals (a row with `qualified_at`). Null while not known.
 */
export type LadderProgress = { attended: boolean | null; friendJoined: boolean | null };
export const LADDER_UNKNOWN: LadderProgress = { attended: null, friendJoined: null };

export type CreditStep = {
  key: 'profile' | 'session' | 'friend';
  label: string;
  value: string;
  done: boolean;
  /** Under the label while the step isn't done. */
  sub?: string;
};

/** The ladder's words (design "Credits Ladder Direction"; owner 2026-11-25). */
export const LADDER_COPY = {
  friendSub: 'Invite a friend. It counts once they finish their profile.',
  allDone: 'You’ve earned 3 credits a month',
  seeHow: 'See how',
  hide: 'Hide',
} as const;

export function creditSteps(v: CreditsView, p: LadderProgress = LADDER_UNKNOWN): CreditStep[] {
  const all = v.level >= 3;
  const attended = p.attended ?? all;
  const friend = p.friendJoined ?? all;
  return [
    { key: 'profile', label: 'Finish your profile', value: '+1', done: v.level >= 1 },
    { key: 'session', label: 'Attend a session', value: '+1', done: attended },
    {
      key: 'friend',
      label: 'A friend joins',
      value: '+1',
      done: friend,
      ...(!friend && { sub: LADDER_COPY.friendSub }),
    },
  ];
}

/**
 * All three ticked and /me agrees (level 3): the card shows the one quiet line
 * instead of the list. Ticked but a lower level (the backend's new ladder not
 * live yet) keeps the list, so the line never promises more than /me pays.
 */
export function ladderComplete(v: CreditsView, steps: readonly CreditStep[]): boolean {
  return v.level >= 3 && steps.every((s) => s.done);
}
