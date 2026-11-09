'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import type { SelectOption } from '@/components/atoms/Select/Select';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { FilterBar } from '@/components/molecules/FilterBar/FilterBar';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { groupEmails, type EmailSummary } from '@/lib/api/data/adminEmails';
import { EMAIL_FILTERS as F, EMAIL_LIST as C, EMAIL_STATUS, goesTo } from '@/lib/copy/adminEmails';
import { formatShortDate } from '@/lib/utils/format';
import { AdminLoadError } from '../../_components/AdminLoadError';
import { filterEmails, filtersActive, NO_EMAIL_FILTERS, type EmailFilters } from './emailFilters';
import styles from './EmailList.module.css';

const opts = (o: Record<string, string>): SelectOption[] =>
  Object.entries(o).map(([value, label]) => ({ value, label }));

type Props = {
  emails: EmailSummary[] | undefined;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  retrying: boolean;
  timeZone?: string;
};

/**
 * Admin Emails.dc.html "1. Email list": search and filters, then one card per
 * template with a matching email. A row opens the email's editor. Error is
 * checked before empty; the filter row stays in place through every state, so
 * a failed load keeps the search and filters.
 */
export function EmailList({ emails, status, onRetry, retrying, timeZone }: Props) {
  const [q, setQ] = useState('');
  const [picked, setFilters] = useState<EmailFilters>(NO_EMAIL_FILTERS);
  const all = emails ?? [];
  const groups = groupEmails(all);
  // A group the registry no longer has (after a reload) reads as all groups.
  const filters =
    picked.group === 'all' || groups.some((g) => g.key === picked.group)
      ? picked
      : { ...picked, group: 'all' };
  const shown = filterEmails(all, q, filters);
  const active = filtersActive(q, filters);

  const bar = (
    <FilterBar
      layout="fill"
      label={F.group}
      lead={
        <SearchField
          labelled="filter"
          compact
          radius="sm"
          label={F.search.label}
          placeholder={F.search.placeholder}
          value={q}
          onChange={setQ}
          onClear={() => setQ('')}
        />
      }
      fields={[
        {
          key: 'group',
          label: F.groups.label,
          options: [
            { value: 'all', label: F.groups.all },
            ...groups.map((g) => ({ value: g.key, label: g.name })),
          ],
          value: filters.group,
          changed: filters.group !== 'all',
          onChange: (v) => setFilters({ ...filters, group: v }),
        },
        {
          key: 'to',
          label: F.to.label,
          options: opts(F.to.options),
          value: filters.to,
          changed: filters.to !== 'all',
          onChange: (v) => setFilters({ ...filters, to: v as EmailFilters['to'] }),
        },
        {
          key: 'status',
          label: F.status.label,
          options: opts(F.status.options),
          value: filters.status,
          changed: filters.status !== 'all',
          onChange: (v) => setFilters({ ...filters, status: v as EmailFilters['status'] }),
        },
      ]}
      count={status === 'ready' ? F.count(shown.length, all.length) : null}
      liveCount
      clearLabel={F.clear}
      active={active}
      onClear={() => {
        setQ('');
        setFilters(NO_EMAIL_FILTERS);
      }}
    />
  );

  if (status === 'loading')
    return (
      <>
        {bar}
        <div className={styles.card} aria-busy="true" aria-label={C.loading} role="status">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skeletonRow} aria-hidden="true">
              <span className={styles.skeletonText}>
                <Skeleton width="36%" height="12px" radius="sm" />
                <Skeleton width="52%" height="10px" radius="sm" />
              </span>
              <Skeleton width="72px" height="20px" radius="full" />
              <Skeleton width="56px" height="20px" radius="full" />
            </div>
          ))}
        </div>
      </>
    );

  if (status === 'error')
    return (
      <>
        {bar}
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
      </>
    );

  const cards = groupEmails(shown);
  const empty = all.length ? C.noMatch : C.none;
  return (
    <>
      {bar}
      {cards.length === 0 && (
        <div className={styles.state}>
          <EmptyState
            illustration="search-results"
            size={120}
            headingLevel={2}
            title={empty.title}
            description={empty.body}
          />
        </div>
      )}
      {cards.map((g) => (
        <section key={g.key} aria-labelledby={`email-group-${g.key}`} className={styles.card}>
          <div className={styles.cardHead}>
            <h2 id={`email-group-${g.key}`} className={styles.groupName}>
              {g.name}
            </h2>
            <span className={styles.meta}>{C.groupMeta(g.emails.length, g.templateName)}</span>
          </div>
          <div className={styles.columns} aria-hidden="true">
            <span>{C.columns.email}</span>
            <span>{C.columns.to}</span>
            <span>{C.columns.template}</span>
            <span>{C.columns.edited}</span>
            <span />
          </div>
          <ul className={styles.rows}>
            {g.emails.map((e) => {
              const statusWord = e.live ? EMAIL_STATUS.live : EMAIL_STATUS.notSetUp;
              const edited = e.lastEdited
                ? { by: e.lastEdited.by, on: formatShortDate(e.lastEdited.at, timeZone) }
                : null;
              const to = goesTo(e.recipients);
              // Named by its content: name, trigger, who it goes to, status, last edit.
              return (
                <li key={e.key}>
                  <Link
                    href={`/admin/emails/${encodeURIComponent(e.key)}`}
                    prefetch={false}
                    className={styles.row}
                  >
                    <span className={styles.what}>
                      <span className={styles.name}>{e.name}</span>
                      <span className={styles.trigger}>{e.trigger}</span>
                      <span className={styles.narrowMeta}>
                        {to} · {statusWord} · {edited ? edited.by : C.defaultWording}
                      </span>
                    </span>
                    <span className={styles.to}>{to}</span>
                    <span className={styles.status}>
                      <Badge type="accent" color={e.live ? 'green' : 'neutral'} size="sm">
                        {statusWord}
                      </Badge>
                    </span>
                    <span className={styles.edited}>
                      <span>{edited ? edited.by : C.defaultWording}</span>
                      {edited && <span className={styles.editedOn}>{edited.on}</span>}
                    </span>
                    <Icon name="chevron_right" size={20} className={styles.chevron} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
