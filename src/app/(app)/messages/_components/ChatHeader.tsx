'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { CHAT_COPY } from '@/lib/copy/messages';
import { formatNextAvailable } from '@/lib/utils/format';
import type { ChatPerson, NextBooking } from '@/types/messages';
import { personLine } from './chatRows';
import styles from './ChatPane.module.css';

/**
 * Where the name goes: a mentor's profile for a mentee (by handle, else by id,
 * which the route also takes); plain text for a mentor (PRD Q3).
 */
export function profileHref(person: ChatPerson, viewerIsMentee: boolean): string | null {
  return viewerIsMentee && person.role === 'mentor' && person.state !== 'closed'
    ? `/mentors/${encodeURIComponent(person.handle ?? person.id)}`
    : null;
}

/**
 * The chat's header (Messages.dc.html `showThread` header): Back on phones,
 * the person, and "Next session {when}" while a booking is upcoming, else
 * "{Role} · {institution}" (`sessionContext` v1).
 */
export function ChatHeader({
  person,
  nextBooking,
  viewerIsMentee,
  timeZone,
  onBack,
  actions,
}: {
  person: ChatPerson;
  nextBooking: NextBooking | null;
  viewerIsMentee: boolean;
  timeZone: string;
  onBack: () => void;
  /** The "More options" menu (the chat build). */
  actions?: ReactNode;
}) {
  const href = profileHref(person, viewerIsMentee);
  const sub = nextBooking
    ? CHAT_COPY.nextSession(formatNextAvailable(nextBooking.startsAt, timeZone))
    : personLine(person);
  return (
    <div className={styles.header}>
      <IconButton
        size="lg"
        glyph={24}
        icon="arrow_back"
        aria-label={CHAT_COPY.back}
        className={styles.back}
        onClick={onBack}
      />
      <Avatar
        size="md"
        initials={person.initials}
        tone={person.cover}
        src={person.avatarUrl}
        focus={person.avatarFocus}
        alt=""
      />
      <div className={styles.who}>
        {href ? (
          <Link href={href} prefetch={false} className={styles.name}>
            {person.name}
          </Link>
        ) : (
          <span className={styles.name}>{person.name}</span>
        )}
        <span className={styles.sub}>{sub}</span>
      </div>
      {actions}
    </div>
  );
}
