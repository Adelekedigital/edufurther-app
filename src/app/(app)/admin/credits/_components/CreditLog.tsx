'use client';

import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ChoiceChips } from '@/components/molecules/ChoiceChips/ChoiceChips';
import { LoadMore } from '@/components/molecules/LoadMore/LoadMore';
import type { CreditEntry } from '@/lib/api/data/adminCredits';
import {
  CREDITS_STATES,
  CREDITS_TABS,
  LOG_COPY,
  signedChange,
  type CreditLogType,
} from '@/lib/copy/adminCredits';
import { cx } from '@/lib/utils/cx';
import { formatShortDate } from '@/lib/utils/format';
import { CreditsError, SkeletonRows } from './CreditsError';
import styles from './CreditLog.module.css';

const CHIPS = (Object.keys(LOG_COPY.chips) as CreditLogType[]).map((value) => ({
  value,
  label: LOG_COPY.chips[value],
}));

type CreditLogProps = {
  type: CreditLogType;
  onType: (t: CreditLogType) => void;
  entries: CreditEntry[];
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  timeZone?: string;
  onOpen: (entry: CreditEntry) => void;
  more: { hasMore: boolean; loadingMore: boolean; loadMoreFailed: boolean; loadMore: () => void };
};

/** Every credit change, newest first, filtered by chip (Admin.dc.html `tabLog`). */
export function CreditLog({
  type,
  onType,
  entries,
  status,
  onRetry,
  timeZone,
  onOpen,
  more,
}: CreditLogProps) {
  const cols = LOG_COPY.columns;
  return (
    <div className={styles.log}>
      <ChoiceChips
        label={LOG_COPY.chipsLabel}
        options={CHIPS}
        selected={[type]}
        onToggle={(v) => onType(v as CreditLogType)}
      />
      {status === 'error' ? (
        <CreditsError onRetry={onRetry} framed />
      ) : status === 'loading' ? (
        <div className={styles.card}>
          <SkeletonRows label={LOG_COPY.loading} />
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.card}>
          <EmptyState
            illustration="search-results"
            size={120}
            headingLevel={3}
            title={CREDITS_STATES.empty}
          />
        </div>
      ) : (
        <>
          <div role="table" aria-label={CREDITS_TABS.log} className={styles.card}>
            <div role="row" className={cx(styles.row, styles.head)}>
              <span role="columnheader">{cols.when}</span>
              <span role="columnheader">{cols.mentee}</span>
              <span role="columnheader">{cols.change}</span>
              <span role="columnheader">{cols.what}</span>
              <span role="columnheader">{cols.by}</span>
            </div>
            {entries.map((e) => (
              <div key={e.id} role="row" className={styles.row}>
                <span role="cell" className={styles.when}>
                  {formatShortDate(e.at, timeZone)}
                </span>
                <span role="cell" className={styles.mentee}>
                  {e.menteeGone ? (
                    e.menteeName
                  ) : (
                    <button type="button" className={styles.link} onClick={() => onOpen(e)}>
                      {e.menteeName}
                    </button>
                  )}
                </span>
                <span role="cell" className={cx(styles.change, e.change > 0 && styles.plus)}>
                  {signedChange(e.change)}
                </span>
                <span role="cell" className={styles.what}>
                  {e.what}
                </span>
                <span role="cell" className={styles.by}>
                  {e.by}
                </span>
              </div>
            ))}
          </div>
          {more.hasMore && (
            <LoadMore
              label={LOG_COPY.more}
              onLoadMore={more.loadMore}
              busy={more.loadingMore}
              error={more.loadMoreFailed ? CREDITS_STATES.errorTitle : null}
            />
          )}
        </>
      )}
    </div>
  );
}
