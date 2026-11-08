'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { PreviewUserRow } from '@/components/molecules/PreviewUserRow/PreviewUserRow';
import { RadioChips } from '@/components/molecules/RadioChips/RadioChips';
import type { PreviewRole, PreviewUser } from '@/lib/api/data/previewStore';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import styles from './PreviewUserPicker.module.css';

export type PickerRole = 'all' | PreviewRole;

type PreviewUserPickerProps = {
  /** The panel's id: the bar's picker button aria-controls it. */
  id: string;
  query: string;
  onQuery: (q: string) => void;
  role: PickerRole;
  onRole: (role: PickerRole) => void;
  users: PreviewUser[];
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  /** The person being previewed, if any. */
  currentId: string | null;
  /** An unknown ?viewAs= value: the red note above the list. */
  miss: string | null;
  /** A pick the server couldn't open (provisional copy, no design). */
  startFailed: boolean;
  onPick: (user: PreviewUser) => void;
  more: { hasMore: boolean; loadingMore: boolean; loadMoreFailed: boolean; loadMore: () => void };
  /** Escape or a click outside: the bar puts focus back on its button. */
  onClose: () => void;
};

const ROLES: { value: PickerRole; label: string }[] = [
  { value: 'all', label: PREVIEW_COPY.picker.all },
  { value: 'mentor', label: PREVIEW_COPY.picker.mentors },
  { value: 'mentee', label: PREVIEW_COPY.picker.mentees },
];

/**
 * The Preview as user picker (AppShell.dc.html "View as user (admin)" panel):
 * search, role chips, and the accounts as a listbox. The search field is a
 * combobox: focus stays in it, arrows move through the rows
 * (aria-activedescendant), Enter picks. Props only; the page fetches.
 */
export function PreviewUserPicker({
  id,
  query,
  onQuery,
  role,
  onRole,
  users,
  status,
  onRetry,
  currentId,
  miss,
  startFailed,
  onPick,
  more,
  onClose,
}: PreviewUserPickerProps) {
  const listId = `${id}-list`;
  const rowId = useId();
  const [active, setActive] = useState(-1);
  const end = useRef<HTMLDivElement>(null);
  // A new answer starts the keyboard from the top.
  const [seen, setSeen] = useState(users);
  if (seen !== users) {
    setSeen(users);
    setActive(-1);
  }

  // More on scroll (PRD): the list's end coming into view asks for the next page.
  const { hasMore, loadingMore, loadMoreFailed, loadMore } = more;
  useEffect(() => {
    const el = end.current;
    if (!el || !hasMore || loadingMore || loadMoreFailed) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) loadMore();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, loadMoreFailed, loadMore]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && users.length > 0) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = Math.min(users.length - 1, Math.max(0, active + step));
      setActive(next);
      document.getElementById(`${rowId}-${next}`)?.scrollIntoView?.({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0 && users[active]) {
      e.preventDefault();
      onPick(users[active]);
    }
  };

  const ready = status === 'ready';
  return (
    <>
      <div className={styles.scrim} aria-hidden onClick={onClose} />
      <div id={id} role="dialog" aria-label={PREVIEW_COPY.picker.panel} className={styles.panel}>
        <div className={styles.head}>
          <input
            type="search"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${rowId}-${active}` : undefined}
            aria-label={PREVIEW_COPY.picker.search}
            placeholder={PREVIEW_COPY.picker.placeholder}
            autoComplete="off"
            enterKeyHint="search"
            className={styles.search}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onKey}
            // The design focuses the search when the picker opens.
            autoFocus
          />
          {/* The dark filter pills (one choice of three): the shared RadioChips row. */}
          <div className={styles.roles}>
            <RadioChips
              look="dark"
              required={false}
              label={PREVIEW_COPY.picker.roles}
              options={ROLES}
              value={role}
              onChange={(v) => onRole(v as PickerRole)}
            />
          </div>
          {(miss || startFailed) && (
            <p role="alert" className={styles.miss}>
              <Icon name="error" size={16} />
              <span>{miss ? PREVIEW_COPY.picker.miss(miss) : PREVIEW_COPY.picker.startFailed}</span>
            </p>
          )}
        </div>
        <div className={styles.body}>
          {/* Always in the panel while open: the combobox's aria-controls names it. */}
          <ul
            id={listId}
            role="listbox"
            aria-label={PREVIEW_COPY.picker.list}
            className={styles.list}
          >
            {ready &&
              users.map((u, i) => (
                <PreviewUserRow
                  key={u.id}
                  id={`${rowId}-${i}`}
                  user={u}
                  selected={u.id === currentId}
                  active={i === active}
                  onPick={onPick}
                />
              ))}
          </ul>
          {ready && users.length === 0 && (
            <p role="status" className={styles.note}>
              {PREVIEW_COPY.picker.noMatch(query.trim())}
            </p>
          )}
          {status === 'loading' && <SkeletonRows label={PREVIEW_COPY.picker.loading} />}
          {status === 'error' && <RetryNote text={PREVIEW_COPY.picker.error} onRetry={onRetry} />}
          {ready && loadingMore && (
            <SkeletonRows label={PREVIEW_COPY.picker.loadingMore} count={1} />
          )}
          {ready && loadMoreFailed && (
            <RetryNote text={PREVIEW_COPY.picker.moreFailed} onRetry={loadMore} />
          )}
          <div ref={end} aria-hidden className={styles.end} />
        </div>
      </div>
    </>
  );
}

/** "We couldn’t load users." with Try again (AppShell.dc.html `vaListError`). */
function RetryNote({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" className={styles.error}>
      {text}
      <button type="button" className={styles.retry} onClick={onRetry}>
        {PREVIEW_COPY.picker.retry}
      </button>
    </div>
  );
}

/** The design's loading rows: a 32px circle and two bars (`vaSkel`). */
function SkeletonRows({ label, count = 3 }: { label: string; count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.skeletons}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeleton}>
          <Skeleton width="32px" height="32px" radius="full" />
          <span className={styles.skeletonText}>
            <Skeleton width="70%" height="10px" />
            <Skeleton width="40%" height="8px" />
          </span>
        </div>
      ))}
    </div>
  );
}
