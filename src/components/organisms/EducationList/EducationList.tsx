'use client';

import { useId, type RefObject } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { EDUCATION_COPY, SETTINGS_COPY } from '@/lib/copy/settings';
import { educationMeta, educationTitle, type EducationRow } from '@/lib/utils/educationLine';
import styles from './EducationList.module.css';

type Props = {
  status: 'loading' | 'error' | 'ready';
  rows: EducationRow[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
  /** A retry is out: Try again shows busy (and stays focusable). */
  retrying?: boolean;
  /** Moves on each failed load, so a repeat failure is announced again. */
  errorKey?: number;
  /** Where focus lands when the control that had it is gone (a deleted row). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** The header's "Add education", for focus after the empty state's Add is gone. */
  addRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * Settings › Education (Mentee Settings.dc.html `isMEdu`, menteeTabs=split):
 * one card, its own header, a row per degree with Edit and Delete. "Add
 * education" sits in the header once there's a degree, in the empty state
 * before. Loading and a failed load keep the header (ours: the design draws
 * neither).
 */
export function EducationList({
  status,
  rows,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
  retrying = false,
  errorKey = 0,
  headingRef,
  addRef,
}: Props) {
  const headingId = useId();
  const filled = status === 'ready' && rows.length > 0;
  return (
    <div className={styles.wrap}>
      <section className={styles.card} aria-labelledby={headingId}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
              {EDUCATION_COPY.title}
            </h2>
            <span className={styles.sub}>{EDUCATION_COPY.sub}</span>
          </div>
          {filled && (
            <Button ref={addRef} variant="secondary-outlined" size="medium" onClick={onAdd}>
              {EDUCATION_COPY.add}
            </Button>
          )}
        </div>
        {/* Always in the page, so what lands in it is read out. */}
        <p role="status" className="sr-only">
          {status === 'loading' && EDUCATION_COPY.loading}
          {status === 'error' && (
            <span key={errorKey}>
              {SETTINGS_COPY.loadError} {SETTINGS_COPY.loadErrorBody}
            </span>
          )}
        </p>
        {status === 'loading' ? (
          <div aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className={styles.row}>
                <Skeleton width="40px" height="40px" radius="lg" />
                <div className={styles.text}>
                  <Skeleton width="45%" height="16px" />
                  <Skeleton width="60%" height="14px" />
                </div>
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          // Error before empty: a failed load never reads as "nothing saved".
          // Announced by the status region above, not by this block.
          <div className={styles.state}>
            <EmptyState
              illustration="forms"
              size={120}
              headingLevel={3}
              title={SETTINGS_COPY.loadError}
              description={SETTINGS_COPY.loadErrorBody}
            />
            <Button variant="secondary-outlined" size="medium" onClick={onRetry} busy={retrying}>
              {SETTINGS_COPY.retry}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.state}>
            <EmptyState
              illustration="forms"
              size={120}
              headingLevel={3}
              title={EDUCATION_COPY.emptyTitle}
              description={EDUCATION_COPY.emptyBody}
            />
            <Button variant="primary" size="medium" onClick={onAdd}>
              {EDUCATION_COPY.add}
            </Button>
          </div>
        ) : (
          <ul className={styles.list}>
            {rows.map((r) => {
              const title = educationTitle(r);
              return (
                <li key={r.id} className={styles.row}>
                  <span className={styles.tile}>
                    <Icon name="school" size={22} />
                  </span>
                  <div className={styles.text}>
                    <span className={styles.rowTitle}>{title}</span>
                    <span className={styles.meta}>{educationMeta(r)}</span>
                  </div>
                  <div className={styles.actions}>
                    <IconButton
                      icon="edit"
                      size="sm"
                      shape="square"
                      aria-label={EDUCATION_COPY.edit(title)}
                      onClick={() => onEdit(r.id)}
                    />
                    <IconButton
                      icon="delete"
                      size="sm"
                      shape="square"
                      tone="danger"
                      aria-label={EDUCATION_COPY.remove(title)}
                      onClick={() => onDelete(r.id)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
