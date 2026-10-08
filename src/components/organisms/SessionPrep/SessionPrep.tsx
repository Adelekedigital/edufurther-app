'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { AnswerItem } from '@/components/molecules/AnswerItem/AnswerItem';
import { DisclosureRow } from '@/components/molecules/DisclosureRow/DisclosureRow';
import type { AnswerFile, BookingAnswer } from '@/types/booking';
import styles from './SessionPrep.module.css';

export type GuideTip = { title: string; body: string };

type SessionPrepProps = {
  /** "What you’ll talk about" / "What Amara wants to talk about". */
  answersTitle: string;
  /** Null while loading. An empty list hides the row: there is nothing to read. */
  answers: BookingAnswer[] | null;
  /** Still coming: a placeholder holds the row's place rather than it popping in. */
  answersLoading?: boolean;
  answersFailed?: boolean;
  onRetryAnswers?: () => void;
  onOpenFile?: (file: AnswerFile) => void;
  guide: GuideTip[];
};

/**
 * Session Join.dc.html's two rows under the lobby: the mentee's booking
 * answers, and the quick guide. Both start closed (the design's default).
 */
export function SessionPrep({
  answersTitle,
  answers,
  answersLoading,
  answersFailed,
  onRetryAnswers,
  onOpenFile,
  guide,
}: SessionPrepProps) {
  const [open, setOpen] = useState<{ talk: boolean; guide: boolean }>({
    talk: false,
    guide: false,
  });
  const toggle = (k: 'talk' | 'guide') => setOpen((o) => ({ ...o, [k]: !o[k] }));
  // A failed read still gets its row, so the answers do not just vanish.
  const showTalk = answersFailed || (answers?.length ?? 0) > 0;
  const preview = answersFailed
    ? 'Couldn’t load the answers.'
    : (answers ?? []).map((a) => a.text).join(' · ');

  const loading = !!answersLoading && !answersFailed;
  return (
    <div className={styles.prep} aria-busy={loading || undefined}>
      {loading && (
        // Ours: the row's shape while the answers load (the design draws none).
        <div className={styles.placeholder} aria-hidden>
          <Skeleton width="32px" height="32px" radius="lg" />
          <span className={styles.placeholderText}>
            <Skeleton width="45%" height="14px" />
            <Skeleton width="80%" height="12px" />
          </span>
        </div>
      )}
      {showTalk && !loading && (
        <DisclosureRow
          icon="forum"
          title={answersTitle}
          preview={preview}
          open={open.talk}
          onToggle={() => toggle('talk')}
        >
          {answersFailed ? (
            <div className={styles.retry}>
              <span className={styles.muted}>We couldn’t load the answers.</span>
              <Button variant="secondary-outlined" size="small" onClick={onRetryAnswers}>
                Try again
              </Button>
            </div>
          ) : (
            (answers ?? []).map((a) => (
              <AnswerItem key={a.questionId} answer={a} onOpenFile={onOpenFile} />
            ))
          )}
        </DisclosureRow>
      )}
      <DisclosureRow
        icon="checklist"
        title="Quick guide for a rewarding session"
        preview={`${guide.length} tips · 1 min read`}
        open={open.guide}
        onToggle={() => toggle('guide')}
        divided={showTalk || loading}
      >
        {guide.map((g) => (
          <div key={g.title} className={styles.tip}>
            <span className={styles.tipTitle}>{g.title}</span>
            <span className={styles.tipBody}>{g.body}</span>
          </div>
        ))}
      </DisclosureRow>
    </div>
  );
}
