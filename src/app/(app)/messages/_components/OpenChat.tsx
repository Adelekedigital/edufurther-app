'use client';

import { useMemo } from 'react';
import { useMenteeGoals } from '@/lib/api/data/goals';
import { degreeValue } from '@/lib/api/data/onboarding';
import { useMenteeProfile } from '@/lib/api/data/settings';
import { CHAT_COPY } from '@/lib/copy/messages';
import type { Viewer } from '@/types/mentor';
import type { ChatRow } from '@/types/messages';
import { ChatMenu } from './ChatMenu';
import { ChatPane } from './ChatPane';
import { ChatView } from './ChatView';
import { startersFor } from './starters';

type Member = Extract<Viewer, { kind: 'member' }>;

/**
 * The open chat: the header with its menu, and the thread with its composer.
 * Reads what the starters and Report need about the viewer (their goal, their
 * name and email) once, from the cached /me reads Settings already uses.
 */
export function OpenChat({
  row,
  member,
  timeZone,
  phone,
  shown,
  draft,
  onDraft,
  onBack,
  onToast,
}: {
  row: ChatRow;
  member: Member;
  timeZone: string;
  phone: boolean;
  /** The chat is on screen (on phones only with `?with=`): read marking needs it. */
  shown: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onBack: () => void;
  onToast: (text: string) => void;
}) {
  const { person, nextBooking } = row;
  // My side in this chat comes from theirs, not from my account: someone who
  // keeps a declined mentor profile is still the mentee to their mentor.
  const mentee = person.role === 'mentor';
  const goals = useMenteeGoals(mentee ? member.id : null);
  const me = useMenteeProfile(member.id);
  const goal = goals.read?.goal ?? null;
  const starters = useMemo(
    () =>
      startersFor(mentee ? 'mentee' : 'mentor', person.firstName, {
        mentee: mentee
          ? {
              myFirst: member.firstName,
              degree: degreeValue(goal),
              field: goal?.field_of_study ?? '',
              term: goal?.target_start_term ?? null,
              firstNeed: goal?.needs[0]
                ? { code: goal.needs[0].code, name: goal.needs[0].display_name }
                : null,
            }
          : null,
        theirInstitution: person.institution,
      }),
    [mentee, person.firstName, person.institution, member.firstName, goal],
  );
  return (
    <ChatPane
      person={person}
      nextBooking={nextBooking}
      viewerIsMentee={mentee}
      timeZone={timeZone}
      onBack={onBack}
      actions={
        <ChatMenu
          person={person}
          nextBooking={nextBooking}
          viewerIsMentee={mentee}
          phone={phone}
          reporter={
            me.profile?.email
              ? {
                  name: me.profile.name || member.firstName,
                  email: me.profile.email,
                  mentor: !mentee,
                }
              : null
          }
        />
      }
    >
      <ChatView
        person={person}
        nextBooking={nextBooking}
        viewerIsMentee={mentee}
        timeZone={timeZone}
        phone={phone}
        shown={shown}
        draft={draft}
        onDraft={onDraft}
        starters={starters}
        onRetried={() => onToast(CHAT_COPY.retried)}
      />
    </ChatPane>
  );
}
