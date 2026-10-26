import { useId } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { GETTING_STARTED as C } from '@/lib/copy/home';
import { cx } from '@/lib/utils/cx';
import styles from './GettingStarted.module.css';

export type StepState = 'done' | 'now' | 'todo';

export type GettingStartedRow = {
  key: string;
  label: string;
  note: string;
  state: StepState;
} & ({ href: string } | { onClick: () => void });

type GettingStartedProps = {
  rows: GettingStartedRow[];
  doneCount: number;
  /** Hide shows once a first request is sent (design canHide). */
  onHide: (() => void) | null;
  /** Where focus goes back to after Undo. */
  hideRef?: React.Ref<HTMLButtonElement>;
};

/**
 * Getting started (Mentee Dashboard v2.dc.html, newHome nextStep): the four
 * setup steps, any order, each with a dot (a green check when done, a blue
 * arrow on the current step, empty otherwise) and where it leads. Props only.
 */
export function GettingStarted({ rows, doneCount, onHide, hideRef }: GettingStartedProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {C.title}
        </h2>
        <div className={styles.headEnd}>
          <span className={styles.count}>{C.count(doneCount)}</span>
          {onHide && (
            <button ref={hideRef} type="button" className={styles.hide} onClick={onHide}>
              {C.hide}
            </button>
          )}
        </div>
      </div>
      <ol className={styles.list}>
        {rows.map((r) => {
          const inner = (
            <>
              <span aria-hidden="true" className={cx(styles.dot, styles[r.state])}>
                {r.state === 'done' && <Icon name="check" size={16} />}
                {r.state === 'now' && <Icon name="arrow_forward" size={16} />}
              </span>
              <span className={styles.lines}>
                <span className={cx(styles.label, r.state === 'done' && styles.labelDone)}>
                  {r.label}
                </span>
                <span className={styles.note}>{r.note}</span>
              </span>
              <Icon name="chevron_right" size={20} className={styles.chevron} />
            </>
          );
          const cls = cx(styles.row, r.state === 'now' && styles.rowNow);
          const current = r.state === 'now' ? ('step' as const) : undefined;
          // One string, so the name keeps its spacing ("…, done, …"): a name
          // built from visible text plus an sr-only fragment loses it.
          const name = [
            r.label,
            r.state === 'done' && !r.note.startsWith(C.done) ? 'done' : null,
            r.note,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li key={r.key}>
              {'href' in r ? (
                <Link
                  href={r.href}
                  prefetch={false}
                  className={cls}
                  aria-current={current}
                  aria-label={name}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  className={cls}
                  onClick={r.onClick}
                  aria-current={current}
                  aria-label={name}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
