'use client';

import type { ReactNode } from 'react';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { CHAT_COPY } from '@/lib/copy/messages';
import type { ChatPerson, NextBooking } from '@/types/messages';
import { ChatHeader } from './ChatHeader';
import styles from './ChatPane.module.css';

/**
 * The chat column: the header, then `children` (the thread and composer).
 */
export function ChatPane({
  person,
  nextBooking,
  viewerIsMentee,
  timeZone,
  onBack,
  actions,
  children,
}: {
  person: ChatPerson;
  nextBooking: NextBooking | null;
  viewerIsMentee: boolean;
  timeZone: string;
  onBack: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-label={CHAT_COPY.chatLabel(person.name)} className={styles.pane}>
      <ChatHeader
        person={person}
        nextBooking={nextBooking}
        viewerIsMentee={viewerIsMentee}
        timeZone={timeZone}
        onBack={onBack}
        actions={actions}
      />
      <div className={styles.body}>{children}</div>
    </section>
  );
}

/** A `?with=` that isn't one of the viewer's chats (not connected, or no longer). */
export function ChatGone({ onBack }: { onBack: () => void }) {
  return (
    <section aria-label={CHAT_COPY.gone} className={styles.pane}>
      <div className={styles.goneHeader}>
        <IconButton
          size="lg"
          glyph={24}
          icon="arrow_back"
          aria-label={CHAT_COPY.back}
          className={styles.back}
          onClick={onBack}
        />
      </div>
      <div className={styles.state}>
        <EmptyState
          illustration="chat"
          size={120}
          title={CHAT_COPY.gone}
          description={CHAT_COPY.goneBody}
        />
      </div>
    </section>
  );
}

/** The chat column while the list loads (desktop only: phones show the list first). */
export function ChatPaneSkeleton() {
  return (
    <div className={styles.pane} aria-hidden>
      <div className={styles.header}>
        <Skeleton width="40px" height="40px" radius="full" />
        <div className={styles.who}>
          <Skeleton width="160px" height="14px" />
          <Skeleton width="220px" height="12px" />
        </div>
      </div>
      <div className={styles.body} />
    </div>
  );
}
