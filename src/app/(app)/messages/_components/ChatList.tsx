'use client';

import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { RadioChips } from '@/components/molecules/RadioChips/RadioChips';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { LIST_COPY, NO_ROWS_COPY } from '@/lib/copy/messages';
import type { ChatFilter, RowView } from './chatRows';
import { ChatListRow } from './ChatListRow';
import { cx } from '@/lib/utils/cx';
import styles from './ChatList.module.css';

type ChatListProps = {
  rows: RowView[];
  /** The open chat's id when the list sits beside it (desktop), for the tint and aria-current. */
  currentId: string | null;
  q: string;
  onQ: (q: string) => void;
  filter: ChatFilter;
  onFilter: (f: ChatFilter) => void;
  totalUnread: number;
  /** The rows are filtered to nothing: which state says so. */
  noRows: 'unread' | 'search' | null;
  onSelect: (id: string) => void;
  onSettings: () => void;
  onNew: () => void;
  /** The screen's placement (hidden on phones while a chat is open). */
  className?: string;
};

/** The list column (Messages.dc.html `showList`): header, search, filters, rows. */
export function ChatList(p: ChatListProps) {
  return (
    <section aria-label={LIST_COPY.title} className={cx(styles.list, p.className)}>
      <div className={styles.top}>
        <div className={styles.head}>
          <h1 className={styles.title}>{LIST_COPY.title}</h1>
          <div className={styles.actions}>
            <IconButton
              variant="ring"
              icon="settings"
              aria-label={LIST_COPY.settings}
              aria-haspopup="dialog"
              onClick={p.onSettings}
            />
            <IconButton
              variant="ring"
              icon="edit_square"
              aria-label={LIST_COPY.newMessage}
              aria-haspopup="dialog"
              onClick={p.onNew}
            />
          </div>
        </div>
        <SearchField
          label={LIST_COPY.searchLabel}
          placeholder={LIST_COPY.searchPlaceholder}
          value={p.q}
          onChange={p.onQ}
          onClear={() => p.onQ('')}
          radius="md"
          compact
        />
        <RadioChips
          label={LIST_COPY.filterLabel}
          look="dark"
          required={false}
          options={[
            { value: 'all', label: LIST_COPY.all },
            { value: 'unread', label: LIST_COPY.unread(p.totalUnread) },
          ]}
          value={p.filter}
          onChange={(v) => p.onFilter(v as ChatFilter)}
        />
      </div>
      <div className={styles.rows}>
        {p.rows.map((r) => (
          <ChatListRow
            key={r.id}
            row={r}
            current={r.id === p.currentId}
            onSelect={() => p.onSelect(r.id)}
          />
        ))}
        {p.noRows && (
          <div className={styles.noRows}>
            <EmptyState
              illustration={p.noRows === 'unread' ? 'inbox' : 'search-results'}
              size={120}
              title={p.noRows === 'unread' ? NO_ROWS_COPY.unreadTitle : NO_ROWS_COPY.searchTitle}
              description={
                p.noRows === 'unread' ? NO_ROWS_COPY.unreadBody : NO_ROWS_COPY.searchBody
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** The list while it loads (or while the viewer's role is unknown): nothing role-specific. */
export function ChatListSkeleton() {
  return (
    <section aria-label={LIST_COPY.title} aria-busy="true" className={styles.list}>
      <div className={styles.top}>
        <div className={styles.head}>
          <h1 className={styles.title}>{LIST_COPY.title}</h1>
        </div>
        <Skeleton height="40px" radius="md" />
        <div className={styles.skeletonPills}>
          <Skeleton width="48px" height="32px" radius="full" />
          <Skeleton width="72px" height="32px" radius="full" />
        </div>
      </div>
      <p className="sr-only" role="status">
        {LIST_COPY.loading}
      </p>
      <div className={styles.rows}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonRow}>
            <Skeleton width="40px" height="40px" radius="full" />
            <div className={styles.skeletonLines}>
              <Skeleton width="60%" height="14px" />
              <Skeleton width="80%" height="12px" />
              <Skeleton width="90%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
