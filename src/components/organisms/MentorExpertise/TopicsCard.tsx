'use client';

import { useId, type Ref } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { MENTOR_EXPERTISE_COPY as C } from '@/lib/copy/mentorSettings';
import { cx } from '@/lib/utils/cx';
import styles from './MentorExpertise.module.css';

type TopicsCardProps = {
  topics: { slug: string; label: string }[];
  onEdit: () => void;
  /** The control that opens the topics modal, so focus can come back to it. */
  editRef?: Ref<HTMLButtonElement>;
};

/**
 * "What you help with" (Mentor Settings.dc.html `topicsListModal` /
 * `topicsEmptyModal`): the chosen topics with Edit, or the empty state with
 * "Choose topics". The topics modal does the saving.
 */
export function TopicsCard({ topics, onEdit, editRef }: TopicsCardProps) {
  const id = useId();
  const empty = topics.length === 0;
  return (
    <section className={cx(styles.card, styles.padded)} aria-labelledby={id}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id={id} className={styles.title}>
            {C.topicsTitle}
          </h2>
          <span className={styles.sub}>{C.topicsSub}</span>
        </div>
        {!empty && (
          <Button
            ref={editRef}
            variant="secondary-outlined"
            size="medium"
            aria-label={C.editTopicsLabel}
            onClick={onEdit}
          >
            {C.editTopics}
          </Button>
        )}
      </div>
      {empty ? (
        <div className={styles.topicsEmpty}>
          <EmptyState
            illustration="search-results"
            size={120}
            headingLevel={3}
            title={C.topicsEmptyTitle}
            description={C.topicsEmptyBody}
          />
          <Button ref={editRef} variant="primary" size="medium" onClick={onEdit}>
            {C.chooseTopics}
          </Button>
        </div>
      ) : (
        <ul className={styles.topics}>
          {topics.map((t) => (
            <li key={t.slug} className={styles.topic}>
              <Icon name="check" size={16} />
              {t.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
