'use client';

import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import type { AdminMentee } from '@/lib/api/data/adminCredits';
import { FIND_COPY } from '@/lib/copy/adminCredits';
import { cx } from '@/lib/utils/cx';
import { CreditsError, SkeletonRows } from './CreditsError';
import styles from './FindMenteeCard.module.css';

type FindMenteeCardProps = {
  query: string;
  onQuery: (q: string) => void;
  mentees: AdminMentee[];
  /** The debounced text the list answers; null while a new answer loads. */
  term: string | null;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  pickedId: string | null;
  onPick: (m: AdminMentee) => void;
  /** Narrowed to 420px beside an open panel (desktop). */
  narrow?: boolean;
};

/** "Find a mentee" (Admin.dc.html creditLayout lookup): search, then pick one. */
export function FindMenteeCard({
  query,
  onQuery,
  mentees,
  term,
  status,
  onRetry,
  pickedId,
  onPick,
  narrow = false,
}: FindMenteeCardProps) {
  const searched = (term ?? query.trim()) !== '';
  return (
    <div className={cx(styles.card, narrow && styles.narrow)}>
      <SearchField
        labelled
        radius="sm"
        label={FIND_COPY.label}
        placeholder={FIND_COPY.placeholder}
        value={query}
        onChange={onQuery}
        onClear={() => onQuery('')}
      />
      {/* Always in the page, so each new count is read out. */}
      <span className={styles.count} role="status">
        {status === 'ready' && (searched ? FIND_COPY.matches(mentees.length) : FIND_COPY.recent)}
      </span>
      {status === 'error' ? (
        <CreditsError onRetry={onRetry} />
      ) : (
        <div className={styles.list}>
          {status === 'loading' ? (
            <SkeletonRows label={FIND_COPY.loading} count={3} />
          ) : mentees.length === 0 ? (
            <p className={styles.none}>{FIND_COPY.noMatch}</p>
          ) : (
            mentees.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cx(styles.row, styles.result, m.id === pickedId && styles.picked)}
                aria-pressed={m.id === pickedId}
                // The spans run together when read ("Okaforamara…"): name each part.
                aria-label={`${m.name}, ${m.email}, ${FIND_COPY.left(m.balance.left, m.balance.total)}`}
                onClick={() => onPick(m)}
              >
                <Avatar size="sm" initials={m.initials} tone={m.cover} src={m.avatarUrl} alt="" />
                <span className={styles.text}>
                  <span className={styles.name}>{m.name}</span>
                  <span className={styles.email}>{m.email}</span>
                </span>
                <span className={styles.balance}>
                  {FIND_COPY.left(m.balance.left, m.balance.total)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
