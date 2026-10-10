'use client';

import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { AnswerItem } from '@/components/molecules/AnswerItem/AnswerItem';
import type { AnswerFile, BookingAnswer } from '@/types/booking';
import styles from './SessionPrep.module.css';

export type GuideTip = { icon: IconName; title: string; body: string };

type AnswersProps = {
  /** "Your answers from booking." / "From Amara’s booking answers." */
  answersSub: string;
  /** Null while loading. */
  answers: BookingAnswer[] | null;
  answersLoading?: boolean;
  answersFailed?: boolean;
  onRetryAnswers?: () => void;
  onOpenFile?: (file: AnswerFile) => void;
};

/**
 * Whether there is anything to put in the answers card or sheet.
 *
 * Counted by what was **answered**, not by rows. Since backend #412 the list
 * carries every question the form asked, blanks included, so a row count says
 * "there are answers" for a form nobody filled in — and the card would open on
 * nothing but "No answer".
 */
export function hasAnswersToShow(
  p: Pick<AnswersProps, 'answers' | 'answersLoading' | 'answersFailed'>,
): boolean {
  return (
    !!p.answersFailed || !!p.answersLoading || !!p.answers?.some((a) => a.answered)
  );
}

/** The answers themselves: in the aside's card and in the phone sheet. */
export function PrepAnswers({
  answersSub,
  answers,
  answersFailed,
  onRetryAnswers,
  onOpenFile,
}: AnswersProps) {
  if (answersFailed) {
    return (
      <div className={styles.retry}>
        <span className={styles.muted}>We couldn’t load the answers.</span>
        <Button variant="secondary-outlined" size="small" onClick={onRetryAnswers}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <>
      <span className={styles.sub}>{answersSub}</span>
      {(answers ?? []).map((a) => (
        <AnswerItem key={a.questionId} answer={a} onOpenFile={onOpenFile} />
      ))}
    </>
  );
}

/** The quick guide's tips, each with its glyph. */
export function PrepGuide({ guide }: { guide: GuideTip[] }) {
  return guide.map((g) => (
    <div key={g.title} className={styles.tip}>
      <span className={styles.disc} aria-hidden>
        <Icon name={g.icon} size={18} />
      </span>
      <span className={styles.tipText}>
        <span className={styles.tipTitle}>{g.title}</span>
        <span className={styles.tipBody}>{g.body}</span>
      </span>
    </div>
  ));
}

type AsideProps = AnswersProps & {
  /** "What you’ll talk about" / "What Amara wants to talk about". */
  answersTitle: string;
  guide: GuideTip[];
};

/**
 * Session Join.dc.html `layout=lobbySplit`, beside the lobby: the booking
 * answers and the quick guide, each in its own card and always open. Hidden
 * on phones, where `SessionPrepButtons` takes its place.
 */
export function SessionPrepAside({ answersTitle, guide, ...answers }: AsideProps) {
  const loading = !!answers.answersLoading && !answers.answersFailed;
  return (
    // "Getting ready" is ours: the design's aside has no name, and a landmark needs one.
    <aside className={styles.aside} aria-label="Getting ready">
      {loading ? (
        // Ours: the card's shape while the answers load (the design draws none).
        <section className={styles.card} aria-busy="true">
          <Skeleton width="55%" height="18px" />
          <Skeleton width="80%" height="12px" />
          <Skeleton width="100%" height="40px" />
        </section>
      ) : (
        hasAnswersToShow(answers) && (
          <section className={styles.card}>
            <h2 className={styles.heading}>{answersTitle}</h2>
            <PrepAnswers {...answers} />
          </section>
        )
      )}
      <section className={styles.card}>
        <h2 className={styles.heading}>Quick guide for a rewarding session</h2>
        <PrepGuide guide={guide} />
      </section>
    </aside>
  );
}

/**
 * The aside's shape while the session itself loads (ours). Most people open
 * this page before a session, so the page starts in the wide layout and does
 * not jump sideways when the lobby arrives.
 */
export function SessionPrepAsideSkeleton() {
  return (
    <div className={styles.aside} aria-hidden>
      <div className={styles.card}>
        <Skeleton width="70%" height="20px" />
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.tip}>
            <Skeleton width="32px" height="32px" radius="lg" />
            <span className={styles.tipText}>
              <Skeleton width="50%" height="16px" />
              <Skeleton width="90%" height="28px" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type PrepSheet = 'talk' | 'guide';

type ButtonsProps = {
  /** "Your answers" / "Amara’s answers". */
  answersLabel: string;
  /** Whether the answers button shows: there is something to read, or a retry. */
  showAnswers: boolean;
  answersLoading?: boolean;
  onOpen: (sheet: PrepSheet) => void;
};

/**
 * Session Join.dc.html `mobPrepRows`: on phones, the foot of the lobby card
 * holds two buttons, each opening its content in a sheet. Hidden from 768px,
 * where the aside shows instead.
 */
export function SessionPrepButtons({
  answersLabel,
  showAnswers,
  answersLoading,
  onOpen,
}: ButtonsProps) {
  const rows: { key: PrepSheet; icon: IconName; title: string }[] = [
    ...(showAnswers ? [{ key: 'talk' as const, icon: 'forum' as const, title: answersLabel }] : []),
    { key: 'guide', icon: 'tips_and_updates', title: 'Quick guide' },
  ];
  return (
    <div className={styles.buttons} aria-busy={answersLoading || undefined}>
      {answersLoading && (
        // Ours: the answers button's place while they load.
        <span className={styles.buttonPlaceholder} aria-hidden>
          <Skeleton width="100%" height="56px" radius="lg" />
        </span>
      )}
      {rows.map((r) => (
        <button
          key={r.key}
          type="button"
          aria-haspopup="dialog"
          className={styles.button}
          onClick={() => onOpen(r.key)}
        >
          <span className={styles.disc} aria-hidden>
            <Icon name={r.icon} size={18} />
          </span>
          <span className={styles.buttonTitle}>{r.title}</span>
        </button>
      ))}
    </div>
  );
}
