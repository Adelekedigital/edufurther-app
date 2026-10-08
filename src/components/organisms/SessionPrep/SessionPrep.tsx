'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
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

  return (
    <div className={styles.prep}>
      {showTalk && (
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
        divided={showTalk}
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
