import type { ReactNode, Ref } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './PageHeader.module.css';

type PageHeaderProps = {
  title: string;
  /** On the title's baseline, quieter (Sessions' "· 2 of 5"). */
  titleAside?: ReactNode;
  /** One line of context: text, or a control in its place (Bookings' time zone, a skeleton). */
  subtitle?: ReactNode;
  /** Right of the title on wide screens, under it when it wraps (a search, an action). */
  actions?: ReactNode;
  /** Caps the title block so a long subtitle wraps early (Calendar 460px, others 520px). */
  measure?: 'narrow' | 'wide';
  /** While the page loads: the subtitle is a placeholder. */
  busy?: boolean;
  ref?: Ref<HTMLElement>;
};

/** Every page's h1 and one line of context, member and admin screens alike. */
export function PageHeader({
  title,
  titleAside,
  subtitle,
  actions,
  measure,
  busy,
  ref,
}: PageHeaderProps) {
  const heading = <h1 className={styles.title}>{title}</h1>;
  return (
    <header ref={ref} className={styles.header} aria-busy={busy || undefined}>
      <div className={cx(styles.text, measure && styles[measure])}>
        {titleAside ? (
          <div className={styles.titleRow}>
            {heading}
            {titleAside}
          </div>
        ) : (
          heading
        )}
        {typeof subtitle === 'string' ? <p className={styles.subtitle}>{subtitle}</p> : subtitle}
      </div>
      {actions}
    </header>
  );
}
