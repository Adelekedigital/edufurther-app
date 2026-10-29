'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useMessagePeople } from '@/lib/api/data/messages';
import { LIST_COPY, NEW_MESSAGE_COPY } from '@/lib/copy/messages';
import { useDebouncedValue } from '@/lib/utils/useDebouncedValue';
import { personLine } from './chatRows';
import styles from './NewMessageDialog.module.css';

/**
 * New message (Messages.dc.html `modalNew`, Modal `kind` picker): the people
 * the viewer is connected to, by name (`GET /me/messages/people?q=`). Picking
 * one opens that chat, empty if new.
 */
export function NewMessageDialog({
  mentee,
  onPick,
  onClose,
}: {
  mentee: boolean;
  onPick: (personId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q.trim(), 250);
  const people = useMessagePeople(query, true);
  const list = people.data ?? [];

  return (
    <ModalShell
      title={NEW_MESSAGE_COPY.title}
      subtitle={NEW_MESSAGE_COPY.subtitle(mentee)}
      onClose={onClose}
    >
      <div className={styles.body}>
        <SearchField
          label={NEW_MESSAGE_COPY.searchLabel}
          placeholder={NEW_MESSAGE_COPY.searchPlaceholder}
          value={q}
          onChange={setQ}
          onClear={() => setQ('')}
          radius="md"
        />
        <div className={styles.people} aria-busy={people.isLoading || undefined}>
          {people.error && !people.data ? (
            <div className={styles.line} role="alert">
              {LIST_COPY.loadError}{' '}
              <Button variant="text" size="small" onClick={people.retry}>
                {LIST_COPY.tryAgain}
              </Button>
            </div>
          ) : people.isLoading && !people.data ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={styles.skeleton} aria-hidden>
                <Skeleton width="40px" height="40px" radius="full" />
                <Skeleton width="60%" height="14px" />
              </div>
            ))
          ) : list.length === 0 ? (
            <p className={styles.line} role="status">
              {query ? NEW_MESSAGE_COPY.noMatch : NEW_MESSAGE_COPY.noPeople(mentee)}
            </p>
          ) : (
            list.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.person}
                onClick={() => onPick(p.id)}
              >
                <Avatar
                  size="md"
                  initials={p.initials}
                  tone={p.cover}
                  src={p.avatarUrl}
                  focus={p.avatarFocus}
                  alt=""
                />
                <span className={styles.text}>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.sub}>{personLine(p)}</span>
                </span>
              </button>
            ))
          )}
        </div>
        {mentee && (
          <p className={styles.foot}>
            {NEW_MESSAGE_COPY.bookFirst}{' '}
            <Link href="/explore" prefetch={false} className={styles.link}>
              {NEW_MESSAGE_COPY.findMentor}
            </Link>
          </p>
        )}
      </div>
    </ModalShell>
  );
}
