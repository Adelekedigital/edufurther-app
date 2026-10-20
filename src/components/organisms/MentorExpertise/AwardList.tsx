'use client';

import { useId, type RefObject } from 'react';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MENTOR_EXPERTISE_COPY as C } from '@/lib/copy/mentorSettings';
import type { AwardFunding } from '@/types/mentor';
import styles from './MentorExpertise.module.css';

export type AwardRow = {
  id: string;
  title: string;
  /** "Awarded by … · 2021", as the profile shows it; null when there's nothing to add. */
  meta: string | null;
  funding: AwardFunding | null;
};

type AwardListProps = {
  status: 'loading' | 'error' | 'ready';
  rows: AwardRow[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
  /** Where focus lands when the control that had it is gone (a deleted row). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** The header's "Add award", for focus after the empty state's Add is gone. */
  addRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * "Scholarships and awards" (Mentor Settings.dc.html `awardRows` /
 * `noAwards`): a row per award with its funding badge, Edit and Delete; "Add
 * award" in the header once there's one, the empty state's "Add your first
 * award" before. Loading and a failed load keep the header (ours: the design
 * draws neither), as Education does.
 */
export function AwardList({
  status,
  rows,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
  headingRef,
  addRef,
}: AwardListProps) {
  const headingId = useId();
  const filled = status === 'ready' && rows.length > 0;
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={`${styles.head} ${styles.headWrap}`}>
        <div className={styles.headText}>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
            {C.awardsTitle}
          </h2>
          <span className={styles.sub}>{C.awardsSub}</span>
        </div>
        {filled && (
          <Button ref={addRef} variant="secondary-outlined" size="medium" onClick={onAdd}>
            {C.addAward}
          </Button>
        )}
      </div>
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
        // Error before empty: a failed load never reads as "no awards".
        <div className={styles.state} role="alert">
          <EmptyState illustration="favorites" size={120} headingLevel={3} title={C.loadError} />
          <Button variant="secondary-outlined" size="medium" onClick={onRetry}>
            {C.retry}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.state}>
          <EmptyState
            illustration="favorites"
            size={120}
            headingLevel={3}
            title={C.awardsEmptyTitle}
            description={C.awardsEmptyBody}
          />
          <Button variant="primary" size="medium" onClick={onAdd}>
            {C.addFirstAward}
          </Button>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} className={styles.row}>
              <span className={styles.tile}>
                <Icon name="workspace_premium" size={22} />
              </span>
              <div className={styles.text}>
                <span className={styles.rowTitle}>{r.title}</span>
                {r.meta && <span className={styles.meta}>{r.meta}</span>}
              </div>
              {r.funding && (
                <Badge type="accent" color="green" size="sm">
                  {C.funding[r.funding]}
                </Badge>
              )}
              <div className={styles.actions}>
                <IconButton
                  icon="edit"
                  size="sm"
                  shape="square"
                  aria-label={C.editAward(r.title)}
                  onClick={() => onEdit(r.id)}
                />
                <IconButton
                  icon="delete"
                  size="sm"
                  shape="square"
                  tone="danger"
                  aria-label={C.deleteAward(r.title)}
                  onClick={() => onDelete(r.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
