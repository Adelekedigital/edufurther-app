import Link from 'next/link';
import { useId } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './ProfileStrengthCard.module.css';

/** One next step: opens its editor here (`onSelect`) or goes where it's done (`href`). */
export type StrengthTip = { key: string; label: string } & (
  { onSelect: () => void; href?: never } | { href: string; onSelect?: never }
);

type ProfileStrengthCardProps = {
  /** The card's id (the page moves focus into it after a step is done). */
  id?: string;
  /** 0–100. */
  percent: number;
  tips: StrengthTip[];
};

/**
 * Profile strength (Mentor Profile.dc.html `canEdit`, the aside): how complete
 * the owner's profile is, and the next steps. The bar is a meter (WAI-ARIA APG
 * Meter): a percentage alone doesn't say what to do, so every tip is an action.
 */
export function ProfileStrengthCard({ id: cardId, percent, tips }: ProfileStrengthCardProps) {
  const id = useId();
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <section id={cardId} className={styles.card} aria-labelledby={`${id}-h`}>
      <div className={styles.head}>
        <h2 id={`${id}-h`} className={styles.title}>
          Profile strength
        </h2>
        <span className={styles.percent} aria-hidden>
          {value}%
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={`${id}-h`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${value}%`}
        className={styles.track}
      >
        <div className={styles.fill} style={{ width: `${value}%` }} />
      </div>
      {tips.length > 0 && (
        <ul className={styles.tips}>
          {tips.map((t) => {
            const body = (
              <>
                <Icon name="add_circle" size={16} className={styles.tipIcon} />
                {t.label}
                <Icon name="chevron_right" size={16} className={styles.chevron} />
              </>
            );
            return (
              <li key={t.key}>
                {t.href ? (
                  <Link href={t.href} prefetch={false} className={styles.tip}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" className={styles.tip} onClick={t.onSelect}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
