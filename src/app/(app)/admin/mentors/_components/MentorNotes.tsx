'use client';

import { useId, useState } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Textarea } from '@/components/atoms/Input/Input';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import type { AdminNote } from '@/lib/api/data/adminMentors';
import { MENTOR_DRAWER } from '@/lib/copy/adminMentors';
import { formatShortDate } from '@/lib/utils/format';
import styles from './MentorDrawer.module.css';

const N = MENTOR_DRAWER.notes;
export const NOTE_MAX = 2000;

type Props = {
  notes: AdminNote[] | undefined;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  /** Absent: this admin can read notes but not write them (limited_access). */
  onAdd?: (body: string) => Promise<unknown>;
  zone: string;
};

/**
 * Internal notes (Admin.dc.html drawer): each with its author and date, then
 * the box and Add note, off while empty. Only admins ever see these.
 */
export function MentorNotes({ notes, status, onRetry, onAdd, zone }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const errorId = useId();
  const add = async () => {
    const body = text.trim();
    if (!body || !onAdd) return;
    setBusy(true);
    setFailed(false);
    try {
      await onAdd(body);
      setText('');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.notesSection}>
      <h3>
        {N.title} <span className={styles.notesHint}>{N.hint}</span>
      </h3>
      {status === 'loading' && <Skeleton height="40px" />}
      {status === 'error' && (
        <p className={styles.muted}>
          {N.loadFailed}{' '}
          <Button variant="text" size="small" onClick={onRetry}>
            {N.retry}
          </Button>
        </p>
      )}
      {status === 'ready' && notes && notes.length > 0 && (
        <ul className={styles.notes}>
          {notes.map((n) => (
            <li key={n.id} className={styles.note}>
              <Avatar
                size="sm"
                initials={n.author.initials}
                // No name: the DS person glyph, as a deleted user is drawn elsewhere.
                tone={n.author.initials ? n.author.cover : 'plain'}
                src={n.author.photoUrl}
                alt=""
              />
              <div className={styles.noteMain}>
                <span className={styles.small}>
                  <strong className={styles.author}>{n.author.name}</strong>
                  {` · ${formatShortDate(n.createdAt, zone)}`}
                </span>
                <p className={styles.noteText}>{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {onAdd && (
        <>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={N.label}
            placeholder={N.placeholder}
            rows={2}
            maxLength={NOTE_MAX}
            invalid={failed}
            aria-describedby={failed ? errorId : undefined}
            className={styles.noteBox}
          />
          {failed && <FieldError id={errorId}>{N.addFailed}</FieldError>}
          <div className={styles.noteActions}>
            <Button
              variant="secondary-outlined"
              size="small"
              onClick={add}
              disabled={!text.trim() && !busy}
              busy={busy}
            >
              {N.add}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
