'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Tag } from '@/components/atoms/Tag/Tag';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import type { EmailValue } from '@/lib/api/data/adminEmails';
import { EMAIL_VALUES as C } from '@/lib/copy/adminEmails';
import { cx } from '@/lib/utils/cx';
import { AdminLoadError } from '../../_components/AdminLoadError';
import { filterValues } from './emailFilters';
import styles from './EmailValues.module.css';

type Props = {
  values: EmailValue[] | undefined;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  retrying: boolean;
};

/**
 * Admin Emails.dc.html "3. Variable reference": read only. A table for
 * assistive tech on every width; under 1024px the cells stack, each with its
 * column's name.
 */
export function EmailValues({ values, status, onRetry, retrying }: Props) {
  const [q, setQ] = useState('');
  const all = values ?? [];
  const rows = filterValues(all, q);
  const cell = (label: string, value: string, className?: string) => (
    <span role="cell" className={className}>
      <span className={styles.cellLabel} aria-hidden="true">
        {label}
      </span>
      {value}
    </span>
  );
  return (
    <>
      <div className={styles.top}>
        <div className={styles.search}>
          <SearchField
            labelled="filter"
            compact
            radius="sm"
            label={C.search.label}
            placeholder={C.search.placeholder}
            value={q}
            onChange={setQ}
            onClear={() => setQ('')}
          />
        </div>
        <p className={styles.note}>{C.note}</p>
      </div>
      {status === 'error' ? (
        <AdminLoadError
          framed
          illustration="inbox"
          headingLevel={2}
          title={C.error.title}
          body={C.error.body}
          retryLabel={C.error.retry}
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : status === 'ready' && all.length === 0 ? (
        <p className={cx(styles.card, styles.none)}>{C.none}</p>
      ) : (
        <div className={styles.card}>
          <div role="table" aria-label={C.table} aria-busy={status === 'loading' || undefined}>
            <div className={styles.head} role="row">
              {Object.values(C.columns).map((c) => (
                <span key={c} role="columnheader">
                  {c}
                </span>
              ))}
            </div>
            {status === 'loading' ? (
              <div aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={styles.row}>
                    <Skeleton width="96px" height="20px" radius="sm" />
                    <Skeleton width="80%" height="12px" radius="sm" />
                  </div>
                ))}
              </div>
            ) : (
              rows.map((v) => (
                <div key={v.name} className={styles.row} role="row">
                  <span role="cell">
                    <Tag tone="value">{v.name}</Tag>
                  </span>
                  <span role="cell" className={styles.meaning}>
                    {v.meaning}
                  </span>
                  {cell(C.columns.example, v.example, styles.plain)}
                  {cell(C.columns.fallback, v.fallback ?? C.noFallback, styles.plain)}
                  {cell(C.columns.usedIn, C.usedIn(v.usedIn), styles.used)}
                </div>
              ))
            )}
          </div>
          {/* Outside the table: a table owns rows only. */}
          {status === 'ready' && rows.length === 0 && (
            <p className={styles.none}>{C.noMatch(q.trim())}</p>
          )}
        </div>
      )}
    </>
  );
}
